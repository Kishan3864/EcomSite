import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { insensitive, type ListParams } from "@/services/admin/shared";

/**
 * Query building shared by the inventory list page and the CSV export so the
 * file a manager downloads always matches the table they are looking at.
 */

/** Archived products are gone from the shop; they do not count as inventory. */
export const ACTIVE_OR_DRAFT: Prisma.ProductWhereInput = { status: { in: ["ACTIVE", "DRAFT"] } };

/** stock <= lowStockThreshold is a column-to-column comparison; Prisma field refs do it in SQL. */
export const lowStockWhere: Prisma.ProductWhereInput = {
  stock: { gt: 0, lte: db.product.fields.lowStockThreshold },
};
export const outOfStockWhere: Prisma.ProductWhereInput = { stock: { lte: 0 } };
export const healthyWhere: Prisma.ProductWhereInput = { stock: { gt: db.product.fields.lowStockThreshold } };

export function inventoryWhere(params: ListParams): Prisma.ProductWhereInput {
  const state = params.filters.stock;
  return {
    ...ACTIVE_OR_DRAFT,
    ...(params.q ? { OR: [{ title: insensitive(params.q) }, { sku: insensitive(params.q) }] } : {}),
    ...(params.filters.category ? { category: { slug: params.filters.category } } : {}),
    ...(state === "low" ? lowStockWhere : state === "out" ? outOfStockWhere : state === "healthy" ? healthyWhere : {}),
  };
}

export function inventoryOrderBy(sort: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "stock-desc":
      return [{ stock: "desc" }, { title: "asc" }];
    case "sold":
      return [{ soldCount: "desc" }, { title: "asc" }];
    case "title":
      return [{ title: "asc" }];
    default:
      // Lowest stock first: what a store owner wants to see before anything else.
      return [{ stock: "asc" }, { title: "asc" }];
  }
}

export const INVENTORY_LIST_OPTIONS = {
  perPage: 25,
  defaultSort: "stock",
  defaultDir: "asc" as const,
  filterKeys: ["category", "stock"],
};
