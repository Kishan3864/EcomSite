"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logActivity, requireAdmin, type AdminSession } from "@/lib/auth/admin";
import type { FormState } from "./form-state";
import { bool, lines, list, num, revalidateAdmin, revalidateStorefront, slugify, str } from "./shared";
import {
  PRODUCT_BADGES,
  PRODUCT_STATUSES,
  VARIANT_TYPES,
  WARRANTY_DEFAULT,
  isGstRate,
  isHsnCode,
  type ImageInput,
  type ProductBadgeValue,
  type ProductStatusValue,
  type SpecGroupInput,
  type VariantGroupInput,
  type VariantTypeValue,
} from "@/app/admin/(dashboard)/products/product-schema";

/**
 * Product catalogue actions. Every save rewrites the child rows (images,
 * variant groups, relations) inside one transaction so a half-applied edit
 * can never reach the storefront. Stock edits leave a StockMovement trail.
 */

const LIST = "/admin/products";
const STATUS_LABEL: Record<ProductStatusValue, string> = { DRAFT: "draft", ACTIVE: "active", ARCHIVED: "archived" };

/* ------------------------------ Helpers ----------------------------- */

function withFlash(url: string, message: string, tone: "ok" | "error" = "ok") {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}flash=${encodeURIComponent(message)}${tone === "error" ? "&tone=error" : ""}`;
}

/** Only ever bounce back inside the products module. */
function safeReturnTo(raw: string) {
  return raw.startsWith(LIST) && !raw.includes("//") ? raw : LIST;
}

function isUrlish(value: string) {
  return /^https?:\/\/\S+$/i.test(value) || (value.startsWith("/") && !value.startsWith("//"));
}

function isStatus(value: string): value is ProductStatusValue {
  return (PRODUCT_STATUSES as readonly string[]).includes(value);
}

function isVariantType(value: string): value is VariantTypeValue {
  return VARIANT_TYPES.some((t) => t.value === value);
}

function parseJson(formData: FormData, key: string): unknown {
  const raw = str(formData, key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function intIn(formData: FormData, key: string, min: number, max: number, fallback = 0) {
  const raw = str(formData, key);
  const value = raw === "" ? fallback : num(formData, key, Number.NaN);
  if (!Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

type Fail = { error: string; field?: string };

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function parseImages(raw: unknown): ImageInput[] | Fail {
  if (!Array.isArray(raw)) return { error: "The image list could not be read. Reload the page and try again.", field: "images" };
  const images: ImageInput[] = [];
  for (const [i, item] of raw.entries()) {
    const row = rec(item);
    const url = text(row.url);
    const alt = text(row.alt);
    if (!url) return { error: `Image ${i + 1} has no URL. Paste one or remove the row.`, field: "images" };
    if (!isUrlish(url)) return { error: `Image ${i + 1}: use a full https:// URL or a path starting with /.`, field: "images" };
    images.push({ url, alt });
  }
  return images;
}

function parseSpecs(raw: unknown): SpecGroupInput[] | Fail {
  if (!Array.isArray(raw)) return { error: "Specifications could not be read. Reload the page and try again.", field: "specifications" };
  const groups: SpecGroupInput[] = [];
  for (const [gi, g] of raw.entries()) {
    const group = rec(g);
    const name = text(group.group);
    const items: { label: string; value: string }[] = [];
    for (const item of Array.isArray(group.items) ? group.items : []) {
      const row = rec(item);
      const label = text(row.label);
      const value = text(row.value);
      if (!label && !value) continue;
      if (!label || !value) {
        return {
          error: `Specification group ${gi + 1}${name ? ` (${name})` : ""}: every row needs both a label and a value.`,
          field: "specifications",
        };
      }
      items.push({ label, value });
    }
    if (!name && items.length === 0) continue;
    if (!name) return { error: `Specification group ${gi + 1} needs a name.`, field: "specifications" };
    if (items.length === 0) return { error: `Specification group “${name}” has no rows. Add one or remove the group.`, field: "specifications" };
    groups.push({ group: name, items });
  }
  return groups;
}

function parseVariants(raw: unknown): VariantGroupInput[] | Fail {
  if (!Array.isArray(raw)) return { error: "Variants could not be read. Reload the page and try again.", field: "variantGroups" };
  const groups: VariantGroupInput[] = [];
  for (const [gi, g] of raw.entries()) {
    const group = rec(g);
    const name = text(group.name);
    const type = text(group.type).toUpperCase();
    if (!name) return { error: `Variant group ${gi + 1} needs a name (e.g. Colour, Size).`, field: "variantGroups" };
    if (!isVariantType(type)) return { error: `Variant group “${name}” has an unknown type.`, field: "variantGroups" };
    const options: VariantGroupInput["options"] = [];
    const seen = new Set<string>();
    for (const o of Array.isArray(group.options) ? group.options : []) {
      const row = rec(o);
      const label = text(row.label);
      if (!label) continue;
      const value = slugify(text(row.value) || label) || label.toLowerCase();
      if (seen.has(value)) return { error: `Variant group “${name}” has two options with the value “${value}”.`, field: "variantGroups" };
      seen.add(value);
      const delta = Number(row.priceDelta ?? 0);
      if (!Number.isInteger(delta) || Math.abs(delta) > 10_000_000) {
        return { error: `Option “${label}” in “${name}”: price difference must be a whole rupee amount.`, field: "variantGroups" };
      }
      const swatch = text(row.swatch);
      options.push({ label, value, swatch, priceDelta: delta, inStock: row.inStock !== false && row.inStock !== "false" });
    }
    if (options.length === 0) return { error: `Variant group “${name}” needs at least one option.`, field: "variantGroups" };
    groups.push({ name, type, options });
  }
  return groups;
}

interface Validated {
  data: Omit<Prisma.ProductUncheckedCreateInput, "id" | "createdAt" | "updatedAt" | "publishedAt" | "soldCount" | "rating" | "reviewCount" | "stock">;
  stock: number;
  images: ImageInput[];
  variantGroups: VariantGroupInput[];
  relatedIds: string[];
  bundleIds: string[];
}

/** Parses and validates the whole product form. Everything is checked server-side. */
async function validate(formData: FormData, selfId?: string): Promise<Validated | Fail> {
  const title = str(formData, "title");
  const slug = slugify(str(formData, "slug") || title);
  const sku = str(formData, "sku").toUpperCase().replace(/\s+/g, "");
  const subtitle = str(formData, "subtitle");
  const description = str(formData, "description");
  const status = str(formData, "status") || "DRAFT";

  if (title.length < 3) return { error: "Give the product a title (at least 3 characters).", field: "title" };
  if (title.length > 160) return { error: "Keep the title under 160 characters.", field: "title" };
  if (!slug) return { error: "The slug cannot be empty — use letters, numbers and dashes.", field: "slug" };
  if (!sku) return { error: "Every product needs a SKU.", field: "sku" };
  if (!/^[A-Z0-9][A-Z0-9._/-]{1,39}$/.test(sku)) return { error: "SKU: 2–40 characters, letters, numbers, dots, dashes or slashes.", field: "sku" };
  if (subtitle.length < 3) return { error: "Add a one-line subtitle — it shows on cards and in search.", field: "subtitle" };
  if (description.length < 20) return { error: "Write a description of at least 20 characters.", field: "description" };
  if (!isStatus(status)) return { error: "Choose a valid status.", field: "status" };

  const price = intIn(formData, "price", 1, 100_000_000);
  if (price === null) return { error: "Price must be a whole rupee amount of at least ₹1.", field: "price" };
  const mrpRaw = str(formData, "mrp");
  const mrp = mrpRaw === "" ? price : intIn(formData, "mrp", 1, 100_000_000);
  if (mrp === null) return { error: "MRP must be a whole rupee amount.", field: "mrp" };
  if (mrp < price) return { error: "MRP cannot be lower than the selling price.", field: "mrp" };

  const stock = intIn(formData, "stock", 0, 10_000_000, 0);
  if (stock === null) return { error: "Stock must be a whole number, 0 or more.", field: "stock" };
  const lowStockThreshold = intIn(formData, "lowStockThreshold", 0, 1_000_000, 10);
  if (lowStockThreshold === null) return { error: "Low-stock threshold must be a whole number, 0 or more.", field: "lowStockThreshold" };

  // Both are optional: blank means the category's default, then the rate in Settings.
  const hsnCode = str(formData, "hsnCode");
  if (hsnCode && !isHsnCode(hsnCode)) return { error: "HSN code must be 4, 6 or 8 digits.", field: "hsnCode" };
  const taxRateRaw = str(formData, "taxRate");
  const taxRate = taxRateRaw === "" ? null : num(formData, "taxRate", Number.NaN);
  if (taxRate !== null && !isGstRate(taxRate)) {
    return { error: "Choose one of the listed GST rates, or leave it blank to inherit.", field: "taxRate" };
  }

  const badgeValues = formData.getAll("badges").filter((v): v is string => typeof v === "string");
  const badges: ProductBadgeValue[] = [];
  for (const b of badgeValues) {
    if (!PRODUCT_BADGES.some((x) => x.value === b)) return { error: "One of the badges is not recognised.", field: "badges" };
    if (!badges.includes(b as ProductBadgeValue)) badges.push(b as ProductBadgeValue);
  }

  const tags = list(formData, "tags").map((t) => t.toLowerCase()).slice(0, 30);
  const colors = list(formData, "colors").slice(0, 20);
  const highlights = lines(formData, "highlights").slice(0, 12);

  const specifications = parseSpecs(parseJson(formData, "specifications"));
  if ("error" in specifications) return specifications;

  const deliveryDays = intIn(formData, "deliveryDays", 1, 60, 3);
  if (deliveryDays === null) return { error: "Delivery days must be between 1 and 60.", field: "deliveryDays" };
  const returnWindowDays = intIn(formData, "returnWindowDays", 0, 90, 10);
  if (returnWindowDays === null) return { error: "Return window must be between 0 and 90 days.", field: "returnWindowDays" };
  const warranty = str(formData, "warranty") || WARRANTY_DEFAULT;
  const codAvailable = bool(formData, "codAvailable");
  const freeShipping = bool(formData, "freeShipping");

  const videoPoster = str(formData, "videoPoster") || null;
  if (videoPoster && !isUrlish(videoPoster)) return { error: "Video poster must be a full https:// URL or a path starting with /.", field: "videoPoster" };
  const metaTitle = str(formData, "metaTitle") || null;
  if (metaTitle && metaTitle.length > 120) return { error: "Meta title should stay under 120 characters.", field: "metaTitle" };
  const metaDescription = str(formData, "metaDescription") || null;
  if (metaDescription && metaDescription.length > 320) return { error: "Meta description should stay under 320 characters.", field: "metaDescription" };

  const brandId = str(formData, "brandId");
  const categoryId = str(formData, "categoryId");
  const subcategoryId = str(formData, "subcategoryId");
  if (!brandId) return { error: "Choose a brand.", field: "brandId" };
  if (!categoryId) return { error: "Choose a category.", field: "categoryId" };
  if (!subcategoryId) return { error: "Choose a subcategory.", field: "subcategoryId" };

  const [brand, subcategory] = await Promise.all([
    db.brand.findUnique({ where: { id: brandId }, select: { id: true } }),
    db.subcategory.findUnique({ where: { id: subcategoryId }, select: { id: true, categoryId: true } }),
  ]);
  if (!brand) return { error: "That brand no longer exists.", field: "brandId" };
  if (!subcategory) return { error: "That subcategory no longer exists.", field: "subcategoryId" };
  if (subcategory.categoryId !== categoryId) return { error: "The subcategory does not belong to the chosen category.", field: "subcategoryId" };

  const images = parseImages(parseJson(formData, "images"));
  if ("error" in images) return images;
  if (status === "ACTIVE" && images.length === 0) {
    return { error: "Add at least one image before making the product live.", field: "images" };
  }

  const variantGroups = parseVariants(parseJson(formData, "variantGroups"));
  if ("error" in variantGroups) return variantGroups;

  const relatedIds = list(formData, "related").filter((id) => id !== selfId).slice(0, 24);
  const bundleIds = list(formData, "bundle").filter((id) => id !== selfId).slice(0, 12);
  const wanted = [...new Set([...relatedIds, ...bundleIds])];
  if (wanted.length) {
    const found = await db.product.findMany({ where: { id: { in: wanted } }, select: { id: true } });
    const ok = new Set(found.map((p) => p.id));
    const missing = wanted.filter((id) => !ok.has(id));
    if (missing.length) return { error: "One of the linked products no longer exists. Remove it and save again.", field: "related" };
  }

  return {
    data: {
      title,
      slug,
      sku,
      subtitle,
      description,
      status,
      price,
      mrp,
      lowStockThreshold,
      hsnCode: hsnCode || null,
      taxRate,
      badges,
      tags,
      colors,
      highlights,
      specifications: specifications as unknown as Prisma.InputJsonValue,
      deliveryDays,
      codAvailable,
      returnWindowDays,
      warranty,
      freeShipping,
      videoPoster,
      metaTitle,
      metaDescription,
      brandId,
      categoryId,
      subcategoryId,
    },
    stock,
    images,
    variantGroups,
    relatedIds,
    bundleIds,
  };
}

async function findClash(slug: string, sku: string, notId?: string): Promise<Fail | null> {
  const [slugClash, skuClash] = await Promise.all([
    db.product.findFirst({ where: { slug, ...(notId ? { NOT: { id: notId } } : {}) }, select: { title: true } }),
    db.product.findFirst({ where: { sku: { equals: sku, mode: "insensitive" }, ...(notId ? { NOT: { id: notId } } : {}) }, select: { title: true } }),
  ]);
  if (slugClash) return { error: `The slug “${slug}” is already used by ${slugClash.title}.`, field: "slug" };
  if (skuClash) return { error: `The SKU ${sku} is already used by ${skuClash.title}.`, field: "sku" };
  return null;
}

/** Replaces every child row of a product. Runs inside the caller's transaction. */
async function writeChildren(tx: Prisma.TransactionClient, productId: string, v: Validated) {
  await tx.productImage.deleteMany({ where: { productId } });
  if (v.images.length) {
    await tx.productImage.createMany({
      data: v.images.map((img, i) => ({ productId, url: img.url, alt: img.alt || v.data.title, sortOrder: i })),
    });
  }

  await tx.variantGroup.deleteMany({ where: { productId } });
  for (const [gi, g] of v.variantGroups.entries()) {
    await tx.variantGroup.create({
      data: {
        productId,
        name: g.name,
        type: g.type,
        sortOrder: gi,
        options: {
          create: g.options.map((o, oi) => ({
            label: o.label,
            value: o.value,
            swatch: o.swatch || null,
            priceDelta: o.priceDelta,
            inStock: o.inStock,
            sortOrder: oi,
          })),
        },
      },
    });
  }

  await tx.productRelation.deleteMany({ where: { productId } });
  const relations: Prisma.ProductRelationCreateManyInput[] = [
    ...v.relatedIds.map((relatedId, i) => ({ productId, relatedId, kind: "RELATED" as const, sortOrder: i })),
    ...v.bundleIds.map((relatedId, i) => ({ productId, relatedId, kind: "BUNDLE" as const, sortOrder: i })),
  ];
  if (relations.length) await tx.productRelation.createMany({ data: relations, skipDuplicates: true });
}

function isUniqueViolation(error: unknown): string | null {
  const e = error as { code?: string; meta?: { target?: string[] | string } };
  if (e?.code !== "P2002") return null;
  const target = Array.isArray(e.meta?.target) ? e.meta?.target.join(",") : String(e.meta?.target ?? "");
  return target;
}

async function uniqueSlug(base: string) {
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await db.product.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function uniqueSku(base: string) {
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await db.product.findFirst({ where: { sku: { equals: candidate, mode: "insensitive" } }, select: { id: true } }))) return candidate;
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

function storefrontPaths(...slugs: (string | undefined)[]) {
  return [...new Set(slugs.filter((s): s is string => Boolean(s)))].map((s) => `/p/${s}`);
}

/* ------------------------------ Create ------------------------------ */

export async function createProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const v = await validate(formData);
  if ("error" in v) return v;

  const clash = await findClash(v.data.slug, v.data.sku);
  if (clash) return clash;

  let productId: string;
  try {
    const product = await db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          ...v.data,
          stock: v.stock,
          publishedAt: v.data.status === "ACTIVE" ? new Date() : null,
        },
      });
      await writeChildren(tx, p.id, v);
      if (v.stock !== 0) {
        await tx.stockMovement.create({
          data: { productId: p.id, delta: v.stock, reason: "Initial stock", actorName: session.name },
        });
      }
      return p;
    });
    productId = product.id;
  } catch (error) {
    const target = isUniqueViolation(error);
    if (target) return target.includes("sku") ? { error: "That SKU was just taken. Choose another.", field: "sku" } : { error: "That slug was just taken. Choose another.", field: "slug" };
    throw error;
  }

  await logActivity(session, {
    action: "product.create",
    entity: "Product",
    entityId: productId,
    summary: `Created product ${v.data.title} (${v.data.sku})`,
    metadata: { status: v.data.status, price: v.data.price, stock: v.stock },
  });
  revalidateStorefront(storefrontPaths(v.data.slug));
  revalidateAdmin("products");
  redirect(withFlash(LIST, `${v.data.title} created`));
}

/* ------------------------------ Update ------------------------------ */

export async function updateProduct(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const current = await db.product.findUnique({
    where: { id },
    select: { id: true, slug: true, stock: true, status: true, publishedAt: true, title: true },
  });
  if (!current) return { error: "This product no longer exists. It may have been deleted by someone else." };

  const v = await validate(formData, id);
  if ("error" in v) return v;

  const clash = await findClash(v.data.slug, v.data.sku, id);
  if (clash) return clash;

  const delta = v.stock - current.stock;
  try {
    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...v.data,
          stock: v.stock,
          publishedAt: v.data.status === "ACTIVE" && !current.publishedAt ? new Date() : undefined,
        },
      });
      await writeChildren(tx, id, v);
      if (delta !== 0) {
        await tx.stockMovement.create({
          data: { productId: id, delta, reason: "Manual edit", actorName: session.name },
        });
      }
    });
  } catch (error) {
    const target = isUniqueViolation(error);
    if (target) return target.includes("sku") ? { error: "That SKU was just taken. Choose another.", field: "sku" } : { error: "That slug was just taken. Choose another.", field: "slug" };
    throw error;
  }

  await logActivity(session, {
    action: "product.update",
    entity: "Product",
    entityId: id,
    summary: `Updated product ${v.data.title} (${v.data.sku})`,
    metadata: {
      status: v.data.status,
      price: v.data.price,
      stock: v.stock,
      ...(delta !== 0 ? { stockDelta: delta } : {}),
      ...(current.status !== v.data.status ? { statusFrom: current.status } : {}),
    },
  });
  revalidateStorefront(storefrontPaths(current.slug, v.data.slug));
  revalidateAdmin("products");
  return {
    ok: true,
    message: delta === 0 ? "Saved." : `Saved. Stock ${delta > 0 ? "increased" : "reduced"} by ${Math.abs(delta)} (movement recorded).`,
  };
}

/* ----------------------------- Duplicate ---------------------------- */

export async function duplicateProduct(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const returnTo = safeReturnTo(str(formData, "returnTo"));

  const source = await db.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variantGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
      relationsFrom: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!source) redirect(withFlash(returnTo, "Product not found", "error"));

  const slug = await uniqueSlug(`${source.slug}-copy`);
  const sku = await uniqueSku(`${source.sku}-COPY`);

  const copy = await db.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        slug,
        sku,
        title: `${source.title} (copy)`,
        subtitle: source.subtitle,
        description: source.description,
        status: "DRAFT",
        price: source.price,
        mrp: source.mrp,
        currency: source.currency,
        stock: 0,
        lowStockThreshold: source.lowStockThreshold,
        hsnCode: source.hsnCode,
        taxRate: source.taxRate,
        badges: source.badges,
        tags: source.tags,
        colors: source.colors,
        highlights: source.highlights,
        specifications: source.specifications as Prisma.InputJsonValue,
        deliveryDays: source.deliveryDays,
        codAvailable: source.codAvailable,
        returnWindowDays: source.returnWindowDays,
        warranty: source.warranty,
        freeShipping: source.freeShipping,
        videoPoster: source.videoPoster,
        metaTitle: source.metaTitle,
        metaDescription: source.metaDescription,
        brandId: source.brandId,
        categoryId: source.categoryId,
        subcategoryId: source.subcategoryId,
        publishedAt: null,
      },
    });
    if (source.images.length) {
      await tx.productImage.createMany({
        data: source.images.map((img, i) => ({ productId: p.id, url: img.url, alt: img.alt, sortOrder: i })),
      });
    }
    for (const g of source.variantGroups) {
      await tx.variantGroup.create({
        data: {
          productId: p.id,
          name: g.name,
          type: g.type,
          sortOrder: g.sortOrder,
          options: {
            create: g.options.map((o) => ({
              label: o.label,
              value: o.value,
              swatch: o.swatch,
              priceDelta: o.priceDelta,
              inStock: o.inStock,
              sortOrder: o.sortOrder,
            })),
          },
        },
      });
    }
    if (source.relationsFrom.length) {
      await tx.productRelation.createMany({
        data: source.relationsFrom.map((r) => ({ productId: p.id, relatedId: r.relatedId, kind: r.kind, sortOrder: r.sortOrder })),
        skipDuplicates: true,
      });
    }
    return p;
  });

  await logActivity(session, {
    action: "product.duplicate",
    entity: "Product",
    entityId: copy.id,
    summary: `Duplicated ${source.title} as ${copy.title} (${copy.sku})`,
    metadata: { sourceId: source.id },
  });
  revalidateAdmin("products");
  redirect(withFlash(`${LIST}/${copy.id}`, `Copy created as a draft with SKU ${copy.sku}. Rename it and set stock before publishing.`));
}

/* ------------------------------ Status ------------------------------ */

async function activationBlocker(rows: { images: number }[]) {
  return rows.filter((r) => r.images === 0).length;
}

export async function setProductStatus(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const status = str(formData, "status");
  const returnTo = safeReturnTo(str(formData, "returnTo"));
  if (!isStatus(status)) redirect(withFlash(returnTo, "Unknown status", "error"));

  const product = await db.product.findUnique({
    where: { id },
    select: { id: true, title: true, slug: true, status: true, publishedAt: true, _count: { select: { images: true } } },
  });
  if (!product) redirect(withFlash(returnTo, "Product not found", "error"));

  if (product.status === status) redirect(withFlash(returnTo, `${product.title} is already ${STATUS_LABEL[status]}`));
  if (status === "ACTIVE" && (await activationBlocker([{ images: product._count.images }])) > 0) {
    redirect(withFlash(returnTo, `${product.title} needs at least one image before it can go live.`, "error"));
  }

  await db.product.update({
    where: { id },
    data: { status, publishedAt: status === "ACTIVE" && !product.publishedAt ? new Date() : undefined },
  });
  await logActivity(session, {
    action: `product.${status.toLowerCase()}`,
    entity: "Product",
    entityId: id,
    summary: `Set ${product.title} to ${STATUS_LABEL[status]}`,
    metadata: { from: product.status, to: status },
  });
  revalidateStorefront(storefrontPaths(product.slug));
  revalidateAdmin("products");
  redirect(withFlash(returnTo, `${product.title} is now ${STATUS_LABEL[status]}`));
}

export async function bulkSetProductStatus(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const status = str(formData, "status");
  const returnTo = safeReturnTo(str(formData, "returnTo"));
  const ids = [...new Set(formData.getAll("ids").filter((v): v is string => typeof v === "string" && v.length > 0))];

  if (!isStatus(status)) redirect(withFlash(returnTo, "Unknown status", "error"));
  if (ids.length === 0) redirect(withFlash(returnTo, "Select at least one product first.", "error"));

  const rows = await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true, status: true, _count: { select: { images: true } } },
  });
  let eligible = rows.filter((r) => r.status !== status);
  let skippedNoImage = 0;
  if (status === "ACTIVE") {
    skippedNoImage = eligible.filter((r) => r._count.images === 0).length;
    eligible = eligible.filter((r) => r._count.images > 0);
  }
  const alreadyThere = rows.length - rows.filter((r) => r.status !== status).length;

  if (eligible.length > 0) {
    const eligibleIds = eligible.map((r) => r.id);
    await db.product.updateMany({ where: { id: { in: eligibleIds } }, data: { status } });
    if (status === "ACTIVE") {
      await db.product.updateMany({ where: { id: { in: eligibleIds }, publishedAt: null }, data: { publishedAt: new Date() } });
    }
    await logActivity(session, {
      action: "product.bulk_status",
      entity: "Product",
      summary: `Set ${eligible.length} products to ${STATUS_LABEL[status]}`,
      metadata: { status, ids: eligibleIds },
    });
    revalidateStorefront(storefrontPaths(...eligible.map((r) => r.slug)));
    revalidateAdmin("products");
  }

  const notes: string[] = [];
  if (alreadyThere) notes.push(`${alreadyThere} already ${STATUS_LABEL[status]}`);
  if (skippedNoImage) notes.push(`${skippedNoImage} skipped — no images`);
  const message =
    eligible.length > 0
      ? `${eligible.length} ${eligible.length === 1 ? "product" : "products"} set to ${STATUS_LABEL[status]}${notes.length ? ` (${notes.join(", ")})` : ""}`
      : `Nothing changed${notes.length ? ` — ${notes.join(", ")}` : ""}`;
  redirect(withFlash(returnTo, message, eligible.length > 0 ? "ok" : "error"));
}

/* ------------------------------ Delete ------------------------------ */

export async function deleteProduct(formData: FormData) {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");
  const returnTo = safeReturnTo(str(formData, "returnTo"));

  const product = await db.product.findUnique({
    where: { id },
    select: { id: true, title: true, slug: true, sku: true, _count: { select: { orderLines: true } } },
  });
  if (!product) redirect(withFlash(returnTo, "Product not found", "error"));

  // Order lines snapshot the product but keep a pointer for returns and
  // reports; deleting would silently break those. Archive instead.
  if (product._count.orderLines > 0) {
    redirect(
      withFlash(
        returnTo,
        `${product.title} appears on ${product._count.orderLines} order ${product._count.orderLines === 1 ? "line" : "lines"} and cannot be deleted. Archive it instead.`,
        "error",
      ),
    );
  }

  await db.product.delete({ where: { id } });
  await logActivity(session, {
    action: "product.delete",
    entity: "Product",
    entityId: id,
    summary: `Deleted product ${product.title} (${product.sku})`,
  });
  revalidateStorefront(storefrontPaths(product.slug));
  revalidateAdmin("products");
  // The edit page no longer exists after a delete, so always land on the list.
  redirect(withFlash(returnTo.startsWith(`${LIST}/`) ? LIST : returnTo, `${product.title} deleted`));
}

export type { AdminSession };
