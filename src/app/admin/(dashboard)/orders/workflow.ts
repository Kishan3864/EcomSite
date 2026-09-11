import type { DeliverySpeed, OrderStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma/client";

/**
 * Pure order-workflow rules shared by the pages and the server actions.
 * Nothing here touches the database, so it is safe to import anywhere.
 */

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "PENDING",
  "PAID",
  "COD_PENDING",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
];

export const PAYMENT_METHODS: PaymentMethod[] = ["ONLINE", "UPI", "CARD", "NETBANKING", "WALLET", "COD"];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  ONLINE: "Online (Razorpay)",
  UPI: "UPI",
  CARD: "Card",
  NETBANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Cash on delivery",
};

export const DELIVERY_SPEED_LABEL: Record<DeliverySpeed, string> = {
  STANDARD: "Standard",
  EXPRESS: "Express",
  SCHEDULED: "Scheduled",
};

/** The happy path. PENDING sits before it; CANCELLED / RETURNED are terminal side exits. */
const FLOW: OrderStatus[] = ["CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

/** The single status an order may move forward to, or null when it is at the end of the road. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  if (status === "PENDING") return "CONFIRMED";
  const i = FLOW.indexOf(status);
  if (i === -1 || i === FLOW.length - 1) return null;
  return FLOW[i + 1];
}

export function canCancel(status: OrderStatus) {
  return status !== "DELIVERED" && status !== "CANCELLED" && status !== "RETURNED";
}

export function isOpen(status: OrderStatus) {
  return status !== "DELIVERED" && status !== "CANCELLED" && status !== "RETURNED";
}

/** Button copy for moving *to* a status. */
export const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "Confirm order",
  PACKED: "Mark as packed",
  SHIPPED: "Mark as shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Mark as delivered",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}
export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as string[]).includes(value);
}
export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as string[]).includes(value);
}

/** `YYYY-MM-DD` in local time, for `<input type="date">` defaults. */
export function toDateInput(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses `YYYY-MM-DD` as local noon so the calendar day survives any timezone. */
export function fromDateInput(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Full shipping address as display lines. */
export function addressLines(o: {
  shipName: string;
  shipLine1: string;
  shipLine2: string | null;
  shipLandmark: string | null;
  shipCity: string;
  shipState: string;
  shipPincode: string;
}) {
  return [
    o.shipName,
    o.shipLine1,
    o.shipLine2,
    o.shipLandmark ? `Near ${o.shipLandmark}` : null,
    `${o.shipCity}, ${o.shipState} ${o.shipPincode}`,
  ].filter((l): l is string => Boolean(l && l.trim()));
}
