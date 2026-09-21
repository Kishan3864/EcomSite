import type { Metadata } from "next";
import Link from "next/link";
import { ListingShell } from "@/components/listing/listing-shell";
import { toCardModels } from "@/lib/card";
import { parseQuery, type RawSearchParams } from "@/lib/query";
import { getBrands, getCategories, searchProducts } from "@/services/catalog";
import { LayoutGrid, Search, Sparkles } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";

  return {
    title: q ? `Search results for "${q}"` : "Search",
    description: q
      ? `Products matching "${q}" on WeekendCart.`
      : "Search across every product on WeekendCart.",
    // Result pages should not compete with category pages in the index.
    robots: { index: false, follow: true },
    alternates: { canonical: q ? `/search?q=${encodeURIComponent(q)}` : "/search" },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const query = parseQuery(params);
  const [result, brands, categories] = await Promise.all([
    searchProducts(query),
    getBrands(),
    getCategories(),
  ]);
  const brandLabels = Object.fromEntries(brands.map((b) => [b.slug, b.name]));

  const term = query.q ?? "";

  // Suggestions are the store's own aisles rather than a fixed list: on a
  // catalogue this small, a hand-written term would send people to a page of
  // no results, and it would go stale the day a department is renamed.
  const suggestions = categories.flatMap((c) => c.subcategories.map((s) => s.name)).slice(0, 10);

  return (
    <ListingShell
      eyebrow="Search"
      title={term ? `Results for “${term}”` : "Search WeekendCart"}
      description={
        term
          ? `${result.total} ${result.total === 1 ? "product" : "products"} matched your search. Refine with the filters, or sort by price and rating.`
          : categories.length > 0
            ? "Type in the search bar above, or start from one of the collections below."
            : "Type in the search bar above. The catalogue is still being built."
      }
      crumbs={[
        { name: "Home", href: "/" },
        { name: "Search", href: "/search" },
        ...(term ? [{ name: term, href: `/search?q=${encodeURIComponent(term)}` }] : []),
      ]}
      query={query}
      facets={result.facets}
      products={toCardModels(result.items)}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      basePath="/search"
      clearHref={term ? `/search?q=${encodeURIComponent(term)}` : "/search"}
      brandLabels={brandLabels}
      emptyVariant="no-results"
      emptySuggestions={
        term ? suggestions.map((s) => ({ label: s, href: `/search?q=${encodeURIComponent(s)}` })) : undefined
      }
    >
      {!term && (
        // Each list is one swipeable row on phones, bleeding by the page gutter.
        <div className="mb-6 grid gap-5 sm:mb-10 lg:grid-cols-2 lg:gap-6">
          {suggestions.length > 0 && (
            <section className="card p-4 sm:p-5" aria-labelledby="search-suggestions">
              <h2 id="search-suggestions" className="t-label mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-brand-600" aria-hidden />
                Try one of these
              </h2>
              <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {suggestions.map((s) => (
                  <li key={s} className="shrink-0">
                    <Link
                      href={`/search?q=${encodeURIComponent(s)}`}
                      className="chip tap h-9 whitespace-nowrap px-3.5 text-[12.5px] font-medium text-ink-700 transition-colors hover:text-brand-700"
                    >
                      <Search size={14} className="text-ink-500" aria-hidden />
                      {s}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {categories.length > 0 && (
            <section className="card p-4 sm:p-5" aria-labelledby="search-departments">
              <h2 id="search-departments" className="t-label mb-3 flex items-center gap-2">
                <LayoutGrid size={14} className="text-brand-600" aria-hidden />
                {suggestions.length > 0 ? "Or browse a department" : "Browse a department"}
              </h2>
              <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {categories.map((c) => (
                  <li key={c.slug} className="shrink-0">
                    <Link
                      href={`/c/${c.slug}`}
                      className="tap group inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-brand-50 pl-1 pr-3.5 text-[12.5px] font-medium text-brand-800 transition-colors hover:bg-brand-100"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-brand-700">
                        <CategoryIcon icon={c.icon} name={c.name} size={14} />
                      </span>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </ListingShell>
  );
}
