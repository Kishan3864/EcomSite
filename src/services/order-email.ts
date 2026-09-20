import "server-only";

import { db } from "@/lib/db";
import { buildOrderConfirmation } from "@/lib/emails/order";
import { sendMail } from "@/lib/mail";
import { orderToken } from "@/lib/order-token";

/**
 * Tells the customer their order is confirmed.
 *
 * Called from every place an order becomes real — the gateway's verified
 * answer, a UPI credit the owner has seen, a cash-on-delivery order at
 * checkout — so there is one email and one wording rather than three.
 *
 * Never awaited by the caller's transaction and never allowed to throw: an
 * order that is paid for is paid for whether or not Gmail was reachable at
 * that moment, and failing the payment because the receipt bounced would be
 * the wrong way round.
 */

const LABEL: Record<string, string> = {
  ONLINE: "Online payment",
  UPI: "UPI",
  CARD: "Card",
  NETBANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Cash on delivery",
};

/**
 * Builds the confirmation for a real order, or null if there is nothing to send
 * to. Separated from the sending so the exact mail a customer would get can be
 * rendered and inspected without a mail server — see /preview/emails.
 */
export async function renderOrderConfirmation(orderId: string) {
  {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        placedAt: true,
        contactName: true,
        contactEmail: true,
        itemsTotal: true,
        productDiscount: true,
        shipping: true,
        tax: true,
        total: true,
        paymentStatus: true,
        invoiceNumber: true,
        paymentMethod: true,
        paymentDetail: true,
        paymentRef: true,
        shipName: true,
        shipLine1: true,
        shipLine2: true,
        shipCity: true,
        shipState: true,
        shipPincode: true,
        estimatedDelivery: true,
        lines: { select: { title: true, quantity: true, price: true, image: true, variantLabel: true } },
      },
    });
    if (!order?.contactEmail) return null;

    const mail = buildOrderConfirmation({
      ...order,
      orderId: order.id,
      // What the money has actually done. COD is never "paid" here: the
      // courier has not collected it yet, and the email says so.
      // Signed, so the links work for a reader with no session cookie.
      viewToken: orderToken(order.id),
      cod: order.paymentMethod === "COD",
      paid: order.paymentStatus === "PAID",
      // The detail is the gateway's own words ("UPI · HDFC"); the method is
      // our column. Prefer the detail when there is one — it is more use to a
      // customer matching this against their bank statement.
      paymentLabel: order.paymentDetail?.trim() || LABEL[order.paymentMethod] || "Online payment",
    });

    return { to: order.contactEmail, ...mail };
  }
}

/**
 * Tells the customer their order is confirmed. Never awaited by a caller's
 * transaction and never allowed to throw.
 */
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  try {
    const mail = await renderOrderConfirmation(orderId);
    if (!mail) return;
    await sendMail(mail);
  } catch (error) {
    console.error("[order-email]", orderId, error instanceof Error ? error.message : error);
  }
}
