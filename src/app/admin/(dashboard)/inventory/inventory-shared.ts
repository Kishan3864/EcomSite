/**
 * Constants shared by the inventory pages, the client forms and the server
 * actions. Kept free of server imports so client components can use it.
 */

export const STOCK_REASONS = [
  { value: "received", label: "Received stock" },
  { value: "damaged", label: "Damaged" },
  { value: "correction", label: "Correction" },
  { value: "returned_supplier", label: "Returned to supplier" },
  { value: "other", label: "Other" },
] as const;

export type StockReason = (typeof STOCK_REASONS)[number]["value"];

export type StockState = "out" | "low" | "healthy";

/** Out beats low: a product with 0 units is "out" even if its threshold is 0. */
export function stockStateOf(stock: number, threshold: number): StockState {
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "healthy";
}

export const STOCK_STATE_META: Record<StockState, { label: string; tone: "sale" | "gold" | "brand" }> = {
  out: { label: "Out of stock", tone: "sale" },
  low: { label: "Low stock", tone: "gold" },
  healthy: { label: "In stock", tone: "brand" },
};

export const STOCK_STATE_OPTIONS: { value: StockState; label: string }[] = [
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
  { value: "healthy", label: "In stock" },
];

export const SORT_OPTIONS = [
  { value: "stock-desc", label: "Stock: high to low" },
  { value: "sold", label: "Most sold first" },
  { value: "title", label: "Title A–Z" },
] as const;

/** Order numbers are the only references the storefront writes; link those. */
export const ORDER_NUMBER_RE = /^WKC-\d{4}-\d{6}$/;
