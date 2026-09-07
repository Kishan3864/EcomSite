import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Indian rupee formatting, e.g. 1,24,999 */
export function formatINR(value: number, opts?: { decimals?: boolean }) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: opts?.decimals ? 2 : 0,
    minimumFractionDigits: opts?.decimals ? 2 : 0,
  }).format(value);
}

export function formatCompact(value: number) {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

export function discountPercent(mrp: number, price: number) {
  if (mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function formatDate(
  date: string | Date,
  style: "long" | "short" | "day" = "long",
) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (style === "day")
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(d);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: style === "short" ? "short" : "long",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Deterministic pseudo-random so server and client renders agree. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

/** Human label for an order status — never title-cased by CSS. */
export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}
