import "server-only";

import { db } from "@/lib/db";
import { BUSINESS } from "@/config/business";
import { initiateRefund, refundableForAttempt } from "./payu-ledger";

/**
 * The one place that decides what may be said about an order's money.
 *
 * RULE ONE: "refunded" may be shown only when money has actually moved. Two
 * things count as proof, and they are not the same thing:
 *
 *   - a PayU Refund row with status SUCCESS — the gateway says it sent it;
 *   - a ManualRefund row — a person says they sent it, with a reference.
 *
 * Everything else is an intention. `Order.paymentStatus` is an intention: it
 * was being written to REFUNDED by a cancellation and by a return settlement,
 * neither of which moved a rupee, and the admin and the customer's order page
 * both believed it. This module reads the ledger instead and derives the
 * answer, so a status column can no longer make either of them lie.
 *
 * Nothing here writes. It is a read model on purpose: the paths that move money
 * are elsewhere, and they all go through `initiateRefund`, whose row lock is
 * what stops the same money going twice.
 */

export type RefundStage =
  /** Nothing is owed and nothing has moved. */
  | "none"
  /** We have decided to give money back; none of it has moved yet. */
  | "due"
  /** A refund is with the gateway and has not been confirmed. */
  | "raised"
  /** Some of what is owed has actually been returned. */
  | "partial"
  /** Everything owed has actually been returned. */
  | "complete"
  /** The gateway refused it, or a refund was left unanswered. A human is needed. */
  | "attention";

export interface RefundState {
  stage: RefundStage;
  /** Whole rupees the shop owes back, as far as the ledger knows. */
  owed: number;
  /** Whole rupees that have genuinely gone back, gateway-confirmed. */
  returnedByGateway: number;
  /** Whole rupees recorded as sent by hand, on somebody's word. */
  returnedByHand: number;
  /** returnedByGateway + returnedByHand. */
  returned: number;
  /** A refund the gateway has been asked for but has not answered. */
  inFlight: number;
  /**
   * True when the stored paymentStatus claims more than the ledger can show.
   * This is the flag the reconciliation page lists, and the reason it exists.
   */
  overstated: boolean;
  /** What a customer should be told, in the shop's own words. */
  customerLabel: string;
  /** What the admin should see. Blunter, and names the discrepancy. */
  adminLabel: string;
}

/** Paise to whole rupees. Refund.amount is paise; every figure shown is rupees. */
const toRupees = (paise: number) => Math.round(paise / 100);

/**
 * How long the customer should expect to wait, quoted from the shop's own
 * published policy rather than invented here. The same numbers appear on
 * /legal/refunds, so the email, the order page and the policy cannot disagree.
 */
export function refundWindowText(): string {
  const { refundSettlementDaysMin: min, refundSettlementDaysMax: max } = BUSINESS.ops;
  return `${min} to ${max} business days`;
}

export const REFUND_SELECT = {
  id: true,
  total: true,
  paymentStatus: true,
  paymentMethod: true,
  refunds: { select: { id: true, amount: true, status: true, requestId: true, createdAt: true } },
  manualRefunds: { select: { id: true, amount: true, reference: true, recordedAt: true } },
  returns: { select: { id: true, status: true, refundAmount: true, refundId: true } },
} as const;

type OrderForRefunds = {
  total: number;
  paymentStatus: string;
  paymentMethod: string;
  refunds: { amount: number; status: string }[];
  manualRefunds: { amount: number }[];
  returns: { status: string; refundAmount: number; refundId: string | null }[];
};

/**
 * Derives the refund state of one order from its ledger.
 *
 * Pure, so it can be unit-reasoned and reused by the admin, the storefront and
 * the reconciliation report without three slightly different opinions.
 */
export function refundState(order: OrderForRefunds): RefundState {
  const returnedByGateway = toRupees(
    order.refunds.filter((r) => r.status === "SUCCESS").reduce((sum, r) => sum + r.amount, 0),
  );
  const returnedByHand = order.manualRefunds.reduce((sum, r) => sum + r.amount, 0);
  const returned = returnedByGateway + returnedByHand;

  // Asked for and not yet answered. OD_HIT and FAILURE are not in flight — one
  // is a refusal and the other needs a person, both handled below.
  const inFlight = toRupees(
    order.refunds
      .filter((r) => ["QUEUED", "IN_PROGRESS", "REQUESTED"].includes(r.status))
      .reduce((sum, r) => sum + r.amount, 0),
  );

  const needsAttention = order.refunds.some((r) => ["FAILURE", "OD_HIT"].includes(r.status));

  /**
   * What is owed.
   *
   * A cancelled-and-paid order owes the whole total. Otherwise it is the sum of
   * the returns that have reached a stage where the money is due — approved and
   * beyond, since a requested return may still be rejected and owes nothing
   * until somebody agrees to it.
   */
  const owedFromReturns = order.returns
    .filter((r) => ["APPROVED", "PICKED_UP", "REFUNDED"].includes(r.status))
    .reduce((sum, r) => sum + r.refundAmount, 0);

  const cancelledOwesAll =
    order.paymentStatus === "REFUND_DUE" || order.paymentStatus === "REFUNDED"
      ? owedFromReturns === 0
      : false;

  const owed = cancelledOwesAll ? order.total : owedFromReturns;

  /**
   * The flag this whole module exists for.
   *
   * The stored status says the money is back; the ledger cannot show a rupee of
   * it. Every one of these is either an old test order or a real customer still
   * waiting, and the reconciliation page lists them rather than quietly
   * correcting them — rewriting somebody's payment history to make a report
   * tidy is not a thing code should do on its own.
   */
  const claimsRefunded =
    order.paymentStatus === "REFUNDED" || order.paymentStatus === "PARTIALLY_REFUNDED";
  const overstated = claimsRefunded && returned < (owed || order.total);

  let stage: RefundStage;
  if (needsAttention) stage = "attention";
  else if (returned > 0 && owed > 0 && returned >= owed) stage = "complete";
  else if (returned > 0) stage = "partial";
  else if (inFlight > 0) stage = "raised";
  else if (owed > 0 || order.paymentStatus === "REFUND_DUE") stage = "due";
  else stage = "none";

  return {
    stage,
    owed,
    returnedByGateway,
    returnedByHand,
    returned,
    inFlight,
    overstated,
    customerLabel: customerLabelFor(stage, order.paymentMethod),
    adminLabel: adminLabelFor(stage, overstated),
  };
}

function customerLabelFor(stage: RefundStage, method: string): string {
  switch (stage) {
    case "none":
      return "No refund on this order";
    case "due":
      return method === "COD"
        ? "Refund being arranged"
        : "Refund approved — not sent yet";
    case "raised":
      return `Refund on its way — your bank takes ${refundWindowText()}`;
    case "partial":
      return "Part of your refund has been sent";
    case "complete":
      return "Refunded";
    case "attention":
      // Never "failed" to a customer: most of the time the money is fine and a
      // person simply has to look. Saying "failed" starts a panic and a call.
      return "We are checking your refund";
  }
}

function adminLabelFor(stage: RefundStage, overstated: boolean): string {
  if (overstated) return "Says refunded — no money moved";
  switch (stage) {
    case "none":
      return "No refund";
    case "due":
      return "Owed — not sent";
    case "raised":
      return "With the gateway";
    case "partial":
      return "Partly returned";
    case "complete":
      return "Refunded";
    case "attention":
      return "Needs a human";
  }
}

/** Loads one order and derives its refund state. */
export async function refundStateFor(orderId: string): Promise<RefundState | null> {
  const order = await db.order.findUnique({ where: { id: orderId }, select: REFUND_SELECT });
  return order ? refundState(order) : null;
}

/**
 * Every order whose stored status claims more than its ledger can show.
 *
 * The reconciliation report. Read-only by design: it names what is wrong and
 * leaves the deciding to a person, because the right answer differs per row —
 * a test order wants correcting, a real customer wants their money.
 */
export async function overstatedOrders() {
  const candidates = await db.order.findMany({
    where: { paymentStatus: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
    select: {
      ...REFUND_SELECT,
      number: true,
      contactName: true,
      contactEmail: true,
      placedAt: true,
      status: true,
    },
    orderBy: { placedAt: "desc" },
  });

  return candidates
    .map((order) => ({ order, state: refundState(order) }))
    .filter((row) => row.state.overstated);
}

/* ------------------------------------------------------------ writing */

export type RefundAttemptOutcome =
  | { ok: true; refundId: string; amount: number; kind: "gateway" }
  /** No gateway capture to reverse — COD, or a UPI credit taken by hand. */
  | { ok: false; reason: "no-gateway"; message: string }
  | { ok: false; reason: "refused"; message: string };

/**
 * Raises a real gateway refund for an order, whoever asked for it.
 *
 * This is the single door. Cancelling an order and settling a return both come
 * through here, which is the whole point: they used to write REFUNDED
 * independently and could each give back money the other had already given.
 *
 * The protection against that is not new code — it is `initiateRefund`, which
 * locks the PaymentAttempt row with SELECT … FOR UPDATE, re-reads the committed
 * refunds inside that lock and re-tests the ceiling before writing. Two callers
 * racing for the same rupee serialise on that lock and exactly one wins; the
 * loser reads the winner's row and is refused in words. Routing both paths
 * through it is what makes that lock cover both of them.
 *
 * Never throws. A refund that cannot be raised must not take the cancellation
 * or the return down with it — the caller records what it did and the
 * reconciliation page shows the money still owed.
 */
export async function raiseGatewayRefund(input: {
  orderId: string;
  /** Whole rupees. Converted to paise here, once, in one place. */
  amountRupees: number;
  actor: { id: string | null; name: string };
  /** Idempotency handle. The same value twice sends one refund. */
  token: string;
}): Promise<RefundAttemptOutcome> {
  const attempts = await db.paymentAttempt.findMany({
    where: { orderId: input.orderId, status: { in: ["CAPTURED", "REFUNDED"] } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (attempts.length === 0) {
    return {
      ok: false,
      reason: "no-gateway",
      message: "There is no gateway payment on this order, so nothing can be refunded automatically.",
    };
  }

  // Find the first attempt with room left. A duplicate payment leaves two
  // captures and only one of them should be reversed.
  for (const attempt of attempts) {
    const refundable = await refundableForAttempt(attempt.id);
    if (!refundable || refundable.blocked) continue;

    const amountPaise = input.amountRupees * 100;
    if (refundable.refundablePaise < amountPaise) continue;

    const outcome = await initiateRefund({
      attemptId: attempt.id,
      amountPaise,
      actor: input.actor,
      token: input.token,
    });

    if (outcome.ok) {
      return {
        ok: true,
        refundId: outcome.refund.id,
        amount: input.amountRupees,
        kind: "gateway",
      };
    }
    return { ok: false, reason: "refused", message: outcome.error };
  }

  return {
    ok: false,
    reason: "refused",
    message: "No payment on this order has enough left to refund that amount.",
  };
}

/**
 * A refund token that is stable for one decision.
 *
 * `initiateRefund` treats a repeated token as a repeat of the same decision and
 * sends nothing the second time. Deriving it from what is being refunded —
 * rather than generating a fresh one — is what makes a double-clicked button,
 * a resubmitted form and a retried action one refund instead of three.
 *
 * PayU will not take more than 23 characters, hence the slice.
 */
export function refundToken(kind: "cancel" | "return", id: string): string {
  return `${kind === "cancel" ? "c" : "r"}-${id}`.slice(0, 23);
}
