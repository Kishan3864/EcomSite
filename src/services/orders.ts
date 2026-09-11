import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { canViewOrder, getCustomerSession } from "@/lib/auth/customer";
import type {
  Address,
  Order,
  OrderStatus,
  OrderTrackingEvent,
  ReturnRequest,
} from "@/lib/types";
import { resolveAvatar } from "@/lib/avatar";

/**
 * Storefront reads for orders. Everything the confirmation, tracking and
 * account screens show comes through here, mapped to the same `Order` domain
 * type the phase-1 UI already renders.
 */

export const orderInclude = {
  lines: true,
  events: { orderBy: { at: "asc" as const } },
  returns: true,
} satisfies Prisma.OrderInclude;

export type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const STATUS_FLOW: OrderStatus[] = ["confirmed", "packed", "shipped", "out_for_delivery", "delivered"];

const FUTURE_COPY: Record<string, { title: string; description: string }> = {
  confirmed: { title: "Order confirmed", description: "We have received your order and payment." },
  packed: { title: "Packed and ready", description: "Your items are packed and handed to the courier." },
  shipped: { title: "Shipped", description: "In transit to your delivery city." },
  out_for_delivery: { title: "Out for delivery", description: "Arriving today between 10am and 6pm." },
  delivered: { title: "Delivered", description: "Handed over at the door. Thank you for shopping with us." },
};

/**
 * The timeline shows what has happened (real events) followed by what is still
 * to come, so a customer always sees the whole journey.
 */
function buildTimeline(row: OrderRow): OrderTrackingEvent[] {
  const status = row.status.toLowerCase() as OrderStatus;
  if (status === "cancelled" || status === "returned") {
    return row.events.map((e) => ({
      status: e.status.toLowerCase() as OrderStatus,
      title: e.title,
      description: e.description,
      location: e.location,
      at: e.at.toISOString(),
      done: true,
    }));
  }

  const done = new Map(row.events.map((e) => [e.status.toLowerCase(), e]));
  const reachedIndex = Math.max(0, STATUS_FLOW.indexOf(status));

  return STATUS_FLOW.map((step, i) => {
    const real = done.get(step);
    if (real) {
      return {
        status: step,
        title: real.title,
        description: real.description,
        location: real.location,
        at: real.at.toISOString(),
        done: true,
      };
    }
    const copy = FUTURE_COPY[step];
    return {
      status: step,
      title: copy.title,
      description: copy.description,
      location: i <= reachedIndex ? row.shipCity : `${row.shipCity}, ${row.shipState}`,
      at: row.estimatedDelivery.toISOString(),
      done: i <= reachedIndex,
    };
  });
}

export function toOrder(row: OrderRow): Order {
  const address: Address = {
    id: `${row.id}-ship`,
    label: (row.shipLabel as Address["label"]) || "Home",
    fullName: row.shipName,
    phone: row.shipPhone,
    line1: row.shipLine1,
    line2: row.shipLine2 ?? undefined,
    landmark: row.shipLandmark ?? undefined,
    city: row.shipCity,
    state: row.shipState,
    pincode: row.shipPincode,
    isDefault: false,
  };

  const deliveryId = row.deliverySpeed.toLowerCase() as Order["delivery"]["id"];

  return {
    id: row.id,
    number: row.number,
    placedAt: row.placedAt.toISOString(),
    status: row.status.toLowerCase() as OrderStatus,
    lines: row.lines.map((l) => ({
      id: l.id,
      productId: l.productId ?? "",
      slug: l.slug,
      title: l.title,
      brand: l.brand,
      categorySlug: l.categorySlug,
      image: l.image,
      price: l.price,
      mrp: l.mrp,
      quantity: l.quantity,
      variantLabel: l.variantLabel ?? undefined,
      variantKey: l.variantKey ?? undefined,
      stock: 0,
      deliveryDays: 3,
      freeShipping: true,
    })),
    address,
    delivery: {
      id: deliveryId,
      name: row.deliveryName,
      description: "",
      price: row.deliveryPrice,
      minDays: deliveryId === "express" ? 1 : 3,
      maxDays: deliveryId === "express" ? 2 : 5,
    },
    paymentMethod: {
      id: row.paymentMethod.toLowerCase() as Order["paymentMethod"]["id"],
      name:
        row.paymentMethod === "COD"
          ? "Cash on Delivery"
          : row.paymentMethod === "CARD"
            ? "Credit / Debit card"
            : row.paymentMethod === "NETBANKING"
              ? "Net banking"
              : row.paymentMethod === "WALLET"
                ? "Wallet"
                : row.paymentMethod === "ONLINE"
                  ? "Online payment"
                  : "UPI",
      description: row.paymentDetail ?? "",
    },
    totals: {
      itemsTotal: row.itemsTotal,
      mrpTotal: row.mrpTotal,
      productDiscount: row.productDiscount,
      couponCode: row.couponCode ?? undefined,
      couponDiscount: row.couponDiscount,
      shipping: row.shipping,
      tax: row.tax,
      total: row.total,
      savings: row.productDiscount + row.couponDiscount,
    },
    estimatedDelivery: row.estimatedDelivery.toISOString(),
    tracking: buildTimeline(row),
    courier: row.courier ?? "WeekendCart Fleet",
    awb: row.awb ?? "",
  };
}

/** Order by id or number, only if the current visitor is allowed to see it. */
export async function getOrderForViewer(idOrNumber: string): Promise<Order | null> {
  const row = await db.order.findFirst({
    where: { OR: [{ id: idOrNumber }, { number: idOrNumber.toUpperCase() }] },
    include: orderInclude,
  });
  if (!row) return null;
  if (!(await canViewOrder(row))) return null;
  return toOrder(row);
}

/** Public tracking lookup: number plus the phone or email used at checkout. */
export async function lookupOrder(number: string, contact: string): Promise<Order | null> {
  const needle = contact.trim().toLowerCase().replace(/\s+/g, "");
  const row = await db.order.findUnique({
    where: { number: number.trim().toUpperCase() },
    include: orderInclude,
  });
  if (!row) return null;
  const phone = row.contactPhone.replace(/\s+/g, "").toLowerCase();
  const email = row.contactEmail.toLowerCase();
  const phoneMatch = needle.length >= 10 && phone.endsWith(needle.slice(-10));
  if (email !== needle && !phoneMatch) return null;
  return toOrder(row);
}

export async function getCustomerOrders(): Promise<Order[]> {
  const session = await getCustomerSession();
  if (!session) return [];
  const rows = await db.order.findMany({
    where: { customerId: session.id },
    orderBy: { placedAt: "desc" },
    include: orderInclude,
  });
  return rows.map(toOrder);
}

export async function getCustomerReturns(): Promise<ReturnRequest[]> {
  const session = await getCustomerSession();
  if (!session) return [];
  const rows = await db.returnRequest.findMany({
    where: { customerId: session.id },
    orderBy: { requestedAt: "desc" },
    include: { order: { select: { number: true } }, orderLine: { select: { title: true, image: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    orderNumber: r.order.number,
    productTitle: r.orderLine.title,
    image: r.orderLine.image,
    reason: r.reason,
    status: r.status.toLowerCase() as ReturnRequest["status"],
    requestedAt: r.requestedAt.toISOString(),
    refundAmount: r.refundAmount,
    refundMode: r.refundMode,
  }));
}

export async function getCustomerAddresses(): Promise<Address[]> {
  const session = await getCustomerSession();
  if (!session) return [];
  const rows = await db.address.findMany({
    where: { customerId: session.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return rows.map((a) => ({
    id: a.id,
    label: (a.label.charAt(0) + a.label.slice(1).toLowerCase()) as Address["label"],
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? undefined,
    landmark: a.landmark ?? undefined,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault,
  }));
}

export async function getCustomerProfile() {
  const session = await getCustomerSession();
  if (!session) return null;
  const c = await db.customer.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      tier: true,
      loyaltyPoints: true,
      createdAt: true,
      avatarUrl: true,
      avatar: { select: { key: true } },
      _count: { select: { orders: true } },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone ?? "",
    tier: c.tier === "PEACOCK_CLUB" ? "WeekendCart Club" : c.tier === "GOLD" ? "Gold" : "Silver",
    loyaltyPoints: c.loyaltyPoints,
    memberSince: c.createdAt.toISOString(),
    orderCount: c._count.orders,
    avatarUrl: resolveAvatar(c),
    avatarInitials: c.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  };
}
