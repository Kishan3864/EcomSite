"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/customer";
import {
  createGatewayOrder,
  fetchPayment,
  publicKeyId,
  razorpayConfigured,
  toPaise,
  upiAppFrom,
  verifyCheckoutSignature,
  type RazorpayPayment,
} from "@/lib/payments/razorpay";
import { BUSINESS } from "@/config/business";

/**
 * Payment lifecycle.
 *
 * The rule the whole file is built around: an order becomes PAID because the
 * gateway says so, never because the browser does. The browser's callback is
 * checked — it proves the response was not fabricated — but the amount and the
 * status are always read back from Razorpay before anything is written.
 */

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
 * Create the gateway order for an order we have already written as PENDING.
 *
 * The amount comes from the order row, which `placeOrder` computed from the
 * catalogue — never from anything the client sent here. The client only names
 * which order it wants to pay for, and must own it.
 */
export async function startPayment(orderId: string): Promise<StartPaymentResult> {
  if (!razorpayConfigured()) {
    return { ok: false, error: "Online payment is not configured yet." };
  }

  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Sign in to pay for this order." };

  const order = await db.order.findFirst({
    where: { id: orderId, customerId: session.id },
    select: {
      id: true,
      number: true,
      total: true,
      paymentStatus: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
    },
  });

  if (!order) return { ok: false, error: "Order not found." };
  if (order.paymentStatus === "PAID") {
    return { ok: false, error: "This order is already paid." };
  }

  const amountPaise = toPaise(order.total);

  try {
    const gatewayOrder = await createGatewayOrder({
      amountPaise,
      receipt: order.number,
      notes: { orderId: order.id, orderNumber: order.number, brand: BUSINESS.brandName },
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
      prefill: {
        name: order.contactName,
        email: order.contactEmail,
        contact: order.contactPhone,
      },
    };
  } catch (error) {
    console.error("startPayment", error);
    return { ok: false, error: "We could not reach the payment service. Nothing has been charged." };
  }
}

/**
 * Apply a captured payment to its order.
 *
 * Shared by the browser callback and the webhook, so both routes converge on
 * one place that decides what "paid" means. Guarded so a second call — a
 * redelivered webhook, or a callback racing the webhook — changes nothing.
 */
async function markPaid(params: {
  orderId: string;
  attemptId: string;
  payment: RazorpayPayment;
}) {
  const { orderId, attemptId, payment } = params;

  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true, total: true },
    });
    if (!order || order.paymentStatus === "PAID") return;

    // The gateway's amount must match what we asked for. A mismatch means
    // something was tampered with or the wrong order was paid, and neither is
    // something to resolve by trusting the payment.
    if (payment.amount !== toPaise(order.total)) {
      await tx.paymentAttempt.update({
        where: { id: attemptId },
        data: {
          status: "FAILED",
          failureCode: "amount_mismatch",
          failureDescription: `Gateway ${payment.amount}p vs order ${toPaise(order.total)}p`,
          payload: payment as unknown as object,
        },
      });
      return;
    }

    await tx.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "CAPTURED",
        gatewayPaymentId: payment.id,
        method: payment.method ?? null,
        upiApp: upiAppFrom(payment),
        payload: payment as unknown as object,
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paymentRef: payment.id,
        paymentDetail: describe(payment),
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId,
        status: "CONFIRMED",
        title: "Payment received",
        description: `${describe(payment)} · ${payment.id}`,
        location: "Online",
      },
    });
  });
}

/** A short, human line for the order page: "UPI · Google Pay", "Card". */
function describe(payment: RazorpayPayment): string {
  const app = upiAppFrom(payment);
  if (payment.method === "upi") return app ? `UPI · ${app}` : "UPI";
  if (payment.method === "card") return "Card";
  if (payment.method === "netbanking") return payment.bank ? `Net banking · ${payment.bank}` : "Net banking";
  if (payment.method === "wallet") return payment.wallet ? `Wallet · ${payment.wallet}` : "Wallet";
  return payment.method ?? "Online";
}

export interface ConfirmPaymentResult {
  ok: boolean;
  error?: string;
  status?: "paid" | "pending";
}

/**
 * The browser's success callback.
 *
 * Signature verification proves the browser did not invent this. The status and
 * amount are then read from the gateway rather than believed, because a
 * verified signature only says "these ids belong together" — it says nothing
 * about whether the money actually moved.
 */
export async function confirmPayment(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<ConfirmPaymentResult> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Sign in to continue." };

  const attempt = await db.paymentAttempt.findUnique({
    where: { gatewayOrderId: input.razorpayOrderId },
    select: { id: true, orderId: true, order: { select: { customerId: true } } },
  });

  if (!attempt || attempt.orderId !== input.orderId) {
    return { ok: false, error: "We could not match this payment to your order." };
  }
  if (attempt.order.customerId !== session.id) {
    return { ok: false, error: "We could not match this payment to your order." };
  }

  const signatureValid = verifyCheckoutSignature({
    gatewayOrderId: input.razorpayOrderId,
    gatewayPaymentId: input.razorpayPaymentId,
    signature: input.signature,
  });

  if (!signatureValid) {
    await db.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "FAILED", failureCode: "signature_mismatch" },
    });
    return { ok: false, error: "This payment could not be verified." };
  }

  try {
    const payment = await fetchPayment(input.razorpayPaymentId);

    if (payment.status === "captured" || payment.status === "authorized") {
      await markPaid({ orderId: attempt.orderId, attemptId: attempt.id, payment });
      revalidatePath(`/order/${attempt.orderId}`);
      return { ok: true, status: "paid" };
    }

    // Authorised-but-not-captured, or still processing. The webhook will
    // settle it; the customer does not need to sit here waiting.
    return { ok: true, status: "pending" };
  } catch (error) {
    console.error("confirmPayment", error);
    // Do not fail the customer over our own lookup failing — the webhook is
    // the authority and will confirm the order regardless.
    return { ok: true, status: "pending" };
  }
}

/**
 * Record that an attempt failed, and release the stock the order was holding.
 *
 * `placeOrder` decrements stock when it writes the order, so an abandoned
 * payment would otherwise keep those units off the shelf until somebody
 * noticed.
 */
export async function failPayment(input: {
  orderId: string;
  gatewayOrderId?: string;
  reason?: string;
}): Promise<{ ok: boolean }> {
  const session = await getCustomerSession();
  if (!session) return { ok: false };

  const order = await db.order.findFirst({
    where: { id: input.orderId, customerId: session.id },
    select: { id: true, paymentStatus: true, lines: { select: { productId: true, quantity: true } } },
  });
  if (!order || order.paymentStatus === "PAID") return { ok: false };

  await db.$transaction(async (tx) => {
    if (input.gatewayOrderId) {
      await tx.paymentAttempt.updateMany({
        where: { gatewayOrderId: input.gatewayOrderId, status: "CREATED" },
        data: { status: "FAILED", failureDescription: input.reason ?? "Cancelled by customer" },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED", status: "CANCELLED" },
    });

    for (const line of order.lines) {
      // A line keeps its snapshot after the product is deleted, so productId
      // can be null. There is nothing to put the stock back on in that case.
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
        description: input.reason ?? "The payment was cancelled or did not go through.",
        location: "Online",
      },
    });
  });

  return { ok: true };
}

/** Polled by the processing page: the webhook may confirm before the callback. */
export async function paymentStatusOf(orderId: string): Promise<"paid" | "pending" | "failed" | null> {
  const session = await getCustomerSession();
  if (!session) return null;

  const order = await db.order.findFirst({
    where: { id: orderId, customerId: session.id },
    select: { paymentStatus: true },
  });
  if (!order) return null;

  if (order.paymentStatus === "PAID") return "paid";
  if (order.paymentStatus === "FAILED") return "failed";
  return "pending";
}

/** Used by the webhook route, which has no customer session to check against. */
export async function applyWebhookPayment(payment: RazorpayPayment): Promise<void> {
  const attempt = await db.paymentAttempt.findUnique({
    where: { gatewayOrderId: payment.order_id },
    select: { id: true, orderId: true },
  });
  if (!attempt) return;

  if (payment.status === "captured" || payment.status === "authorized") {
    await markPaid({ orderId: attempt.orderId, attemptId: attempt.id, payment });
    return;
  }

  if (payment.status === "failed") {
    await db.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "FAILED",
        gatewayPaymentId: payment.id,
        failureCode: payment.error_code ?? null,
        failureDescription: payment.error_description ?? null,
        payload: payment as unknown as object,
      },
    });
  }
}
