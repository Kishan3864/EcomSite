import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  OAUTH_COOKIE,
  OAUTH_TTL_SECONDS,
  codeChallenge,
  configuredProvider,
  encodeHandshake,
  randomToken,
  safeNextPath,
} from "@/lib/auth/oauth";
import { cookieOptions } from "@/lib/auth/session";

/**
 * Opens the provider's consent screen. The CSRF state and the PKCE verifier go
 * into a short-lived cookie that only the callback on this site can read, so a
 * response that was not asked for from this browser cannot be redeemed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const provider = configuredProvider((await params).provider);
  if (!provider) return new Response("Not found", { status: 404 });

  const state = randomToken();
  const verifier = randomToken();
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  const store = await cookies();
  store.set(
    OAUTH_COOKIE,
    encodeHandshake({ provider: provider.id, state, verifier, next }),
    cookieOptions(OAUTH_TTL_SECONDS),
  );

  const authorize = new URL(provider.authorizeUrl);
  authorize.search = new URLSearchParams({
    ...provider.authorizeParams,
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    response_type: "code",
    scope: provider.scope,
    state,
    code_challenge: await codeChallenge(verifier),
    code_challenge_method: "S256",
  }).toString();

  redirect(authorize.toString());
}
