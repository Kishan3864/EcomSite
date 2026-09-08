import type { OfferType } from "@/generated/prisma/client";

/** Pure helpers shared by the offers list, form and detail pages. */

export type OfferStatus = "active" | "scheduled" | "expired" | "exhausted" | "inactive";
type Tone = "neutral" | "brand" | "gold" | "sale" | "ink" | "sky";

export const OFFER_STATUS: Record<OfferStatus, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "brand" },
  scheduled: { label: "Scheduled", tone: "sky" },
  expired: { label: "Expired", tone: "neutral" },
  exhausted: { label: "Used up", tone: "gold" },
  inactive: { label: "Inactive", tone: "neutral" },
};

export function offerStatus(
  o: { isActive: boolean; startsAt: Date; expiresAt: Date; usageLimit: number | null; usedCount: number },
  now: Date,
): OfferStatus {
  if (!o.isActive) return "inactive";
  if (o.expiresAt < now) return "expired";
  if (o.startsAt > now) return "scheduled";
  if (o.usageLimit !== null && o.usedCount >= o.usageLimit) return "exhausted";
  return "active";
}

export const OFFER_TYPES: readonly OfferType[] = ["PERCENT", "FLAT", "SHIPPING", "BANK"];

export const OFFER_TYPE: Record<OfferType, { label: string; short: string; tone: Tone; unit: "%" | "₹" }> = {
  PERCENT: { label: "Percentage off", short: "Percent", tone: "brand", unit: "%" },
  FLAT: { label: "Flat discount", short: "Flat", tone: "gold", unit: "₹" },
  SHIPPING: { label: "Free shipping", short: "Shipping", tone: "sky", unit: "₹" },
  BANK: { label: "Bank offer", short: "Bank", tone: "ink", unit: "%" },
};

/** `datetime-local` value for a Date, in the server's local time (matches how the action parses it). */
export function toInputDateTime(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
