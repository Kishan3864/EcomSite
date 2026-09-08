"use server";

import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import type { FormState } from "./form-state";
import { revalidateAdmin, revalidateStorefront, str } from "./shared";
import { STOCK_REASONS } from "@/app/admin/(dashboard)/inventory/inventory-shared";

/**
 * Inventory writes. Stock only ever changes here (and when the storefront
 * places an order), and every change leaves a StockMovement row so the ledger
 * on /admin/inventory/[productId] always explains the current number.
 */

const MAX_UNITS = 100_000;

function wholeNumber(raw: string): number | null {
  return /^\d{1,7}$/.test(raw) ? Number(raw) : null;
}

/**
 * Adds or removes units. The form posts `direction` (add | remove), `quantity`,
 * `reason`, an optional `note` (required for "Other") and an optional
 * `reference` such as a PO or invoice number.
 */
export async function adjustStock(productId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");

  const direction = str(formData, "direction") === "remove" ? -1 : 1;
  const quantity = wholeNumber(str(formData, "quantity"));
  if (quantity === null) return { error: "Enter a whole number of units.", field: "quantity" };
  if (quantity < 1) return { error: "Quantity must be at least 1.", field: "quantity" };
  if (quantity > MAX_UNITS) return { error: "That is more than 1,00,000 units. Double-check the quantity.", field: "quantity" };

  const reason = STOCK_REASONS.find((r) => r.value === str(formData, "reason"));
  if (!reason) return { error: "Pick a reason for the change.", field: "reason" };

  const note = str(formData, "note").slice(0, 200);
  if (reason.value === "other" && note.length < 3) return { error: "Describe what happened.", field: "note" };

  const reference = str(formData, "reference").slice(0, 60) || null;
  const delta = direction * quantity;
  const reasonText = note ? `${reason.label} — ${note}` : reason.label;

  const outcome = await db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true, slug: true, sku: true, stock: true },
    });
    if (!product) return { error: "This product no longer exists." } as const;

    const next = product.stock + delta;
    if (next < 0) {
      return {
        error:
          product.stock === 0
            ? "There is nothing in stock to remove."
            : `Only ${product.stock} in stock — you cannot remove ${quantity}.`,
        field: "quantity",
      } as const;
    }

    // Optimistic guard: if an order or another manager changed the stock since
    // the page was rendered, the update matches zero rows and we refuse rather
    // than silently apply the delta to a number nobody saw.
    const updated = await tx.product.updateMany({
      where: { id: productId, stock: product.stock },
      data: { stock: next },
    });
    if (updated.count !== 1) {
      return { error: "Stock changed while you were editing. Reload the page and try again." } as const;
    }

    await tx.stockMovement.create({
      data: { productId, delta, reason: reasonText, reference, actorName: session.name },
    });

    return { product, next } as const;
  });

  if ("error" in outcome) return outcome;

  const { product, next } = outcome;
  await logActivity(session, {
    action: "inventory.adjust",
    entity: "Product",
    entityId: product.id,
    summary: `${delta > 0 ? "Added" : "Removed"} ${quantity} ${quantity === 1 ? "unit" : "units"} ${delta > 0 ? "to" : "from"} ${product.title} (${reason.label}) — now ${next}`,
    metadata: { sku: product.sku, delta, before: product.stock, after: next, reason: reason.label, note: note || undefined, reference: reference ?? undefined },
  });

  revalidateStorefront([`/p/${product.slug}`]);
  revalidateAdmin("inventory");
  return { ok: true, message: `Stock now ${next}.` };
}

/** Sets the per-product low-stock alert level shown as "Threshold" in the table. */
export async function setThreshold(productId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");

  const value = wholeNumber(str(formData, "threshold"));
  if (value === null) return { error: "Enter a whole number (0 turns the alert off).", field: "threshold" };
  if (value > MAX_UNITS) return { error: "Keep the threshold under 1,00,000.", field: "threshold" };

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, title: true, lowStockThreshold: true },
  });
  if (!product) return { error: "This product no longer exists." };
  if (product.lowStockThreshold === value) return { ok: true, message: "Already set to that." };

  await db.product.update({ where: { id: productId }, data: { lowStockThreshold: value } });

  await logActivity(session, {
    action: "inventory.threshold",
    entity: "Product",
    entityId: product.id,
    summary: `Set low-stock threshold for ${product.title} to ${value} (was ${product.lowStockThreshold})`,
    metadata: { before: product.lowStockThreshold, after: value },
  });

  revalidateAdmin("inventory");
  return { ok: true, message: value === 0 ? "Low-stock alert turned off." : `Alert when stock is ${value} or fewer.` };
}
