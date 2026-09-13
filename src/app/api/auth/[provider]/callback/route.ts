import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { signInWithProvider } from "@/lib/auth/customer";
import {
  type ConfiguredProvider,
  type OAuthErrorCode,
  OAUTH_COOKIE,
  configuredProvider,
  decodeHandshake,
  safeNextPath,
  tokensMatch,
} from "@/lib/auth/oauth";

/**
 * Why every failure below is written to the server log.
 *
 * A shopper is told one sentence — "we could not finish that sign-in" — which
 * is all they can act on. But that sentence covers a dozen different causes:
 * a client secret that has been rotated, a redirect URI that is one character
 * out in the provider's console, a consent screen still in Testing, a code
 * replayed by the back button, or simply this server being unable to open a
 * connection to Google. Swallowing them all into `null` meant nobody could
 * tell which, because nothing was ever written down.
 *
 * The provider's own `error` / `error_description` is the single most useful
 * line here — "invalid_client", "redirect_uri_mismatch", "invalid_grant" each
 * name the fix exactly. Neither the client secret nor the authorisation code
 * is ever logged.
 */
function logFailure(stage: string, provider: ConfiguredProvider, detail: string) {
  console.error(`[auth:${provider.id}] ${stage} — ${detail}`);
}

/**
 * Per attempt. A healthy connect to Google from this box has been measured at
 * up to 7 seconds when the network is having a bad moment, so 8 was cutting it
 * fine; 10 leaves margin without stranding anyone, since the slow path is rare
 * and the common one answers in well under a second.
 */
const REQUEST_TIMEOUT_MS = 10_000;
const BACKOFF_MS = [0, 400, 1_200];

/**
 * A fetch that retries a connection that never got an answer, and reports why
 * when it finally gives up.
 *
 * Only failures with no answer are retried — a dropped connection, a refused
 * one, a timeout, or a 5xx from the provider. A 4xx is an answer: the code was
 * already redeemed, or the credentials are wrong, and asking again would at
 * best waste the customer's time and at worst replay a single-use code. So a
 * bad network costs a second and nobody notices; a bad setting fails at once
 * and says so.
 */
async function attempt(
  stage: string,
  provider: ConfiguredProvider,
  run: (signal: AbortSignal) => Promise<Response>,
): Promise<Response | null> {
  let lastReason = "";

  for (const [tries, wait] of BACKOFF_MS.entries()) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));

    try {
      const response = await run(AbortSignal.timeout(REQUEST_TIMEOUT_MS));
      if (response.ok) {
        if (tries > 0) console.warn(`[auth:${provider.id}] ${stage} — succeeded on try ${tries + 1}`);
        return response;
      }

      // Both Google and Facebook answer a rejected exchange with JSON naming
      // the reason. It is about the request, not the person, so it is safe.
      const body = await response.text().catch(() => "");
      lastReason = `HTTP ${response.status} ${body.slice(0, 400)}`;
      if (response.status < 500) break; // an answer, and not one retrying changes
    } catch (error) {
      // Almost always the network: this server could not reach the provider.
      lastReason =
        `request failed (${error instanceof Error ? error.message : String(error)}). ` +
        `Check that this server can reach ${new URL(provider.tokenUrl).host} — ` +
        "npx tsx scripts/check-auth.ts";
    }
  }

  logFailure(stage, provider, lastReason);
  return null;
}

async function exchangeCode(provider: ConfiguredProvider, code: string, verifier: string) {
  const response = await attempt("token exchange", provider, (signal) =>
    fetch(provider.tokenUrl, {
      signal,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: provider.redirectUri,
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        code_verifier: verifier,
      }),
      cache: "no-store",
    }),
  );
  if (!response) return null;

  const payload: unknown = await response.json().catch(() => null);
  const token =
    typeof payload === "object" && payload !== null
      ? (payload as { access_token?: unknown }).access_token
      : null;
  if (typeof token !== "string" || !token) {
    logFailure("token exchange", provider, "the response carried no access_token");
    return null;
  }
  return token;
}

async function fetchUserinfo(provider: ConfiguredProvider, accessToken: string): Promise<unknown> {
  const response = await attempt("userinfo", provider, (signal) =>
    fetch(provider.userinfoUrl, {
      signal,
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    }),
  );
  return response ? response.json().catch(() => null) : null;
}

/** Back to sign-in with a code that page knows how to put into words. */
function fail(code: OAuthErrorCode): never {
  redirect(`/login?error=${code}`);
}

/**
 * Redeems the code the provider sent back and signs the customer in. Anything
 * that goes wrong ends on the sign-in page, because the person standing here
 * only needs to know whether it is worth trying again.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const provider = configuredProvider((await params).provider);
  if (!provider) return new Response("Not found", { status: 404 });

  const store = await cookies();
  const handshake = decodeHandshake(store.get(OAUTH_COOKIE)?.value);
  // One attempt per handshake, whether it works out or not.
  store.delete(OAUTH_COOKIE);

  const query = request.nextUrl.searchParams;
  if (query.get("error")) {
    const code = query.get("error");
    logFailure("provider refused", provider, `${code} ${query.get("error_description") ?? ""}`);
    fail(code === "access_denied" ? "oauth_denied" : "oauth_failed");
  }

  const state = query.get("state");
  const code = query.get("code");
  if (
    !handshake ||
    handshake.provider !== provider.id ||
    !state ||
    !tokensMatch(handshake.state, state)
  ) {
    // Nearly always the handshake cookie: it is set on the host the sign-in
    // started from, and the provider sends everyone back to the one fixed
    // redirect URI. Start on a second hostname and the cookie is not there to
    // be read — so both hostnames must not offer the button, or the site must
    // redirect to the canonical one before anybody presses it.
    logFailure(
      "state check",
      provider,
      handshake
        ? "the returned state did not match the handshake cookie"
        : `no handshake cookie on ${request.nextUrl.host} — was the sign-in started on a different hostname?`,
    );
    fail("oauth_state");
  }
  if (!code) fail("oauth_failed");

  const accessToken = await exchangeCode(provider, code, handshake.verifier);
  const payload = accessToken ? await fetchUserinfo(provider, accessToken) : null;
  if (!payload) fail("oauth_failed");

  // Nothing usable came back: either the provider was never asked for an
  // address, or the customer declined it at the consent screen.
  const profile = provider.readProfile(payload);
  if (!profile) fail("oauth_email");

  const result = await signInWithProvider(provider.authProvider, profile);
  if (!result.ok) fail(result.error);

  redirect(safeNextPath(handshake.next));
}
