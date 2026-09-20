"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import { OPEN_REFUND_STATES, PAYU_REFUND_TOKEN_MAX, payuConfigured } from "@/lib/payments/payu";
import {
  initiateRefund,
  resolveUnacknowledgedRefund,
  syncRefundStatus,
  syncSettlementForOrder,
} from "@/services/payu-ledger";
import { sendOrderMail } from "@/services/order-mail";
import { formatINR } from "@/lib/utils";
import type { FormState } from "./form-state";
import { revalidateAdmin, str } from "./shared";

/**
 * The admin's three buttons on top of the PayU ledger: give money back, ask
 * PayU what has happened since, and settle a refund PayU never answered for.
 *
 * Deliberately thin. Every rule about how much may be refunded, what counts
 * against the ceiling, and what makes a second click harmless lives in
 * `src/services/payu-ledger.ts` and nowhere else — a second copy of that
 * arithmetic here is how an order ends up refunded twice. What belongs in this
 * file, and only in this file, is the part a browser can reach: checking who is
 * asking, reading the form, writing the audit line, and revalidating the pages
 * the answer changes.
 *
 * `payu-ledger` itself is deliberately not a "use server" module for exactly
 * that reason — an exported `initiateRefund` a browser can post at is a
 * withdrawal form. This is the one door into it, and it opens only for a
 * manager.
 */

/** Everything an order's payment answer can appear on. */
function revalidateOrder(orderId: string) {
  revalidateAdmin("orders");
  revalidatePath(`/order/${orderId}`);
  revalidatePath(`/track/${orderId}`);
  revalidatePath("/account/orders");
}

/** Paise on the row, rupees in the sentence. */
const inr = (paise: number) => formatINR(paise / 100, { decimals: true });

/**
 * Raise a refund against one captured payment.
 *
 * The form sends three things: which payment, how much in rupees, and the
 * token the ledger derived for the state it was drawn in. The same ledger state
 * yields the same token, so a double click, a back-and-resubmit, a reload and a
 * second tab all carry one token and the ledger answers the second submit from
 * the row the first wrote rather than sending a second refund.
 *
 * It is not the last line of defence, and it never was: two admins working from
 * two different ledger states carry two different tokens. What stops them
 * refunding the same money twice is the locked claim inside `initiateRefund`.
 */
export async function refundPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const attemptId = str(formData, "attemptId");
  const token = str(formData, "token");

  // The token is about to be written to a unique column and then handed to
  // PayU, which refuses anything over 23 characters. A rejected token leaves a
  // refund row PayU never heard of, and that row blocks every later refund on
  // the payment until a person clears it — so a malformed one is turned away
  // here, before anything at all is written.
  if (!token || token.length > PAYU_REFUND_TOKEN_MAX || !/^[A-Za-z0-9]+$/.test(token)) {
    return { error: "This refund form is out of date. Reload the order and try again." };
  }

  const typed = str(formData, "amount").replace(/[,₹\s]/g, "");
  const rupees = Number(typed);
  if (!typed || !Number.isFinite(rupees) || rupees <= 0) {
    return { error: "Type the amount to refund, in rupees.", field: "amount" };
  }
  // Rupees on the screen, paise in the database. Rounded rather than truncated,
  // so a figure that lands a hair under a paisa in binary floating point does
  // not quietly become a paisa less than the owner typed.
  const amountPaise = Math.round(rupees * 100);

  const attempt = await db.paymentAttempt.findUnique({
    where: { id: attemptId },
    select: { id: true, orderId: true, gatewayPaymentId: true, order: { select: { number: true } } },
  });
  if (!attempt) return { error: "That payment does not exist." };

  // Every guard — captured or not, inside the ceiling, not already sent, not
  // blocked by an unanswered refund — is inside here. Nothing above repeats it.
  const outcome = await initiateRefund({
    attemptId,
    amountPaise,
    actor: { id: session.id, name: session.name },
    token,
  });

  // Raised, not completed: a Refund row now exists and the email says only
  // that. "refund-completed" is sent elsewhere, when PayU confirms it.
  if (outcome.ok) sendOrderMail(attempt.orderId, "refund-raised");

  revalidateOrder(attempt.orderId);

  if (!outcome.ok) {
    // The same decision arriving twice, or a form whose reference is spent.
    // Nothing was written and nothing was sent, so there is no event here: the
    // sentence goes back to the screen and the log stays quiet.
    if (outcome.audit === "repeat") return { error: outcome.error };

    // A row left QUEUED with no request id is not a refund that failed — it is
    // one nobody has heard back about, and its money may well have moved. It is
    // logged as what it is, because "did not go through" is the one thing
    // nobody may conclude from it. Which of the two this is comes from the
    // ledger, not from the shape of the row out here: a submit refused because
    // a sibling on the same payment was still in flight carries no row at all,
    // and was being audited as "did not go through" for the very decision whose
    // twin did go through.
    const inDoubt = outcome.audit === "in-doubt";

    // Logged even though nothing may have moved. A refund PayU refused, or one
    // it never answered, is exactly the event somebody comes looking for later.
    await logActivity(session, {
      action: inDoubt ? "order.payment.refund.unacknowledged" : "order.payment.refund.failed",
      entity: "Order",
      entityId: attempt.orderId,
      summary: inDoubt
        ? `Refund of ${inr(amountPaise)} on ${attempt.order.number} was sent to PayU and not ` +
          `acknowledged (reference ${outcome.refund?.token}) — it must be checked in PayU and settled ` +
          `from the order before any further refund on this payment`
        : `Refund of ${inr(amountPaise)} on ${attempt.order.number} did not go through: ${outcome.error}`,
      metadata: {
        attemptId,
        amountPaise,
        token,
        mihpayid: attempt.gatewayPaymentId,
        requestId: outcome.refund?.requestId ?? null,
        refundId: outcome.refund?.id ?? null,
      },
    });
    return { error: outcome.error };
  }

  if (outcome.alreadySent) {
    // The same decision arriving a second time. Nothing was sent, so there is
    // nothing new to log.
    return {
      ok: true,
      message: `That refund of ${inr(outcome.refund.amount)} had already been sent to PayU — this did not send another.`,
    };
  }

  await logActivity(session, {
    action: "order.payment.refund",
    entity: "Order",
    entityId: attempt.orderId,
    summary: `Refunded ${inr(outcome.refund.amount)} on ${attempt.order.number} through PayU (reference ${outcome.refund.token})`,
    metadata: {
      attemptId,
      amountPaise: outcome.refund.amount,
      token: outcome.refund.token,
      mihpayid: attempt.gatewayPaymentId,
      requestId: outcome.refund.requestId,
      refundId: outcome.refund.id,
    },
  });

  return {
    ok: true,
    message:
      `PayU has accepted a refund of ${inr(outcome.refund.amount)} on ${attempt.order.number}. ` +
      `It is queued, not paid yet — check again in a day or two.`,
  };
}

/**
 * Ask PayU what it knows about this order now: how its open refunds are getting
 * on, and whether the money has been settled into the bank yet.
 *
 * Both calls sit outside anything transactional and each is allowed to fail on
 * its own, the way the Delhivery call in `cancelOrder` does. A settlement fetch
 * that times out must not throw away the refund answers that already came back,
 * and its message says what to do by hand rather than inviting a retry.
 */
export async function refreshPayuPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");

  const order = await db.order.findUnique({ where: { id }, select: { id: true, number: true } });
  if (!order) return { error: "Order not found." };

  if (!payuConfigured()) {
    return { error: "PayU is not configured on this server, so there is nothing to ask it." };
  }

  const open = await db.refund.findMany({
    where: {
      orderId: id,
      requestId: { not: null },
      // The one definition of "PayU may still change its mind about this".
      status: { in: OPEN_REFUND_STATES },
    },
    orderBy: { initiatedAt: "asc" },
    select: { id: true },
  });

  // Sequential, never in parallel — the same discipline every other loop over
  // PayU calls in this codebase keeps. `syncRefundStatus` swallows its own
  // transport errors and returns null, so one unreachable refund does not stop
  // the others.
  let moved = 0;
  for (const row of open) {
    const result = await syncRefundStatus(row.id);
    if (result?.changed) moved += 1;
  }

  let settled = 0;
  let settlementNote = "";
  try {
    const settlement = await syncSettlementForOrder(id);
    settled = settlement.updated;
    // A row PayU holds for this txnid whose amount disagrees with ours is not
    // "not settled yet", and reading the same "nothing has changed" for both is
    // how the settlement half of this feature could be dead without anybody
    // noticing.
    if (settlement.mismatched > 0) {
      settlementNote =
        `PayU reported ${settlement.mismatched} transaction${settlement.mismatched === 1 ? "" : "s"} ` +
        `for ${order.number} whose amount does not match what this order charged, so nothing was ` +
        `written from ${settlement.mismatched === 1 ? "it" : "them"} — check ${order.number} in the ` +
        `PayU dashboard under Settlements.`;
    }
  } catch (error) {
    const why = error instanceof Error ? error.message : "no answer";
    console.error("[payu] settlement", order.number, why);
    settlementNote =
      `The settlement figures could not be fetched (${why}) — ` +
      `look ${order.number} up in the PayU dashboard under Settlements.`;
  }

  if (moved > 0 || settled > 0) {
    await logActivity(session, {
      action: "order.payment.payu.refresh",
      entity: "Order",
      entityId: id,
      summary:
        `Refreshed ${order.number} from PayU — ${moved} refund${moved === 1 ? "" : "s"} moved on, ` +
        `settlement written for ${settled} payment${settled === 1 ? "" : "s"}`,
      metadata: { refundsChecked: open.length, refundsChanged: moved, attemptsSettled: settled },
    });
  }

  revalidateOrder(id);

  if (moved === 0 && settled === 0) {
    return settlementNote
      ? { error: settlementNote }
      : { ok: true, message: "Asked PayU. Nothing has changed on this order since last time." };
  }

  const parts: string[] = [];
  if (moved > 0) parts.push(`${moved} refund${moved === 1 ? "" : "s"} moved on`);
  if (settled > 0) parts.push(`settlement written for ${settled} payment${settled === 1 ? "" : "s"}`);

  return { ok: true, message: `${parts.join(", ")}.${settlementNote ? ` ${settlementNote}` : ""}` };
}

/**
 * Settle a refund PayU never acknowledged, on the word of someone who went and
 * looked.
 *
 * The block itself stays exactly as it was: a refund we sent and never heard
 * back about stops every later refund on that payment, because its money may
 * have moved and a second one could double the payout. What was missing was the
 * way out. Until this existed, one fifteen-second timeout froze refunds on a
 * payment until somebody ran SQL against the live database.
 *
 * MANAGER-only like the refund itself, confirmed in the browser, and audited
 * either way — this decides whether real money is treated as having left the
 * account, which is the same weight as raising the refund was.
 *
 * Every rule about what may be written is in `resolveUnacknowledgedRefund`.
 * This reads the form, checks who is asking, and writes the line that says who
 * said what.
 */
export async function resolveRefund(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const refundId = str(formData, "refundId");
  const verdict = str(formData, "verdict");
  const requestId = str(formData, "requestId");

  if (verdict !== "sent" && verdict !== "not-sent") {
    return { error: "Say what PayU showed — either it has the refund, or it has no record of it." };
  }

  const refund = await db.refund.findUnique({
    where: { id: refundId },
    select: {
      id: true,
      token: true,
      amount: true,
      orderId: true,
      order: { select: { number: true } },
    },
  });
  if (!refund) return { error: "That refund does not exist." };

  const outcome = await resolveUnacknowledgedRefund({
    refundId: refund.id,
    resolution: verdict === "sent" ? { kind: "sent", requestId } : { kind: "not-sent" },
    actor: { id: session.id, name: session.name },
  });

  revalidateOrder(refund.orderId);

  if (!outcome.ok) {
    return { error: outcome.error, field: verdict === "sent" ? "requestId" : undefined };
  }

  await logActivity(session, {
    action: "order.payment.refund.resolved",
    entity: "Order",
    entityId: refund.orderId,
    summary:
      verdict === "sent"
        ? `Unacknowledged refund ${refund.token} of ${inr(refund.amount)} on ${refund.order.number} ` +
          `was found in PayU under request ${requestId} — the money is on its way and the amount ` +
          `stays committed`
        : `Unacknowledged refund ${refund.token} of ${inr(refund.amount)} on ${refund.order.number} ` +
          `was not in PayU — marked failed, no money moved, and the amount is refundable again`,
    metadata: {
      refundId: refund.id,
      token: refund.token,
      amountPaise: refund.amount,
      verdict,
      requestId: verdict === "sent" ? requestId : null,
    },
  });

  return { ok: true, message: outcome.message };
}
