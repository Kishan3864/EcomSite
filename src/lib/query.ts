import type { ProductQuery, SortKey } from "./types";

/**
 * URL <-> query translation, shared by the server pages and the client filter
 * panel. Keeping it in one place means a filter added here works everywhere,
 * and every listing URL stays clean, shareable and crawlable.
 */

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "popularity", label: "Popularity" },
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Customer rating" },
  { value: "discount", label: "Discount" },
];

const SORT_VALUES = new Set(SORT_OPTIONS.map((o) => o.value));

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | string[] | undefined) {
  if (!value) return undefined;
  const flat = Array.isArray(value) ? value : [value];
  const out = flat.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

function num(value: string | string[] | undefined) {
  const raw = first(value);
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function parseQuery(params: RawSearchParams): ProductQuery {
  const sort = first(params.sort) as SortKey | undefined;

  return {
    q: first(params.q)?.trim() || undefined,
    category: first(params.category) || undefined,
    subcategory: first(params.subcategory) || undefined,
    brands: list(params.brands),
    colors: list(params.colors),
    tags: list(params.tags),
    minPrice: num(params.minPrice),
    maxPrice: num(params.maxPrice),
    minRating: num(params.rating),
    minDiscount: num(params.discount),
    inStockOnly: first(params.inStock) === "1",
    fastDelivery: first(params.fast) === "1",
    sort: sort && SORT_VALUES.has(sort) ? sort : undefined,
    page: num(params.page) ?? 1,
    perPage: 24,
  };
}

/** Serialise back to a querystring, dropping defaults so URLs stay short. */
export function buildQueryString(query: ProductQuery, omit: (keyof ProductQuery)[] = []) {
  const params = new URLSearchParams();
  const skip = new Set(omit);

  const put = (key: string, value: string | undefined | null) => {
    if (value) params.set(key, value);
  };

  if (!skip.has("q")) put("q", query.q);
  if (!skip.has("category")) put("category", query.category);
  if (!skip.has("subcategory")) put("subcategory", query.subcategory);
  if (!skip.has("brands")) put("brands", query.brands?.join(","));
  if (!skip.has("colors")) put("colors", query.colors?.join(","));
  if (!skip.has("tags")) put("tags", query.tags?.join(","));
  if (!skip.has("minPrice")) put("minPrice", query.minPrice?.toString());
  if (!skip.has("maxPrice")) put("maxPrice", query.maxPrice?.toString());
  if (!skip.has("minRating")) put("rating", query.minRating?.toString());
  if (!skip.has("minDiscount")) put("discount", query.minDiscount?.toString());
  if (!skip.has("inStockOnly") && query.inStockOnly) params.set("inStock", "1");
  if (!skip.has("fastDelivery") && query.fastDelivery) params.set("fast", "1");
  if (!skip.has("sort") && query.sort && query.sort !== "relevance")
    params.set("sort", query.sort);
  if (!skip.has("page") && query.page && query.page > 1)
    params.set("page", String(query.page));

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export interface ActiveFilter {
  key: string;
  label: string;
  /** Params to clear when this chip is dismissed. */
  clear: Record<string, null | string>;
}

export function activeFilters(
  query: ProductQuery,
  labels: { brands?: Record<string, string>; colors?: Record<string, string> } = {},
): ActiveFilter[] {
  const out: ActiveFilter[] = [];

  for (const b of query.brands ?? []) {
    out.push({
      key: `brand-${b}`,
      label: labels.brands?.[b] ?? b,
      clear: { brands: (query.brands ?? []).filter((x) => x !== b).join(",") || null },
    });
  }
  for (const c of query.colors ?? []) {
    out.push({
      key: `color-${c}`,
      label: c,
      clear: { colors: (query.colors ?? []).filter((x) => x !== c).join(",") || null },
    });
  }
  if (query.minPrice != null || query.maxPrice != null) {
    out.push({
      key: "price",
      label: `₹${(query.minPrice ?? 0).toLocaleString("en-IN")} – ₹${(query.maxPrice ?? 200000).toLocaleString("en-IN")}`,
      clear: { minPrice: null, maxPrice: null },
    });
  }
  if (query.minRating != null) {
    out.push({ key: "rating", label: `${query.minRating}★ and above`, clear: { rating: null } });
  }
  if (query.minDiscount != null) {
    out.push({
      key: "discount",
      label: `${query.minDiscount}% off or more`,
      clear: { discount: null },
    });
  }
  if (query.inStockOnly) {
    out.push({ key: "inStock", label: "In stock only", clear: { inStock: null } });
  }
  if (query.fastDelivery) {
    out.push({ key: "fast", label: "Fast delivery", clear: { fast: null } });
  }

  return out;
}

export function countActive(query: ProductQuery) {
  return activeFilters(query).length;
}
