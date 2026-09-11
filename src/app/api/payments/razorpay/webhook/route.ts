import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, type RazorpayPayment } from "@/lib/payments/razorpay";
import { applyWebhookPayment } from "@/services/payment-core";

/**
 * Razorpay webhook.
 *
 * This, not the browser, is what makes an order paid. A customer whose phone
 * dies between paying and returning to the site still gets a confirmed order,
 * because Razorpay tells us from its own servers.
 *
 * Three things this route has to get right:
 *
 *  1. Verify against the RAW body. Parsing to JSON and re-serialising changes
 *     whitespace and key order, and the HMAC stops matching — the usual reason
 *     a webhook works in testing and fails in production.
 *  2. Be idempotent. Razorpay retries until it gets a 2xx, so the same event
 *     arrives repeatedly by design. The unique event id is the guard.
 *  3. Answer 200 even when we cannot act. A non-2xx makes Razorpay retry for
 *     hours over something a retry will never fix, and the failure is ours to
 *     find in the log, not theirs to hammer.
 */

// Signature verification needs the unbuffered request, so this cannot be static.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature");
  const eventId = request.headers.get("x-razorpay-event-id");

  if (!signature || !eventId) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // A Razorpay event is a few kilobytes. Refuse anything far larger before
  // reading it, so the endpoint cannot be used to make the server buffer and
  // hash arbitrarily large bodies.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > 256_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const raw = await request.text();
  if (raw.length > 256_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let valid = false;
  try {
    valid = verifyWebhookSignature(raw, signature);
  } catch (error) {
    // A missing secret is our misconfiguration, not a bad request.
    console.error("razorpay webhook: secret not configured", error);
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (!valid) {
    // Genuinely unauthenticated: reject rather than record.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: { event?: string; payload?: { payment?: { entity?: RazorpayPayment } } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const event = body.event ?? "unknown";

  // The unique constraint on eventId is the idempotency guard: a redelivery
  // loses the race here and returns without doing the work twice.
  try {
    await db.webhookEvent.create({
      data: { eventId, event, payload: body as object },
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    const payment = body.payload?.payment?.entity;
    if (payment) await applyWebhookPayment(payment);

    await db.webhookEvent.update({
      where: { eventId },
      data: { handledAt: new Date() },
    });
  } catch (error) {
    // Left unhandled on purpose: handledAt stays null, so the row is a record
    // of something that needs looking at rather than a silent loss.
    console.error("razorpay webhook: handler failed", eventId, event, error);
  }

  return NextResponse.json({ ok: true });
}
