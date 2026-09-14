import { applyPayuResponse } from "@/services/payu-core";

/**
 * Where PayU posts the customer back to, whether the payment worked or not.
 *
 * This is a cross-site form POST, so the session cookie does not come with it —
 * and nothing here needs one. The order is identified by the transaction id
 * and the answer is trusted because its hash verifies against the salt, which
 * is a stronger claim than any cookie could make.
 *
 * It always ends in a redirect, never a rendered page: the customer must land
 * on a URL they can reload, share or come back to, and a POST result is none
 * of those.
 */

const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

function back(path: string) {
  // 303 so the browser follows with GET — which is what carries the session
  // cookie, and what makes the destination reloadable.
  return new Response(null, { status: 303, headers: { Location: `${site()}${path}`, "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: Record<string, string>;
  try {
    const form = await request.formData();
    body = Object.fromEntries(
      [...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]),
    );
  } catch {
    return back("/cart?error=payment_unreadable");
  }

  const outcome = await applyPayuResponse(body);

  if (outcome.kind === "paid") return back(`/order/${outcome.orderId}?placed=1`);

  // Back to the order itself, which already knows how to offer another
  // attempt. PayU own words for the failure are on the order timeline and in
  // the admin panel; they are not put in the URL, because a reason taken from
  // a form field and rendered on a page is a cross-site scripting hole.
  if (outcome.kind === "failed") return back(`/order/${outcome.orderId}?payment=failed`);

  // Neither confirmed nor refused: a hash that did not verify, an unknown
  // transaction, or a bank still thinking. None of those is something to show
  // a customer as either success or failure.
  return back("/account/orders?pending=1");
}

/**
 * PayU occasionally sends the customer back with GET — an abandoned page
 * restored from history, mostly. There is nothing to apply, so send them to
 * their orders rather than a 405.
 */
export async function GET() {
  return back("/account/orders");
}
