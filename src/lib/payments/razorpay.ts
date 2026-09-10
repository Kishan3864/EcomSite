import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay, over plain fetch.
 *
 * The official SDK wraps the same three REST calls we need and pulls in its own
 * HTTP stack, so this talks to the API directly. Everything here is
 * server-only: the key secret never leaves the server, and neither does any
 * function that touches it.
 *
 * Amounts are in paise throughout. The order table stores rupees, so every
 * crossing between the two is explicit — a silent factor of 100 is the classic
 * way to charge someone a hundred times too much.
 */

const API = "https://api.razorpay.com/v1";

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Safe to send to the browser: the checkout script needs it. */
export function publicKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID?.trim() || null;
}

/** True while the test keys are in use, so the UI can say so plainly. */
export function isTestMode(): boolean {
  return (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_test");
}

function credentials() {
  const id = process.env.RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!id || !secret) throw new Error("Razorpay keys are not configured.");
  return { id, secret };
}

function authHeader() {
  const { id, secret } = credentials();
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    // A payment call must never be served from a cache.
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: { code?: string; description?: string } })
    | null;

  if (!response.ok) {
    const description = body?.error?.description ?? `HTTP ${response.status}`;
    throw new Error(`Razorpay: ${description}`);
  }
  if (!body) throw new Error("Razorpay returned an empty response.");
  return body;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
}

/**
 * Create the gateway-side order. `receipt` carries our own order number so a
 * Razorpay dashboard row can always be traced back to a row in our database
 * without a lookup table.
 */
export async function createGatewayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      // Capture automatically: an authorised-but-uncaptured payment expires
      // and reverses on its own, which reads to the customer as money taken
      // and no order placed.
      payment_capture: 1,
      notes: params.notes ?? {},
    }),
  });
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  amount: number;
  currency: string;
  error_code?: string | null;
  error_description?: string | null;
  /** Present on UPI payments; names the app the customer paid from. */
  upi?: { vpa?: string; flow?: string };
  wallet?: string | null;
  bank?: string | null;
  card_id?: string | null;
}

/** Read a payment back from the gateway. The gateway is the authority. */
export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function refundPayment(params: {
  paymentId: string;
  amountPaise?: number;
  notes?: Record<string, string>;
}): Promise<{ id: string; status: string; amount: number }> {
  return call(`/payments/${encodeURIComponent(params.paymentId)}/refund`, {
    method: "POST",
    body: JSON.stringify({
      ...(params.amountPaise ? { amount: params.amountPaise } : {}),
      notes: params.notes ?? {},
    }),
  });
}

/**
 * Compare two hex digests without leaking, through timing, how many leading
 * characters matched. A plain `===` on a signature is a textbook timing oracle.
 */
function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Verify the handshake the browser hands back after checkout closes.
 *
 * This proves the browser is not making the success up. It is *not* proof the
 * money arrived — only the webhook, which comes from Razorpay's servers rather
 * than the customer's, is that. Both are checked, and the webhook wins.
 */
export function verifyCheckoutSignature(params: {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}): boolean {
  const { secret } = credentials();
  const expected = createHmac("sha256", secret)
    .update(`${params.gatewayOrderId}|${params.gatewayPaymentId}`)
    .digest("hex");
  return safeEqualHex(expected, params.signature);
}

/**
 * Verify a webhook against the raw request body.
 *
 * The body must be the exact bytes received. Parsing it to JSON and
 * re-serialising changes key order and whitespace, and the signature stops
 * matching — the single most common reason a webhook integration "randomly"
 * fails in production.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured.");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Rupees as stored on the order → paise as the gateway expects. */
export const toPaise = (rupees: number) => Math.round(rupees * 100);

/** Which UPI app was used, where the payload says. */
export function upiAppFrom(payment: RazorpayPayment): string | null {
  const vpa = payment.upi?.vpa;
  if (!vpa) return null;
  const handle = vpa.split("@")[1]?.toLowerCase() ?? "";
  if (handle.includes("okaxis") || handle.includes("okhdfc") || handle.includes("oksbi")) {
    return "Google Pay";
  }
  if (handle.includes("ybl") || handle.includes("ibl") || handle.includes("axl")) return "PhonePe";
  if (handle.includes("paytm")) return "Paytm";
  if (handle.includes("upi")) return "BHIM";
  return handle || null;
}
