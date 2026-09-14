import "server-only";

import { db } from "@/lib/db";

/**
 * Who may review a product, and why not.
 *
 * Only someone the product actually reached. Not "signed in", not "ordered" —
 * delivered. A review is a report on living with the thing, and one written
 * before it arrives is a report on nothing. A shop whose reviews all come from
 * people who own the product is worth more to the next shopper than one whose
 * star rating anybody can move.
 *
 * Reading reviews needs none of this. Everyone sees them.
 *
 * Kept out of the "use server" module on purpose: every export of one of those
 * is an endpoint, and this takes a customer id — as an action it would let
 * anyone ask what anyone else had bought. The action wrapper supplies the id
 * from the caller's own session.
 */

export type ReviewEligibility =
  | { can: true; orderNumber: string }
  | { can: false; reason: "signin" }
  | { can: false; reason: "not-bought" }
  | { can: false; reason: "awaiting-delivery"; expected: string; orderNumber: string }
  | { can: false; reason: "already"; status: "pending" | "published" | "hidden" };

/** Delivered, or delivered and sent back — either way it reached them. */
const RECEIVED = ["DELIVERED", "RETURNED"] as const;

export async function reviewEligibilityFor(
  customerId: string,
  productId: string,
): Promise<ReviewEligibility> {
  // One review per customer per product. Theirs already exists, or it does not.
  const mine = await db.review.findFirst({
    where: { productId, customerId },
    select: { status: true },
    orderBy: { createdAt: "desc" },
  });
  if (mine) {
    return {
      can: false,
      reason: "already",
      status:
        mine.status === "APPROVED" ? "published" : mine.status === "HIDDEN" ? "hidden" : "pending",
    };
  }

  const received = await db.orderLine.findFirst({
    where: { productId, order: { customerId, status: { in: [...RECEIVED] } } },
    select: { order: { select: { number: true } } },
    orderBy: { order: { placedAt: "desc" } },
  });
  if (received) return { can: true, orderNumber: received.order.number };

  // Bought, but not with them yet. Worth saying when, rather than a flat no.
  const onTheWay = await db.orderLine.findFirst({
    where: {
      productId,
      order: { customerId, status: { notIn: ["CANCELLED", "RETURNED", "PENDING"] } },
    },
    select: { order: { select: { number: true, estimatedDelivery: true } } },
    orderBy: { order: { placedAt: "desc" } },
  });
  if (onTheWay) {
    return {
      can: false,
      reason: "awaiting-delivery",
      expected: onTheWay.order.estimatedDelivery.toISOString(),
      orderNumber: onTheWay.order.number,
    };
  }

  return { can: false, reason: "not-bought" };
}
