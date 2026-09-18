/**
 * What a refund's state means, in one place.
 *
 * Deliberately free of imports — no `server-only`, no Prisma, nothing — because
 * both halves of the admin need it: the server action that writes the row, and
 * the client form that has to tell the owner what to expect. A file with no
 * imports can be used by either without dragging the database into a browser
 * bundle, the same reason `src/services/admin/form-state.ts` is written this
 * way.
 *
 * The wording below is PayU's own, from their refund documentation. It is
 * written down once so that nobody has to invent "should be there in a few
 * days" on a screen where a customer is being quoted it.
 */

/**
 * The states a refund can be in. The same six values as the `RefundStatus`
 * enum in the database, as plain strings, so this file needs no Prisma import.
 */
export const REFUND_STATES = [
  "QUEUED",
  "IN_PROGRESS",
  "REQUESTED",
  "SUCCESS",
  "FAILURE",
  "OD_HIT",
] as const;

export type RefundState = (typeof REFUND_STATES)[number];

/** Short labels, for a pill or a table cell. */
export const REFUND_STATE_LABEL: Record<RefundState, string> = {
  QUEUED: "Queued",
  IN_PROGRESS: "In progress",
  REQUESTED: "With the bank",
  SUCCESS: "Refunded",
  FAILURE: "Failed",
  OD_HIT: "Overdraft",
};

/**
 * PayU's words for the same six states.
 *
 * They arrive with inconsistent spacing and casing — "IN PROGRESS", "in
 * progress", "od_hit" — so everything is upper-cased and its separators
 * flattened to a single underscore before the lookup.
 */
export function refundStateFromPayu(raw: string): RefundState | null {
  const key = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  switch (key) {
    case "QUEUED":
    case "REFUND_QUEUED":
      return "QUEUED";
    case "IN_PROGRESS":
    case "PENDING":
      return "IN_PROGRESS";
    case "REQUESTED":
      return "REQUESTED";
    case "SUCCESS":
    case "SUCCESSFUL":
    case "REFUNDED":
      return "SUCCESS";
    case "FAILURE":
    case "FAILED":
      return "FAILURE";
    case "OD_HIT":
      return "OD_HIT";
    default:
      return null;
  }
}

/**
 * How long the customer is waiting, in words anybody can repeat on the phone.
 *
 * PayU gives these estimates itself; the point of putting them here is that the
 * refund screen, the order timeline and any email all quote the same number of
 * days rather than three different guesses.
 */
export function describeRefundEta(status: RefundState): string {
  switch (status) {
    case "QUEUED":
      return "Accepted by PayU, not yet sent to the bank.";
    case "IN_PROGRESS":
      return "Raised with the bank. Usually back within a few working days.";
    case "REQUESTED":
      return "Sent to the bank for offline processing — 5 to 7 business days.";
    case "SUCCESS":
      return "Refunded. The money has left PayU.";
    case "FAILURE":
      return "Failed. No money moved — it can be raised again.";
    case "OD_HIT":
      return "Held against an overdraft at PayU — 5 to 7 business days.";
  }
}

/**
 * The states PayU may still change its mind about — one definition of "open".
 *
 * Written down here because three places need exactly this list: the two
 * Prisma `in:` clauses that pick the refunds worth asking PayU about, and
 * `syncRefundStatus`, which must not walk a finished refund backwards. Each of
 * them used to spell the four states out for itself, which is three copies of
 * one rule and two chances for them to disagree the next time PayU adds a
 * state.
 *
 * Typed as `RefundState[]` rather than a readonly tuple so Prisma's `in:`
 * takes it without a cast.
 */
export const OPEN_REFUND_STATES: RefundState[] = ["QUEUED", "IN_PROGRESS", "REQUESTED", "OD_HIT"];

/** True while PayU may still change its mind about this refund. */
export const refundIsOpen = (status: RefundState) => OPEN_REFUND_STATES.includes(status);
