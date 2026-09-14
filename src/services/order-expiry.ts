import "server-only";

import { db } from "@/lib/db";

/**
 * Putting stock back when an order is never paid for.
 *
 * placeOrder takes stock off the shelf the moment an order is written, so an
 * abandoned checkout would otherwise hold those units for good.
 *
 * Releasing an order is not final. If the money turns up afterwards — a bank
 * that took its time, a webhook that arrived late, a UPI reference the owner
 * confirms tomorrow — the payment path revives the order and takes the stock
 * back, because money taken is an order owed. That is what makes releasing
 * safe enough to do without asking.
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

/**
 * How many unpaid orders one customer may hold at once.
 *
 * Not a limit they are refused at — going over it releases their oldest rather
 * than turning them away. Somebody who left two UPI orders unpaid last night
 * must still be able to buy something this morning.
 */
export const MAX_UNPAID_PER_CUSTOMER = 3;

const UNPAID = ["PENDING", "FAILED"] as const;

/**
 * Put one unpaid order's stock back and mark it cancelled.
 *
 * Re-checks inside the transaction, because a payment may have landed between
 * the decision and the write — and an order that has just been paid for must
 * never be released underneath it.
 */
export async function releaseOrder(orderId: string, reason: string): Promise<boolean> {
  let released = false;

  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        paymentStatus: true,
        status: true,
        lines: { select: { productId: true, quantity: true } },
      },
    });
    if (!order) return;
    if (order.paymentStatus === "PAID" || order.paymentStatus === "VERIFYING") return;
    if (order.status === "CANCELLED" || order.status === "RETURNED") return;

    released = true;

    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "FAILED",
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
    await tx.paymentAttempt.updateMany({
      where: { orderId, status: "CREATED" },
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
        orderId,
        status: "CANCELLED",
        title: "Order released",
        description: `${reason} If the money has since left your account, contact us and we will sort it out.`,
        location: "Online",
      },
    });
  });

  return released;
}

/**
 * Release orders nobody paid for. Runs lazily off checkout traffic, so it needs
 * no scheduler.
 */
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
      paymentStatus: { in: [...UNPAID] },
      status: { notIn: ["CANCELLED", "RETURNED"] },
      paymentMethod: scope?.method ?? "ONLINE",
      placedAt: { lt: cutoff },
      ...(scope?.customerId ? { customerId: scope.customerId } : {}),
    },
    select: { id: true },
    take: 50,
  });

  const window = minutes < 60 ? `${minutes} minutes` : `${Math.round(minutes / 60)} hours`;
  let released = 0;
  for (const order of stale) {
    if (await releaseOrder(order.id, `No payment was received within ${window}, so the items went back on sale.`)) {
      released++;
    }
  }
  return released;
}

/**
 * Keep one customer's unpaid orders within bounds by releasing their oldest,
 * rather than refusing them a new one.
 *
 * The old rule counted them and, past three, turned the customer away — which
 * on a shop whose UPI orders stay open for twelve hours meant a few unfinished
 * attempts locked someone out of buying anything at all. Stock is still
 * bounded; the person is not.
 */
export async function trimUnpaidOrders(customerId: string): Promise<number> {
  const unpaid = await db.order.findMany({
    where: {
      customerId,
      paymentStatus: { in: [...UNPAID] },
      status: { notIn: ["CANCELLED", "RETURNED"] },
      paymentMethod: { in: ["ONLINE", "UPI", "CARD", "NETBANKING", "WALLET"] },
    },
    select: { id: true },
    orderBy: { placedAt: "desc" },
  });

  // Keep room for the order about to be written: the newest few stay, the rest
  // go back on the shelf.
  let released = 0;
  for (const order of unpaid.slice(MAX_UNPAID_PER_CUSTOMER - 1)) {
    if (
      await releaseOrder(
        order.id,
        "Released to make room for a newer order you started. Nothing was charged.",
      )
    ) {
      released++;
    }
  }
  return released;
}
