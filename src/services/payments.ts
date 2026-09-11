"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/customer";
import { rateLimit, TOO_MANY } from "@/lib/rate-limit";
import {
  createGatewayOrder,
  fetchPayment,
  publicKeyId,
  razorpayConfigured,
  toPaise,
  verifyCheckoutSignature,
} from "@/lib/payments/razorpay";
import { expireStalePendingOrders, markPaid } from "@/services/payment-core";
import { BUSINESS } from "@/config/business";

/**
 * Payment actions the checkout page calls.
 *
 * Every export here is a server action — an endpoint a browser can invoke —
 * so each one checks the session, checks the order belongs to that customer,
 * and is rate limited. Anything that must not be browser-reachable lives in
 * payment-core.ts, which is server-only.
 *
 * The rule the whole flow is built on: an order becomes PAID because the
 * gateway says so, never because the browser does.
 */

const WINDOW = 10 * 60_000;

/** A gateway order Razorpay will still accept payment against. */
const REUSE_ATTEMPT_MINUTES = 15;

/** Past this many attempts on one order, something other than bad luck is happening. */
const MAX_ATTEMPTS_PER_ORDER = 6;

export interface StartPaymentResult {
  ok: boolean;
  error?: string;
  keyId?: string;
  gatewayOrderId?: string;
  amountPaise?: number;
  orderNumber?: string;
  prefill?: { name: string; email: string; contact: string };
}

/**
 * Open (or reopen) the gateway checkout for an order already written as
 * PENDING. The amount comes from the order row, which placeOrder priced from
 * the catalogue — the browser only names which order, and must own it.
 */
export async function startPayment(orderId: string): Promise<StartPaymentResult> {
  if (!razorpayConfigured()) {
    return { ok: false, error: "Online payment is not available right now." };
  }

  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Sign in to pay for this order." };
  if (!rateLimit("pay:start", session.id, 12, WINDOW)) return { ok: false, error: TOO_MANY };

  await expireStalePendingOrders();

  const order = await db.order.findFirst({
    where: { id: orderId, customerId: session.id },
    select: {
      id: true,
      number: true,
      total: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
    },
  });

  if (!order) return { ok: false, error: "Order not found." };
  if (order.paymentStatus === "PAID") return { ok: false, error: "This order is already paid." };
  if (order.paymentMethod === "COD") {
    return { ok: false, error: "This order is set to cash on delivery." };
  }
  if (order.status === "CANCELLED") {
    return { ok: false, error: "This order was cancelled. Please place it again from your bag." };
  }

  const amountPaise = toPaise(order.total);
  const prefill = {
    name: order.contactName,
    email: order.contactEmail,
    contact: order.contactPhone,
  };

  // Reuse a recent gateway order rather than minting a new one on every click.
  // Retrying after a failed card is normal; forty Razorpay orders for one
  // purchase is not, and it makes reconciliation miserable.
  const recent = await db.paymentAttempt.findFirst({
    where: {
      orderId: order.id,
      status: "CREATED",
      amount: amountPaise,
      createdAt: { gt: new Date(Date.now() - REUSE_ATTEMPT_MINUTES * 60_000) },
    },
    orderBy: { createdAt: "desc" },
    select: { gatewayOrderId: true },
  });

  if (recent) {
    return {
      ok: true,
      keyId: publicKeyId() ?? undefined,
      gatewayOrderId: recent.gatewayOrderId,
      amountPaise,
      orderNumber: order.number,
      prefill,
    };
  }

  const attempts = await db.paymentAttempt.count({ where: { orderId: order.id } });
  if (attempts >= MAX_ATTEMPTS_PER_ORDER) {
    return {
      ok: false,
      error: "Too many payment attempts on this order. Please place it again from your bag.",
    };
  }

  try {
    const gatewayOrder = await createGatewayOrder({
      amountPaise,
      receipt: order.number,
      notes: { orderNumber: order.number, brand: BUSINESS.brandName },
    });

    await db.paymentAttempt.create({
      data: {
        orderId: order.id,
        gatewayOrderId: gatewayOrder.id,
        amount: amountPaise,
        currency: "INR",
        status: "CREATED",
      },
    });

    return {
      ok: true,
      keyId: publicKeyId() ?? undefined,
      gatewayOrderId: gatewayOrder.id,
      amountPaise,
      orderNumber: order.number,
      prefill,
    };
  } catch (error) {
    console.error("startPayment", error);
    return {
      ok: false,
      error: "We could not reach the payment service. Nothing has been charged.",
    };
  }
}

export interface ConfirmPaymentResult {
  ok: boolean;
  error?: string;
  status?: "paid" | "pending";
}

/**
 * The browser's success callback. The signature proves the browser did not
 * invent the response; the status and amount are then read back from the
 * gateway, because a valid signature only says the ids belong together — not
 * that money moved.
 */
export async function confirmPayment(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<ConfirmPaymentResult> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  if (!rateLimit("pay:confirm", session.id, 20, WINDOW)) return { ok: false, error: TOO_MANY };

  // Shape check before anything touches the database or the crypto.
  const id = /^[A-Za-z0-9_]{6,64}$/;
  if (
    !id.test(input.razorpayOrderId) ||
    !id.test(input.razorpayPaymentId) ||
    !/^[a-f0-9]{64}$/.test(input.signature)
  ) {
    return { ok: false, error: "This payment could not be verified." };
  }

  const attempt = await db.paymentAttempt.findUnique({
    where: { gatewayOrderId: input.razorpayOrderId },
    select: { id: true, orderId: true, order: { select: { customerId: true } } },
  });

  const mismatch = "We could not match this payment to your order.";
  if (!attempt || attempt.orderId !== input.orderId) return { ok: false, error: mismatch };
  if (attempt.order.customerId !== session.id) return { ok: false, error: mismatch };

  const valid = verifyCheckoutSignature({
    gatewayOrderId: input.razorpayOrderId,
    gatewayPaymentId: input.razorpayPaymentId,
    signature: input.signature,
  });

  if (!valid) {
    await db.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "FAILED", failureCode: "signature_mismatch" },
    });
    return { ok: false, error: "This payment could not be verified." };
  }

  try {
    const payment = await fetchPayment(input.razorpayPaymentId);

    // The payment must be for the gateway order this attempt created — a
    // valid signature over someone else's pairing does not transfer here.
    if (payment.order_id !== input.razorpayOrderId) return { ok: false, error: mismatch };

    if (payment.status === "captured" || payment.status === "authorized") {
      await markPaid({ orderId: attempt.orderId, attemptId: attempt.id, payment });
      revalidatePath(`/order/${attempt.orderId}`);
      return { ok: true, status: "paid" };
    }

    // Still processing. The webhook will settle it.
    return { ok: true, status: "pending" };
  } catch (error) {
    console.error("confirmPayment", error);
    // Our own lookup failing is not the customer's problem; the webhook is the
    // authority and will confirm the order regardless.
    return { ok: true, status: "pending" };
  }
}

/**
 * The customer closed the checkout or the payment failed. Release the order and
 * the stock it was holding. If the payment turns out to have succeeded after
 * all, the webhook revives the order.
 */
export async function failPayment(input: {
  orderId: string;
  gatewayOrderId?: string;
  reason?: string;
}): Promise<{ ok: boolean }> {
  const session = await getCustomerSession();
  if (!session) return { ok: false };
  if (!rateLimit("pay:fail", session.id, 20, WINDOW)) return { ok: false };

  const order = await db.order.findFirst({
    where: { id: input.orderId, customerId: session.id },
    select: {
      id: true,
      paymentStatus: true,
      paymentMethod: true,
      lines: { select: { productId: true, quantity: true } },
    },
  });
  if (!order || order.paymentStatus !== "PENDING" || order.paymentMethod === "COD") {
    return { ok: false };
  }

  // Free text from the browser is stored, so bound it.
  const reason = (input.reason ?? "The payment was cancelled or did not go through.").slice(0, 200);

  await db.$transaction(async (tx) => {
    if (input.gatewayOrderId) {
      await tx.paymentAttempt.updateMany({
        where: { orderId: order.id, gatewayOrderId: input.gatewayOrderId, status: "CREATED" },
        data: { status: "FAILED", failureDescription: reason },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED", status: "CANCELLED" },
    });

    for (const line of order.lines) {
      // A line keeps its snapshot after its product is deleted, so productId
      // can be null — there is nothing to return the stock to in that case.
      if (!line.productId) continue;
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { increment: line.quantity }, soldCount: { decrement: line.quantity } },
      });
    }

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: "CANCELLED",
        title: "Payment not completed",
        description: reason,
        location: "Online",
      },
    });
  });

  return { ok: true };
}

/** Polled by the processing page: the webhook may confirm before the callback. */
export async function paymentStatusOf(
  orderId: string,
): Promise<"paid" | "pending" | "failed" | null> {
  const session = await getCustomerSession();
  if (!session) return null;
  if (!rateLimit("pay:poll", session.id, 120, WINDOW)) return "pending";

  const order = await db.order.findFirst({
    where: { id: orderId, customerId: session.id },
    select: { paymentStatus: true },
  });
  if (!order) return null;

  if (order.paymentStatus === "PAID") return "paid";
  if (order.paymentStatus === "FAILED") return "failed";
  return "pending";
}
