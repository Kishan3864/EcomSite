import "server-only";

import { db } from "@/lib/db";
import type { ProductFormOptions } from "./product-form";

/**
 * Select lists the product form needs: brands, categories with their
 * subcategories (filtered client-side), wholesalers for the sourcing picker,
 * and a compact list of active products for the related / bundle pickers.
 *
 * The supplier list is admin-only data. This loader is called from the admin
 * product pages and nowhere else — never import it from a storefront route.
 */
export async function loadProductFormOptions(): Promise<ProductFormOptions> {
  const [brands, categories, subcategories, suppliers, catalog] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.subcategory.findMany({ orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }], select: { id: true, name: true, categoryId: true } }),
    db.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true } }),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: { title: "asc" }, select: { id: true, title: true, sku: true } }),
  ]);
  return { brands, categories, subcategories, suppliers, catalog };
}
