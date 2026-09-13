import type { CartLine, DeliveryOption, OrderTotals } from "./types";

/**
 * Rates the shop owner controls from Settings. The defaults here match the
 * seeded values and are only a fallback — everything that can reach the
 * database passes the real ones in.
 */
export interface Rates {
  freeThreshold: number;
  standardFee: number;
  gstRate: number;
}

export const DEFAULT_RATES: Rates = { freeThreshold: 999, standardFee: 79, gstRate: 18 };

export function computeTotals(
  lines: CartLine[],
  options: {
    delivery?: DeliveryOption | null;
    rates?: Rates;
  } = {},
): OrderTotals {
  const rates = options.rates ?? DEFAULT_RATES;
  const itemsTotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const mrpTotal = lines.reduce((sum, l) => sum + l.mrp * l.quantity, 0);
  const productDiscount = mrpTotal - itemsTotal;

  const baseShipping = options.delivery?.price ?? 0;
  const qualifiesFree = itemsTotal >= rates.freeThreshold;

  const shipping =
    options.delivery?.id === "standard" ? (qualifiesFree ? 0 : rates.standardFee) : baseShipping;

  const payable = itemsTotal + shipping;
  const tax = Math.round(payable - payable / (1 + rates.gstRate / 100));

  return {
    itemsTotal,
    mrpTotal,
    productDiscount,
    shipping,
    tax,
    total: payable,
    savings: productDiscount + (baseShipping - shipping),
  };
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/** Slowest line in the cart decides the promise shown to the customer. */
export function estimatedDelivery(lines: CartLine[], delivery?: DeliveryOption | null) {
  const slowest = lines.reduce((max, l) => Math.max(max, l.deliveryDays), 1);
  const min = Math.max(delivery?.minDays ?? 3, slowest);
  const max = Math.max(delivery?.maxDays ?? 5, min + 1);
  const from = new Date();
  from.setDate(from.getDate() + min);
  const to = new Date();
  to.setDate(to.getDate() + max);
  return { from, to, minDays: min, maxDays: max };
}
