import "server-only";

import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type {
  Banner,
  Brand,
  Category,
  FacetValue,
  Offer,
  Paginated,
  Product,
  ProductFacets,
  ProductQuery,
  PromoTile,
  QuestionAnswer,
  RatingBreakdown,
  Review,
  SortKey,
  Subcategory,
  VariantGroup,
} from "@/lib/types";
import { COLOR_HEX } from "@/data/products";
import { discountPercent } from "@/lib/utils";

/**
 * The storefront's read API, now backed by Postgres.
 *
 * Every function keeps the signature it had in phase 1 (when it read the mock
 * arrays), so no page or component changed when the database arrived. Rows are
 * mapped to the same domain types the UI has always consumed.
 */

/* ------------------------------ Mappers ----------------------------- */

const productListInclude = {
  brand: { select: { slug: true, name: true } },
  category: { select: { slug: true } },
  subcategory: { select: { slug: true } },
  images: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.ProductInclude;

const productFullInclude = {
  ...productListInclude,
  variantGroups: {
    orderBy: { sortOrder: "asc" as const },
    include: { options: { orderBy: { sortOrder: "asc" as const } } },
  },
  relationsFrom: { orderBy: { sortOrder: "asc" as const }, select: { relatedId: true, kind: true } },
} satisfies Prisma.ProductInclude;

type ProductListRow = Prisma.ProductGetPayload<{ include: typeof productListInclude }>;
type ProductFullRow = Prisma.ProductGetPayload<{ include: typeof productFullInclude }>;

/** Estimates a star histogram when only the aggregate is known (cards, rails). */
function estimateBreakdown(rating: number, count: number): RatingBreakdown {
  const five = Math.max(0.35, Math.min(0.82, (rating - 3.2) / 1.6));
  const four = Math.min(0.4, (1 - five) * 0.58);
  const three = (1 - five - four) * 0.5;
  const two = (1 - five - four - three) * 0.55;
  const one = 1 - five - four - three - two;
  const at = (share: number) => Math.max(0, Math.round(count * share));
  return { 5: at(five), 4: at(four), 3: at(three), 2: at(two), 1: at(one) };
}

function toProduct(
  row: ProductListRow | ProductFullRow,
  breakdown?: RatingBreakdown,
): Product {
  const full = row as Partial<ProductFullRow>;
  const variants: VariantGroup[] = (full.variantGroups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type.toLowerCase() as VariantGroup["type"],
    options: g.options.map((o) => ({
      id: o.id,
      label: o.label,
      value: o.value,
      swatch: o.swatch ?? (g.type === "COLOR" ? COLOR_HEX[o.label] : undefined),
      priceDelta: o.priceDelta,
      inStock: o.inStock,
    })),
  }));

  const relations = full.relationsFrom ?? [];

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    brandSlug: row.brand.slug,
    brandName: row.brand.name,
    categorySlug: row.category.slug,
    subcategorySlug: row.subcategory.slug,
    images: row.images.length
      ? row.images.map((i) => ({ url: i.url, alt: i.alt }))
      : [{ url: "", alt: row.title }],
    videoPoster: row.videoPoster ?? undefined,
    price: row.price,
    mrp: row.mrp,
    currency: "INR",
    rating: row.rating,
    reviewCount: row.reviewCount,
    ratingBreakdown: breakdown ?? estimateBreakdown(row.rating, row.reviewCount),
    stock: row.stock,
    soldCount: row.soldCount,
    badges: row.badges.map((b) => b.toLowerCase() as Product["badges"][number]),
    tags: row.tags,
    colors: row.colors,
    variants,
    highlights: row.highlights,
    description: row.description,
    specifications: (row.specifications as unknown as Product["specifications"]) ?? [],
    deliveryDays: row.deliveryDays,
    codAvailable: row.codAvailable,
    returnWindowDays: row.returnWindowDays,
    warranty: row.warranty,
    freeShipping: row.freeShipping,
    createdAt: (row.publishedAt ?? row.createdAt).toISOString(),
    relatedIds: relations.filter((r) => r.kind === "RELATED").map((r) => r.relatedId),
    bundleIds: relations.filter((r) => r.kind === "BUNDLE").map((r) => r.relatedId),
  };
}

type CategoryRow = Prisma.CategoryGetPayload<{ include: { subcategories: true } }>;

function toSubcategory(row: CategoryRow["subcategories"][number], categorySlug: string): Subcategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categorySlug,
    description: row.description,
    image: { url: row.imageUrl, alt: row.imageAlt },
  };
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    menuLabel: row.menuLabel,
    icon: row.icon,
    accent: row.accent,
    description: row.description,
    image: { url: row.imageUrl, alt: row.imageAlt },
    highlights: row.highlights,
    featuredBrands: row.featuredBrandSlugs,
    subcategories: row.subcategories
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => toSubcategory(s, row.slug)),
  };
}

const ACTIVE = { status: "ACTIVE" as const };

/* ---------------------------- Taxonomy ---------------------------- */

export const getCategories = cache(async (): Promise<Category[]> => {
  const rows = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { subcategories: true },
  });
  return rows.map(toCategory);
});

export const getCategory = cache(async (slug: string): Promise<Category | null> => {
  const row = await db.category.findFirst({
    where: { slug, isActive: true },
    include: { subcategories: true },
  });
  return row ? toCategory(row) : null;
});

export async function getSubcategory(
  categorySlug: string,
  subSlug: string,
): Promise<{ category: Category; subcategory: Subcategory } | null> {
  const category = await getCategory(categorySlug);
  if (!category) return null;
  const subcategory = category.subcategories.find((s) => s.slug === subSlug);
  return subcategory ? { category, subcategory } : null;
}

export const getBrands = cache(async (): Promise<Brand[]> => {
  const rows = await db.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return rows.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    logoText: b.logoText,
    tagline: b.tagline,
    origin: b.origin,
  }));
});

export async function getBrand(slug: string): Promise<Brand | null> {
  const brands = await getBrands();
  return brands.find((b) => b.slug === slug) ?? null;
}

/* ---------------------------- Products ---------------------------- */

export const getProduct = cache(async (slug: string): Promise<Product | null> => {
  const row = await db.product.findFirst({
    where: { slug, ...ACTIVE },
    include: productFullInclude,
  });
  if (!row) return null;

  const grouped = await db.review.groupBy({
    by: ["rating"],
    where: { productId: row.id, status: "APPROVED" },
    _count: { _all: true },
  });
  const breakdown: RatingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const g of grouped) {
    const key = Math.min(5, Math.max(1, g.rating)) as 1 | 2 | 3 | 4 | 5;
    breakdown[key] += g._count._all;
  }
  const hasReal = Object.values(breakdown).some((n) => n > 0);

  return toProduct(row, hasReal ? breakdown : undefined);
});

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const rows = await db.product.findMany({
    where: { id: { in: ids }, ...ACTIVE },
    include: productListInclude,
  });
  const byId = new Map(rows.map((r) => [r.id, toProduct(r)]));
  return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}

const SORTERS: Record<SortKey, (a: Product, b: Product) => number> = {
  relevance: (a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount,
  popularity: (a, b) => b.soldCount - a.soldCount,
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
  newest: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  discount: (a, b) => discountPercent(b.mrp, b.price) - discountPercent(a.mrp, a.price),
};

/** Text matching is done in the query so the scoped set stays small. */
function textWhere(q: string | undefined): Prisma.ProductWhereInput {
  if (!q) return {};
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return {
    AND: terms.map((t) => ({
      OR: [
        { title: { contains: t, mode: "insensitive" } },
        { subtitle: { contains: t, mode: "insensitive" } },
        { tags: { has: t } },
        { colors: { has: t.charAt(0).toUpperCase() + t.slice(1) } },
        { brand: { name: { contains: t, mode: "insensitive" } } },
        { category: { name: { contains: t, mode: "insensitive" } } },
        { subcategory: { name: { contains: t, mode: "insensitive" } } },
        { subcategory: { slug: { contains: t, mode: "insensitive" } } },
      ],
    })),
  };
}

function matchesRefinements(product: Product, query: ProductQuery) {
  if (query.brands?.length && !query.brands.includes(product.brandSlug)) return false;
  if (query.minPrice != null && product.price < query.minPrice) return false;
  if (query.maxPrice != null && product.price > query.maxPrice) return false;
  if (query.minRating != null && product.rating < query.minRating) return false;
  if (query.minDiscount != null && discountPercent(product.mrp, product.price) < query.minDiscount)
    return false;
  if (query.colors?.length && !product.colors.some((c) => query.colors!.includes(c))) return false;
  if (query.inStockOnly && product.stock <= 0) return false;
  if (query.fastDelivery && product.deliveryDays > 2) return false;
  if (query.tags?.length && !query.tags.some((t) => product.tags.includes(t))) return false;
  return true;
}

export async function searchProducts(
  query: ProductQuery = {},
): Promise<Paginated<Product> & { facets: ProductFacets }> {
  const perPage = query.perPage ?? 24;
  const page = Math.max(1, query.page ?? 1);

  // The "scope" is everything the search term + category narrow to. Facet
  // counts are computed against the scope, not the refined result, so a brand
  // you have not ticked still shows how many products it would add.
  const rows = await db.product.findMany({
    where: {
      ...ACTIVE,
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.subcategory ? { subcategory: { slug: query.subcategory } } : {}),
      ...textWhere(query.q),
    },
    include: productListInclude,
  });
  const scoped = rows.map((r) => toProduct(r));

  const matched = scoped.filter((p) => matchesRefinements(p, query));
  const sorted = [...matched].sort(SORTERS[query.sort ?? "relevance"]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const items = sorted.slice((page - 1) * perPage, page * perPage);

  return { items, total, page, perPage, totalPages, facets: buildFacets(scoped, rows) };
}

function tally(values: string[]) {
  return values.reduce((acc, v) => acc.set(v, (acc.get(v) ?? 0) + 1), new Map<string, number>());
}

function buildFacets(scope: Product[], rows: ProductListRow[]): ProductFacets {
  const brandName = new Map(rows.map((r) => [r.brand.slug, r.brand.name]));
  const brandCounts = tally(scope.map((p) => p.brandSlug));
  const colorCounts = tally(scope.flatMap((p) => p.colors));
  const categoryCounts = tally(scope.map((p) => p.categorySlug));

  const brands: FacetValue[] = [...brandCounts.entries()]
    .map(([value, count]) => ({ value, label: brandName.get(value) ?? value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const colors: FacetValue[] = [...colorCounts.entries()]
    .map(([value, count]) => ({ value, label: value, count, swatch: COLOR_HEX[value] }))
    .sort((a, b) => b.count - a.count);

  const categories: FacetValue[] = [...categoryCounts.entries()]
    .map(([value, count]) => ({ value, label: value.replace(/-/g, " "), count }))
    .sort((a, b) => b.count - a.count);

  const ratings: FacetValue[] = [4.5, 4, 3.5, 3].map((r) => ({
    value: String(r),
    label: `${r} and above`,
    count: scope.filter((p) => p.rating >= r).length,
  }));

  const discounts: FacetValue[] = [50, 40, 30, 20, 10].map((d) => ({
    value: String(d),
    label: `${d}% and above`,
    count: scope.filter((p) => discountPercent(p.mrp, p.price) >= d).length,
  }));

  const prices = scope.map((p) => p.price);
  return {
    brands,
    colors,
    categories,
    ratings,
    discounts,
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 200000,
    },
  };
}

/* --------------------------- Merchandising -------------------------- */

async function listActive(args: Prisma.ProductFindManyArgs): Promise<Product[]> {
  const rows = await db.product.findMany({
    ...args,
    where: { ...ACTIVE, ...(args.where ?? {}) },
    include: productListInclude,
  });
  return rows.map((r) => toProduct(r));
}

export const getTrending = (limit = 10) =>
  listActive({ where: { badges: { has: "TRENDING" } }, orderBy: { soldCount: "desc" }, take: limit });

/**
 * Badged bestsellers, falling back to what actually sells.
 *
 * The badge is set by hand in the admin panel. A new catalogue has none, and a
 * homepage band that stays empty until someone discovers a checkbox is a band
 * that never appears — so below a useful number we rank by units sold instead.
 */
export async function getBestsellers(limit = 10) {
  const badged = await listActive({
    where: { badges: { has: "BESTSELLER" } },
    orderBy: { soldCount: "desc" },
    take: limit,
  });
  if (badged.length >= Math.min(4, limit)) return badged;
  return listActive({ orderBy: [{ soldCount: "desc" }, { rating: "desc" }], take: limit });
}

export const getNewArrivals = (limit = 10) =>
  listActive({ orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: limit });

export async function getFlashDeals(limit = 8) {
  const all = await listActive({ where: { stock: { gt: 0 } } });
  return all
    .filter((p) => discountPercent(p.mrp, p.price) >= 25)
    .sort(SORTERS.discount)
    .slice(0, limit);
}

export const getLimitedStock = (limit = 8) =>
  listActive({ where: { stock: { gt: 0, lte: 15 } }, orderBy: { stock: "asc" }, take: limit });

export const getHandpicked = (limit = 10) =>
  listActive({ where: { badges: { has: "HANDPICKED" } }, orderBy: { rating: "desc" }, take: limit });

export async function getRecommended(limit = 10) {
  const all = await listActive({ where: { reviewCount: { gt: 0 } } });
  return all
    .sort(
      (a, b) =>
        b.rating * Math.log(b.reviewCount + 1) - a.rating * Math.log(a.reviewCount + 1),
    )
    .slice(0, limit);
}

export const getCategoryTop = (categorySlug: string, limit = 8) =>
  listActive({ where: { category: { slug: categorySlug } }, orderBy: { soldCount: "desc" }, take: limit });

export async function getRelated(product: Product, limit = 8) {
  const explicit = await getProductsByIds(product.relatedIds.slice(0, limit));
  if (explicit.length >= Math.min(4, limit)) return explicit;
  // Fall back to siblings when the merchandiser has not curated a list yet.
  const siblings = await listActive({
    where: { subcategory: { slug: product.subcategorySlug }, id: { not: product.id } },
    orderBy: { soldCount: "desc" },
    take: limit,
  });
  const seen = new Set(explicit.map((p) => p.id));
  return [...explicit, ...siblings.filter((p) => !seen.has(p.id))].slice(0, limit);
}

export function getBundle(product: Product) {
  return getProductsByIds(product.bundleIds);
}

/* ----------------------------- Reviews ------------------------------ */

export async function getReviews(productId: string): Promise<Review[]> {
  const rows = await db.review.findMany({
    where: { productId, status: "APPROVED" },
    orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    author: r.author,
    location: r.location,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    verified: r.verified,
    helpfulCount: r.helpfulCount,
    images: r.images.length ? r.images : undefined,
  }));
}

export async function getQuestions(productId: string): Promise<QuestionAnswer[]> {
  const rows = await db.question.findMany({
    where: { productId, status: "ANSWERED", answer: { not: null } },
    orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((q) => ({
    id: q.id,
    productId: q.productId,
    question: q.question,
    answer: q.answer ?? "",
    askedBy: q.askedBy,
    answeredBy: q.answeredBy ?? "WeekendCart Support",
    answeredAt: (q.answeredAt ?? q.createdAt).toISOString(),
    upvotes: q.upvotes,
  }));
}

/* ------------------------------ Offers ------------------------------ */

type OfferRow = Prisma.OfferGetPayload<{ include: { category: { select: { slug: true } } } }>;

function toOffer(o: OfferRow): Offer {
  return {
    id: o.id,
    code: o.code,
    title: o.title,
    description: o.description,
    type: o.type.toLowerCase() as Offer["type"],
    value: o.value,
    minSpend: o.minSpend,
    maxDiscount: o.maxDiscount ?? undefined,
    expiresAt: o.expiresAt.toISOString(),
    categorySlug: o.category?.slug,
    accent: o.accent,
  };
}

export const getOffers = cache(async (): Promise<Offer[]> => {
  const now = new Date();
  const rows = await db.offer.findMany({
    where: { isActive: true, startsAt: { lte: now }, expiresAt: { gte: now } },
    orderBy: { createdAt: "asc" },
    include: { category: { select: { slug: true } } },
  });
  return rows.map(toOffer);
});

export async function getOffer(code: string): Promise<Offer | null> {
  const row = await db.offer.findUnique({
    where: { code: code.toUpperCase().trim() },
    include: { category: { select: { slug: true } } },
  });
  if (!row || !row.isActive) return null;
  return toOffer(row);
}

/* ---------------------------- Catalogue size ------------------------ */

/**
 * How much catalogue there is to merchandise with.
 *
 * The homepage asks before it decides what to render: a shop with two real
 * products cannot fill eight bands, and padding them out with the same two
 * products repeated reads as an empty shop pretending otherwise.
 */
export const getCatalogueSize = cache(
  async (): Promise<{ products: number; categories: number }> => {
    const [products, categories] = await Promise.all([
      db.product.count({ where: ACTIVE }),
      db.category.count({ where: { isActive: true } }),
    ]);
    return { products, categories };
  },
);

/* ------------------------------ Banners ----------------------------- */

export const getBanners = cache(
  async (): Promise<{ hero: Banner[]; mid: Banner[]; promoTiles: PromoTile[] }> => {
    const now = new Date();
    const rows = await db.banner.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { sortOrder: "asc" },
    });

    const banner = (b: (typeof rows)[number]): Banner => ({
      id: b.id,
      eyebrow: b.eyebrow,
      title: b.title,
      subtitle: b.subtitle,
      cta: b.cta,
      href: b.href,
      image: { url: b.imageUrl, alt: b.imageAlt || b.title },
      align: b.align === "right" ? "right" : "left",
      theme: b.theme === "light" ? "light" : "dark",
    });

    return {
      hero: rows.filter((b) => b.placement === "HERO").map(banner),
      mid: rows.filter((b) => b.placement === "MID").map(banner),
      promoTiles: rows
        .filter((b) => b.placement === "PROMO_TILE")
        .map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          href: b.href,
          cta: b.cta,
          image: { url: b.imageUrl, alt: b.imageAlt || b.title },
        })),
    };
  },
);

/* --------------------------- Static params -------------------------- */

export async function getAllProductSlugs() {
  const rows = await db.product.findMany({ where: ACTIVE, select: { slug: true } });
  return rows.map((r) => r.slug);
}

export async function getAllCategoryPaths() {
  const categories = await getCategories();
  return categories.flatMap((c) => [
    { category: c.slug },
    ...c.subcategories.map((s) => ({ category: c.slug, subcategory: s.slug })),
  ]);
}
