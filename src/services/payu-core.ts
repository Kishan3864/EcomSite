import "server-only";

import { db } from "@/lib/db";
import { toPaise } from "@/lib/gst";
import { sendOrderConfirmation } from "./order-email";
import {
  describePayu,
  newTxnId,
  payuAmount,
  payuConfig,
  payuEndpoint,
  payuFailed,
  payuFormFields,
  payuMethod,
  payuResponseIsAuthentic,
  payuSucceeded,
  type PayuResponse,
} from "@/lib/payments/payu";

/**
 * The PayU half of the payment lifecycle, kept server-only.
 *
 * Deliberately not a "use server" module. Every export of one of those is an
 * endpoint a browser can call, and `applyPayuResponse` marks an order paid —
 * exposed as an action, that is a free order for anyone who can post an object
 * at it. Only the return route (after verifying PayU's hash) and the page that
 * starts a payment reach in here.
 */

/** Enough retries for a customer whose bank keeps saying no; not enough to abuse. */
const MAX_ATTEMPTS_PER_ORDER = 8;

export interface PayuSession {
  endpoint: string;
  fields: Record<string, string>;
}

export type PayuStart =
  | { ok: true; session: PayuSession }
  | { ok: false; error: string };

/**
 * Sign a fresh transaction for an order and hand back the form the browser
 * will post. Each visit is a new transaction id: PayU rejects a repeat of one
 * it has already seen, and a customer who came back to try again deserves a
 * clean attempt rather than a duplicate error.
 */
export async function startPayuPayment(orderId: string): Promise<PayuStart> {
  const config = payuConfig();
  if (!config) return { ok: false, error: "Online payment is not set up on this site yet." };

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      total: true,
      status: true,
      paymentStatus: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      _count: { select: { payments: true } },
    },
  });
  if (!order) return { ok: false, error: "We could not find that order." };
  if (order.paymentStatus === "PAID") return { ok: false, error: "This order is already paid." };
  if (order.status === "CANCELLED") {
    return { ok: false, error: "This order was cancelled. Please place it again." };
  }
  if (order._count.payments >= MAX_ATTEMPTS_PER_ORDER) {
    return {
      ok: false,
      error: "Too many payment attempts on this order. Please contact us and we will help you complete it.",
    };
  }

  const txnid = newTxnId(order.number);

  await db.paymentAttempt.create({
    data: {
      orderId: order.id,
      gatewayOrderId: txnid,
      amount: toPaise(order.total),
      currency: "INR",
      status: "CREATED",
    },
  });

  return {
    ok: true,
    session: {
      endpoint: payuEndpoint(config),
      fields: payuFormFields(config, {
        txnid,
        amountRupees: order.total,
        // PayU prints this to the customer on its own page and on the bank
        // statement, so it names the shop and the order rather than the items.
        productInfo: `Order ${order.number}`,
        firstName: order.contactName,
        email: order.contactEmail,
        phone: order.contactPhone,
      }),
    },
  };
}

export type PayuOutcome =
  | { kind: "paid"; orderId: string }
  | { kind: "failed"; orderId: string; message: string }
  | { kind: "ignored"; reason: string };

/**
 * Apply what PayU says happened.
 *
 * Idempotent, because it is called from two places that race: the customer's
 * browser being posted back, and PayU's webhook. Whichever arrives first wins
 * and the second finds the work done.
 *
 * Nothing is believed without the hash, and nothing is believed about the
 * amount either — the transaction is matched to the attempt we created, and
 * the rupees PayU reports must be the paise we asked for.
 */
export async function applyPayuResponse(body: Record<string, string>): Promise<PayuOutcome> {
  const config = payuConfig();
  if (!config) return { kind: "ignored", reason: "PayU is not configured" };

  if (!payuResponseIsAuthentic(config, body)) {
    console.error("[payu] rejected a response whose hash did not verify", {
      txnid: body.txnid,
      status: body.status,
    });
    return { kind: "ignored", reason: "hash mismatch" };
  }

  const response = body as unknown as PayuResponse;
  const attempt = await db.paymentAttempt.findUnique({
    where: { gatewayOrderId: response.txnid },
    select: { id: true, orderId: true, amount: true, status: true },
  });
  if (!attempt) return { kind: "ignored", reason: "no such transaction" };

  if (payuSucceeded(response.status)) {
    // PayU reports rupees; we stored paise. A mismatch means the amount was
    // edited somewhere between the two, and a verified hash over an edited
    // amount would mean our own salt had leaked — either way, not a sale.
    if (payuAmount(attempt.amount / 100) !== payuAmount(Number(response.amount))) {
      await db.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "FAILED",
          failureCode: "amount_mismatch",
          failureDescription: `PayU ${response.amount} vs order ${attempt.amount / 100}`,
          payload: body as object,
        },
      });
      console.error("[payu] amount mismatch", { txnid: response.txnid });
      return { kind: "failed", orderId: attempt.orderId, message: "The amount did not match this order. Nothing has been charged." };
    }

    const newlyPaid = await markPayuPaid(attempt.id, attempt.orderId, response, body);
    // Only on the transition, so a redelivered webhook does not send a second
    // receipt for the same payment.
    if (newlyPaid) void sendOrderConfirmation(attempt.orderId);
    return { kind: "paid", orderId: attempt.orderId };
  }

  if (payuFailed(response.status)) {
    const why = response.error_Message?.trim() || response.field9?.trim() || "Payment not completed";

    await db.$transaction(async (tx) => {
      await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: "CREATED" },
        data: {
          status: "FAILED",
          gatewayPaymentId: response.mihpayid || null,
          failureCode: response.unmappedstatus ?? response.status,
          failureDescription: why,
          payload: body as object,
        },
      });

      // The order itself is marked failed, so the admin panel shows what
      // actually happened rather than an order still "pending" hours later.
      // It stays PENDING as an *order* — its stock is still reserved and the
      // customer can try again — until the sweep releases it or they pay.
      const current = await tx.order.findUnique({
        where: { id: attempt.orderId },
        select: { paymentStatus: true },
      });
      if (current && current.paymentStatus !== "PAID" && current.paymentStatus !== "VERIFYING") {
        await tx.order.update({
          where: { id: attempt.orderId },
          data: { paymentStatus: "FAILED", paymentDetail: `Not completed — ${why}`.slice(0, 190) },
        });
        await tx.orderEvent.create({
          data: {
            orderId: attempt.orderId,
            status: "PENDING",
            title: "Payment did not go through",
            description: `${why}. Nothing was charged. The items are still reserved — you can try paying again.`,
            location: "Online",
          },
        });
      }
    });
    return { kind: "failed", orderId: attempt.orderId, message: why };
  }

  // "pending" and friends: the bank has not decided. Leave the attempt open —
  // the webhook will bring the verdict.
  return { kind: "ignored", reason: `status ${response.status}` };
}

/** True when this call is what moved the order to paid. */
async function markPayuPaid(
  attemptId: string,
  orderId: string,
  response: PayuResponse,
  raw: Record<string, string>,
): Promise<boolean> {
  let moved = false;
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        paymentStatus: true,
        status: true,
        lines: { select: { productId: true, quantity: true } },
      },
    });
    if (!order || order.paymentStatus === "PAID") return;
    moved = true;

    // Money that lands after the order lapsed is still money taken: honour the
    // order and take its stock back off the shelf, rather than strand a
    // payment. The event says so, because that order needs a second look
    // before anyone packs it.
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
        gatewayPaymentId: response.mihpayid,
        method: (response.mode ?? "").toLowerCase() || null,
        payload: raw as object,
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentMethod: payuMethod(response),
        paymentRef: response.mihpayid,
        paymentDetail: describePayu(response),
        cancelledAt: null,
        cancelReason: null,
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId,
        status: "CONFIRMED",
        title: "Payment received",
        description: revived
          ? `${describePayu(response)} · ${response.mihpayid}. Arrived after the order had lapsed; stock was re-reserved — check availability before dispatch.`
          : `${describePayu(response)} · ${response.mihpayid}`,
        location: "Online",
      },
    });
  });

  return moved;
}
