"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import { mediaUrl } from "@/lib/media";
import { revalidateAdmin, revalidateStorefront, str } from "./shared";

/**
 * The uploaded image library.
 *
 * Uploading happens in /api/admin/media, because the forms send a file the
 * moment it is chosen rather than waiting to be submitted. What is left for a
 * server action is deleting — and deleting is the part that needs care, since
 * one picture is often used in several places and the URL is the only link
 * between them.
 */

const flash = (message: string, tone?: "error") =>
  `/admin/media?flash=${encodeURIComponent(message)}${tone ? `&tone=${tone}` : ""}`;

/** Everywhere in the shop that is currently pointing at this address. */
export async function mediaUsage(url: string) {
  const [products, categories, subcategories, banners] = await Promise.all([
    db.productImage.count({ where: { url } }),
    db.category.count({ where: { imageUrl: url } }),
    db.subcategory.count({ where: { imageUrl: url } }),
    db.banner.count({ where: { imageUrl: url } }),
  ]);
  return { products, categories, subcategories, banners, total: products + categories + subcategories + banners };
}

/**
 * Remove an image for good.
 *
 * Refused while anything still points at it. A deleted file would leave a
 * product card with a hole in it and no clue where the hole came from, and the
 * owner is far better served by being told which product to change first.
 */
export async function deleteMedia(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const key = str(formData, "key");

  const asset = await db.mediaAsset.findUnique({
    where: { key },
    select: { id: true, key: true, filename: true },
  });
  if (!asset) redirect(flash("That image is already gone", "error"));

  const used = await mediaUsage(mediaUrl(asset.key));
  if (used.total > 0) {
    const where = [
      used.products && `${used.products} product image${used.products === 1 ? "" : "s"}`,
      used.categories && `${used.categories} categor${used.categories === 1 ? "y" : "ies"}`,
      used.subcategories && `${used.subcategories} collection${used.subcategories === 1 ? "" : "s"}`,
      used.banners && `${used.banners} banner${used.banners === 1 ? "" : "s"}`,
    ]
      .filter(Boolean)
      .join(", ");
    redirect(flash(`${asset.filename} is still used by ${where}. Change those first.`, "error"));
  }

  await db.mediaAsset.delete({ where: { id: asset.id } });
  await logActivity(session, {
    action: "media.delete",
    entity: "MediaAsset",
    entityId: asset.id,
    summary: `Deleted image ${asset.filename}`,
  });

  revalidateAdmin("media");
  revalidateStorefront();
  redirect(flash(`${asset.filename} deleted`));
}
