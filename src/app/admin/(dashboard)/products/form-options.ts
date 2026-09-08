import "server-only";

import { db } from "@/lib/db";
import type { ProductFormOptions } from "./product-form";

/**
 * Select lists the product form needs: brands, categories with their
 * subcategories (filtered client-side), and a compact list of active
 * products for the related / bundle pickers.
 */
export async function loadProductFormOptions(): Promise<ProductFormOptions> {
  const [brands, categories, subcategories, catalog] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.subcategory.findMany({ orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }], select: { id: true, name: true, categoryId: true } }),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: { title: "asc" }, select: { id: true, title: true, sku: true } }),
  ]);
  return { brands, categories, subcategories, catalog };
}
