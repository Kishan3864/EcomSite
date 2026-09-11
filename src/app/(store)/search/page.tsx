import type { Metadata } from "next";
import Link from "next/link";
import { ListingShell } from "@/components/listing/listing-shell";
import { toCardModels } from "@/lib/card";
import { parseQuery, type RawSearchParams } from "@/lib/query";
import { getBrands, getCategories, searchProducts } from "@/services/catalog";
import { popularSearches } from "@/data/marketing";

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

  return (
    <ListingShell
      eyebrow="Search"
      title={term ? `Results for “${term}”` : "Search WeekendCart"}
      description={
        term
          ? `${result.total} ${result.total === 1 ? "product" : "products"} matched your search. Refine with the filters, or sort by price and rating.`
          : "Type in the search bar above, or start from one of the popular searches below."
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
    >
      {!term && (
        // Each list is one swipeable row on phones instead of a tall wrapped
        // stack, bleeding to the screen edge by exactly the page gutter.
        <div className="mb-5 space-y-4 sm:mb-8 sm:space-y-7">
          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 sm:mb-3">
              Popular searches
            </h2>
            <ul className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {popularSearches.map((s) => (
                <li key={s} className="shrink-0">
                  <Link
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="tap inline-block whitespace-nowrap rounded-full border border-ink-200 bg-surface px-3 py-2 text-[12px] text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-700 sm:px-3.5 sm:text-[12.5px]"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 sm:mb-3">
              Or browse a department
            </h2>
            <ul className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {categories.map((c) => (
                <li key={c.slug} className="shrink-0">
                  <Link
                    href={`/c/${c.slug}`}
                    className="tap inline-block whitespace-nowrap rounded-full bg-ink-100 px-3 py-2 text-[12px] font-medium text-ink-800 transition-colors hover:bg-brand-100 hover:text-brand-800 sm:px-3.5 sm:text-[12.5px]"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </ListingShell>
  );
}
