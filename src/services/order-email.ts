import "server-only";

import { db } from "@/lib/db";
import { buildOrderConfirmation } from "@/lib/emails/order";
import { sendMail } from "@/lib/mail";

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

export async function sendOrderConfirmation(orderId: string): Promise<void> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        placedAt: true,
        contactName: true,
        contactEmail: true,
        itemsTotal: true,
        shipping: true,
        total: true,
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
        lines: { select: { title: true, quantity: true, price: true } },
      },
    });
    if (!order?.contactEmail) return;

    const mail = buildOrderConfirmation({
      ...order,
      orderId: order.id,
      // The detail is the gateway's own words ("UPI · HDFC"); the method is
      // our column. Prefer the detail when there is one — it is more use to a
      // customer matching this against their bank statement.
      paymentLabel: order.paymentDetail?.trim() || LABEL[order.paymentMethod] || "Online payment",
    });

    await sendMail({ to: order.contactEmail, ...mail });
  } catch (error) {
    console.error("[order-email]", orderId, error instanceof Error ? error.message : error);
  }
}
