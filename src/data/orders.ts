import type { Order, OrderTrackingEvent } from "@/lib/types";
import { POOL, img } from "./images";
import { savedAddresses } from "./marketing";

/**
 * Order history seeded for the demo account. Kept independent of the product
 * catalogue on purpose — order lines are historical snapshots, so a later
 * price or title change must never rewrite what a customer already bought.
 */

const TRACK_TEMPLATE: Omit<OrderTrackingEvent, "at" | "done">[] = [
  { status: "confirmed", title: "Order confirmed", description: "We have received your order and payment.", location: "WeekendCart, Bengaluru" },
  { status: "packed", title: "Packed and ready", description: "Your items are packed and handed to the courier.", location: "Fulfilment Centre, Hosur Road" },
  { status: "shipped", title: "Shipped", description: "In transit to your delivery city.", location: "Bengaluru Hub" },
  { status: "out_for_delivery", title: "Out for delivery", description: "Arriving today between 10am and 6pm.", location: "HSR Layout, Bengaluru" },
  { status: "delivered", title: "Delivered", description: "Handed over at the door. Thank you for shopping with us.", location: "HSR Layout, Bengaluru" },
];

const ORDER_STAGE: Record<string, number> = {
  confirmed: 0,
  packed: 1,
  shipped: 2,
  out_for_delivery: 3,
  delivered: 4,
};

export function buildTracking(
  status: Order["status"],
  placedAt: string,
): OrderTrackingEvent[] {
  const stage = ORDER_STAGE[status] ?? 0;
  const start = new Date(placedAt);

  return TRACK_TEMPLATE.map((event, i) => {
    const at = new Date(start);
    at.setDate(at.getDate() + i);
    at.setHours(9 + i * 3, (i * 17) % 60, 0, 0);
    return { ...event, at: at.toISOString(), done: i <= stage };
  });
}

function order(
  id: string,
  number: string,
  placedAt: string,
  status: Order["status"],
  lines: Order["lines"],
  overrides: Partial<Order> = {},
): Order {
  const itemsTotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const mrpTotal = lines.reduce((s, l) => s + l.mrp * l.quantity, 0);
  const shipping = itemsTotal >= 999 ? 0 : 79;
  const total = itemsTotal + shipping;
  const eta = new Date(placedAt);
  eta.setDate(eta.getDate() + 4);

  return {
    id,
    number,
    placedAt,
    status,
    lines,
    address: savedAddresses[0],
    delivery: {
      id: "standard",
      name: "Standard delivery",
      description: "Free on orders above ₹999.",
      price: 0,
      minDays: 3,
      maxDays: 5,
    },
    paymentMethod: {
      id: "upi",
      name: "UPI",
      description: "Paid via Google Pay",
    },
    totals: {
      itemsTotal,
      mrpTotal,
      productDiscount: mrpTotal - itemsTotal,
      couponDiscount: 0,
      shipping,
      tax: Math.round(total - total / 1.18),
      total,
      savings: mrpTotal - itemsTotal,
    },
    estimatedDelivery: eta.toISOString(),
    tracking: buildTracking(status, placedAt),
    courier: "WeekendCart Express",
    awb: `MYRX${number.replace(/\D/g, "").slice(-10)}`,
    ...overrides,
  };
}

export const demoOrders: Order[] = [
  order(
    "ord_4691",
    "MYR-2026-004691",
    "2026-08-26T11:12:00.000Z",
    "out_for_delivery",
    [
      {
        id: "p16::none",
        productId: "p16",
        slug: "novair-solace-anc",
        title: "Novair Solace ANC",
        brand: "Novair",
        categorySlug: "electronics",
        image: img(POOL.audio[1], { fit: "square", w: 240 }),
        price: 14999,
        mrp: 19999,
        quantity: 1,
        variantLabel: "Ink Black",
        stock: 54,
        deliveryDays: 1,
        freeShipping: true,
      },
      {
        id: "p22::none",
        productId: "p22",
        slug: "orbo-arc-2",
        title: "Orbo Arc 2",
        brand: "Orbo",
        categorySlug: "electronics",
        image: img(POOL.wearables[1], { fit: "square", w: 240 }),
        price: 18999,
        mrp: 24999,
        quantity: 1,
        variantLabel: "Peacock · 44mm",
        stock: 44,
        deliveryDays: 1,
        freeShipping: true,
      },
    ],
  ),
  order(
    "ord_4182",
    "MYR-2026-004182",
    "2026-07-08T16:40:00.000Z",
    "delivered",
    [
      {
        id: "p35::none",
        productId: "p35",
        slug: "saanjh-linen-co-ord-set",
        title: "Saanjh Linen Co-ord Set",
        brand: "Saanjh",
        categorySlug: "fashion",
        image: img(POOL.womenwear[4], { fit: "square", w: 240 }),
        price: 4299,
        mrp: 6499,
        quantity: 1,
        variantLabel: "Sand · M",
        stock: 32,
        deliveryDays: 3,
        freeShipping: true,
      },
      {
        id: "p78::none",
        productId: "p78",
        slug: "nirvaan-vitamin-c-serum",
        title: "Nirvaan Vitamin C Serum",
        brand: "Nirvaan Naturals",
        categorySlug: "beauty",
        image: img(POOL.beauty[1], { fit: "square", w: 240 }),
        price: 1299,
        mrp: 1899,
        quantity: 2,
        variantLabel: "30 ml",
        stock: 210,
        deliveryDays: 2,
        freeShipping: true,
      },
    ],
    {
      paymentMethod: {
        id: "card",
        name: "Credit card",
        description: "HDFC Bank ****4412",
      },
    },
  ),
  order(
    "ord_3907",
    "MYR-2026-003907",
    "2026-05-19T09:05:00.000Z",
    "delivered",
    [
      {
        id: "p64::none",
        productId: "p64",
        slug: "copperleaf-cast-iron-tawa",
        title: "Copperleaf Cast Iron Tawa",
        brand: "Copperleaf",
        categorySlug: "kitchen",
        image: img(POOL.kitchen[3], { fit: "square", w: 240 }),
        price: 1899,
        mrp: 2699,
        quantity: 1,
        variantLabel: "26 cm",
        stock: 130,
        deliveryDays: 2,
        freeShipping: true,
      },
    ],
    {
      paymentMethod: {
        id: "cod",
        name: "Cash on Delivery",
        description: "Paid on delivery",
      },
    },
  ),
];
