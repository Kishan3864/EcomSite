import type { CartLine, DeliveryOption, Offer, OrderTotals } from "./types";

export const FREE_SHIPPING_THRESHOLD = 999;
export const GST_RATE = 0.18;

export interface CouponResult {
  code: string;
  discount: number;
  label: string;
}

/** Mirrors the rules a pricing service would enforce server-side. */
export function evaluateCoupon(
  offer: Offer | null | undefined,
  itemsTotal: number,
  categories: string[],
): { ok: boolean; discount: number; reason?: string } {
  if (!offer) return { ok: false, discount: 0, reason: "That code is not valid." };
  if (new Date(offer.expiresAt) < new Date())
    return { ok: false, discount: 0, reason: "This offer has expired." };
  if (itemsTotal < offer.minSpend)
    return {
      ok: false,
      discount: 0,
      reason: `Add items worth ${(offer.minSpend - itemsTotal).toLocaleString("en-IN")} more to use this code.`,
    };
  if (offer.categorySlug && !categories.includes(offer.categorySlug))
    return { ok: false, discount: 0, reason: "This code applies to a different category." };

  if (offer.type === "shipping") return { ok: true, discount: 0 };

  const raw = offer.type === "percent" ? (itemsTotal * offer.value) / 100 : offer.value;
  const discount = Math.round(Math.min(raw, offer.maxDiscount ?? raw));
  return { ok: true, discount };
}

export function computeTotals(
  lines: CartLine[],
  options: {
    delivery?: DeliveryOption | null;
    coupon?: { code: string; discount: number; type?: Offer["type"] } | null;
  } = {},
): OrderTotals {
  const itemsTotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const mrpTotal = lines.reduce((sum, l) => sum + l.mrp * l.quantity, 0);
  const productDiscount = mrpTotal - itemsTotal;

  const couponDiscount = options.coupon?.discount ?? 0;

  const baseShipping = options.delivery?.price ?? 0;
  const qualifiesFree = itemsTotal >= FREE_SHIPPING_THRESHOLD;
  const waivedByCoupon = options.coupon?.type === "shipping";

  const shipping =
    options.delivery?.id === "standard"
      ? qualifiesFree
        ? 0
        : 79
      : waivedByCoupon
        ? 0
        : baseShipping;

  const payable = Math.max(0, itemsTotal - couponDiscount) + shipping;
  const tax = Math.round(payable - payable / (1 + GST_RATE));

  return {
    itemsTotal,
    mrpTotal,
    productDiscount,
    couponCode: options.coupon?.code,
    couponDiscount,
    shipping,
    tax,
    total: payable,
    savings: productDiscount + couponDiscount + (baseShipping - shipping),
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
