/**
 * When the shop asks a customer to review what they bought.
 *
 * Change `delayDays` to move the ask; everything else follows from it. The
 * sending itself lives in src/services/order-reviews.ts and runs on a timer
 * started in src/instrumentation-node.ts.
 */
export const REVIEW_REQUESTS = {
  /**
   * Days after delivery before the request email goes out.
   *
   * 0 means on delivery: it follows straight after the "delivered" email (and
   * the courier sync), and its wording changes to "once you have had a chance
   * to use it" rather than claiming days of use. The "How was it?" panel on the
   * track and order pages appears on delivery whatever this says. Set it back
   * to 2 or 3 to give people time to open the box before the email asks.
   */
  delayDays: 0 as number,

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
