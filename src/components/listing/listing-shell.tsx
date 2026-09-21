import Link from "next/link";
import { SearchX, SlidersHorizontal } from "lucide-react";
import type { ProductFacets, ProductQuery } from "@/lib/types";
import type { ProductCardModel } from "@/lib/card";
import { EmptyState, PageHeader, type Crumb } from "@/components/ui/primitives";
import { ProductGridSkeleton, Shimmer } from "@/components/ui/skeleton";
import { buttonClasses } from "@/components/ui/button";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/json-ld";
import { FilterPanel, ActiveChips } from "./filters";
import { ListingToolbar } from "./toolbar";
import { Pagination } from "./pagination";
import { ListingResults, ListingViewProvider } from "./view-mode";
import { buildQueryString } from "@/lib/query";
import { cn } from "@/lib/utils";

export interface ListingShellProps {
  title: string;
  description?: string;
  eyebrow?: string;
  crumbs: Crumb[];
  query: ProductQuery;
  facets: ProductFacets;
  products: ProductCardModel[];
  total: number;
  page: number;
  totalPages: number;
  basePath: string;
  /** Where "clear all filters" points — defaults to basePath. */
  clearHref?: string;
  hideCategoryFilter?: boolean;
  brandLabels: Record<string, string>;
  /** Rendered between the header and the grid — subcategory tiles, chips, etc. */
  children?: React.ReactNode;
  emptyVariant?: "no-results" | "no-products";
  /** Extra links offered in the empty state (e.g. search suggestions). */
  emptySuggestions?: { label: string; href: string }[];
}

/**
 * Every product listing: PageHeader, optional lead-in (children), then a
 * sticky filter rail beside the toolbar, chips, results and pagination.
 */
export function ListingShell({
  title,
  description,
  eyebrow,
  crumbs,
  query,
  facets,
  products,
  total,
  page,
  totalPages,
  basePath,
  clearHref,
  hideCategoryFilter,
  brandLabels,
  children,
  emptyVariant = "no-products",
  emptySuggestions,
}: ListingShellProps) {
  const noResults = emptyVariant === "no-results";

  return (
    <div className="container-page pb-12 sm:pb-16">
      <BreadcrumbJsonLd items={crumbs} />
      {products.length > 0 && <ItemListJsonLd items={products} name={title} />}

      <PageHeader
        crumbs={crumbs}
        title={title}
        description={
          description ? (
            // Two lines on phones so the first products stay on screen.
            <span className="line-clamp-2 sm:line-clamp-none">{description}</span>
          ) : undefined
        }
        meta={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 ring-1 ring-inset ring-line">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              <span className="font-semibold tabular-nums text-ink-900">{total}</span>
              {total === 1 ? "product" : "products"}
            </span>
          </span>
        }
      />

      {children}

      <ListingViewProvider>
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:gap-10">
          <aside aria-label="Product filters" className="hidden lg:block">
            <div className="card sticky-under-header no-scrollbar max-h-[calc(100dvh-var(--sticky-top)-1rem)] overflow-y-auto overscroll-contain px-4 pb-2">
              <FilterPanel query={query} facets={facets} hideCategory={hideCategoryFilter} />
            </div>
          </aside>

          <div className="min-w-0">
            <ListingToolbar
              query={query}
              facets={facets}
              total={total}
              page={page}
              totalPages={totalPages}
              hideCategory={hideCategoryFilter}
            />

            <ActiveChips query={query} brandLabels={brandLabels} />

            {products.length === 0 ? (
              <EmptyState
                icon={noResults ? <SearchX size={24} /> : <SlidersHorizontal size={24} />}
                title={noResults ? "No products matched your search" : "Nothing here with those filters"}
                body={
                  noResults
                    ? "Try fewer words, check the spelling, or browse a category from the menu above."
                    : "Loosen a filter or two and we will find you something. Price and brand filters are usually the culprits."
                }
                action={
                  <div className="flex flex-col items-center gap-5">
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link href={clearHref ?? basePath} className={buttonClasses("primary", "md")}>
                        Clear all filters
                      </Link>
                      <Link href="/products" className={buttonClasses("outline", "md")}>
                        Browse everything
                      </Link>
                    </div>
                    {emptySuggestions && emptySuggestions.length > 0 && (
                      <div className="max-w-xl">
                        <p className="t-label mb-2.5">Try one of these</p>
                        <ul className="flex flex-wrap justify-center gap-1.5">
                          {emptySuggestions.map((s) => (
                            <li key={s.href}>
                              <Link
                                href={s.href}
                                className="chip tap h-8 px-3 text-[12.5px] font-medium text-ink-700 transition-colors hover:text-brand-700"
                              >
                                {s.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                }
              />
            ) : (
              <>
                <ListingResults products={products} priorityCount={2} />
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  hrefFor={(p) => `${basePath}${buildQueryString({ ...query, page: p })}`}
                  className={cn("mt-8 sm:mt-12", totalPages <= 1 && "hidden")}
                />
              </>
            )}
          </div>
        </div>
      </ListingViewProvider>
    </div>
  );
}

/** Loading state for every listing route, in step with the shell's geometry. */
export function ListingShellSkeleton() {
  return (
    <div className="container-page pb-12 sm:pb-16">
      <div className="pb-5 pt-5 sm:pb-7 sm:pt-7">
        <Shimmer className="mb-3 h-3 w-48 max-w-full" />
        <Shimmer className="h-7 w-56 max-w-full sm:h-8 sm:w-72" />
        <Shimmer className="mt-2 h-3.5 w-96 max-w-full" />
        <Shimmer className="mt-3 h-6 w-28 rounded-full" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:gap-10">
        <aside className="hidden lg:block">
          <div className="card px-4 pb-2">
            <div className="flex h-12 items-center border-b border-line">
              <Shimmer className="h-3.5 w-20" />
            </div>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="border-b border-line py-4 last:border-b-0">
                <Shimmer className="h-3 w-24" />
                <div className="mt-3.5 space-y-2.5">
                  {Array.from({ length: 4 }, (_, j) => (
                    <Shimmer key={j} className="h-3 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>
        <div className="min-w-0">
          <div className="-mx-3 mb-4 flex gap-2 border-y border-line px-3 py-2 sm:-mx-6 sm:px-6 lg:hidden">
            <Shimmer className="h-9 flex-1 rounded-full" />
            <Shimmer className="h-9 flex-1 rounded-full" />
            <Shimmer className="h-9 w-[68px] rounded-full" />
          </div>
          <div className="card mb-4 hidden h-14 items-center justify-between px-4 lg:flex">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-8 w-56 rounded-full" />
          </div>
          <ProductGridSkeleton count={12} columns={4} />
        </div>
      </div>
    </div>
  );
}
