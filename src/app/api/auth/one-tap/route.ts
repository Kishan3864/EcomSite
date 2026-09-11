import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { configuredProvider, randomToken } from "@/lib/auth/oauth";
import { verifyGoogleIdToken } from "@/lib/auth/google-id-token";
import { signInWithProvider } from "@/lib/auth/customer";
import { cookieOptions } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Google One Tap and the Google button.
 *
 * Deliberately not under /api/auth/google/: a static "google" folder there
 * would shadow the dynamic /api/auth/[provider]/start and /callback routes,
 * because Next does not fall back from a matched static segment to a dynamic
 * sibling — the existing redirect sign-in would start returning 404.
 *
 *   GET  → a fresh nonce (set in an httpOnly cookie) and the public client id.
 *   POST → verify the ID token against that nonce and sign the customer in,
 *          through the same signInWithProvider the redirect flow uses, so
 *          account linking behaves identically whichever door they came in by.
 */

export const dynamic = "force-dynamic";

const NONCE_COOKIE = "weekendcart_gnonce";
const NONCE_PATH = "/api/auth/one-tap";
const NONCE_TTL_SECONDS = 60 * 60;
const NO_STORE = { "Cache-Control": "no-store" };

function siteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function GET() {
  const google = configuredProvider("google");
  const origin = siteOrigin();
  if (!google || !origin) return reply({ enabled: false });

  const nonce = randomToken();
  (await cookies()).set(NONCE_COOKIE, nonce, {
    ...cookieOptions(NONCE_TTL_SECONDS),
    path: NONCE_PATH,
  });

  // The client id is public by design — it is in every Google button's markup.
  return reply({ enabled: true, clientId: google.clientId, nonce, origin });
}

export async function POST(request: NextRequest) {
  const google = configuredProvider("google");
  const origin = siteOrigin();
  if (!google || !origin) return reply({ ok: false, error: "oauth_failed" }, 404);

  // Login CSRF: this endpoint sets a session cookie, so it answers only to our
  // own pages. A cross-site form or fetch carries a different Origin.
  if (request.headers.get("origin") !== origin) {
    return reply({ ok: false, error: "oauth_state" }, 403);
  }

  if (!rateLimit("one-tap:ip", await clientIp(), 20, 10 * 60_000)) {
    return reply({ ok: false, error: "oauth_failed" }, 429);
  }

  let credential = "";
  try {
    const body = (await request.json()) as { credential?: unknown };
    credential = typeof body.credential === "string" ? body.credential : "";
  } catch {
    // Falls through to the empty-credential answer.
  }
  if (!credential || credential.length > 4096) {
    return reply({ ok: false, error: "oauth_failed" }, 400);
  }

  const jar = await cookies();
  const nonce = jar.get(NONCE_COOKIE)?.value;
  // Single use, whatever happens next.
  jar.delete({ name: NONCE_COOKIE, path: NONCE_PATH });
  if (!nonce) return reply({ ok: false, error: "oauth_state" }, 400);

  const profile = await verifyGoogleIdToken(credential, google.clientId, nonce);
  if (!profile) return reply({ ok: false, error: "oauth_failed" }, 401);

  const result = await signInWithProvider("GOOGLE", profile);
  if (!result.ok) return reply({ ok: false, error: result.error }, 403);

  return reply({ ok: true });
}
