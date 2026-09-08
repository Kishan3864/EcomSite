"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import type { BannerPlacement } from "@/generated/prisma/client";
import type { FormState } from "./form-state";
import { bool, dateOrNull, num, revalidateAdmin, revalidateStorefront, str } from "./shared";

/**
 * Home-page banners: HERO carousel slides, MID feature banners and square
 * PROMO_TILEs. Ordering is per placement (0..n-1); every write revalidates
 * the storefront because the home page reads these at request time.
 */

const PLACEMENTS: readonly BannerPlacement[] = ["HERO", "MID", "PROMO_TILE"];

const flash = (text: string, tone?: "error") =>
  `/admin/banners?flash=${encodeURIComponent(text)}${tone ? `&tone=${tone}` : ""}`;

function validate(formData: FormData) {
  const placementRaw = str(formData, "placement");
  const eyebrow = str(formData, "eyebrow");
  const title = str(formData, "title");
  const subtitle = str(formData, "subtitle");
  const cta = str(formData, "cta") || "Shop now";
  const href = str(formData, "href");
  const imageUrl = str(formData, "imageUrl");
  const imageAlt = str(formData, "imageAlt");
  const align = str(formData, "align") || "left";
  const theme = str(formData, "theme") || "dark";
  const sortOrderRaw = str(formData, "sortOrder");
  const sortOrder = sortOrderRaw === "" ? null : num(formData, "sortOrder", NaN);
  const startsAt = dateOrNull(formData, "startsAt");
  const endsAt = dateOrNull(formData, "endsAt");
  const isActive = bool(formData, "isActive");

  if (!PLACEMENTS.includes(placementRaw as BannerPlacement))
    return { error: "Choose where this banner appears.", field: "placement" } as const;
  const placement = placementRaw as BannerPlacement;

  if (title.length < 2) return { error: "A headline is required.", field: "title" } as const;
  if (title.length > 90) return { error: "Keep the headline under 90 characters.", field: "title" } as const;
  if (eyebrow.length > 60) return { error: "Keep the eyebrow under 60 characters.", field: "eyebrow" } as const;
  if (subtitle.length > 220) return { error: "Keep the subtitle under 220 characters.", field: "subtitle" } as const;
  if (cta.length > 40) return { error: "Keep the button label under 40 characters.", field: "cta" } as const;

  if (!href.startsWith("/") || href.startsWith("//"))
    return { error: "Link must be a storefront path starting with “/”, e.g. /c/fashion or /offers.", field: "href" } as const;
  if (/\s/.test(href)) return { error: "Link cannot contain spaces.", field: "href" } as const;

  if (!imageUrl) return { error: "An image is required.", field: "imageUrl" } as const;
  if (!/^(https?:\/\/[^\s]+|\/[^\s]*)$/i.test(imageUrl))
    return { error: "Image must be an https:// URL or a path on this site.", field: "imageUrl" } as const;

  if (align !== "left" && align !== "right") return { error: "Alignment must be left or right.", field: "align" } as const;
  if (theme !== "light" && theme !== "dark") return { error: "Theme must be light or dark.", field: "theme" } as const;
  if (sortOrder !== null && (!Number.isInteger(sortOrder) || sortOrder < 0))
    return { error: "Position must be a whole number (0 = first).", field: "sortOrder" } as const;

  if (str(formData, "startsAt") && !startsAt) return { error: "Start date is not valid.", field: "startsAt" } as const;
  if (str(formData, "endsAt") && !endsAt) return { error: "End date is not valid.", field: "endsAt" } as const;
  if (startsAt && endsAt && endsAt <= startsAt)
    return { error: "End must be after the start date.", field: "endsAt" } as const;

  return {
    data: {
      placement,
      eyebrow,
      title,
      subtitle,
      cta,
      href,
      imageUrl,
      imageAlt: imageAlt || title,
      align,
      theme: placement === "MID" ? theme : "dark",
      sortOrder,
      startsAt,
      endsAt,
      isActive,
    },
  } as const;
}

/** Rewrites sortOrder to 0..n-1 for a placement so up/down moves stay meaningful. */
async function normalise(placement: BannerPlacement) {
  const rows = await db.banner.findMany({
    where: { placement },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });
  const updates = rows
    .map((r, i) => ({ id: r.id, from: r.sortOrder, to: i }))
    .filter((r) => r.from !== r.to)
    .map((r) => db.banner.update({ where: { id: r.id }, data: { sortOrder: r.to } }));
  if (updates.length) await db.$transaction(updates);
}

/** Would hiding this banner leave the home-page hero with nothing to show? */
async function isLastLiveHero(id: string) {
  const now = new Date();
  const live = await db.banner.count({
    where: {
      placement: "HERO",
      isActive: true,
      NOT: { id },
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
  });
  return live === 0;
}

export async function createBanner(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const result = validate(formData);
  if ("error" in result) return result;

  const { sortOrder, ...rest } = result.data;
  const count = await db.banner.count({ where: { placement: rest.placement } });
  const banner = await db.banner.create({ data: { ...rest, sortOrder: sortOrder ?? count } });
  await normalise(banner.placement);

  await logActivity(session, {
    action: "banner.create",
    entity: "Banner",
    entityId: banner.id,
    summary: `Added ${banner.placement} banner “${banner.title}”`,
    metadata: { placement: banner.placement, href: banner.href },
  });
  revalidateStorefront();
  revalidateAdmin("banners");
  redirect(flash(`“${banner.title}” added`));
}

export async function updateBanner(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const existing = await db.banner.findUnique({ where: { id } });
  if (!existing) return { error: "This banner no longer exists." };

  const result = validate(formData);
  if ("error" in result) return result;

  const { sortOrder, ...rest } = result.data;
  if (existing.placement === "HERO" && existing.isActive && !rest.isActive && (await isLastLiveHero(id)))
    return {
      error: "This is the only live hero slide. Add or activate another hero banner before hiding it.",
      field: "isActive",
    };

  const banner = await db.banner.update({
    where: { id },
    data: { ...rest, sortOrder: sortOrder ?? existing.sortOrder },
  });
  await normalise(banner.placement);
  if (existing.placement !== banner.placement) await normalise(existing.placement);

  await logActivity(session, {
    action: "banner.update",
    entity: "Banner",
    entityId: banner.id,
    summary: `Updated ${banner.placement} banner “${banner.title}”`,
    metadata: { placement: banner.placement, isActive: banner.isActive },
  });
  revalidateStorefront();
  revalidateAdmin("banners");
  return { ok: true, message: "Saved." };
}

export async function toggleBannerActive(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const banner = await db.banner.findUnique({ where: { id } });
  if (!banner) redirect(flash("Banner not found", "error"));

  if (banner.placement === "HERO" && banner.isActive && (await isLastLiveHero(id)))
    redirect(flash("This is the only live hero slide. Activate another hero banner before hiding it.", "error"));

  const updated = await db.banner.update({ where: { id }, data: { isActive: !banner.isActive } });
  await logActivity(session, {
    action: updated.isActive ? "banner.activate" : "banner.deactivate",
    entity: "Banner",
    entityId: id,
    summary: `${updated.isActive ? "Activated" : "Deactivated"} ${updated.placement} banner “${updated.title}”`,
  });
  revalidateStorefront();
  revalidateAdmin("banners");
}

export async function moveBanner(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const direction = str(formData, "direction") === "up" ? -1 : 1;

  const banner = await db.banner.findUnique({ where: { id } });
  if (!banner) redirect(flash("Banner not found", "error"));

  await normalise(banner.placement);
  const rows = await db.banner.findMany({
    where: { placement: banner.placement },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true, title: true },
  });
  const index = rows.findIndex((r) => r.id === id);
  const target = rows[index + direction];
  if (index < 0 || !target) return; // already at the edge

  await db.$transaction([
    db.banner.update({ where: { id }, data: { sortOrder: target.sortOrder } }),
    db.banner.update({ where: { id: target.id }, data: { sortOrder: rows[index].sortOrder } }),
  ]);
  await logActivity(session, {
    action: "banner.reorder",
    entity: "Banner",
    entityId: id,
    summary: `Moved ${banner.placement} banner “${banner.title}” ${direction < 0 ? "up" : "down"}`,
    metadata: { from: rows[index].sortOrder, to: target.sortOrder },
  });
  revalidateStorefront();
  revalidateAdmin("banners");
}

export async function deleteBanner(formData: FormData) {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");
  const banner = await db.banner.findUnique({ where: { id } });
  if (!banner) redirect(flash("Banner not found", "error"));

  if (banner.placement === "HERO" && banner.isActive && (await isLastLiveHero(id)))
    redirect(flash("This is the only live hero slide. Add another hero banner before deleting it.", "error"));

  await db.banner.delete({ where: { id } });
  await normalise(banner.placement);
  await logActivity(session, {
    action: "banner.delete",
    entity: "Banner",
    entityId: id,
    summary: `Deleted ${banner.placement} banner “${banner.title}”`,
  });
  revalidateStorefront();
  revalidateAdmin("banners");
  redirect(flash(`“${banner.title}” deleted`));
}
