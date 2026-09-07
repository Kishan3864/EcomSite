import type {
  Address,
  CartLine,
  DeliveryOption,
  Order,
  OrderTotals,
  PaymentMethod,
} from "./types";
import { buildTracking } from "@/data/orders";
import { estimatedDelivery } from "./pricing";

/**
 * Assembles the Order object the confirmation, history and tracking screens all
 * read. When a real backend exists this becomes the response body of
 * `POST /api/orders` — the shape does not change.
 */
export function buildOrder(input: {
  lines: CartLine[];
  address: Address;
  delivery: DeliveryOption;
  paymentMethod: PaymentMethod;
  totals: OrderTotals;
}): Order {
  const placedAt = new Date();
  const sequence = 5000 + Math.floor(Math.random() * 4000);
  const number = `MYR-${placedAt.getFullYear()}-${String(sequence).padStart(6, "0")}`;
  const eta = estimatedDelivery(input.lines, input.delivery);

  return {
    id: `ord_${sequence}`,
    number,
    placedAt: placedAt.toISOString(),
    status: "confirmed",
    lines: input.lines,
    address: input.address,
    delivery: input.delivery,
    paymentMethod: input.paymentMethod,
    totals: input.totals,
    estimatedDelivery: eta.to.toISOString(),
    tracking: buildTracking("confirmed", placedAt.toISOString()),
    courier: input.delivery.id === "express" ? "Mayura Express" : "Mayura Fleet",
    awb: `MYRX${sequence}${placedAt.getMonth() + 1}${placedAt.getDate()}`,
  };
}
