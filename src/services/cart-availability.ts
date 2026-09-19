"use server";

import { db } from "@/lib/db";
import { toCardModels, type ProductCardModel } from "@/lib/card";
import { getProductsByIds } from "./catalog";
import { visibleProducts } from "./visibility";

/**
 * Which of these products can no longer be bought.
 *
 * The bag lives in the shopper's browser with its own copy of each line, so it
 * keeps showing a product that has since been hidden, archived or deleted —
 * and `placeOrder` would refuse it only at the very last step. The cart page
 * asks this first, so the shopper is told on the bag itself and can take the
 * line out before starting checkout.
 *
 * It answers with ids only, under the same rule every storefront read uses.
 * Nothing about a hidden product is sent back — not its title, not why.
 */
export async function unavailableProductIds(productIds: string[]): Promise<string[]> {
  const ids = [...new Set(productIds.filter((id) => typeof id === "string" && id.length > 0))].slice(0, 100);
  if (ids.length === 0) return [];
  const visible = await db.product.findMany({
    where: visibleProducts({ id: { in: ids } }),
    select: { id: true },
  });
  const ok = new Set(visible.map((p) => p.id));
  return ids.filter((id) => !ok.has(id));
}

/**
 * The same question for everything else the browser remembers — recently
 * viewed, the wishlist, saved-for-later — asked once per visit by the store
 * provider, which then drops what is `gone` from the lists AND from storage.
 *
 * `brandless` are products still on sale whose brand has been switched off: a
 * stored line carries its own copy of the brand name, and that copy has to be
 * blanked too or the hidden brand lives on in the bag and the wishlist.
 */
export async function sweepStoredProducts(productIds: string[]): Promise<{ gone: string[]; brandless: string[] }> {
  const ids = [...new Set(productIds.filter((id) => typeof id === "string" && id.length > 0))].slice(0, 200);
  if (ids.length === 0) return { gone: [], brandless: [] };
  const visible = await db.product.findMany({
    where: visibleProducts({ id: { in: ids } }),
    select: { id: true, brand: { select: { isActive: true } } },
  });
  const ok = new Set(visible.map((p) => p.id));
  return {
    gone: ids.filter((id) => !ok.has(id)),
    brandless: visible.filter((p) => !p.brand.isActive).map((p) => p.id),
  };
}

/**
 * Recently viewed, as the shop has it NOW: the stored ids resolved through the
 * visibility rule into the same card model every grid and rail uses. A hidden
 * product is simply not in the answer, and a price that has changed since the
 * visit is the current one.
 */
export async function recentlyViewedCards(productIds: string[]): Promise<ProductCardModel[]> {
  const ids = [...new Set(productIds.filter((id) => typeof id === "string" && id.length > 0))].slice(0, 12);
  return toCardModels(await getProductsByIds(ids));
}
