import type { BannerPlacement } from "@/generated/prisma/client";

/** Pure helpers shared by the banners list, form and detail pages. */

export type BannerStatus = "live" | "scheduled" | "ended" | "inactive";
type Tone = "neutral" | "brand" | "gold" | "sale" | "ink" | "sky";

export const BANNER_STATUS: Record<BannerStatus, { label: string; tone: Tone }> = {
  live: { label: "Live", tone: "brand" },
  scheduled: { label: "Scheduled", tone: "sky" },
  ended: { label: "Ended", tone: "neutral" },
  inactive: { label: "Inactive", tone: "neutral" },
};

export function bannerStatus(
  b: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date,
): BannerStatus {
  if (!b.isActive) return "inactive";
  if (b.endsAt && b.endsAt < now) return "ended";
  if (b.startsAt && b.startsAt > now) return "scheduled";
  return "live";
}

export const PLACEMENTS: readonly BannerPlacement[] = ["HERO", "MID", "PROMO_TILE"];

export const PLACEMENT_META: Record<BannerPlacement, { label: string; description: string; hint: string }> = {
  HERO: {
    label: "Hero carousel",
    description: "Full-width slides at the top of the home page: eyebrow, headline, subtitle and a button over a photo.",
    hint: "Wide landscape image, at least 1600×700. Keep the subject away from the text side.",
  },
  MID: {
    label: "Feature banners",
    description: "Split image-and-copy panels between product rails. The first two live banners are shown.",
    hint: "Landscape image around 1200×900. Light theme sits on a pale card; dark on peacock.",
  },
  PROMO_TILE: {
    label: "Promo tiles",
    description: "Square tiles in a row of four under the hero: title, one-line subtitle and a link label.",
    hint: "Square or portrait image, at least 800×800. Text is overlaid on a dark gradient.",
  },
};

/** `datetime-local` value for a Date, in the server's local time (matches how the action parses it). */
export function toInputDateTime(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
