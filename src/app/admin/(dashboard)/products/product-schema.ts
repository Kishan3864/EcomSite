/**
 * Constants and payload shapes shared by the product form (client) and the
 * product actions (server). No server imports here so the client can use it.
 */

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type ProductStatusValue = (typeof PRODUCT_STATUSES)[number];

export const STATUS_HELP: Record<ProductStatusValue, string> = {
  DRAFT: "Hidden from shoppers. Use while you finish the listing.",
  ACTIVE: "Live on the storefront and searchable.",
  ARCHIVED: "Retired. Hidden everywhere but kept for order history.",
};

/**
 * The GST rates India actually levies. Shared with the category form, whose
 * defaults are only ever a fallback for the products inside it.
 */
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;
export type GstRateValue = (typeof GST_RATES)[number];

export function isGstRate(value: number): value is GstRateValue {
  return (GST_RATES as readonly number[]).includes(value);
}

/** HSN codes run to 4, 6 or 8 digits; a service SAC is 6. */
export function isHsnCode(value: string) {
  return /^\d{4}(?:\d{2}){0,2}$/.test(value);
}

export const PRODUCT_BADGES = [
  { value: "BESTSELLER", label: "Bestseller" },
  { value: "NEW", label: "New in" },
  { value: "TRENDING", label: "Trending" },
  { value: "LIMITED", label: "Few left" },
  { value: "EXCLUSIVE", label: "Exclusive" },
  { value: "HANDPICKED", label: "Handpicked" },
] as const;
export type ProductBadgeValue = (typeof PRODUCT_BADGES)[number]["value"];

export const VARIANT_TYPES = [
  { value: "COLOR", label: "Colour" },
  { value: "SIZE", label: "Size" },
  { value: "STORAGE", label: "Storage" },
  { value: "OPTION", label: "Option" },
] as const;
export type VariantTypeValue = (typeof VARIANT_TYPES)[number]["value"];

export const STOCK_STATES = [
  { value: "in", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
] as const;

/** `sort` URL values for the list page: `<field>_<dir>`; the default is `updated_desc`. */
export const SORT_OPTIONS = [
  { value: "updated_asc", label: "Least recently updated" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "stock_asc", label: "Stock: lowest first" },
  { value: "stock_desc", label: "Stock: highest first" },
  { value: "sold_desc", label: "Best selling" },
  { value: "title_asc", label: "Title A–Z" },
] as const;

export interface ImageInput {
  url: string;
  alt: string;
}

export interface SpecItemInput {
  label: string;
  value: string;
}

export interface SpecGroupInput {
  group: string;
  items: SpecItemInput[];
}

export interface VariantOptionInput {
  label: string;
  value: string;
  swatch: string;
  priceDelta: number;
  inStock: boolean;
}

export interface VariantGroupInput {
  name: string;
  type: VariantTypeValue;
  options: VariantOptionInput[];
}

/** Compact catalogue row used by the related / bundle pickers. */
export interface CatalogItem {
  id: string;
  title: string;
  sku: string;
}

export const WARRANTY_DEFAULT = "6 months against manufacturing defects";
