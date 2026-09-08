"use server";

import { redirect } from "next/navigation";
import { icons } from "lucide-react";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import type { FormState } from "./form-state";
import { bool, lines, list, num, revalidateAdmin, revalidateStorefront, slugify, str } from "./shared";

/**
 * Categories & subcategories. Both feed the storefront's mega menu, footer and
 * `/c/<category>/<subcategory>` listing pages, so every write revalidates the
 * storefront. Products require both a category and a subcategory, which is why
 * deletes are refused (or products are moved) rather than orphaning anything.
 */

const HEX = /^#[0-9a-f]{6}$/i;
const MAX_HIGHLIGHTS = 4;
const MAX_HIGHLIGHT_LENGTH = 60;

const flash = (path: string, message: string, tone?: "error") =>
  `${path}?flash=${encodeURIComponent(message)}${tone ? `&tone=${tone}` : ""}`;

/** Lucide exports icons in PascalCase; the storefront stores kebab-case names. */
function isKnownIcon(name: string) {
  const pascal = name
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return pascal.length > 0 && pascal in icons;
}

function isImageRef(value: string) {
  return /^https?:\/\/\S+$/i.test(value) || (value.startsWith("/") && !value.startsWith("//"));
}

/* ============================== Categories ============================== */

async function validateCategory(formData: FormData, currentId?: string) {
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  const menuLabel = str(formData, "menuLabel") || name;
  const icon = slugify(str(formData, "icon")) || "tag";
  const accent = str(formData, "accent").toLowerCase() || "#2c837c";
  const description = str(formData, "description");
  const imageUrl = str(formData, "imageUrl");
  const imageAlt = str(formData, "imageAlt") || name;
  const highlights = lines(formData, "highlights");
  const featuredBrandSlugs = list(formData, "featuredBrandSlugs");
  const sortOrderRaw = str(formData, "sortOrder");
  const isActive = bool(formData, "isActive");

  if (name.length < 2) return { error: "Category name is required.", field: "name" } as const;
  if (name.length > 60) return { error: "Keep the name under 60 characters.", field: "name" } as const;
  if (!slug) return { error: "Slug cannot be empty.", field: "slug" } as const;
  if (menuLabel.length > 40) return { error: "Menu labels are short headings — keep it under 40 characters.", field: "menuLabel" } as const;
  if (!isKnownIcon(icon)) {
    return { error: `“${icon}” is not a Lucide icon name. Try cpu, shirt, sofa, gem or sparkles.`, field: "icon" } as const;
  }
  if (!HEX.test(accent)) return { error: "Accent must be a 6-digit hex colour like #2c837c.", field: "accent" } as const;
  if (description.length < 10) {
    return { error: "Add a short description — it appears on the category page and in search results.", field: "description" } as const;
  }
  if (!isImageRef(imageUrl)) {
    return { error: "Image must be an https:// URL or a path starting with /.", field: "imageUrl" } as const;
  }
  if (highlights.length > MAX_HIGHLIGHTS) {
    return { error: `Keep it to ${MAX_HIGHLIGHTS} highlights — the mega menu only has room for four.`, field: "highlights" } as const;
  }
  if (highlights.some((h) => h.length > MAX_HIGHLIGHT_LENGTH)) {
    return { error: `Each highlight should be ${MAX_HIGHLIGHT_LENGTH} characters or fewer.`, field: "highlights" } as const;
  }
  if (sortOrderRaw !== "" && !Number.isInteger(Number(sortOrderRaw))) {
    return { error: "Position must be a whole number.", field: "sortOrder" } as const;
  }
  const sortOrder = sortOrderRaw === "" ? null : Math.max(0, num(formData, "sortOrder"));

  if (featuredBrandSlugs.length > 0) {
    const found = await db.brand.findMany({ where: { slug: { in: featuredBrandSlugs } }, select: { slug: true } });
    const known = new Set(found.map((b) => b.slug));
    const missing = featuredBrandSlugs.filter((s) => !known.has(s));
    if (missing.length > 0) {
      return { error: `Unknown brand${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`, field: "featuredBrandSlugs" } as const;
    }
  }

  const clash = await db.category.findFirst({
    where: { slug, ...(currentId ? { NOT: { id: currentId } } : {}) },
    select: { name: true },
  });
  if (clash) return { error: `The slug “${slug}” is already used by ${clash.name}.`, field: "slug" } as const;

  return {
    data: { name, slug, menuLabel, icon, accent, description, imageUrl, imageAlt, highlights, featuredBrandSlugs, isActive },
    sortOrder,
  } as const;
}

export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const result = await validateCategory(formData);
  if ("error" in result) return result;

  const last = await db.category.aggregate({ _max: { sortOrder: true } });
  const sortOrder = result.sortOrder ?? (last._max.sortOrder ?? -1) + 1;

  const category = await db.category.create({ data: { ...result.data, sortOrder } });

  await logActivity(session, {
    action: "category.create",
    entity: "Category",
    entityId: category.id,
    summary: `Created category ${category.name}`,
    metadata: { slug: category.slug, isActive: category.isActive },
  });
  revalidateStorefront();
  revalidateAdmin("categories");
  redirect(flash("/admin/categories", `${category.name} created`));
}

export async function updateCategory(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const existing = await db.category.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!existing) return { error: "This category no longer exists. It may have been deleted by someone else." };

  const result = await validateCategory(formData, id);
  if ("error" in result) return result;

  const category = await db.category.update({
    where: { id },
    data: { ...result.data, ...(result.sortOrder === null ? {} : { sortOrder: result.sortOrder }) },
  });

  await logActivity(session, {
    action: "category.update",
    entity: "Category",
    entityId: category.id,
    summary: `Updated category ${category.name}`,
    metadata: {
      isActive: category.isActive,
      ...(existing.slug !== category.slug ? { slugChanged: { from: existing.slug, to: category.slug } } : {}),
    },
  });
  revalidateStorefront();
  revalidateAdmin("categories");
  return { ok: true, message: "Saved." };
}

export async function deleteCategory(formData: FormData) {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");

  const category = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { subcategories: true, offers: true } } },
  });
  if (!category) redirect(flash("/admin/categories", "Category not found", "error"));

  // Products require a category and a subcategory; refuse rather than orphan them.
  const productCount = await db.product.count({
    where: { OR: [{ categoryId: id }, { subcategory: { categoryId: id } }] },
  });
  if (productCount > 0) {
    redirect(
      flash(
        "/admin/categories",
        `${category.name} still has ${productCount} product${productCount === 1 ? "" : "s"}. Move them to another category first, or deactivate the category instead.`,
        "error",
      ),
    );
  }

  await db.category.delete({ where: { id } }); // subcategories cascade; offers fall back to store-wide
  await logActivity(session, {
    action: "category.delete",
    entity: "Category",
    entityId: id,
    summary: `Deleted category ${category.name}`,
    metadata: { subcategories: category._count.subcategories, offersUnscoped: category._count.offers },
  });
  revalidateStorefront();
  revalidateAdmin("categories");

  const extra = category._count.offers > 0 ? ` · ${category._count.offers} offer${category._count.offers === 1 ? " is" : "s are"} now store-wide` : "";
  redirect(flash("/admin/categories", `${category.name} deleted${extra}`));
}

export async function toggleCategoryActive(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const category = await db.category.findUnique({ where: { id }, select: { isActive: true } });
  if (!category) return;

  const updated = await db.category.update({ where: { id }, data: { isActive: !category.isActive } });
  await logActivity(session, {
    action: updated.isActive ? "category.activate" : "category.deactivate",
    entity: "Category",
    entityId: id,
    summary: `${updated.isActive ? "Activated" : "Deactivated"} category ${updated.name}`,
  });
  revalidateStorefront();
  revalidateAdmin("categories");
}

/** Swaps a category with its neighbour and renumbers so sortOrder stays dense (0..n-1). */
export async function moveCategory(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const direction = str(formData, "direction") === "up" ? "up" : "down";

  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, sortOrder: true },
  });
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) return;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return;

  const order = [...rows];
  [order[index], order[target]] = [order[target], order[index]];
  const writes = order
    .map((row, i) => ({ row, i }))
    .filter(({ row, i }) => row.sortOrder !== i)
    .map(({ row, i }) => db.category.update({ where: { id: row.id }, data: { sortOrder: i } }));
  if (writes.length > 0) await db.$transaction(writes);

  await logActivity(session, {
    action: "category.reorder",
    entity: "Category",
    entityId: id,
    summary: `Moved category ${rows[index].name} ${direction} to position ${target + 1}`,
  });
  revalidateStorefront();
  revalidateAdmin("categories");
}

/* ============================ Subcategories ============================= */

async function validateSubcategory(formData: FormData, categoryId: string, currentId?: string) {
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  const description = str(formData, "description");
  const imageUrl = str(formData, "imageUrl");
  const imageAlt = str(formData, "imageAlt") || name;
  const sortOrderRaw = str(formData, "sortOrder");
  const isActive = formData.has("isActive") ? bool(formData, "isActive") : true;

  if (name.length < 2) return { error: "Subcategory name is required.", field: "name" } as const;
  if (name.length > 60) return { error: "Keep the name under 60 characters.", field: "name" } as const;
  if (!slug) return { error: "Slug cannot be empty.", field: "slug" } as const;
  if (description.length < 5) {
    return { error: "Add a one-line description — it shows under the name in the mega menu.", field: "description" } as const;
  }
  if (description.length > 160) return { error: "Keep the description under 160 characters.", field: "description" } as const;
  if (!isImageRef(imageUrl)) {
    return { error: "Image must be an https:// URL or a path starting with /.", field: "imageUrl" } as const;
  }
  if (sortOrderRaw !== "" && !Number.isInteger(Number(sortOrderRaw))) {
    return { error: "Position must be a whole number.", field: "sortOrder" } as const;
  }
  const sortOrder = sortOrderRaw === "" ? null : Math.max(0, num(formData, "sortOrder"));

  const clash = await db.subcategory.findFirst({
    where: { categoryId, slug, ...(currentId ? { NOT: { id: currentId } } : {}) },
    select: { name: true },
  });
  if (clash) return { error: `The slug “${slug}” is already used by ${clash.name} in this category.`, field: "slug" } as const;

  return { data: { name, slug, description, imageUrl, imageAlt, isActive }, sortOrder } as const;
}

export async function createSubcategory(categoryId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const category = await db.category.findUnique({ where: { id: categoryId }, select: { id: true, name: true } });
  if (!category) return { error: "This category no longer exists." };

  const result = await validateSubcategory(formData, categoryId);
  if ("error" in result) return result;

  const last = await db.subcategory.aggregate({ where: { categoryId }, _max: { sortOrder: true } });
  const sortOrder = result.sortOrder ?? (last._max.sortOrder ?? -1) + 1;

  const sub = await db.subcategory.create({ data: { ...result.data, sortOrder, categoryId } });

  await logActivity(session, {
    action: "subcategory.create",
    entity: "Subcategory",
    entityId: sub.id,
    summary: `Added subcategory ${sub.name} to ${category.name}`,
    metadata: { categoryId, slug: sub.slug },
  });
  revalidateStorefront();
  revalidateAdmin("categories");
  redirect(flash(`/admin/categories/${categoryId}`, `${sub.name} added to ${category.name}`));
}

export async function updateSubcategory(
  categoryId: string,
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const existing = await db.subcategory.findFirst({ where: { id, categoryId }, select: { id: true, slug: true } });
  if (!existing) return { error: "This subcategory no longer exists. It may have been deleted by someone else." };

  const result = await validateSubcategory(formData, categoryId, id);
  if ("error" in result) return result;

  const sub = await db.subcategory.update({
    where: { id },
    data: { ...result.data, ...(result.sortOrder === null ? {} : { sortOrder: result.sortOrder }) },
    include: { category: { select: { name: true } } },
  });

  await logActivity(session, {
    action: "subcategory.update",
    entity: "Subcategory",
    entityId: sub.id,
    summary: `Updated subcategory ${sub.name} (${sub.category.name})`,
    metadata: {
      categoryId,
      isActive: sub.isActive,
      ...(existing.slug !== sub.slug ? { slugChanged: { from: existing.slug, to: sub.slug } } : {}),
    },
  });
  revalidateStorefront();
  revalidateAdmin("categories");
  return { ok: true, message: "Saved." };
}

/**
 * Deletes a subcategory. Products need a subcategory, so when any exist the
 * caller must name a sibling (`moveTo`) to receive them; otherwise we refuse.
 */
export async function deleteSubcategory(formData: FormData) {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");
  const moveTo = str(formData, "moveTo");

  const sub = await db.subcategory.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true } }, _count: { select: { products: true } } },
  });
  if (!sub) redirect(flash("/admin/categories", "Subcategory not found", "error"));

  const back = `/admin/categories/${sub.categoryId}`;
  const products = sub._count.products;
  let movedTo: { id: string; name: string } | null = null;

  if (products > 0) {
    if (!moveTo) {
      redirect(
        flash(
          back,
          `${sub.name} still has ${products} product${products === 1 ? "" : "s"}. Open it and choose where to move them before deleting, or deactivate it instead.`,
          "error",
        ),
      );
    }
    const target = await db.subcategory.findFirst({
      where: { id: moveTo, categoryId: sub.categoryId, NOT: { id } },
      select: { id: true, name: true },
    });
    if (!target) {
      redirect(flash(`${back}/subcategories/${id}`, "Pick a subcategory in the same category to move the products to.", "error"));
    }
    movedTo = target;
    await db.$transaction([
      db.product.updateMany({ where: { subcategoryId: id }, data: { subcategoryId: target.id } }),
      db.subcategory.delete({ where: { id } }),
    ]);
  } else {
    await db.subcategory.delete({ where: { id } });
  }

  await logActivity(session, {
    action: "subcategory.delete",
    entity: "Subcategory",
    entityId: id,
    summary: movedTo
      ? `Deleted subcategory ${sub.name} (${sub.category.name}) and moved ${products} products to ${movedTo.name}`
      : `Deleted subcategory ${sub.name} (${sub.category.name})`,
    metadata: { categoryId: sub.categoryId, movedProducts: products, movedTo: movedTo?.id ?? null },
  });
  revalidateStorefront();
  revalidateAdmin("categories");
  redirect(
    flash(
      back,
      movedTo
        ? `${sub.name} deleted · ${products} product${products === 1 ? "" : "s"} moved to ${movedTo.name}`
        : `${sub.name} deleted`,
    ),
  );
}

export async function toggleSubcategoryActive(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const sub = await db.subcategory.findUnique({ where: { id }, select: { isActive: true } });
  if (!sub) return;

  const updated = await db.subcategory.update({
    where: { id },
    data: { isActive: !sub.isActive },
    include: { category: { select: { name: true } } },
  });
  await logActivity(session, {
    action: updated.isActive ? "subcategory.activate" : "subcategory.deactivate",
    entity: "Subcategory",
    entityId: id,
    summary: `${updated.isActive ? "Activated" : "Deactivated"} subcategory ${updated.name} (${updated.category.name})`,
    metadata: { categoryId: updated.categoryId },
  });
  revalidateStorefront();
  revalidateAdmin("categories");
}

/** Same swap-and-renumber as categories, scoped to the parent category. */
export async function moveSubcategory(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const direction = str(formData, "direction") === "up" ? "up" : "down";

  const current = await db.subcategory.findUnique({ where: { id }, select: { categoryId: true } });
  if (!current) return;

  const rows = await db.subcategory.findMany({
    where: { categoryId: current.categoryId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, sortOrder: true },
  });
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) return;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return;

  const order = [...rows];
  [order[index], order[target]] = [order[target], order[index]];
  const writes = order
    .map((row, i) => ({ row, i }))
    .filter(({ row, i }) => row.sortOrder !== i)
    .map(({ row, i }) => db.subcategory.update({ where: { id: row.id }, data: { sortOrder: i } }));
  if (writes.length > 0) await db.$transaction(writes);

  await logActivity(session, {
    action: "subcategory.reorder",
    entity: "Subcategory",
    entityId: id,
    summary: `Moved subcategory ${rows[index].name} ${direction} to position ${target + 1}`,
    metadata: { categoryId: current.categoryId },
  });
  revalidateStorefront();
  revalidateAdmin("categories");
}
