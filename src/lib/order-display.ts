import type { Order } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/**
 * The two facts every customer order screen repeats — when, and with whom —
 * worked out once so four screens cannot disagree about them.
 *
 * Both had been written inline on each screen, and each screen got them wrong
 * the same way: it printed the checkout PROMISE (estimatedDelivery) after the
 * words "Delivered on", and the courier line knew only two states, booked or
 * "being packed". A delivered order therefore showed a delivery date in the
 * future and claimed to be waiting for a courier.
 */

type DeliveryFacts = Pick<Order, "status" | "estimatedDelivery" | "deliveredAt">;
type CourierFacts = Pick<Order, "status" | "courier" | "awb">;

/** Label and value for the "when" line, e.g. "Delivered on" / "Mon, 21 Sept". */
export function deliveryFact(
  order: DeliveryFacts,
  style: "day" | "short" = "day",
): { label: string; value: string } {
  switch (order.status) {
    case "delivered":
    case "returned":
      // A returned order was delivered first; the date it arrived still stands.
      return {
        label: "Delivered on",
        value: order.deliveredAt ? formatDate(order.deliveredAt, style) : "Date not recorded",
      };
    case "cancelled":
      return { label: "Delivery", value: "Cancelled" };
    default:
      return { label: "Expected by", value: formatDate(order.estimatedDelivery, style) };
  }
}

/**
 * The same fact as one short sentence, for a list row: "Delivered on 21 Sept",
 * "Arriving by Wed, 23 Sept", "Cancelled — not delivered". A returned or
 * cancelled order used to read "Arriving by…" on the orders list.
 */
export function deliverySentence(order: DeliveryFacts): string {
  if (order.status === "cancelled") return "Cancelled — not delivered";
  const { label, value } = deliveryFact(order, order.status === "delivered" || order.status === "returned" ? "short" : "day");
  return label === "Expected by" ? `Arriving by ${value}` : `${label} ${value}`;
}

/**
 * Who is carrying it, said as truthfully as the order allows.
 *
 * An AWB is the only proof a courier has the parcel, so it wins whenever there
 * is one. Without it the line follows the order's own state instead of
 * assuming it is still on the packing table.
 */
export function courierLine(order: CourierFacts): string {
  if (order.awb) return order.courier ? `${order.courier} · ${order.awb}` : order.awb;

  switch (order.status) {
    case "delivered":
    case "returned":
      // Delivered without a courier booking — handed over some other way.
      return order.courier || "Delivered";
    case "cancelled":
      return "Not shipped";
    case "shipped":
    case "out_for_delivery":
      return order.courier || "Tracking number not added yet";
    case "packed":
      return "Packed — booking soon";
    default:
      return "Being packed — booking soon";
  }
}
