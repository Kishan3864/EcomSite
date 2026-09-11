import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { ProviderProfile } from "./oauth";

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
 * `jose` caches the key set and refetches it when Google rotates keys.
 */

const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function verifyGoogleIdToken(
  credential: string,
  clientId: string,
  expectedNonce: string,
): Promise<ProviderProfile | null> {
  try {
    const { payload } = await jwtVerify(credential, GOOGLE_KEYS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
      algorithms: ["RS256"],
      clockTolerance: 30,
    });

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
  } catch {
    // Bad signature, wrong audience, expired — all the same answer.
    return null;
  }
}
