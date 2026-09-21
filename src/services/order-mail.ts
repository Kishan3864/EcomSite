import "server-only";

import { after } from "next/server";
import { db } from "@/lib/db";
import { mailConfigured, sendMail } from "@/lib/mail";
import { orderToken } from "@/lib/order-token";
import { buildOrderUpdate, type OrderEmailKind } from "@/lib/emails/order-updates";
import type { ReviewEmailKind } from "@/lib/emails/review-request";
import { refundWindowText } from "./refunds";

/**
 * The one way an order lifecycle email is sent.
 *
 * Every trigger — a gateway callback, an admin button, a courier sync — calls
 * `sendOrderMail(orderId, kind)` and nothing else. That keeps three promises
 * that were easy to break when each caller sent its own mail:
 *
 *  1. It is sent once. `Order.emailsSent` records the kinds already sent, and a
 *     kind already in the list is skipped. PayU retries its callback, a courier
 *     sync runs every twenty minutes and an admin can click twice; none of them
 *     should mean a second "your order has shipped".
 *  2. It never breaks the thing that triggered it. The whole call is wrapped,
 *     runs inside after() so the response has already gone, and a failure is
 *     logged rather than thrown. An order that shipped has shipped whether or
 *     not the mail server was reachable.
 *  3. It cannot claim what has not happened. Each kind states what must be true
 *     of the row before it will send, and the guard is here rather than in the
 *     caller so that a new caller cannot forget it.
 */

/** The courier's own tracking page, when we know how to build one. */
function courierTrackingUrl(courier: string | null, awb: string | null): string | null {
  if (!courier || !awb) return null;
  if (/delhivery/i.test(courier)) return `https://www.delhivery.com/track-v2/package/${encodeURIComponent(awb)}`;
  return null;
}

/** Where a refund goes back to, said the way a customer would say it. */
function refundDestination(method: string): string | null {
  switch (method) {
    case "UPI":
      return "the UPI account you paid from";
    case "CARD":
      return "the card you paid with";
    case "NETBANKING":
      return "the bank account you paid from";
    case "WALLET":
      return "the wallet you paid from";
    case "COD":
      // Nothing was ever paid online, so there is nothing to send back the same
      // way. Support arranges these by hand.
      return null;
    default:
      return "the account you paid from";
  }
}

/**
 * Whether the order is really in the state this email would claim.
 *
 * This is Rule One in code. The email text says a thing happened; if the row
 * does not show it happened, the email is not sent, however enthusiastically it
 * was asked for.
 */
function truthful(kind: OrderEmailKind, order: OrderRow): { ok: true } | { ok: false; why: string } {
  switch (kind) {
    case "placed":
      // Never routed through here — the confirmation has its own builder. It
      // is in the union so it can hold a slot in emailsSent.
      return { ok: false, why: "the confirmation is sent by sendOrderConfirmation" };

    case "packed":
      // Packed is a real, observable step: somebody moved the order to PACKED.
      // Anything at or past it is fine, since a later state implies this one.
      return ["PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)
        ? { ok: true }
        : { ok: false, why: `status is ${order.status}, not PACKED or beyond` };

    case "return-requested":
      return order.returns.length > 0
        ? { ok: true }
        : { ok: false, why: "no return has been raised on this order" };

    case "return-rejected":
      return order.returns.some((r) => r.status === "REJECTED")
        ? { ok: true }
        : { ok: false, why: "no return on this order has been rejected" };

    case "payment-received":
      return order.paymentStatus === "PAID"
        ? { ok: true }
        : { ok: false, why: `paymentStatus is ${order.paymentStatus}, not PAID` };

    case "payment-failed":
      return order.paymentStatus === "FAILED"
        ? { ok: true }
        : { ok: false, why: `paymentStatus is ${order.paymentStatus}, not FAILED` };

    case "shipped":
      // An AWB is the proof a courier has actually taken it. Without one,
      // "shipped" is somebody's intention.
      return order.awb
        ? { ok: true }
        : { ok: false, why: "no AWB on the order, so nothing has been handed to a courier" };

    case "out-for-delivery":
      return order.status === "OUT_FOR_DELIVERY"
        ? { ok: true }
        : { ok: false, why: `status is ${order.status}, not OUT_FOR_DELIVERY` };

    case "delivered":
      return order.deliveredAt
        ? { ok: true }
        : { ok: false, why: "deliveredAt is not set" };

    case "cancelled-by-shop":
    case "cancelled-by-you":
      // Which of the two is a fact about who pressed the button, which only the
      // caller knows; both require the order to actually be cancelled.
      return order.status === "CANCELLED"
        ? { ok: true }
        : { ok: false, why: `status is ${order.status}, not CANCELLED` };

    case "refund-raised":
      // Raised means a refund row exists. It does not mean money moved, and the
      // email says exactly that.
      return order.refunds.length > 0
        ? { ok: true }
        : { ok: false, why: "no refund has been raised on this order" };

    case "refund-completed":
      /**
       * The only email in the set that asserts money actually moved, so it is
       * the strictest. Two things count, and nothing else does: the gateway
       * confirming SUCCESS, or a person recording a manual transfer with a
       * reference against their name. A COD order has no capture to reverse,
       * so without the second it could never honestly send this at all.
       */
      return order.refunds.some((r) => r.status === "SUCCESS") || order.manualRefunds.length > 0
        ? { ok: true }
        : { ok: false, why: "no refund on this order has been confirmed successful" };

    case "refund-failed":
      /**
       * The gateway refused it, or answered OD_HIT. Guarded as strictly as the
       * success case and for the same reason: telling somebody their refund
       * needs another attempt, when it is quietly on its way, is its own kind
       * of false alarm.
       */
      return order.refunds.some((r) => ["FAILURE", "OD_HIT"].includes(r.status))
        ? { ok: true }
        : { ok: false, why: "no refund on this order has been refused by the gateway" };

    case "return-approved":
      return order.returns.some((r) => ["APPROVED", "PICKED_UP", "REFUNDED"].includes(r.status))
        ? { ok: true }
        : { ok: false, why: "no return on this order has been approved" };

    case "return-picked-up":
      return order.returns.some((r) => ["PICKED_UP", "REFUNDED"].includes(r.status))
        ? { ok: true }
        : { ok: false, why: "no return on this order has been collected" };
  }
}

const SELECT = {
  id: true,
  number: true,
  contactName: true,
  contactEmail: true,
  total: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  courier: true,
  awb: true,
  estimatedDelivery: true,
  deliveredAt: true,
  cancelledAt: true,
  cancelReason: true,
  emailsSent: true,
  refunds: { select: { amount: true, status: true, requestId: true, createdAt: true } },
  manualRefunds: { select: { amount: true, reference: true, recordedAt: true } },
  returns: {
    select: {
      status: true,
      reason: true,
      adminNote: true,
      refundAmount: true,
      orderLine: { select: { title: true, quantity: true } },
    },
  },
} as const;

type OrderRow = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

function loadOrder(orderId: string) {
  return db.order.findUnique({ where: { id: orderId }, select: SELECT });
}

/**
 * Builds the mail for a kind, or explains why it will not be sent. Exported so
 * /preview/emails can render the real thing for a real order without sending.
 */
export async function renderOrderMail(
  orderId: string,
  kind: OrderEmailKind,
): Promise<{ ok: true; mail: { to: string; subject: string; html: string; text: string } } | { ok: false; why: string }> {
  const order = await loadOrder(orderId);
  if (!order) return { ok: false, why: "no such order" };
  if (!order.contactEmail) return { ok: false, why: "the order has no email address on it" };

  const honest = truthful(kind, order);
  if (!honest.ok) return honest;

  const manual = order.manualRefunds[order.manualRefunds.length - 1];
  const successful = order.refunds.find((r) => r.status === "SUCCESS");
  const latestRefund = successful ?? order.refunds[order.refunds.length - 1];
  const activeReturn = order.returns[order.returns.length - 1];

  const mail = buildOrderUpdate({
    kind,
    number: order.number,
    orderId: order.id,
    contactName: order.contactName,
    total: order.total,
    viewToken: orderToken(order.id),
    courier: order.courier,
    awb: order.awb,
    trackingUrl: courierTrackingUrl(order.courier, order.awb),
    estimatedDelivery: order.estimatedDelivery,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
    cancelReason: order.cancelReason,
    // For "completed" only the confirmed refund's amount is quoted; for
    // "raised" the newest one, which is the one just raised.
    // Refund.amount is PAISE (it matches PaymentAttempt.amount); every figure
    // in an email is whole rupees. Quoting it unconverted would tell a
    // customer they are getting a hundred times their money back.
    refundAmount: latestRefund
      ? Math.round(latestRefund.amount / 100)
      : // ManualRefund.amount is already whole rupees — typed in by a person
        // reading a bank app — so it is NOT divided by a hundred.
        (manual?.amount ?? activeReturn?.refundAmount ?? null),
    refundDestination: refundDestination(order.paymentMethod),
    // Quoted from the shop's own published policy, never invented here.
    refundWindow: refundWindowText(),
    /**
     * The shop's note, not the customer's.
     *
     * ReturnRequest.reason is why the CUSTOMER wanted to return it ("arrived
     * damaged"). adminNote is why it was turned down. This read the first and
     * printed it as the rejection reason, so the email told somebody their
     * return was refused because "arrived damaged" — quoting their own words
     * back at them as the shop's justification.
     */
    rejectReason: order.returns.find((r) => r.status === "REJECTED")?.adminNote ?? null,
    refundRef:
      (kind === "refund-completed" ? (successful?.requestId ?? manual?.reference) : null) ?? null,
    returnItems: activeReturn?.orderLine
      ? [`${activeReturn.orderLine.title} × ${activeReturn.orderLine.quantity}`]
      : null,
  });

  return { ok: true, mail: { to: order.contactEmail, ...mail } };
}

/**
 * Sends one lifecycle email, once, without ever throwing.
 *
 * Callers use it as `void sendOrderMail(id, "shipped")` and carry on; the work
 * happens in after(), so a slow SMTP server cannot hold up the admin action or
 * the gateway callback that asked for it.
 */
export function sendOrderMail(orderId: string, kind: OrderEmailKind): void {
  after(async () => {
    try {
      if (!mailConfigured()) return;

      // Re-read inside after(): the transaction that triggered this has
      // committed by now, so this sees the state the email will describe.
      const order = await loadOrder(orderId);
      if (!order) return;
      if (order.emailsSent.includes(kind)) return;

      const built = await renderOrderMail(orderId, kind);
      if (!built.ok) {
        // Worth a line in the log: it means a trigger fired for a state the
        // order is not in, which is a bug in the caller rather than in the mail.
        console.warn(`[order-mail] ${kind} not sent for ${orderId}: ${built.why}`);
        return;
      }

      const sent = await sendMail(built.mail);
      if (!sent) return;

      // Recorded only after the server accepted it, so a failed send is retried
      // the next time the trigger fires rather than silently swallowed.
      await db.order.update({
        where: { id: orderId },
        data: { emailsSent: { push: kind } },
      });
    } catch (error) {
      console.error("[order-mail]", kind, orderId, error instanceof Error ? error.message : error);
    }
  });
}

/**
 * Builds any kind for any order, ignoring whether it would be truthful.
 *
 * ONLY for the admin's "send me a test copy" button, which delivers to the
 * admin and never to the customer. The truthfulness guard exists to stop a
 * customer being told something untrue; showing the owner what a "delivered"
 * email looks like on an order that has not shipped tells nobody anything
 * false, and is the only way to check a template without waiting for a courier.
 *
 * It never writes to emailsSent, so using it cannot consume the customer's real
 * send.
 */
export async function renderOrderMailForPreview(
  orderId: string,
  kind: OrderEmailKind | ReviewEmailKind,
): Promise<{ subject: string; html: string; text: string } | null> {
  // The review request and its reminder are sent on a timer, not through
  // sendOrderMail, but they are order emails all the same and can be checked
  // from the same card.
  if (kind === "review-request" || kind === "review-reminder") {
    const { renderReviewMail } = await import("./order-reviews");
    const built = await renderReviewMail(orderId, kind, { ignoreRules: true });
    return built.ok ? { subject: built.mail.subject, html: built.mail.html, text: built.mail.text } : null;
  }

  // The confirmation has its own builder, with the lines and the totals.
  if (kind === "placed") {
    const { renderOrderConfirmation } = await import("./order-email");
    const mail = await renderOrderConfirmation(orderId);
    return mail ? { subject: mail.subject, html: mail.html, text: mail.text } : null;
  }

  const order = await loadOrder(orderId);
  if (!order) return null;

  const successful = order.refunds.find((r) => r.status === "SUCCESS");
  const latestRefund = successful ?? order.refunds[order.refunds.length - 1];
  const manual = order.manualRefunds[order.manualRefunds.length - 1];
  const activeReturn = order.returns[order.returns.length - 1];

  return buildOrderUpdate({
    kind,
    number: order.number,
    orderId: order.id,
    contactName: order.contactName,
    total: order.total,
    viewToken: orderToken(order.id),
    courier: order.courier,
    awb: order.awb,
    trackingUrl: courierTrackingUrl(order.courier, order.awb),
    estimatedDelivery: order.estimatedDelivery,
    deliveredAt: order.deliveredAt ?? new Date(),
    cancelledAt: order.cancelledAt ?? new Date(),
    cancelReason: order.cancelReason,
    refundAmount: latestRefund
      ? Math.round(latestRefund.amount / 100)
      : (manual?.amount ?? activeReturn?.refundAmount ?? order.total),
    refundDestination: refundDestination(order.paymentMethod),
    refundRef: successful?.requestId ?? manual?.reference ?? null,
    refundWindow: refundWindowText(),
    rejectReason: activeReturn?.adminNote ?? null,
    returnItems: activeReturn?.orderLine
      ? [`${activeReturn.orderLine.title} × ${activeReturn.orderLine.quantity}`]
      : null,
  });
}
