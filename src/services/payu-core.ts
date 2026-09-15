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
  verifyPayuTransaction,
  type PayuResponse,
} from "@/lib/payments/payu";

/**
 * The PayU half of the payment lifecycle, kept server-only.
 *
 * Deliberately not a "use server" module. Every export of one of those is an
 * endpoint a browser can call, and applying a verdict marks an order paid —
 * exposed as an action, that is a free order for anyone who can post an object
 * at it. Only the return route (after verifying PayU's hash), the webhook
 * (likewise) and the reconciler (which asked PayU itself) reach in here.
 *
 * Three things can tell us a payment landed, and all three end in `applyVerdict`
 * so they cannot disagree: the customer's browser being posted back, PayU's
 * webhook, and us asking PayU directly. The first two prove themselves with a
 * hash; the third is a call we made, so its answer is ours by definition.
 */

/** Enough retries for a customer whose bank keeps saying no; not enough to abuse. */
const MAX_ATTEMPTS_PER_ORDER = 8;

/**
 * How long to leave an attempt alone before asking PayU about it.
 *
 * Long enough that a customer still on the bank's page is not chased, short
 * enough that a payment whose browser never came back is found while they are
 * still wondering. It also throttles: an attempt is asked about at most once
 * per window, however many times a page is loaded.
 */
const RECONCILE_AFTER_MINUTES = 3;

export interface PayuSession {
  endpoint: string;
  fields: Record<string, string>;
}

export type PayuStart = { ok: true; session: PayuSession } | { ok: false; error: string };

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

/* ------------------------------ Verdicts ----------------------------- */

export type PayuOutcome =
  | { kind: "paid"; orderId: string }
  | { kind: "failed"; orderId: string; message: string }
  | { kind: "ignored"; reason: string };

interface Verdict {
  txnid: string;
  status: string;
  mihpayid: string;
  /** Rupees, as PayU writes them. */
  amount: string;
  mode: string;
  bankcode: string;
  errorMessage: string;
  raw: object;
}

/**
 * Apply what PayU says happened.
 *
 * Idempotent, because it is reached from places that race each other. Whichever
 * arrives first wins and the rest find the work already done.
 *
 * Nothing is believed about the amount: the transaction is matched to the
 * attempt we created, and the rupees PayU reports must be the paise we asked
 * for. A verified answer carrying a different amount would mean the salt had
 * leaked, and that is not a sale either.
 */
async function applyVerdict(verdict: Verdict): Promise<PayuOutcome> {
  const attempt = await db.paymentAttempt.findUnique({
    where: { gatewayOrderId: verdict.txnid },
    select: { id: true, orderId: true, amount: true, status: true },
  });
  if (!attempt) return { kind: "ignored", reason: "no such transaction" };

  if (payuSucceeded(verdict.status)) {
    if (payuAmount(attempt.amount / 100) !== payuAmount(Number(verdict.amount))) {
      await db.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "FAILED",
          failureCode: "amount_mismatch",
          failureDescription: `PayU ${verdict.amount} vs order ${attempt.amount / 100}`,
          payload: verdict.raw,
        },
      });
      console.error("[payu] amount mismatch", { txnid: verdict.txnid });
      return {
        kind: "failed",
        orderId: attempt.orderId,
        message: "The amount did not match this order. Nothing has been charged.",
      };
    }

    const newlyPaid = await markPaid(attempt.id, attempt.orderId, verdict);
    // Only on the transition, so a redelivered webhook does not send a second
    // receipt for the same payment.
    if (newlyPaid) void sendOrderConfirmation(attempt.orderId);
    return { kind: "paid", orderId: attempt.orderId };
  }

  if (payuFailed(verdict.status)) {
    const why = verdict.errorMessage.trim() || "Payment not completed";

    await db.$transaction(async (tx) => {
      await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: "CREATED" },
        data: {
          status: "FAILED",
          gatewayPaymentId: verdict.mihpayid || null,
          failureCode: verdict.status,
          failureDescription: why,
          payload: verdict.raw,
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

  // "pending" and friends: the bank has not decided. Touch the attempt so the
  // reconciler waits another window before asking again, and leave it open.
  await db.paymentAttempt.updateMany({
    where: { id: attempt.id, status: "CREATED" },
    data: { payload: verdict.raw },
  });
  return { kind: "ignored", reason: `status ${verdict.status}` };
}

/** True when this call is what moved the order to paid. */
async function markPaid(attemptId: string, orderId: string, verdict: Verdict): Promise<boolean> {
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
    if (!order) return;

    /**
     * A second payment on an order that is already paid.
     *
     * It happens for real: a UPI collect request times out in the browser, the
     * shopper backs up and pays again, and then both collect requests are
     * approved. Two authentic, hash-verified, amount-matching verdicts arrive
     * for one order.
     *
     * This used to `return` here — before the attempt row was updated — so the
     * second payment was silently dropped. The money was taken by PayU and
     * this system held no record of it at all: nothing to reconcile against,
     * nobody told, no refund raised. That is the worst class of payment bug,
     * because it is invisible.
     *
     * Now the attempt is claimed instead. `updateMany` scoped to status
     * CREATED is what separates the two cases: a genuinely new attempt is
     * still CREATED and gets claimed, while PayU redelivering the webhook for
     * the attempt that already won finds it CAPTURED, claims nothing, and
     * stays the no-op it should be. The order itself is left exactly as it is
     * — it is paid, and this does not pay it twice.
     */
    if (order.paymentStatus === "PAID") {
      const claimed = await tx.paymentAttempt.updateMany({
        where: { id: attemptId, status: "CREATED" },
        data: {
          status: "CAPTURED",
          gatewayPaymentId: verdict.mihpayid || null,
          method: verdict.mode.toLowerCase() || null,
          payload: verdict.raw,
          failureDescription: "Duplicate payment on an already-paid order — refund due",
        },
      });

      if (claimed.count > 0) {
        console.error("[payu] DUPLICATE PAYMENT on an already-paid order — refund due", {
          orderId,
          txnid: verdict.txnid,
          mihpayid: verdict.mihpayid,
        });
        await tx.orderEvent.create({
          data: {
            orderId,
            status: "CONFIRMED",
            title: "Duplicate payment received — refund due",
            description:
              `${describePayu(verdict)} · ${verdict.mihpayid}. A second payment landed on an order ` +
              `that was already paid. Refund this transaction from the PayU dashboard.`,
            location: "Online",
          },
        });
      }
      return;
    }

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
        gatewayPaymentId: verdict.mihpayid || null,
        method: verdict.mode.toLowerCase() || null,
        payload: verdict.raw,
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentMethod: payuMethod(verdict),
        paymentRef: verdict.mihpayid,
        paymentDetail: describePayu(verdict),
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
          ? `${describePayu(verdict)} · ${verdict.mihpayid}. Arrived after the order had lapsed; stock was re-reserved — check availability before dispatch.`
          : `${describePayu(verdict)} · ${verdict.mihpayid}`,
        location: "Online",
      },
    });
  });

  return moved;
}

/* ------------------- What PayU posted back to us --------------------- */

/**
 * The browser return and the webhook, both of which carry a hash we can check
 * against the salt. Anything that does not verify changes nothing.
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

  const r = body as unknown as PayuResponse;
  return applyVerdict({
    txnid: r.txnid,
    status: r.status,
    mihpayid: r.mihpayid ?? "",
    amount: r.amount ?? "",
    mode: r.mode ?? "",
    bankcode: r.bankcode ?? "",
    errorMessage: r.error_Message ?? r.field9 ?? "",
    raw: body,
  });
}

/* ----------------------- What we ask PayU about ---------------------- */

/**
 * Catch up on payments nobody told us about.
 *
 * A customer whose phone died on the bank's page, a redirect a captive wifi
 * portal swallowed, a webhook that was never delivered — in each of those the
 * money moved and only PayU knows. Rather than leave the order pending until
 * somebody complains, we ask.
 *
 * Safe to call while rendering a page: it never throws, it only looks at
 * attempts old enough to have settled, and it will not ask about the same one
 * twice inside a window.
 */
export async function reconcilePayuOrder(orderId: string): Promise<boolean> {
  const config = payuConfig();
  if (!config) return false;

  const cutoff = new Date(Date.now() - RECONCILE_AFTER_MINUTES * 60_000);
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      paymentStatus: true,
      payments: {
        where: { status: "CREATED", createdAt: { lt: cutoff }, updatedAt: { lt: cutoff } },
        select: { gatewayOrderId: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });
  if (!order || order.paymentStatus === "PAID" || order.payments.length === 0) return false;

  let changed = false;
  for (const attempt of order.payments) {
    try {
      const seen = await verifyPayuTransaction(config, attempt.gatewayOrderId);
      if (!seen) continue; // PayU never saw it: nobody paid.
      const outcome = await applyVerdict({
        txnid: attempt.gatewayOrderId,
        status: seen.status,
        mihpayid: seen.mihpayid,
        amount: seen.amount,
        mode: seen.mode,
        bankcode: seen.bankRef,
        errorMessage: seen.errorMessage,
        raw: seen as unknown as object,
      });
      if (outcome.kind === "paid") return true;
      if (outcome.kind === "failed") changed = true;
    } catch (error) {
      // PayU unreachable, or answering something unexpected. The order is
      // exactly as it was; the next page load tries again.
      console.error(
        "[payu] verify",
        attempt.gatewayOrderId,
        error instanceof Error ? error.message : error,
      );
      return changed;
    }
  }
  return changed;
}

/**
 * The same, across every order still waiting on one. Called lazily from the
 * admin orders screen, so it needs no scheduler and costs nothing on a quiet
 * shop.
 */
export async function reconcileStalePayuOrders(limit = 10): Promise<number> {
  const config = payuConfig();
  if (!config) return 0;

  const cutoff = new Date(Date.now() - RECONCILE_AFTER_MINUTES * 60_000);
  const waiting = await db.order.findMany({
    where: {
      paymentStatus: { in: ["PENDING", "FAILED"] },
      payments: { some: { status: "CREATED", createdAt: { lt: cutoff }, updatedAt: { lt: cutoff } } },
    },
    select: { id: true },
    orderBy: { placedAt: "desc" },
    take: limit,
  });

  let changed = 0;
  for (const order of waiting) {
    if (await reconcilePayuOrder(order.id)) changed++;
  }
  return changed;
}
