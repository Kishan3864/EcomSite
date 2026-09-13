import "server-only";

import { jwtVerify, type JWTVerifyGetKey } from "jose";
import type { ProviderProfile } from "./oauth";
import { googleKeySet, refreshGoogleKeysIfStale } from "./google-keys";

/**
 * Verify a Google ID token from One Tap or the Google button.
 *
 * The token arrives from the browser, so nothing in it is believed until the
 * signature checks out against Google's published keys. Beyond the signature:
 *
 *  - `aud` must be our client id — a token Google issued to some other site is
 *    a valid Google token, and useless here;
 *  - `iss` must be Google;
 *  - `nonce` must match the one we set in this browser's cookie moments ago,
 *    which binds the token to this sign-in attempt. Without it, a token lifted
 *    from anywhere could be replayed at this endpoint until it expired.
 *
 * The keys come from `./google-keys`, which holds them in memory and on disk
 * and refreshes them in the background. Verification therefore opens no
 * connection while the customer waits — which is the point, on a server whose
 * outbound connections to Google are unreliable.
 */

/** The claims we act on, once the signature is proven. */
function readClaims(payload: Record<string, unknown>, expectedNonce: string) {
  if (typeof payload.nonce !== "string" || payload.nonce !== expectedNonce) return null;
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;

  const email = payload.email.toLowerCase().trim();
  const name =
    typeof payload.name === "string" && payload.name.trim()
      ? payload.name.trim()
      : email.split("@")[0];

  return {
    providerId: payload.sub,
    email,
    emailVerified: payload.email_verified === true,
    name,
    avatarUrl: typeof payload.picture === "string" ? payload.picture : null,
  };
}

async function verifyAgainst(keys: JWTVerifyGetKey, credential: string, clientId: string) {
  return jwtVerify(credential, keys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
    algorithms: ["RS256"],
    clockTolerance: 30,
  });
}

/**
 * The ID token that comes back with the redirect flow's token response.
 *
 * No nonce here, and none is needed: this token did not travel through the
 * browser. It came straight from Google over TLS, in the reply to a request
 * carrying our client secret and the PKCE verifier, so the exchange is already
 * bound to this attempt. Reading it saves the second call to Google's userinfo
 * endpoint, which on this server is a call that may simply never answer.
 */
export async function readGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<ProviderProfile | null> {
  const keys = await googleKeySet();
  if (!keys) return null;
  try {
    const { payload } = await verifyAgainst(keys, idToken, clientId);
    const claims = payload as Record<string, unknown>;
    // readClaims insists on a nonce; this token has none to insist on.
    return readClaims({ ...claims, nonce: "" }, "");
  } catch {
    return null;
  }
}

export async function verifyGoogleIdToken(
  credential: string,
  clientId: string,
  expectedNonce: string,
): Promise<ProviderProfile | null> {
  const keys = await googleKeySet();
  if (!keys) {
    console.error("[auth:google] no signing keys available — cannot verify the ID token");
    return null;
  }

  try {
    const { payload } = await verifyAgainst(keys, credential, clientId);
    return readClaims(payload as Record<string, unknown>, expectedNonce);
  } catch (error) {
    // A key we have never seen means Google has rotated and our copy is behind.
    // Everything else — bad signature, wrong audience, expired, replayed nonce
    // — is a token we should refuse, and refetching keys would not change that.
    const rotated =
      error instanceof Error && /no applicable key|signature verification/i.test(error.message);
    if (!rotated) return null;

    const fresh = await refreshGoogleKeysIfStale();
    if (!fresh) return null;
    try {
      const { payload } = await verifyAgainst(fresh, credential, clientId);
      return readClaims(payload as Record<string, unknown>, expectedNonce);
    } catch {
      return null;
    }
  }
}
