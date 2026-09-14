import "server-only";

import { db } from "@/lib/db";

/**
 * Putting stock back when an order is never paid for.
 *
 * placeOrder takes stock off the shelf the moment an order is written, so an
 * abandoned checkout would otherwise hold those units for good. This runs
 * lazily, piggy-backing on checkout traffic, so it needs no scheduler.
 *
 * Releasing an order is not final. If the money turns up afterwards — a bank
 * that took its time, a webhook that arrived late — the payment path revives
 * the order and takes the stock back (see `applyPayuResponse` and
 * `confirmUpiPayment`), because money taken is an order owed.
 */

/** A gateway order that has not been paid for this long is released. */
export const PENDING_EXPIRY_MINUTES = 45;

/**
 * A UPI order is given far longer than a gateway one. There is no window to
 * close and no callback to lose: the customer may well pay from another phone,
 * or come back after lunch, and releasing their stock underneath them would
 * turn a slow payment into a cancelled order. Only orders where nothing has
 * been reported are swept — once a reference is in, a human decides.
 */
export const UPI_EXPIRY_MINUTES = 12 * 60;

export async function expireStalePendingOrders(scope?: {
  /** Only this customer's orders — used when they are placing a fresh one. */
  customerId?: string;
  /** Override the shop-wide window; a customer superseding their own can be short. */
  olderThanMinutes?: number;
  /** Which kind of unpaid order to release. Gateway orders by default. */
  method?: "ONLINE" | "UPI";
}): Promise<number> {
  const minutes =
    scope?.olderThanMinutes ?? (scope?.method === "UPI" ? UPI_EXPIRY_MINUTES : PENDING_EXPIRY_MINUTES);
  const cutoff = new Date(Date.now() - minutes * 60_000);

  const stale = await db.order.findMany({
    where: {
      // PENDING is "nothing reported yet"; FAILED is "the gateway said no".
      // Both are unpaid orders sitting on stock. VERIFYING is neither: a
      // customer has given a reference and it waits for a person, not a clock.
      paymentStatus: { in: ["PENDING", "FAILED"] },
      status: { notIn: ["CANCELLED", "RETURNED"] },
      paymentMethod: scope?.method ?? "ONLINE",
      placedAt: { lt: cutoff },
      ...(scope?.customerId ? { customerId: scope.customerId } : {}),
    },
    select: { id: true, lines: { select: { productId: true, quantity: true } } },
    take: 50,
  });

  for (const order of stale) {
    await db.$transaction(async (tx) => {
      // Re-check inside the transaction: a payment may have landed since the
      // query above ran.
      const current = await tx.order.findUnique({
        where: { id: order.id },
        select: { paymentStatus: true, status: true },
      });
      if (!current) return;
      if (current.paymentStatus === "PAID" || current.paymentStatus === "VERIFYING") return;
      if (current.status === "CANCELLED" || current.status === "RETURNED") return;

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "FAILED",
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: "Not paid for in time; the items were released.",
        },
      });
      await tx.paymentAttempt.updateMany({
        where: { orderId: order.id, status: "CREATED" },
        data: { status: "FAILED", failureDescription: "Expired without payment" },
      });
      for (const line of order.lines) {
        if (!line.productId) continue;
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { increment: line.quantity }, soldCount: { decrement: line.quantity } },
        });
      }
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          title: "Order released",
          description: `No payment was received within ${minutes < 60 ? `${minutes} minutes` : `${Math.round(minutes / 60)} hours`}, so the items went back on sale. If the money has since left your account, contact us and we will sort it out.`,
          location: "Online",
        },
      });
    });
  }

  return stale.length;
}
