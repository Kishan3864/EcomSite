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
      ? `Products matching "${q}" on Mayura.`
      : "Search across every product on Mayura.",
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
      title={term ? `Results for “${term}”` : "Search Mayura"}
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
        <div className="mb-8 space-y-7">
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Popular searches
            </h2>
            <ul className="flex flex-wrap gap-2">
              {popularSearches.map((s) => (
                <li key={s}>
                  <Link
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="inline-block rounded-full border border-ink-200 bg-surface px-3.5 py-2 text-[12.5px] text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-700"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Or browse a department
            </h2>
            <ul className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/c/${c.slug}`}
                    className="inline-block rounded-full bg-ink-100 px-3.5 py-2 text-[12.5px] font-medium text-ink-800 transition-colors hover:bg-brand-100 hover:text-brand-800"
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
