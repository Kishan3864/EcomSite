import "server-only";

import { after } from "next/server";
import { db } from "@/lib/db";
import { mailConfigured, sendMail } from "@/lib/mail";
import { orderToken } from "@/lib/order-token";
import { buildOrderUpdate, type OrderEmailKind } from "@/lib/emails/order-updates";

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

    case "cancelled":
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
      // The only email in the set that asserts money actually moved, so it is
      // the strictest: the gateway must have said so.
      return order.refunds.some((r) => r.status === "SUCCESS")
        ? { ok: true }
        : { ok: false, why: "no refund on this order has been confirmed successful" };

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
  returns: {
    select: {
      status: true,
      reason: true,
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
    refundAmount: latestRefund ? Math.round(latestRefund.amount / 100) : (activeReturn?.refundAmount ?? null),
    refundDestination: refundDestination(order.paymentMethod),
    refundRef: (kind === "refund-completed" ? successful?.requestId : null) ?? null,
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
