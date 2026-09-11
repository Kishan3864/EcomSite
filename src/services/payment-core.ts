import "server-only";

import { db } from "@/lib/db";
import type { PaymentMethod } from "@/generated/prisma/client";
import { toPaise, upiAppFrom, type RazorpayPayment } from "@/lib/payments/razorpay";

/**
 * The parts of the payment lifecycle that must never be callable from a
 * browser.
 *
 * These used to sit in services/payments.ts, which is a "use server" module —
 * and every export of a "use server" module is a server action, an endpoint the
 * client can invoke. `applyWebhookPayment` takes a payment object and marks the
 * matching order paid; exposed as an action, that is an order confirmed for
 * free by anyone who forges the object. This module is server-only, so neither
 * the bundler nor a crafted request can reach it: only the webhook route (after
 * signature verification) and the actions in payments.ts (after checking the
 * session and re-reading the gateway) call into it.
 */

/** An online order that has not been paid for this long is released. */
export const PENDING_EXPIRY_MINUTES = 45;

/** "UPI · Google Pay", "Card", "Net banking · HDFC" — for the order page. */
export function describe(payment: RazorpayPayment): string {
  const app = upiAppFrom(payment);
  if (payment.method === "upi") return app ? `UPI · ${app}` : "UPI";
  if (payment.method === "card") return "Card";
  if (payment.method === "netbanking") {
    return payment.bank ? `Net banking · ${payment.bank}` : "Net banking";
  }
  if (payment.method === "wallet") return payment.wallet ? `Wallet · ${payment.wallet}` : "Wallet";
  return "Online";
}

/** Narrow the order from ONLINE to what the customer actually paid with. */
function methodFrom(payment: RazorpayPayment): PaymentMethod {
  switch (payment.method) {
    case "upi":
      return "UPI";
    case "card":
      return "CARD";
    case "netbanking":
      return "NETBANKING";
    case "wallet":
      return "WALLET";
    default:
      return "ONLINE";
  }
}

/**
 * Apply a captured payment to its order. Idempotent: a second call — a
 * redelivered webhook, or the browser callback racing the webhook — finds the
 * order already paid and changes nothing.
 */
export async function markPaid(params: {
  orderId: string;
  attemptId: string;
  payment: RazorpayPayment;
}) {
  const { orderId, attemptId, payment } = params;

  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        paymentStatus: true,
        status: true,
        total: true,
        lines: { select: { productId: true, quantity: true } },
      },
    });
    if (!order || order.paymentStatus === "PAID") return;

    // The gateway's amount and currency must be exactly what we asked for. A
    // mismatch means tampering or the wrong order, and neither is resolved by
    // believing the payment.
    const expected = toPaise(order.total);
    if (payment.amount !== expected || payment.currency !== "INR") {
      await tx.paymentAttempt.update({
        where: { id: attemptId },
        data: {
          status: "FAILED",
          failureCode: "amount_mismatch",
          failureDescription: `Gateway ${payment.amount} ${payment.currency} vs order ${expected} INR`,
          payload: payment as unknown as object,
        },
      });
      return;
    }

    // Money that arrives after the order lapsed — a UPI approval that came in
    // late, or a customer who closed the window just as their bank said yes —
    // is still money taken. Honour the order rather than strand the payment,
    // and put back the stock the lapse released.
    const revived = order.status === "CANCELLED";
    if (revived) {
      for (const line of order.lines) {
        if (!line.productId) continue;
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity }, soldCount: { increment: line.quantity } },
        });
      }
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
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentMethod: methodFrom(payment),
        paymentRef: payment.id,
        paymentDetail: describe(payment),
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId,
        status: "CONFIRMED",
        title: "Payment received",
        description: revived
          ? `${describe(payment)} · ${payment.id}. Arrived after the order had lapsed; stock was re-reserved — check availability before dispatch.`
          : `${describe(payment)} · ${payment.id}`,
        location: "Online",
      },
    });
  });
}

/** Called by the webhook route, after it has verified Razorpay's signature. */
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

/**
 * Release online orders that were never paid for.
 *
 * placeOrder takes stock off the shelf the moment an order is written, so an
 * abandoned checkout would otherwise hold those units indefinitely. This runs
 * lazily, piggy-backing on checkout traffic, so it needs no scheduler. If a
 * payment for a released order does arrive late, markPaid revives it.
 */
export async function expireStalePendingOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - PENDING_EXPIRY_MINUTES * 60_000);

  const stale = await db.order.findMany({
    where: { paymentStatus: "PENDING", paymentMethod: "ONLINE", placedAt: { lt: cutoff } },
    select: { id: true, lines: { select: { productId: true, quantity: true } } },
    take: 50,
  });

  for (const order of stale) {
    await db.$transaction(async (tx) => {
      // Re-check inside the transaction: a payment may have landed since the
      // query above ran.
      const current = await tx.order.findUnique({
        where: { id: order.id },
        select: { paymentStatus: true },
      });
      if (current?.paymentStatus !== "PENDING") return;

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED", status: "CANCELLED" },
      });
      await tx.paymentAttempt.updateMany({
        where: { orderId: order.id, status: "CREATED" },
        data: { status: "FAILED", failureDescription: "Expired without payment" },
      });
      for (const line of order.lines) {
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
          title: "Order lapsed",
          description: `No payment arrived within ${PENDING_EXPIRY_MINUTES} minutes, so the items were released.`,
          location: "Online",
        },
      });
    });
  }

  return stale.length;
}
