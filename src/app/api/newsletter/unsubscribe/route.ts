import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyUnsubscribe } from "@/lib/newsletter-token";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * One-click unsubscribe (RFC 8058), the target of the List-Unsubscribe header.
 *
 * Gmail, Apple Mail and Yahoo show their own "Unsubscribe" button for mail
 * carrying that header, and pressing it makes their servers POST here with
 * the body `List-Unsubscribe=One-Click`. Everything needed is in the signed
 * query string, so the body is not read and no cookie is involved.
 *
 * GET never unsubscribes. Link scanners and mail-security proxies fetch every
 * URL in a message, and a GET that removed people would unsubscribe them
 * without their knowledge; a GET is sent to the confirmation page instead.
 */

export const dynamic = "force-dynamic";

const PLAIN = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };

function reply(body: string, status: number) {
  return new Response(body, { status, headers: PLAIN });
}

export async function POST(request: NextRequest) {
  // Generous on purpose: one-click requests arrive from the mail providers'
  // own servers, so many genuine subscribers can share an address. The token
  // is the real gate; this only stops the endpoint being hammered.
  if (!rateLimit("newsletter-unsubscribe:ip", await clientIp(), 120, 10 * 60_000)) {
    return reply("Too many requests. Please try again in a few minutes.", 429);
  }

  const params = request.nextUrl.searchParams;
  const email = verifyUnsubscribe(params.get("e"), params.get("t"));
  if (!email) return reply("This unsubscribe link is not valid.", 400);

  // deleteMany, not delete: an address that has already gone is a success.
  await db.newsletterSubscriber.deleteMany({ where: { email } });
  return reply("You have been unsubscribed from WeekendCart emails.", 200);
}

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const forward = new URLSearchParams();
  for (const key of ["e", "t"]) {
    const value = params.get(key);
    if (value && /^[A-Za-z0-9_-]{1,400}$/.test(value)) forward.set(key, value);
  }
  const query = forward.toString();
  // A relative Location keeps the redirect on whichever host served the
  // request, with no dependence on how the proxy reports the origin.
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/newsletter/unsubscribe${query ? `?${query}` : ""}`,
      "Cache-Control": "no-store",
    },
  });
}
