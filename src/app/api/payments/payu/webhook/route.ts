import { applyPayuResponse } from "@/services/payu-core";

/**
 * PayU's own notification, independent of the customer's browser.
 *
 * The browser return is the fast path and this is the reliable one: a phone
 * that died on the bank's page, a customer who closed the tab the moment their
 * UPI app said yes, a redirect eaten by a captive wifi portal — in every one of
 * those the order is still confirmed, because PayU tells us separately.
 *
 * It is safe to expose because it proves itself: the same SHA-512 over the
 * salt that the browser return carries. A forged post without the salt fails
 * that check and changes nothing, and applyPayuResponse is idempotent, so a
 * redelivery after the browser already confirmed the order is a no-op.
 *
 * Always 200, whatever we decide: a gateway that reads an error code retries
 * for hours, and there is nothing for it to fix.
 */
export async function POST(request: Request) {
  let body: Record<string, string> = {};
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("application/json")) {
      const json = (await request.json()) as Record<string, unknown>;
      body = Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v ?? "")]));
    } else {
      const form = await request.formData();
      body = Object.fromEntries(
        [...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]),
      );
    }
  } catch {
    return Response.json({ received: true }, { status: 200 });
  }

  const outcome = await applyPayuResponse(body);
  if (outcome.kind === "ignored" && outcome.reason === "hash mismatch") {
    // Logged inside applyPayuResponse. Answered plainly rather than with a 4xx:
    // telling an attacker which of their guesses parsed is a favour.
    return Response.json({ received: true }, { status: 200 });
  }

  return Response.json({ received: true, outcome: outcome.kind }, { status: 200 });
}
