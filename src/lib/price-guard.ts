/**
 * Is this price probably a mistake? One rule, used by every place that asks.
 *
 * A warning, never a block. A live product sat at ₹5 for days because a price
 * dropped for a payment test was never put back, and nothing anywhere said so.
 * The shop must still be allowed to sell at a loss or run a deep clearance on
 * purpose — so this only ever points, and the save always goes through.
 *
 * ACTIVE products only: a draft is allowed to be unfinished, and an archived
 * one is not for sale. Two tests, either is enough:
 *
 *   under cost      the price is below what the unit cost to buy, when a cost
 *                   has been recorded at all;
 *   under 10% MRP   the price is less than a tenth of the MRP — the shape a
 *                   slipped decimal or a test price leaves behind.
 *
 * No imports, so the product form (a client component), the server action, the
 * list and the dashboard can all share this one function and cannot disagree.
 */
export interface PricedProduct {
  status: string;
  price: number;
  mrp: number;
  costPrice: number | null;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * For the routes that put products on sale WITHOUT opening them — publishing
 * from the list, un-archiving, switching a hidden category on. Judges each as
 * if it were already live, because in a moment it will be, and names the ones
 * the rule points at so the admin is told which to look at, not just how many.
 */
export function priceCaution(products: (Omit<PricedProduct, "status"> & { title: string })[]): string | null {
  const flagged = products.filter((p) => priceWarning({ ...p, status: "ACTIVE" }) !== null);
  if (flagged.length === 0) return null;
  const named = flagged.slice(0, 3).map((p) => `“${p.title}” at ${inr(p.price)} against an MRP of ${inr(p.mrp)}`);
  const more = flagged.length - named.length;
  return `Check the price: ${named.join("; ")}${more > 0 ? `; and ${more} more` : ""}.`;
}

export function priceWarning(p: PricedProduct): string | null {
  if (p.status !== "ACTIVE") return null;
  const reasons: string[] = [];
  if (p.costPrice !== null && p.costPrice > 0 && p.price < p.costPrice) {
    reasons.push(`it is under the cost price of ${inr(p.costPrice)}`);
  }
  if (p.mrp > 0 && p.price * 10 < p.mrp) {
    reasons.push(`it is under a tenth of the MRP of ${inr(p.mrp)}`);
  }
  if (reasons.length === 0) return null;
  return `Check the price: ${inr(p.price)} is live, and ${reasons.join(" and ")}.`;
}
