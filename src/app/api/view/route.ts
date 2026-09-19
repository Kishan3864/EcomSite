import { db } from "@/lib/db";
import { ADMIN_COOKIE, adminToken } from "@/lib/auth/session";
import { cookies, headers } from "next/headers";

/**
 * Counts one product page view, for the homepage ranking.
 *
 * It can neither slow a product page down nor break one, by construction:
 *
 *   - the page never calls this while rendering. The browser sends it after
 *     the page is on screen, with `sendBeacon` — a request nobody waits for
 *     and whose answer nobody reads;
 *   - whatever happens in here, the answer is an empty 204. A database that is
 *     down, a product that does not exist, a body that is not JSON: all
 *     swallowed. There is no error a shopper could ever be shown.
 *
 * What it stores is "this product, today, one more" — see ProductViewDaily.
 * Nothing about the visitor is read into the row or kept anywhere.
 *
 * Not counted: anything that calls itself a bot, a signed-in admin (the owner
 * checking his own shop), and a repeat view of the same product in the same
 * browser session (the browser does not send those at all).
 */

const BOT = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|curl|wget|python|scrapy|httpclient|facebookexternalhit|whatsapp/i;

const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  try {
    const agent = (await headers()).get("user-agent") ?? "";
    if (!agent || BOT.test(agent)) return done();

    const admin = await adminToken.verify((await cookies()).get(ADMIN_COOKIE)?.value);
    if (admin) return done();

    const body = (await request.json()) as { id?: unknown };
    const id = typeof body.id === "string" && /^[a-z0-9]{10,40}$/i.test(body.id) ? body.id : null;
    if (!id) return done();

    // One statement, no read-then-write. An id that is not a product fails the
    // foreign key and lands in the catch below, which is where it belongs.
    await db.$executeRaw`
      INSERT INTO "ProductViewDaily" ("productId", "day", "views")
      VALUES (${id}, (now() AT TIME ZONE 'Asia/Kolkata')::date, 1)
      ON CONFLICT ("productId", "day") DO UPDATE SET "views" = "ProductViewDaily"."views" + 1`;
  } catch {
    /* a view that was not counted is not a problem worth anyone's attention */
  }
  return done();
}
