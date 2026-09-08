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
  return (
    <HeaderClient searchDocs={searchDocs} categories={categories} offerCount={offers.length} />
  );
}
