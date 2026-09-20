import "server-only";

import { db } from "@/lib/db";
import { sendOrderMail } from "./order-mail";
import {
  checkPayuActionStatus,
  fetchPayuTransactionDetails,
  newRefundToken,
  payuAmount,
  payuConfig,
  payuRowIsRefund,
  payuSettlementRowKey,
  refundIsOpen,
  refundPayuTransaction,
  refundStateFromPayu,
  refundTokenFor,
  type PayuSettlementRow,
  type RefundState,
} from "@/lib/payments/payu";
import type { Prisma, Refund } from "@/generated/prisma/client";

/**
 * The money after the sale: refunds out, and the settlement coming back in.
 *
 * Deliberately not a "use server" module, for the same reason `payu-core.ts`
 * is not one. Every export of a "use server" file is an endpoint a browser can
 * post at, and `initiateRefund` moves real money out of the account — exposed
 * that way it is a withdrawal form for anyone who can guess an id. The thin
 * `"use server"` wrapper that does `requireAdmin`, the confirmation and the
 * activity log belongs in `src/services/admin/`, and it calls in here.
 *
 * Three rules hold everything below together.
 *
 *   The row is written before PayU is called. A refund that went out and was
 *   then lost to a timeout is the one failure that costs the shop twice, so
 *   the record of having asked has to survive the asking.
 *
 *   The ceiling is the captured attempt, never the order. `markPaid` in
 *   payu-core can leave one order with two captured attempts — a duplicate
 *   payment — and only one of them is being given back. `Order.total` is the
 *   wrong number and `Order.paymentStatus` is a flag three other code paths
 *   already write.
 *
 *   Paise in, paise out. Everything on `PaymentAttempt` and `Refund` is paise;
 *   PayU is told rupees with two decimals, and that conversion happens in
 *   exactly one place, on the way out.
 */

/* ------------------------------ Units --------------------------------- */

/** Paise to the rupee figure PayU wants. The only place this conversion lives. */
const paiseToRupees = (paise: number) => paise / 100;

/**
 * A rupee string from PayU to paise.
 *
 * PayU reports fees as rupees with two decimals, which paise hold exactly.
 * Where a rate works out finer than a paisa PayU has already rounded before
 * sending; rounding again here can move a figure by at most half a paisa, and
 * the bank statement is the authority if the two ever disagree. Anything
 * unparseable — an empty string, a dash, "NA" — reads as "PayU did not say",
 * which is null, not zero.
 */
function rupeesToPaise(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** A date from PayU, or null if it sent something that is not one. */
function parsePayuDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "na") return null;
  const parsed = new Date(trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "YYYY-MM-DD", which is the only date format these commands accept. */
export const payuDay = (date: Date) => date.toISOString().slice(0, 10);

/* --------------------------- What is refundable ----------------------- */

/**
 * A refund that went to PayU and was never answered for.
 *
 * Its money may or may not have moved, so it holds the whole payment shut
 * until a person has looked it up in PayU's dashboard and said which. It is
 * carried on `RefundableAttempt` — rather than left for the screen to go and
 * find — because the sentence that blocks the refund and the control that
 * clears the block have to be able to sit next to each other.
 */
export interface UnacknowledgedRefund {
  refundId: string;
  /** Our reference, and what to search PayU's dashboard under Refunds for. */
  token: string;
  amountPaise: number;
  /** When it was raised. The row is written before PayU is called, so this is
   *  also the moment the fifteen-second clock on PayU's answer started. */
  initiatedAt: Date;
  /** "four seconds ago" — computed here so the screen and the guard that
   *  decides whether to offer the remedy are reading one clock. */
  raisedAgo: string;
}

/**
 * How long a refund may go unanswered before a person is offered the remedy.
 *
 * `refundPayuTransaction` allows PayU fifteen seconds, and this module's first
 * rule puts the row in the database BEFORE the call — so between the commit and
 * the answer every reader sees exactly the shape a stranded refund leaves
 * behind. The admin order page re-reads every twelve seconds, which means a
 * second manager reliably saw the block, and the resolve control under it,
 * while the first manager's call was still open. That was the second road to a
 * double payout: he searches PayU for the reference, PayU has not indexed it
 * yet, he honestly records "no such refund", the amount goes back into the
 * ceiling and a second refund goes out against the same capture.
 *
 * So nothing about the BLOCK changes — it goes on the instant the row exists,
 * as it always did. Only the remedy waits. Two minutes is PayU's fifteen
 * seconds with room for its own dashboard to catch up.
 */
export const REFUND_STRAND_AFTER_MS = 120_000;

/** How long ago, in the words a sentence wants. */
export function describeRefundAge(from: Date, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - from.getTime()) / 1000));
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export interface RefundableAttempt {
  attemptId: string;
  orderId: string;
  orderNumber: string;
  /** PayU's payment id. Without one there is nothing to refund against. */
  mihpayid: string | null;
  /** Paise actually captured. */
  capturedPaise: number;
  /** Paise already given back, or on their way back. */
  committedPaise: number;
  /** Paise that may still be refunded. Never negative. */
  refundablePaise: number;
  /** Why this attempt cannot be refunded at all, if it cannot. */
  blocked: string | null;
  /**
   * The refunds nobody has established the fate of, and which PayU cannot
   * still be answering. Usually empty.
   *
   * Not every refund behind `blocked` appears here: one raised moments ago
   * blocks just as hard, but offering the remedy on it is what made the remedy
   * a second road to a double refund. See `REFUND_STRAND_AFTER_MS`.
   */
  unacknowledged: UnacknowledgedRefund[];
  /**
   * The idempotency token the next refund on this payment should carry.
   *
   * Derived from the ledger rather than minted per render, so that every
   * render of an unchanged ledger hands the form the same one — which is what
   * makes a reload and a second tab one refund rather than two. See
   * `refundTokenFor`.
   */
  nextToken: string;
}

/**
 * Everything the ceiling is computed from.
 *
 * One select, used by the read that draws the screen and by the re-read
 * `initiateRefund` does inside its transaction, so the two can never drift
 * into disagreeing about what counts.
 */
const CEILING_SELECT = {
  id: true,
  orderId: true,
  amount: true,
  status: true,
  gatewayPaymentId: true,
  order: { select: { number: true } },
  refunds: {
    select: {
      id: true,
      token: true,
      amount: true,
      status: true,
      requestId: true,
      initiatedAt: true,
    },
  },
} satisfies Prisma.PaymentAttemptSelect;

type CeilingRow = Prisma.PaymentAttemptGetPayload<{ select: typeof CEILING_SELECT }>;

/**
 * The arithmetic, over rows somebody else has already read.
 *
 * Split out from the query for one reason: `initiateRefund` has to run exactly
 * this sum a second time, against the row it has locked, and a second copy of
 * the rules living there is how the check that draws the screen and the check
 * that moves the money end up disagreeing.
 */
function ceilingFor(attempt: CeilingRow, now: number = Date.now()): RefundableAttempt {
  const committedPaise = attempt.refunds
    .filter((r) => r.status !== "FAILURE")
    .reduce((sum, r) => sum + r.amount, 0);

  // Refunds PayU has not answered for. Their money may or may not have moved,
  // and until that is established nothing more goes out against this payment.
  const inFlight = attempt.refunds.filter((r) => r.status === "QUEUED" && !r.requestId);

  // Of those, only the ones PayU cannot still be answering are handed to the
  // person who has to say which. A refund raised four seconds ago looks exactly
  // like one stranded since last Tuesday, and telling them apart is the only
  // judgement the whole remedy rests on — see REFUND_STRAND_AFTER_MS.
  const unacknowledged = inFlight
    .filter((r) => now - r.initiatedAt.getTime() > REFUND_STRAND_AFTER_MS)
    .map((r) => ({
      refundId: r.id,
      token: r.token,
      amountPaise: r.amount,
      initiatedAt: r.initiatedAt,
      raisedAgo: describeRefundAge(r.initiatedAt, now),
    }));

  // The youngest thing still in flight, when none of them is old enough to be
  // called stranded. It blocks just as hard; it is only described differently.
  const waiting =
    unacknowledged.length === 0 && inFlight.length > 0
      ? inFlight.reduce((a, b) => (a.initiatedAt >= b.initiatedAt ? a : b))
      : null;

  // REFUNDED is tested first, ahead of "never captured", because
  // `recomputeRefundTotals` moves a fully refunded attempt off CAPTURED.
  // Asking "is it CAPTURED" first told the owner that a payment he had just
  // given back in full had never been taken — on the screen showing the
  // capture and the refund side by side.
  const blocked =
    attempt.status === "REFUNDED"
      ? "All of this payment has already been given back, so there is nothing left to refund."
      : attempt.status !== "CAPTURED"
        ? "This payment was never captured, so there is nothing to refund."
        : !attempt.gatewayPaymentId
          ? "PayU never gave this payment an id, so it cannot be refunded through the API."
          : waiting
            ? `A refund of ${formatPaiseForMessage(waiting.amount)} was raised ` +
              `${describeRefundAge(waiting.initiatedAt, now)} and PayU has not answered it yet. ` +
              `Nothing more goes out on this payment until it has — reload the order in a minute.`
            : unacknowledged.length > 0
              ? "A refund on this payment was sent to PayU and never acknowledged. Check it in PayU before sending another."
              : null;

  return {
    attemptId: attempt.id,
    orderId: attempt.orderId,
    orderNumber: attempt.order.number,
    mihpayid: attempt.gatewayPaymentId,
    capturedPaise: attempt.amount,
    committedPaise,
    refundablePaise: Math.max(0, attempt.amount - committedPaise),
    blocked,
    unacknowledged,
    // The state of the ledger, in the only three numbers that can change what
    // the next refund is allowed to be: which payment, what is committed
    // against it, and how many rows it already carries. A refund that commits
    // moves the second; one PayU refuses moves the third, which is what lets
    // it be raised again.
    nextToken: refundTokenFor(
      attempt.order.number,
      `${attempt.id}:${committedPaise}:${attempt.refunds.length}`,
    ),
  };
}

/**
 * How much of one payment may still be given back.
 *
 * Exported because the admin screen has to show this number and the refund
 * form has to cap its input by it, and a second implementation of this sum
 * somewhere in the UI is how an order ends up refunded twice. There is one
 * copy of the arithmetic and this is it.
 *
 * A refund that PayU has not yet refused still counts against the ceiling. Only
 * an outright FAILURE frees its amount up again, because only then is it
 * certain no money moved.
 *
 * This is the READ, and it takes no lock. It is not what stands between two
 * admins and a double payout — `initiateRefund` re-runs it under one. Use it
 * to draw a screen, never to decide that a refund is safe to send.
 */
export async function refundableForAttempt(attemptId: string): Promise<RefundableAttempt | null> {
  const attempt = await db.paymentAttempt.findUnique({
    where: { id: attemptId },
    select: CEILING_SELECT,
  });
  if (!attempt) return null;
  return ceilingFor(attempt);
}

/* ------------------------------ Refunding ----------------------------- */

/**
 * What the activity log should call a refusal.
 *
 * The ledger knows which of the three this is; out in the action it could only
 * be guessed at from the shape of the row, and it guessed wrong — a submit
 * refused because a sibling on the same payment was still in flight was audited
 * as "did not go through", the one conclusion nobody may draw from a refund
 * whose fate is unknown.
 *
 *   refused   a guard said no. Nothing was written and nothing was sent.
 *   in-doubt  a row exists and nobody knows what became of it. Never "failed".
 *   repeat    the same decision arriving twice, or a stale form. Nothing
 *             happened, so there is nothing to record.
 */
export type RefundRefusal = "refused" | "in-doubt" | "repeat";

export type RefundOutcome =
  | { ok: true; refund: Refund; alreadySent: boolean }
  | { ok: false; error: string; refund: Refund | null; audit: RefundRefusal };

export interface InitiateRefundInput {
  /** The CAPTURED attempt being refunded — not the order. */
  attemptId: string;
  /** Paise. Must be positive and within what is left of the capture. */
  amountPaise: number;
  /** Who is doing this. The name is stored even if the account is later gone. */
  actor: { id: string | null; name: string };
  /**
   * The idempotency handle, and PayU's `var2`.
   *
   * Pass the same token twice and the second call sends nothing — it finds the
   * first refund and returns it. Pass `refundableForAttempt`'s `nextToken` and
   * every render of an unchanged ledger carries the same one, which is what
   * makes a double click, a back-and-resubmit and a second tab one refund.
   * Omitted, a fresh token is made, and then two calls are two decisions —
   * which is what the claim below is there to serialise.
   */
  token?: string;
}

/**
 * A refusal carried out of the claim transaction.
 *
 * Modelled on the `soldOut` throw in `placeOrder`: the transaction has to roll
 * back, and the sentence the owner reads has to come back out with it. Nothing
 * has been written when one of these is thrown, so the rollback costs nothing.
 */
const refused = (message: string) => Object.assign(new Error(message), { refusedRefund: true });
const isRefusal = (error: unknown): error is Error =>
  (error as { refusedRefund?: boolean } | null)?.refusedRefund === true;

/**
 * The same token, already on the ledger we have just locked.
 *
 * Carried out of the transaction the same way a refusal is, because it is not
 * one: a repeat of a decision already taken must be answered from the row that
 * took it, not from the generic block that row raises.
 */
const repeatOf = (refundId: string) =>
  Object.assign(new Error("repeat submit"), { repeatRefundId: refundId });

/**
 * Refund a payment, and be the only thing that ever does.
 *
 * Nothing else in the codebase may create a Refund row or call
 * `refundPayuTransaction`. Every guard that stops the shop paying out money it
 * did not take is in this one function, so a second path around it is a second
 * set of guards that will not agree with these.
 *
 * What it will not do: refund an attempt that was never captured, refund more
 * than was captured, refund what has already been refunded, refund a
 * non-positive amount, or send anything at all while an earlier refund on the
 * same payment is in a state nobody has established.
 *
 * A true return means PayU accepted the request and queued it. It does not mean
 * the customer has the money — `syncRefundStatus` finds that out, days later,
 * and only then does the order say REFUNDED.
 */
export async function initiateRefund(input: InitiateRefundInput): Promise<RefundOutcome> {
  const config = payuConfig();
  if (!config) {
    return {
      ok: false,
      error: "PayU is not configured on this server.",
      refund: null,
      audit: "refused",
    };
  }

  // Before the token lookup, because that lookup now compares the amount and a
  // sentence quoting a nonsensical figure helps nobody.
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
    return {
      ok: false,
      error: "A refund has to be a whole number of paise, above zero.",
      refund: null,
      audit: "refused",
    };
  }

  // A token we have seen before is a repeat of a decision already taken, not a
  // new one — provided it is a repeat of the SAME decision, which is what
  // `answerForExistingToken` checks first. Outside the transaction on purpose:
  // the common repeat submit should not queue behind a row lock to be told that
  // nothing happened.
  if (input.token) {
    const existing = await db.refund.findUnique({ where: { token: input.token } });
    if (existing) return answerForExistingToken(existing, input.amountPaise);
  }

  /**
   * THE CLAIM — the ceiling is read and the row that spends it is written in
   * one transaction, with the payment itself locked.
   *
   * This is the lesson `placeOrder` learned about stock, applied on the one
   * path where the thing being spent is money leaving the account. There, two
   * shoppers buying the last unit both passed the check and both subtracted.
   * Here, two admins refunding the same 999 rupees both read committed 0, both
   * passed the ceiling, and PayU queued two refunds against one capture. The
   * token does not help: two tabs, two admins or two renders each carry a
   * different one, so the unique index has nothing to collide on.
   *
   * `SELECT ... FOR UPDATE` on the PaymentAttempt row is what serialises them.
   * Postgres holds the second racer at that statement until the first
   * transaction commits, and only then does it re-read the refunds, re-sum what
   * is committed and re-test the ceiling — against a ledger that has stopped
   * moving. Of N racing refunds exactly one can claim the last rupee; the rest
   * read the row the winner wrote and are refused in words.
   *
   * What is deliberately NOT in here: the call to PayU. An interactive
   * transaction holds a database connection for its whole body and PayU is
   * allowed fifteen seconds to answer, so a pool of five would be gone in five
   * concurrent refunds. The row is committed first — which is this module's
   * first rule anyway, the record of having asked must survive the asking — and
   * PayU is called after, with the claim already made.
   */
  let claim: { refund: Refund; mihpayid: string };
  try {
    claim = await db.$transaction(async (tx) => {
      // The lock, and nothing else, before anything is read: there is no window
      // between reading and locking to lose a racer in.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "PaymentAttempt" WHERE "id" = ${input.attemptId} FOR UPDATE
      `;
      if (locked.length === 0) throw refused("That payment does not exist.");

      const attempt = await tx.paymentAttempt.findUnique({
        where: { id: input.attemptId },
        select: CEILING_SELECT,
      });
      if (!attempt) throw refused("That payment does not exist.");

      // A repeat of a decision already taken, found on the locked ledger.
      //
      // Two genuinely concurrent submits carrying one token both miss the
      // lookup above — there is no row yet when either of them reads — and the
      // loser arrives here after the winner has committed. Tested BEFORE the
      // block, because the winner's row is QUEUED with no request id at this
      // instant, so `blocked` is set and the loser was refused with a sentence
      // about an unanswered refund on this payment — true of its own sibling,
      // useless to the person who pressed the button twice, and audited as
      // "did not go through" for the very decision that did. A repeat of a
      // decision is not a stranded refund. The unique index below still stands
      // behind this; it was simply never reached.
      const repeat = input.token ? attempt.refunds.find((r) => r.token === input.token) : undefined;
      if (repeat) throw repeatOf(repeat.id);

      // Every guard, re-run against the locked row. Moving the check without
      // moving the create would change nothing at all.
      const state = ceilingFor(attempt);
      if (state.blocked) throw refused(state.blocked);
      if (input.amountPaise > state.refundablePaise) {
        throw refused(
          `Only ${formatPaiseForMessage(state.refundablePaise)} of this payment can still be refunded — ` +
            `${formatPaiseForMessage(state.capturedPaise)} was taken and ` +
            `${formatPaiseForMessage(state.committedPaise)} has already gone back.`,
        );
      }
      if (!state.mihpayid) throw refused("PayU never gave this payment an id.");

      // Written inside the lock, on purpose. From here on there is a record of
      // the intent whatever happens to the process, the network or PayU, and
      // the next racer to take this lock reads it.
      const refund = await tx.refund.create({
        data: {
          paymentAttemptId: state.attemptId,
          orderId: state.orderId,
          token: input.token ?? newRefundToken(state.orderNumber),
          amount: input.amountPaise,
          status: "QUEUED",
          initiatedById: input.actor.id,
          initiatedByName: input.actor.name,
        },
      });

      return { refund, mihpayid: state.mihpayid };
    });
  } catch (error) {
    // A guard said no. The transaction rolled back over nothing.
    if (isRefusal(error)) {
      return { ok: false, error: error.message, refund: null, audit: "refused" };
    }

    // Two requests carrying the same token. Either the locked re-read saw the
    // winner's row, or the unique index picked a winner and this is the loser —
    // two ways of learning the same thing. Both read that row and report what
    // it says, rather than sending a second refund.
    const repeatId = (error as { repeatRefundId?: string }).repeatRefundId;
    if (repeatId || ((error as { code?: string }).code === "P2002" && input.token)) {
      const existing = repeatId
        ? await db.refund.findUnique({ where: { id: repeatId } })
        : await db.refund.findUnique({ where: { token: input.token as string } });
      if (existing) return answerForExistingToken(existing, input.amountPaise);
    }

    // The lock was held longer than a transaction is allowed to live, or the
    // pool had nothing to give. Nothing was written and nothing was sent, so
    // this is a sentence rather than a crashed screen.
    const code = (error as { code?: string }).code;
    if (code === "P2024" || code === "P2028") {
      console.error("[payu] refund claim", input.attemptId, code);
      return {
        ok: false,
        refund: null,
        audit: "refused",
        error:
          "Another refund on this payment is being raised right now. Reload the order in a moment " +
          "and check the Refunds card before trying again.",
      };
    }

    throw error;
  }

  const refund = claim.refund;

  let ack;
  try {
    ack = await refundPayuTransaction(config, {
      mihpayid: claim.mihpayid,
      token: refund.token,
      amountRupees: paiseToRupees(refund.amount),
    });
  } catch (error) {
    // PayU timed out, or answered something that was not JSON. This is the
    // dangerous case: the request may well have landed. The row stays QUEUED
    // with no request id — which `ceilingFor` reads as "a human must look at
    // this" and which blocks any further refund on this payment — and the
    // message says what to do rather than inviting a retry. Once the owner has
    // looked, `resolveUnacknowledgedRefund` is how the block comes off.
    const why = error instanceof Error ? error.message : "no answer";
    console.error("[payu] refund", refund.token, why);
    // Conditional, like every write that lands after the call — see
    // `stillUnanswered`. A manager who settled this row while the call was open
    // has made an audited decision, and this must not quietly write over it.
    const written = await writeAfterCall(refund, {
      failureReason: `PayU did not answer — ${why}`.slice(0, 500),
      lastCheckedAt: new Date(),
    });
    if (written.resolvedElsewhere) {
      return resolvedUnderneath(
        await noteAgainstResolvedRefund(written.refund, `PayU never answered this request — ${why}.`),
        `it never answered (${why}), so whether the money moved is still unknown`,
      );
    }
    return {
      ok: false,
      refund: written.refund,
      audit: "in-doubt",
      error:
        `PayU did not answer, so this refund may or may not have gone through (${why}). ` +
        `Look up reference ${refund.token} in the PayU dashboard under Refunds — no further refund ` +
        `on this payment will go out until you say what you found there.`,
    };
  }

  if (!ack.ok) {
    const why = ack.message || `PayU refused the refund (error ${ack.errorCode || "unknown"}).`;
    const written = await recordAck(refund, {
      status: "FAILURE",
      requestId: ack.requestId || null,
      payload: ack.raw,
      failureReason: why,
    });
    if (written.resolvedElsewhere) {
      return resolvedUnderneath(
        await noteAgainstResolvedRefund(written.refund, `PayU then refused this refund: ${why}`),
        `it refused the refund — ${why}`,
      );
    }
    if (!written.persisted) {
      return {
        ok: false,
        refund: written.refund,
        audit: "in-doubt",
        error:
          `${why} That refusal could not be written down, so the row still reads as unanswered and ` +
          `this payment stays shut behind reference ${refund.token} until somebody records what PayU ` +
          `shows against it.`,
      };
    }
    return { ok: false, refund: written.refund, audit: "refused", error: `${why} ${RAISE_AGAIN}` };
  }

  /**
   * PayU accepted it and gave us nothing to ask about it with.
   *
   * `check_action_status` knows only the request id, so a row like this can
   * never be followed up — and it is exactly the shape `ceilingFor` reads as
   * unacknowledged, so the payment is shut behind it anyway. Calling that a
   * success left the owner reading "PayU has accepted a refund" under a payment
   * that had silently frozen. It is the transport failure in all but name, and
   * it is answered the same way.
   */
  if (!ack.requestId) {
    const written = await recordAck(refund, {
      status: "QUEUED",
      requestId: null,
      payload: ack.raw,
      failureReason:
        `PayU accepted this refund (error code ${ack.errorCode || "none"}) but returned no request id, ` +
        `so its progress cannot be checked.`,
    });
    if (written.resolvedElsewhere) {
      return resolvedUnderneath(
        await noteAgainstResolvedRefund(
          written.refund,
          "PayU then accepted this refund, but gave no reference for it.",
        ),
        "it ACCEPTED the refund but gave no reference for it, so the money may well be on its way",
      );
    }
    return {
      ok: false,
      refund: written.refund,
      audit: "in-doubt",
      error:
        `PayU accepted this refund of ${formatPaiseForMessage(refund.amount)} but gave no reference for ` +
        `it, so there is no way to ask what became of it. Look up reference ${refund.token} in the PayU ` +
        `dashboard under Refunds — no further refund on this payment will go out until you say what you ` +
        `found there.`,
    };
  }

  const written = await recordAck(refund, {
    status: "QUEUED",
    requestId: ack.requestId,
    payload: ack.raw,
    failureReason: null,
  });

  // PayU has the money in hand and somebody settled the row while it was being
  // asked. Their verdict stands and this is a refusal, because the one thing
  // that must not happen here is a green tick over a row a manager has just
  // marked as never sent — that is the ceiling freed on money that did move.
  if (written.resolvedElsewhere) {
    return resolvedUnderneath(
      await noteAgainstResolvedRefund(
        written.refund,
        `PayU then ACCEPTED this refund under reference ${ack.requestId} — money PayU believes it is ` +
          `paying out.`,
      ),
      `it ACCEPTED the refund under reference ${ack.requestId}, so the money is on its way`,
    );
  }

  // The money moved and the bookkeeping did not. Saying "accepted and queued"
  // here left the owner reading a success over a row shaped exactly as
  // `ceilingFor` reads unacknowledged — the screen and the ledger contradicting
  // each other on the one page where money leaves the account.
  if (!written.persisted) {
    return {
      ok: false,
      refund: written.refund,
      audit: "in-doubt",
      error:
        `PayU accepted this refund of ${formatPaiseForMessage(refund.amount)} under reference ` +
        `${ack.requestId}, but it could not be written down. Record it against reference ` +
        `${refund.token} in the PayU dashboard before raising another — no further refund on this ` +
        `payment will go out until you say what you found there.`,
    };
  }

  // Accepted, written, but PayU's reference collided with one already on
  // another row and had to be dropped into the reason instead. The row reads as
  // unacknowledged and the payment is shut behind it, so the sentence has to say
  // so rather than call it queued.
  if (!written.requestIdStored) {
    return {
      ok: false,
      refund: written.refund,
      audit: "in-doubt",
      error:
        `PayU accepted this refund of ${formatPaiseForMessage(refund.amount)} but its reference ` +
        `(${ack.requestId}) could not be recorded against it, so there is no way to ask what became ` +
        `of it. Look up reference ${refund.token} in the PayU dashboard under Refunds — no further ` +
        `refund on this payment will go out until you say what you found there.`,
    };
  }

  return { ok: true, refund: written.refund, alreadySent: false };
}

/**
 * What a refusal has to add, because the form in front of the owner is now
 * stale: its token has been spent on the row PayU has just said no to.
 */
const RAISE_AGAIN =
  "No money moved. Reload the order to raise it again — the form on this page has spent its reference.";

/* ------------------ Writing down what PayU said, safely --------------- */

/**
 * The predicate every write that lands after the PayU call must carry.
 *
 * The row is committed QUEUED with no request id and the call is made outside
 * that transaction, so for as long as PayU is thinking, the row sits in the
 * open where somebody else can settle it — `resolveUnacknowledgedRefund` exists
 * to let them. An `update({ where: { id } })` arriving afterwards silently
 * writes over an audited human decision, and when that decision was "PayU never
 * took it" the amount is already back in the ceiling and a second refund may
 * already be out against the same capture. That is the same double payout the
 * locked claim was built to stop, arriving by the other road.
 *
 * So: match on the state the caller left the row in, and read the count. Zero
 * means a person got there first, which is a refusal, never a retry.
 */
const stillUnanswered = (refundId: string) =>
  ({ id: refundId, status: "QUEUED", requestId: null }) satisfies Prisma.RefundWhereInput;

interface AfterCallWrite {
  /** The row as it now stands — re-read, whether or not the write applied. */
  refund: Refund;
  /** The conditional write matched a row and was applied. */
  persisted: boolean;
  /** Somebody settled this refund while PayU was being asked about it. */
  resolvedElsewhere: boolean;
}

/** One conditional post-call write, with the count read rather than ignored. */
async function writeAfterCall(
  refund: Refund,
  data: Prisma.RefundUpdateManyMutationInput,
): Promise<AfterCallWrite> {
  const result = await db.refund.updateMany({ where: stillUnanswered(refund.id), data });
  const current = await db.refund.findUnique({ where: { id: refund.id } });

  if (result.count > 0) {
    return { refund: current ?? refund, persisted: true, resolvedElsewhere: false };
  }
  // No row matched. Either it is gone, or it is no longer QUEUED-with-no-id —
  // and only `resolveUnacknowledgedRefund` and this function can have moved it.
  if (!current) return { refund, persisted: false, resolvedElsewhere: false };

  console.error(
    "[payu] refund settled underneath the call",
    refund.token,
    `now ${current.status}`,
    `requestId ${current.requestId ?? "—"}`,
  );
  return { refund: current, persisted: false, resolvedElsewhere: true };
}

/**
 * Keep PayU's own account of a refund somebody has already settled by hand.
 *
 * Their verdict is audited and this one is not, so the verdict stands: the only
 * thing written is a note APPENDED to whatever they left, carrying PayU's
 * reference. Status and request id are untouched, and the write is itself
 * conditional on the row still reading the way it did a moment ago, so this can
 * no more clobber a third writer than the one it replaced.
 */
async function noteAgainstResolvedRefund(row: Refund, note: string): Promise<Refund> {
  const merged = `${row.failureReason ? `${row.failureReason} ` : ""}${note}`.slice(0, 500);
  const written = await db.refund.updateMany({
    where: { id: row.id, status: row.status, requestId: row.requestId },
    data: { failureReason: merged, lastCheckedAt: new Date() },
  });
  if (written.count === 0) return row;
  return (await db.refund.findUnique({ where: { id: row.id } })) ?? row;
}

/** The refusal a caller gets when a person settled the row underneath it. */
function resolvedUnderneath(row: Refund, payuSaid: string): RefundOutcome {
  return {
    ok: false,
    refund: row,
    audit: "in-doubt",
    error:
      `While PayU was being asked about refund ${row.token}, somebody settled that refund by hand — ` +
      `it now reads ${row.status}${row.requestId ? ` under request ${row.requestId}` : ""}. Their ` +
      `decision has been left exactly as they made it and nothing here has been written over it. ` +
      `PayU's own answer was that ${payuSaid}. Look reference ${row.token} up in the PayU dashboard ` +
      `under Refunds and reconcile the two before anything else is refunded on this payment.`,
  };
}

interface AckWrite extends AfterCallWrite {
  /** PayU's reference landed in the column `check_action_status` answers to. */
  requestIdStored: boolean;
}

/**
 * Write PayU's answer onto the row, and never let that write be what fails.
 *
 * This runs AFTER the irreversible step. `Refund.requestId` carries a unique
 * index, so a request id PayU has already used on another row raises P2002
 * here — with the money already queued. Letting that throw turned a completed
 * money movement into a crashed screen, and left the row reading as
 * unacknowledged, which froze the payment as well. So the id is dropped from
 * the write and kept in the reason instead, where a person can still read it.
 *
 * What is NOT swallowed any more is the fact that it happened. Every caller is
 * told whether the write landed and whether PayU's reference is on the row, so
 * none of them can answer "accepted and queued" over a row the next render will
 * read as stranded.
 */
async function recordAck(
  refund: Refund,
  answer: {
    status: Refund["status"];
    requestId: string | null;
    payload: unknown;
    failureReason: string | null;
  },
): Promise<AckWrite> {
  const data = (requestId: string | null, failureReason: string | null) => ({
    status: answer.status,
    requestId,
    payload: answer.payload as Prisma.InputJsonValue,
    failureReason: failureReason ? failureReason.slice(0, 500) : null,
    lastCheckedAt: new Date(),
  });

  try {
    const first = await writeAfterCall(refund, data(answer.requestId, answer.failureReason));
    return { ...first, requestIdStored: first.persisted && answer.requestId !== null };
  } catch (error) {
    console.error(
      "[payu] refund bookkeeping",
      refund.token,
      answer.requestId,
      error instanceof Error ? error.message : error,
    );
    try {
      const second = await writeAfterCall(
        refund,
        data(
          null,
          `${answer.failureReason ?? "PayU answered this refund."} PayU's reference was ` +
            `${answer.requestId ?? "not given"} and it could not be stored against this row — look it ` +
            `up in the PayU dashboard.`,
        ),
      );
      return { ...second, requestIdStored: false };
    } catch (second) {
      console.error(
        "[payu] refund bookkeeping failed twice",
        refund.token,
        second instanceof Error ? second.message : second,
      );
      return { refund, persisted: false, resolvedElsewhere: false, requestIdStored: false };
    }
  }
}

/**
 * What to say about a refund that already exists under the token we were given.
 *
 * The amount is tested first, and it is not a formality. The token is derived
 * from the LEDGER STATE — the attempt, what is committed against it and how
 * many rows it carries — and the amount is no part of that seed, so every tab
 * and every manager looking at one unchanged ledger holds the same reference
 * whatever they type into the box. Answering the second of those from the first
 * one's row reported a green "PayU has accepted a refund of ₹300" to a manager
 * who had just asked for ₹699, with nothing sent, nothing logged and no error
 * anywhere. A different amount is a different decision, and it is refused as
 * one rather than answered.
 *
 * After that the order of the three matters. A refund PayU refused carries a
 * request id like any other, so asking "has it got a request id" first would
 * report a refusal as a success and leave the customer waiting on money that
 * was never sent. Refusal is checked first, for that reason.
 */
function answerForExistingToken(
  existing: Refund,
  amountPaise: number,
  now: number = Date.now(),
): RefundOutcome {
  if (existing.amount !== amountPaise) {
    console.warn(
      "[payu] refund token reused for a different amount",
      existing.token,
      `${existing.amount} vs ${amountPaise}`,
    );
    return {
      ok: false,
      refund: existing,
      audit: "repeat",
      error:
        `The reference this form carries (${existing.token}) has already been spent on a refund of ` +
        `${formatPaiseForMessage(existing.amount)}, and this asks for ` +
        `${formatPaiseForMessage(amountPaise)}. Nothing has been sent. Reload the order and raise ` +
        `the ${formatPaiseForMessage(amountPaise)} against the ceiling as it now stands.`,
    };
  }
  if (existing.status === "FAILURE") {
    return {
      ok: false,
      refund: existing,
      audit: "repeat",
      error: `${existing.failureReason || "PayU refused this refund."} ${RAISE_AGAIN}`,
    };
  }
  if (existing.requestId) return { ok: true, refund: existing, alreadySent: true };

  // The same decision, arriving while the first copy of it is still with PayU.
  // Calling that "sent and never acknowledged" is false at that instant and
  // points a double-clicking manager at the resolve control, which is the last
  // place he should be sent. It resolves itself within PayU's fifteen seconds.
  if (now - existing.initiatedAt.getTime() <= REFUND_STRAND_AFTER_MS) {
    return {
      ok: false,
      refund: existing,
      audit: "repeat",
      error:
        `This refund (${existing.token}) is with PayU right now — this did not send a second one. ` +
        `Reload the order in a moment to see what PayU said about it.`,
    };
  }

  return {
    ok: false,
    refund: existing,
    audit: "in-doubt",
    error:
      `This refund (${existing.token}) was already sent to PayU and PayU never acknowledged it. ` +
      `Check it in the PayU dashboard before sending another.`,
  };
}

/* ------------ Settling a refund nobody ever heard back about ---------- */

/** What the owner found when he went and looked in PayU. */
export type RefundResolution =
  /** PayU has no such refund: the request never landed, so no money moved. */
  | { kind: "not-sent" }
  /** PayU is carrying it, under this request id. The money is on its way. */
  | { kind: "sent"; requestId: string };

export type ResolveOutcome =
  | { ok: true; refund: Refund; message: string }
  | { ok: false; error: string };

/**
 * Let a person end the standoff a silent PayU leaves behind.
 *
 * A refund we sent and never heard back about blocks every later refund on the
 * payment, and that block is right: the money may have moved. What was missing
 * was any way to lift it. Nothing in the codebase could clear such a row —
 * `syncRefundStatus` needs a request id to ask about and the refresh action
 * skips rows without one — so a single fifteen-second timeout, on a box whose
 * outbound network is a documented recurring problem, bricked every future
 * refund on that payment until somebody ran SQL against the live database.
 *
 * So: the owner opens PayU's dashboard, searches Refunds for our reference, and
 * tells this function which of the two things he found there.
 *
 *   not-sent  PayU has no record of it. Nothing left the account. The row
 *             becomes FAILURE, which frees its amount back into the ceiling —
 *             the same meaning FAILURE carries everywhere else in this module.
 *   sent      PayU has it, under a request id. The row keeps its QUEUED status
 *             and its claim on the ceiling, and gains the id — which is what
 *             `syncRefundStatus` needs to follow it to SUCCESS on its own.
 *
 * Neither is offered while the refund could still legitimately be in flight,
 * and the "sent" id is confirmed with PayU before it is believed. Both of those
 * are below, with the reasoning next to them; between them they close the two
 * ways this remedy could itself become a second refund.
 *
 * It is a money guard like every other one, so it lives here rather than in the
 * action: the "use server" wrapper checks who is asking, confirms, and writes
 * the audit line. Who decided this and what they said they saw goes in the
 * activity log, which is where this shop keeps its record of a human judgement
 * — `initiatedByName` is left alone, because overwriting it would lose who
 * raised the refund in the first place.
 */
export async function resolveUnacknowledgedRefund(input: {
  refundId: string;
  resolution: RefundResolution;
  actor: { id: string | null; name: string };
}): Promise<ResolveOutcome> {
  const requestId = input.resolution.kind === "sent" ? input.resolution.requestId.trim() : "";
  if (input.resolution.kind === "sent") {
    if (!requestId) {
      return { ok: false, error: "Type the request id PayU shows against this refund." };
    }
    // The same care the refund token gets before it is written to a unique
    // column: a cell pasted out of a dashboard can carry anything at all.
    if (requestId.length > 64 || !/^[A-Za-z0-9._:-]+$/.test(requestId)) {
      return {
        ok: false,
        error: "A PayU request id is letters, digits and dashes — copy it from the Refunds table.",
      };
    }
  }

  const existing = await db.refund.findUnique({
    where: { id: input.refundId },
    select: {
      id: true,
      token: true,
      amount: true,
      status: true,
      requestId: true,
      initiatedAt: true,
      paymentAttemptId: true,
      paymentAttempt: { select: { gatewayPaymentId: true } },
    },
  });
  if (!existing) return { ok: false, error: "That refund does not exist." };
  if (existing.status !== "QUEUED" || existing.requestId) {
    return {
      ok: false,
      error:
        "There is nothing unresolved about this refund — PayU has acknowledged it, or somebody has " +
        "already settled it. Reload the order to see where it stands.",
    };
  }

  /**
   * A refund still inside PayU's own answering time is not stranded, and this
   * is where that has to be enforced — the money guards live in the service and
   * a screen is not allowed to be the only thing holding one.
   *
   * The dangerous verdict is "not-sent": it writes FAILURE and puts the whole
   * amount back into the ceiling. Pressed while the first manager's call is
   * still open — which the twelve-second auto-refresh made reliable — it frees
   * the ceiling for money that is on its way out, and a second refund goes.
   * "sent" is gated too, for one reason: the id cannot be confirmed against a
   * refund PayU has not finished registering, so the confirmation below would
   * refuse it anyway, with a worse sentence.
   */
  const age = Date.now() - existing.initiatedAt.getTime();
  if (age <= REFUND_STRAND_AFTER_MS) {
    return {
      ok: false,
      error:
        `This refund was raised ${describeRefundAge(existing.initiatedAt)} and PayU is allowed ` +
        `fifteen seconds to answer, so it may still be in flight — and PayU's dashboard takes longer ` +
        `than that to show it either way. Nothing more goes out on this payment meanwhile. Reload ` +
        `the order in a couple of minutes and settle it then.`,
    };
  }

  if (input.resolution.kind === "sent") {
    /**
     * PayU's own word for it, before a hand-typed id is believed.
     *
     * The shape check above says only that the characters could be an id. The
     * ids in PayU's Refunds table are near-identical numeric strings sitting one
     * under another, and copying the neighbouring row used to be enough to
     * unblock this payment on a reference belonging to a different refund:
     * `syncRefundStatus` would then follow THAT refund, and if it had failed,
     * write FAILURE here and hand the whole amount back to the ceiling.
     *
     * It is a read, on a path a person is already waiting on. If it cannot be
     * made, nothing is recorded and the block stays — which costs a retry and
     * never costs a payout.
     */
    const onThisPayment = await db.refund.findFirst({
      where: { requestId, paymentAttemptId: existing.paymentAttemptId },
      select: { token: true, amount: true },
    });
    if (onThisPayment) {
      return {
        ok: false,
        error:
          `PayU's reference ${requestId} is already recorded against refund ${onThisPayment.token} ` +
          `of ${formatPaiseForMessage(onThisPayment.amount)} on this payment, so it cannot also ` +
          `belong to ${existing.token}. Check which row you copied out of PayU's Refunds table.`,
      };
    }

    const config = payuConfig();
    if (!config) {
      return {
        ok: false,
        error:
          "PayU is not configured on this server, so this request id cannot be confirmed with PayU " +
          "— and an unconfirmed id is what unfreezes this payment. Nothing has been recorded.",
      };
    }

    let seen;
    try {
      seen = await checkPayuActionStatus(config, requestId);
    } catch (error) {
      const why = error instanceof Error ? error.message : "no answer";
      console.error("[payu] resolve confirm", requestId, why);
      return {
        ok: false,
        error:
          `PayU could not be reached to confirm request ${requestId} (${why}). Nothing has been ` +
          `recorded and this payment stays shut — try again in a moment.`,
      };
    }

    if (!seen) {
      return {
        ok: false,
        error:
          `PayU has no record of request ${requestId}. If PayU really has no refund against ` +
          `reference ${existing.token} either, record that instead — but check the row you copied ` +
          `out of the Refunds table first.`,
      };
    }

    const stated = seen.amount.trim().replace(/,/g, "");
    const statedRupees = stated === "" ? null : Number(stated);
    if (
      statedRupees !== null &&
      Number.isFinite(statedRupees) &&
      payuAmount(statedRupees) !== payuAmount(existing.amount / 100)
    ) {
      return {
        ok: false,
        error:
          `PayU says request ${requestId} is for ` +
          `${formatPaiseForMessage(Math.round(statedRupees * 100))}, not the ` +
          `${formatPaiseForMessage(existing.amount)} on reference ${existing.token} — check the row ` +
          `you copied out of the Refunds table.`,
      };
    }

    const mihpayid = existing.paymentAttempt.gatewayPaymentId;
    if (seen.mihpayid && mihpayid && seen.mihpayid !== mihpayid) {
      return {
        ok: false,
        error:
          `PayU says request ${requestId} belongs to payment ${seen.mihpayid}, and this refund is ` +
          `against payment ${mihpayid} — check the row you copied out of the Refunds table.`,
      };
    }
  }

  const when = new Date();
  const note =
    `PayU never acknowledged this refund. ${input.actor.name} checked the PayU dashboard and found no ` +
    `refund against reference ${existing.token}, so no money moved and the amount is refundable again.`;

  let claimed: number;
  try {
    claimed = await db.$transaction(async (tx) => {
      // The same lock `initiateRefund` takes, for the same reason: this changes
      // what the ceiling allows, so it must not land in the middle of somebody
      // else's ceiling read.
      await tx.$queryRaw`
        SELECT "id" FROM "PaymentAttempt" WHERE "id" = ${existing.paymentAttemptId} FOR UPDATE
      `;
      // Conditional, so two managers pressing this at the same moment cannot
      // both settle it — the second matches nothing and is told so.
      const result = await tx.refund.updateMany({
        where: { id: existing.id, status: "QUEUED", requestId: null },
        data:
          input.resolution.kind === "sent"
            ? { requestId, failureReason: null, lastCheckedAt: when }
            : { status: "FAILURE", failureReason: note.slice(0, 500), lastCheckedAt: when },
      });
      return result.count;
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return {
        ok: false,
        error:
          `Request id ${requestId} is already recorded against another refund. Check you have copied ` +
          `the right row out of PayU.`,
      };
    }
    throw error;
  }

  if (claimed === 0) {
    return {
      ok: false,
      error: "Somebody settled this refund a moment ago. Reload the order to see where it stands.",
    };
  }

  const refund = await db.refund.findUniqueOrThrow({ where: { id: existing.id } });

  return {
    ok: true,
    refund,
    message:
      input.resolution.kind === "sent"
        ? `Recorded: PayU is carrying refund ${existing.token} of ` +
          `${formatPaiseForMessage(existing.amount)} under request ${requestId}. It still counts against ` +
          `what can be refunded, and Refresh from PayU will follow it from here.`
        : `Recorded: PayU never took refund ${existing.token}, so no money moved. ` +
          `${formatPaiseForMessage(existing.amount)} is refundable again and this payment is open.`,
  };
}

/** Rupees, plainly, for a sentence a person reads. */
const formatPaiseForMessage = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* --------------------- Catching up with a refund ---------------------- */

export interface RefundSyncResult {
  refund: Refund;
  /** True when PayU told us something we did not already know. */
  changed: boolean;
  state: RefundState;
}

/**
 * Ask PayU what became of one refund and write down the answer.
 *
 * Idempotent, and safe to call as often as anyone likes: it only ever moves a
 * refund forward. SUCCESS and FAILURE are final — once PayU has said the money
 * moved, or said it did not, a later answer cannot take that back, because
 * `Order.paymentStatus` has already been changed on the strength of it.
 *
 * Returns null when there is nothing to ask about: no such refund, no request
 * id (PayU never acknowledged it), or PayU not configured.
 */
export async function syncRefundStatus(refundId: string): Promise<RefundSyncResult | null> {
  const config = payuConfig();
  if (!config) return null;

  const refund = await db.refund.findUnique({ where: { id: refundId } });
  if (!refund || !refund.requestId) return null;

  let seen;
  try {
    seen = await checkPayuActionStatus(config, refund.requestId);
  } catch (error) {
    // Exactly as the reconciler treats a failed verify: the row is left as it
    // was and the next sweep tries again.
    console.error("[payu] refund status", refund.requestId, error instanceof Error ? error.message : error);
    return null;
  }

  const now = new Date();
  const reported = seen ? refundStateFromPayu(seen.status) : null;
  // SUCCESS and FAILURE are the two PayU cannot take back. `refundIsOpen` is
  // the one definition of the other four, rather than a fifth list spelled out
  // here.
  const terminal = !refundIsOpen(refund.status);

  // Nothing new: PayU said nothing we could read, or repeated itself, or this
  // refund is already finished. Record that we asked and stop.
  if (!seen || !reported || reported === refund.status || terminal) {
    const touched = await db.refund.update({
      where: { id: refund.id },
      data: { lastCheckedAt: now, ...(seen ? { payload: seen.raw as Prisma.InputJsonValue } : {}) },
    });
    return { refund: touched, changed: false, state: touched.status };
  }

  // Conditional on the state this call read, like every other write that lands
  // after a PayU answer: two refreshes racing on one refund must not both
  // decide they moved it, and `recomputeRefundTotals` below is keyed off that.
  const moved = await db.refund.updateMany({
    where: { id: refund.id, status: refund.status },
    data: {
      status: reported,
      lastCheckedAt: now,
      payload: seen.raw as Prisma.InputJsonValue,
      // check_action_status carries no reason beyond the state itself, so say
      // what is actually known rather than storing the word "FAILURE" twice.
      failureReason:
        reported === "FAILURE"
          ? `PayU reported this refund as ${seen.status || "failed"}. No money moved — it can be raised again.`
          : null,
    },
  });

  const updated = await db.refund.findUniqueOrThrow({ where: { id: refund.id } });
  if (moved.count === 0) {
    // Somebody else wrote this row between the read and the answer. Whatever
    // they wrote is at least as new as this, so it stands.
    return { refund: updated, changed: false, state: updated.status };
  }

  if (reported === "SUCCESS") {
    await recomputeRefundTotals(refund.paymentAttemptId, refund.orderId);
    // The gateway has confirmed the money moved. This is the only email that
    // asserts that, and this is the only place that knows it.
    sendOrderMail(refund.orderId, "refund-completed");
  }

  return { refund: updated, changed: true, state: reported };
}

/*
 * There was a `syncOpenRefunds(limit)` here, sweeping every refund still in
 * flight. Nothing ever called it: `refreshPayuPayment` walks the open refunds
 * of the one order in front of the owner, which is the only place this shop
 * asks PayU anything, and it did the same walk inline. Two implementations of
 * one sweep, one of them never run and therefore never wrong in a way anybody
 * would notice, is worse than none — so it is gone. The states that count as
 * "still open" now live once, as OPEN_REFUND_STATES in lib/payments/refund-status.
 */

/**
 * Put what PayU has confirmed onto the attempt and the order it belongs to.
 *
 * Derived, never accumulated: it re-reads the refunds that PayU has confirmed,
 * sums them, and compares that against what was actually captured. Running it
 * twice therefore says the same thing twice, which is what makes the sync above
 * safe to call as often as anyone likes.
 *
 * A partial refund leaves the order PARTIALLY_REFUNDED; partials adding up to
 * the whole capture make it REFUNDED.
 *
 * It never walks a status backwards. An order already marked REFUNDED — which
 * `cancelOrder` does with no gateway call at all — stays REFUNDED, because
 * telling the owner less than he already believes about a refund helps nobody.
 *
 * Exported so a "recheck this order" control has something honest to call; it
 * creates nothing and sends nothing, it only restates what the rows already say.
 */
export async function recomputeRefundTotals(attemptId: string, orderId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({
      where: { id: attemptId },
      select: { amount: true, status: true, refunds: { select: { amount: true, status: true } } },
    });
    if (!attempt) return;

    const refundedHere = attempt.refunds
      .filter((r) => r.status === "SUCCESS")
      .reduce((sum, r) => sum + r.amount, 0);

    if (refundedHere >= attempt.amount && attempt.status === "CAPTURED") {
      await tx.paymentAttempt.update({ where: { id: attemptId }, data: { status: "REFUNDED" } });
    }

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        paymentStatus: true,
        payments: {
          where: { status: { in: ["CAPTURED", "REFUNDED"] } },
          select: { amount: true, refunds: { select: { amount: true, status: true } } },
        },
      },
    });
    if (!order) return;

    const captured = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const refunded = order.payments.reduce(
      (sum, p) => sum + p.refunds.filter((r) => r.status === "SUCCESS").reduce((s, r) => s + r.amount, 0),
      0,
    );

    const next =
      captured > 0 && refunded >= captured
        ? "REFUNDED"
        : order.paymentStatus === "PAID"
          ? "PARTIALLY_REFUNDED"
          : null;

    if (next && next !== order.paymentStatus) {
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: next } });
    }
  });
}

/* ------------------------- Fees and settlement ------------------------ */

export interface SettlementSyncResult {
  /** Rows PayU returned across every page we asked for. */
  fetched: number;
  /** Payment attempts we recognised and wrote settlement onto. */
  updated: number;
  /**
   * Rows whose txnid names an attempt we hold but whose amount does not match
   * it. Nothing is written for these, and counting them is what keeps that
   * from being indistinguishable from "PayU has not settled it yet".
   */
  mismatched: number;
}

export interface SettlementSyncInput {
  /** "YYYY-MM-DD", inclusive. */
  from: string;
  to: string;
  /**
   * Only write these transaction ids. Left out, every row in the range that
   * matches an attempt we hold is written.
   */
  txnids?: string[];
  /** How many pages to walk before giving up. PayU pages silently. */
  maxPages?: number;
}

/**
 * Pull the fee and settlement picture for a date range onto our own rows.
 *
 * `get_Transaction_Details` is a query across the whole merchant account for a
 * span of days, not a lookup of one order, so it comes back carrying other
 * customers' names, emails and phone numbers. None of that is stored: only the
 * columns below, and only onto an attempt we already hold, matched by our own
 * transaction id.
 *
 * Idempotent by construction — it writes the same values PayU reports, so
 * running it twice over the same week changes nothing the second time. Fields
 * PayU leaves blank are left alone rather than blanked out, because a later
 * page of a partial answer must not erase an earlier good one.
 *
 * The feed carries refunds as well as payments, under the same txnid, and only
 * the payment's figures belong on a payment. Refund rows are skipped outright
 * — see `payuRowIsRefund` — and `fetched` counts what PayU sent, not what was
 * worth writing.
 */
export async function syncSettlementForAttempts(
  input: SettlementSyncInput,
): Promise<SettlementSyncResult> {
  const config = payuConfig();
  if (!config) return { fetched: 0, updated: 0, mismatched: 0 };

  const wanted = input.txnids?.length ? new Set(input.txnids) : null;
  const maxPages = Math.max(1, Math.min(input.maxPages ?? 5, 20));

  const rows: PayuSettlementRow[] = [];
  const seen = new Set<string>();
  // Sequential, never in parallel — the same discipline the reconciler keeps.
  for (let page = 1; page <= maxPages; page++) {
    const batch = await fetchPayuTransactionDetails(config, {
      from: input.from,
      to: input.to,
      page,
    });
    if (batch.length === 0) break;
    /**
     * Some accounts ignore the page argument entirely and hand back the first
     * page for ever. Recognising a repeat is what stops that becoming a loop.
     *
     * Keyed on the txnid AND the request id, because a refunded sale appears
     * in this feed twice under one txnid — once as the payment, once as the
     * refund. Keyed on the txnid alone, the second of those looked like a page
     * PayU had already sent, so a legitimate page whose rows all belonged to
     * transactions already seen ended the walk early and the settlements after
     * it were quietly dropped.
     */
    const fresh = batch.filter((row) => !seen.has(payuSettlementRowKey(row)));
    if (fresh.length === 0) break;
    for (const row of fresh) seen.add(payuSettlementRowKey(row));
    rows.push(...fresh);
  }

  let updated = 0;
  let mismatched = 0;
  const now = new Date();

  for (const row of rows) {
    if (wanted && !wanted.has(row.txnid)) continue;

    // A refund is not a payout. Writing one onto the payment made "Reached the
    // bank" read as the refunded amount and quoted the refund's UTR as the
    // settlement's — a figure the owner would then look for on his bank
    // statement and never find.
    if (payuRowIsRefund(row)) continue;

    // Typed rather than a loose object, so a mistyped column name is a build
    // error here and not a silent gap in the settlement figures months later.
    const data: Prisma.PaymentAttemptUpdateManyMutationInput = { settlementSyncedAt: now };

    const fee = rupeesToPaise(row.merchantServiceFee);
    const feeTax = rupeesToPaise(row.merchantServiceTax);
    const settled = rupeesToPaise(row.amountSettled);
    const valueDate = parsePayuDate(row.valueDate);

    if (row.bankName) data.bankName = row.bankName;
    if (row.cardMasked) data.cardMasked = row.cardMasked;
    if (fee !== null) data.gatewayFee = fee;
    if (feeTax !== null) data.gatewayFeeTax = feeTax;
    if (row.settlementId) data.settlementId = row.settlementId;
    if (settled !== null) data.settledAmount = settled;
    if (row.utr) data.utrNumber = row.utr;
    if (valueDate) data.valueDate = valueDate;

    // A transaction PayU knows about and we do not is skipped rather than
    // throwing — most of this feed belongs to other orders on this merchant
    // account, and some to orders that never reached this database.
    const held = await db.paymentAttempt.findMany({
      where: { gatewayOrderId: row.txnid },
      select: { id: true, amount: true },
    });
    if (held.length === 0) continue;

    // The amount is a second opinion on the txnid whenever PayU states one, and
    // it is compared through `payuAmount` — the same normaliser `applyVerdict`
    // puts on this identical question. Exact paise equality was a second
    // implementation of one comparison: an account reporting "1499.005", or the
    // net rather than the gross, matched nothing, wrote nothing and said
    // nothing, and the owner read "Nothing has changed on this order" for ever.
    const stated = row.amount.trim().replace(/,/g, "");
    const chargedRupees = stated === "" ? null : Number(stated);
    const matched =
      chargedRupees !== null && Number.isFinite(chargedRupees)
        ? held.filter((a) => payuAmount(a.amount / 100) === payuAmount(chargedRupees))
        : held;

    if (matched.length === 0) {
      // Loud, because the alternative is a settlement half that is dead on live
      // with no diagnostic at all.
      console.error(
        "[payu] settlement amount mismatch",
        row.txnid,
        `PayU ${row.amount}`,
        `ours ${held.map((a) => (a.amount / 100).toFixed(2)).join(", ")}`,
      );
      mismatched += 1;
      continue;
    }

    const result = await db.paymentAttempt.updateMany({
      where: { id: { in: matched.map((a) => a.id) } },
      data,
    });
    if (result.count > 0) updated += 1;
  }

  return { fetched: rows.length, updated, mismatched };
}

/**
 * The same, for the attempts on one order — the shape the admin order page
 * wants. PayU has no per-order query, so this asks for the days those attempts
 * were created on and keeps only their rows.
 */
export async function syncSettlementForOrder(orderId: string): Promise<SettlementSyncResult> {
  const attempts = await db.paymentAttempt.findMany({
    where: { orderId, status: { in: ["CAPTURED", "REFUNDED"] } },
    select: { gatewayOrderId: true, createdAt: true },
  });
  if (attempts.length === 0) return { fetched: 0, updated: 0, mismatched: 0 };

  const times = attempts.map((a) => a.createdAt.getTime());
  // A day either side: PayU dates a transaction in IST and this box may not be.
  const from = payuDay(new Date(Math.min(...times) - 86_400_000));
  const to = payuDay(new Date(Math.max(...times) + 86_400_000));

  return syncSettlementForAttempts({
    from,
    to,
    txnids: attempts.map((a) => a.gatewayOrderId),
  });
}
