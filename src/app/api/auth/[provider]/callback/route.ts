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

async function exchangeCode(provider: ConfiguredProvider, code: string, verifier: string) {
  const response = await fetch(provider.tokenUrl, {
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
  }).catch(() => null);
  if (!response?.ok) return null;

  const payload: unknown = await response.json().catch(() => null);
  const token =
    typeof payload === "object" && payload !== null
      ? (payload as { access_token?: unknown }).access_token
      : null;
  return typeof token === "string" && token ? token : null;
}

async function fetchUserinfo(provider: ConfiguredProvider, accessToken: string): Promise<unknown> {
  const response = await fetch(provider.userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  return response.json().catch(() => null);
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
    fail(query.get("error") === "access_denied" ? "oauth_denied" : "oauth_failed");
  }

  const state = query.get("state");
  const code = query.get("code");
  if (
    !handshake ||
    handshake.provider !== provider.id ||
    !state ||
    !tokensMatch(handshake.state, state)
  ) {
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
