/**
 * When the shop asks a customer to review what they bought.
 *
 * Change `delayDays` to move the ask; everything else follows from it. The
 * sending itself lives in src/services/order-reviews.ts and runs on a timer
 * started in src/instrumentation-node.ts.
 */
export const REVIEW_REQUESTS = {
  /**
   * Days after delivery before the request goes out.
   *
   * Not the same day as the "delivered" email: nobody can review a thing they
   * have not opened yet, and asking before they have used it gets either no
   * answer or an answer about the packaging.
   */
  delayDays: 3,

  /**
   * Days after the request before the one reminder, for products still not
   * reviewed. `null` turns the reminder off. There is never a second one.
   */
  reminderAfterDays: 7 as number | null,

  /**
   * An order delivered longer ago than this is never asked.
   *
   * It is what keeps the first deploy from writing to every order ever
   * delivered, and a stalled server from sending a pile of stale requests
   * when it comes back.
   */
  maxAgeDays: 14,

  /**
   * If the reminder could not go out within this many days of falling due —
   * the server was down, say — it is dropped rather than sent late.
   */
  reminderGraceDays: 3,

  /** How long the link in the email keeps working, counted from delivery. */
  linkValidDays: 120,

  /** How often the server looks for requests that have fallen due. */
  sweepEveryMinutes: 15,
} as const;
