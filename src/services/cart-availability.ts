"use server";

import { db } from "@/lib/db";
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
