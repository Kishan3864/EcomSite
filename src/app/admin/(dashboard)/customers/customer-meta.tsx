import type { CustomerTier } from "@/generated/prisma/client";
import { Pill } from "@/components/admin/ui";

/**
 * Small shared vocabulary for the Customers module — tier labels, the
 * anonymisation marker and the pills both pages render. Server-safe (no
 * hooks) so the list page, the detail page and the server actions can all
 * import it.
 */

export const TIER_OPTIONS: { value: CustomerTier; label: string }[] = [
  { value: "SILVER", label: "Silver" },
  { value: "GOLD", label: "Gold" },
  { value: "PEACOCK_CLUB", label: "Peacock Club" },
];

export function isTier(value: string): value is CustomerTier {
  return TIER_OPTIONS.some((t) => t.value === value);
}

export function tierLabel(tier: CustomerTier) {
  return TIER_OPTIONS.find((t) => t.value === tier)?.label ?? tier;
}

const TIER_TONE: Record<CustomerTier, "neutral" | "gold" | "brand"> = {
  SILVER: "neutral",
  GOLD: "gold",
  PEACOCK_CLUB: "brand",
};

export function TierPill({ tier }: { tier: CustomerTier }) {
  return <Pill tone={TIER_TONE[tier]}>{tierLabel(tier)}</Pill>;
}

/**
 * Anonymised customers keep their row (orders reference it for accounting)
 * but every personal field is replaced. The reserved e-mail domain is the
 * marker: `.invalid` can never be registered, so it cannot collide with a
 * real address.
 */
export const ANONYMISED_DOMAIN = "anonymised.invalid";
export const ANONYMISED_NAME = "Deleted customer";

export function isAnonymised(customer: { email: string }) {
  return customer.email.endsWith(`@${ANONYMISED_DOMAIN}`);
}

export const LOYALTY_POINTS_MAX = 1_000_000;
