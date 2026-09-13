import { HeaderClient } from "./header-client";
import { getSearchDocs } from "@/services/search-docs";
import { getCategories, getOffers } from "@/services/catalog";

/**
 * Server shell for the header.
 *
 * Loads the category tree and the autocomplete index server-side and hands
 * both to the interactive header, so the product catalogue never reaches the
 * browser bundle and admin edits to categories show up on the next request.
 */
export async function Header() {
  const [searchDocs, categories, offers] = await Promise.all([
    getSearchDocs(),
    getCategories(),
    getOffers(),
  ]);

  // The ticker used to name a coupon code in its copy. Clearing the demo
  // catalogue deleted that coupon while the claim stayed on every page, which
  // is an advertised code that fails at checkout. It is read from the live
  // offers now, so it is there exactly when the coupon is.
  const coupon = offers.find((o) => o.type === "percent" || o.type === "flat");
  const promoLine = coupon
    ? coupon.type === "percent"
      ? `Use ${coupon.code} for ${coupon.value}% off`
      : `Use ${coupon.code} for ₹${coupon.value.toLocaleString("en-IN")} off`
    : null;

  return (
    <HeaderClient
      searchDocs={searchDocs}
      categories={categories}
      offerCount={offers.length}
      promoLine={promoLine}
    />
  );
}
