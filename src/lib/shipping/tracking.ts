import "server-only";

import { after } from "next/server";
import { db } from "@/lib/db";
import { delhiveryConfig, mapDelhiveryStatus, trackWaybill, type Tracking } from "@/lib/shipping/delhivery";

/**
 * Pulls Delhivery's scans into an order's own timeline, so the customer's order
 * page shows where the parcel actually is without anyone in the admin panel
 * typing it in.
 *
 * Deliberately not a server action: a browser must not be able to make this
 * server call Delhivery on demand. The order pages call it while rendering,
 * throttled; the admin panel calls it on a button.
 */

const ORDER_FLOW = ["CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
const SYNC_INTERVAL_MS = 20 * 60_000;

/** Has this order's tracking been pulled recently enough to trust? */
export function trackingIsFresh(row: { trackingSyncedAt: Date | null }) {
  return !!row.trackingSyncedAt && Date.now() - row.trackingSyncedAt.getTime() < SYNC_INTERVAL_MS;
}

/**
 * Safe to call often: it records only scans it has not seen, never moves a
 * status backwards, and swallows a courier outage — an order page must render
 * whether or not Delhivery is answering.
 */
export async function syncTracking(orderId: string, options: { force?: boolean } = {}): Promise<Tracking | null> {
  const config = delhiveryConfig();
  if (!config) return null;

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      courier: true,
      awb: true,
      status: true,
      shipCity: true,
      trackingSyncedAt: true,
      events: { where: { actorName: "Delhivery" }, select: { at: true, title: true } },
    },
  });
  if (!order?.awb || order.courier !== "Delhivery") return null;
  if (order.status === "CANCELLED" || order.status === "RETURNED") return null;
  if (!options.force && trackingIsFresh(order)) return null;

  let tracking: Tracking | null;
  try {
    tracking = await trackWaybill(config, order.awb);
  } catch (error) {
    console.error("[shipping] tracking", order.awb, error instanceof Error ? error.message : error);
    return null;
  }

  const seen = new Set(order.events.map((e) => `${e.at.toISOString()}|${e.title}`));
  const mapped = tracking ? mapDelhiveryStatus(tracking) : null;
  let deliveredNow = false;

  await db.$transaction(async (tx) => {
    for (const scan of tracking?.scans ?? []) {
      const at = new Date(scan.at);
      if (Number.isNaN(at.getTime())) continue;
      // Only scans that mean something on the five-step timeline; the rest
      // are courier-internal and would only be noise to a customer.
      const status = mapDelhiveryStatus({ ...tracking!, status: scan.scan, statusType: "" });
      if (!status) continue;
      const title = scan.scan;
      if (seen.has(`${at.toISOString()}|${title}`)) continue;
      seen.add(`${at.toISOString()}|${title}`);
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status,
          title,
          description: scan.instructions,
          location: scan.location || order.shipCity,
          at,
          actorName: "Delhivery",
        },
      });
    }

    // Forwards only: a courier scan never un-delivers an order.
    const from = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number]);
    const to = mapped ? ORDER_FLOW.indexOf(mapped) : -1;
    const advance = mapped !== null && to > from;
    deliveredNow = advance && mapped === "DELIVERED";
    const eta = tracking?.expectedDelivery ? new Date(tracking.expectedDelivery) : null;

    await tx.order.update({
      where: { id: order.id },
      data: {
        trackingSyncedAt: new Date(),
        ...(advance ? { status: mapped } : {}),
        // Cash on delivery is collected at the door: delivered means paid.
        ...(advance && mapped === "DELIVERED" ? { deliveredAt: new Date(), paymentStatus: "PAID" } : {}),
        ...(eta && !Number.isNaN(eta.getTime()) ? { estimatedDelivery: eta } : {}),
      },
    });
  });

  /**
   * A courier scan just marked it delivered: ask for the review now rather
   * than at the next sweep, as the admin button's path does. In after(), so a
   * slow mail server never holds up the order page that triggered the sync;
   * outside a request (a script) there is no after(), and the timer picks it
   * up within a quarter of an hour instead.
   */
  if (deliveredNow) {
    try {
      after(async () => {
        const { sendReviewRequestIfDue } = await import("@/services/order-reviews");
        await sendReviewRequestIfDue(order.id);
      });
    } catch {
      // No request scope; the review-request timer covers it.
    }
  }

  return tracking;
}
