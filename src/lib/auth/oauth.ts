import "server-only";

import type { AuthProvider } from "@/generated/prisma/client";

export const PROVIDER_IDS = ["google", "facebook"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

/** The only fields of a provider's userinfo response we are willing to act on. */
export interface ProviderProfile {
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
}

/**
 * Short, stable codes carried back on `/login?error=`. The login page maps the
 * ones it knows to a sentence and anything else to a generic message, so these
 * may be added to but should not be renamed.
 */
export type OAuthErrorCode =
  | "oauth_denied"
  | "oauth_state"
  | "oauth_failed"
  | "oauth_email"
  | "oauth_link"
  | "oauth_other_provider"
  | "oauth_disabled";

interface ProviderDefinition {
  label: string;
  authProvider: AuthProvider;
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scope: string;
  /** Provider-specific extras merged into the authorisation request. */
  authorizeParams: Record<string, string>;
  clientIdEnv: string;
  clientSecretEnv: string;
  readProfile: (payload: unknown) => ProviderProfile | null;
}

export interface ConfiguredProvider extends ProviderDefinition {
  id: ProviderId;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  google: {
    label: "Google",
    authProvider: "GOOGLE",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userinfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    // Google would otherwise reuse whichever account the browser last used,
    // which on a shared phone signs in the wrong person without a word.
    authorizeParams: { prompt: "select_account" },
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    readProfile(payload) {
      const claims = asRecord(payload);
      if (!claims) return null;
      const providerId = text(claims.sub);
      const email = text(claims.email);
      if (!providerId || !email) return null;
      return {
        providerId,
        email: email.toLowerCase(),
        emailVerified: claims.email_verified === true,
        name: text(claims.name) ?? email.split("@")[0],
        avatarUrl: text(claims.picture),
      };
    },
  },
  facebook: {
    label: "Facebook",
    authProvider: "FACEBOOK",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    userinfoUrl: "https://graph.facebook.com/v21.0/me?fields=id,name,email,picture.type(large)",
    scope: "email public_profile",
    authorizeParams: {},
    clientIdEnv: "FACEBOOK_CLIENT_ID",
    clientSecretEnv: "FACEBOOK_CLIENT_SECRET",
    readProfile(payload) {
      const profile = asRecord(payload);
      if (!profile) return null;
      const providerId = text(profile.id);
      const email = text(profile.email);
      if (!providerId || !email) return null;
      const picture = asRecord(asRecord(profile.picture)?.data);
      return {
        providerId,
        email: email.toLowerCase(),
        // Graph exposes no verification flag, so a Facebook sign-in is never
        // trusted to attach itself to an account that already exists.
        emailVerified: false,
        name: text(profile.name) ?? email.split("@")[0],
        avatarUrl: picture?.is_silhouette === true ? null : text(picture?.url),
      };
    },
  },
};

function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

/**
 * A provider is only usable once its credentials and the public site URL are
 * set: without the site URL the redirect URI cannot match the one registered
 * in the provider's console, and the flow would fail the moment it started.
 */
export function configuredProvider(id: string): ConfiguredProvider | null {
  if (!isProviderId(id)) return null;
  const definition = PROVIDERS[id];
  const clientId = process.env[definition.clientIdEnv]?.trim();
  const clientSecret = process.env[definition.clientSecretEnv]?.trim();
  const site = siteUrl();
  if (!clientId || !clientSecret || !site) return null;

  return {
    ...definition,
    id,
    clientId,
    clientSecret,
    redirectUri: `${site}/api/auth/${id}/callback`,
  };
}

/** What the sign-in pages may offer. Empty means: render no provider buttons. */
export function configuredProviders(): { id: ProviderId; label: string }[] {
  return PROVIDER_IDS.map((id) => configuredProvider(id))
    .filter((provider) => provider !== null)
    .map((provider) => ({ id: provider.id, label: provider.label }));
}

/** How a provider is named in copy; null for an ordinary password account. */
export function providerLabel(authProvider: AuthProvider): string | null {
  return Object.values(PROVIDERS).find((entry) => entry.authProvider === authProvider)?.label ?? null;
}

/* --------------------------- Handshake cookie --------------------------- */

export const OAUTH_COOKIE = "weekendcart_oauth";
export const OAUTH_TTL_SECONDS = 60 * 10;

/** Held between the redirect out and the callback, and discarded either way. */
export interface OAuthHandshake {
  provider: ProviderId;
  state: string;
  verifier: string;
  next: string;
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(value: string) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)));
}

export function randomToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** PKCE S256: the provider only ever sees the digest of the verifier. */
export async function codeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export function encodeHandshake(handshake: OAuthHandshake) {
  return base64url(new TextEncoder().encode(JSON.stringify(handshake)));
}

export function decodeHandshake(value: string | undefined): OAuthHandshake | null {
  if (!value) return null;
  try {
    const parsed = asRecord(JSON.parse(fromBase64url(value)));
    const provider = text(parsed?.provider);
    const state = text(parsed?.state);
    const verifier = text(parsed?.verifier);
    const next = text(parsed?.next);
    if (!provider || !isProviderId(provider) || !state || !verifier || !next) return null;
    return { provider, state, verifier, next };
  } catch {
    return null;
  }
}

/** Compares two opaque tokens without leaking how far they matched. */
export function tokensMatch(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Stand-in origin, used only to test that a `next` value stays on this site. */
const SAME_SITE = "https://weekendcart.invalid";

/** Only ever send people back to a path on this site. */
export function safeNextPath(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/")) return fallback;
  try {
    // Resolved rather than pattern-matched: `//host`, `/\host` and a path with
    // a tab in it all reach another origin once a browser normalises them.
    const url = new URL(value, SAME_SITE);
    if (url.origin !== SAME_SITE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
