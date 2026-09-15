import Link from "next/link";
import type { ProductFacets, ProductQuery } from "@/lib/types";
import type { ProductCardModel } from "@/lib/card";
import { Breadcrumbs, EmptyState, type Crumb } from "@/components/ui/primitives";
import { ProductGridSkeleton, Shimmer } from "@/components/ui/skeleton";
import { buttonClasses } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-rail";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/json-ld";
import { FilterPanel, ActiveChips } from "./filters";
import { ListingToolbar } from "./toolbar";
import { Pagination } from "./pagination";
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
  /** Rendered between the header and the grid — subcategory pills, banners, etc. */
  children?: React.ReactNode;
  emptyVariant?: "no-results" | "no-products";
}

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
}: ListingShellProps) {
  return (
    <div className="container-page py-3 sm:py-7">
      <BreadcrumbJsonLd items={crumbs} />
      {products.length > 0 && <ItemListJsonLd items={products} name={title} />}

      <Breadcrumbs items={crumbs} className="mb-3 sm:mb-5" />

      {/* On phones the title block stays short so the first row of products
          is on screen without scrolling; the description clamps to two lines. */}
      <header className="mb-4 border-b border-hairline pb-3 sm:mb-6 sm:pb-5">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <div
          className={cn(
            "flex flex-wrap items-baseline gap-x-3 gap-y-1",
            eyebrow && "mt-1.5 sm:mt-3",
          )}
        >
          <h1 className="min-w-0 break-words font-display text-[24px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:text-[32px]">
            {title}
          </h1>
          {/* Said once. From lg up the toolbar in the column below carries the
              same count, and printing it twice in one eyeful reads as padding. */}
          <span className="text-[13px] tabular-nums text-ink-500 lg:hidden">
            {total} {total === 1 ? "product" : "products"}
          </span>
        </div>
        {description && (
          <p className="mt-1.5 line-clamp-2 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:mt-2.5 sm:line-clamp-none sm:text-[15px] sm:leading-[1.6]">
            {description}
          </p>
        )}
      </header>

      {children}

      <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-[132px] max-h-[calc(100vh-160px)] overflow-y-auto pr-2">
            <FilterPanel query={query} facets={facets} hideCategory={hideCategoryFilter} />
          </div>
        </aside>

        <div className="min-w-0">
          <ListingToolbar
            query={query}
            facets={facets}
            total={total}
            hideCategory={hideCategoryFilter}
          />

          {/* The chips carry their own phone spacing, so an empty row adds none. */}
          <div className="lg:mb-4">
            <ActiveChips query={query} brandLabels={brandLabels} />
          </div>

          {products.length === 0 ? (
            /* No icon: EmptyState draws the shop's own mark, and a lucide
               glyph in a tinted square on top of it is two marks saying one
               thing. */
            <EmptyState
              title={
                emptyVariant === "no-results"
                  ? "No products matched your search"
                  : "Nothing here with those filters"
              }
              body={
                emptyVariant === "no-results"
                  ? "Try fewer words, check the spelling, or browse a category from the menu above."
                  : "Loosen a filter or two and we will find you something. Price and brand filters are usually the culprits."
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href={clearHref ?? basePath} className={buttonClasses("primary", "md")}>
                    Clear all filters
                  </Link>
                  <Link href="/products" className={buttonClasses("outline", "md")}>
                    Browse everything
                  </Link>
                </div>
              }
            />
          ) : (
            <>
              <ProductGrid products={products} priorityCount={4} className="xl:grid-cols-4" />
              <Pagination
                page={page}
                totalPages={totalPages}
                hrefFor={(p) => `${basePath}${buildQueryString({ ...query, page: p })}`}
                className={cn("mt-6 sm:mt-10", totalPages <= 1 && "hidden")}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading state for every listing route. It lives beside the shell rather than
 * with the generic skeletons so its phone geometry — the short title and the
 * full-bleed Sort | Filters bar — changes in step with the shell's; from lg up
 * it is the same filter rail and grid as the shared listing skeleton.
 */
export function ListingShellSkeleton() {
  return (
    <div className="container-page py-3 sm:py-7">
      <Shimmer className="mb-3 h-3 w-56 max-w-full sm:mb-5" />

      <div className="mb-4 border-b border-hairline pb-3 sm:mb-6 sm:pb-5">
        <Shimmer className="h-2.5 w-32" />
        <Shimmer className="mt-1.5 h-6.5 w-52 max-w-full sm:mt-3 sm:h-8 sm:w-72" />
        <Shimmer className="mt-1.5 h-3.5 w-96 max-w-full sm:mt-2.5" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block lg:pr-2">
          {/* The panel's own 48px header, so the rail does not shift up by the
              height of a rule the moment the real filters arrive. */}
          <div className="flex h-12 items-center border-b border-hairline">
            <Shimmer className="h-3 w-20" />
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="border-b border-hairline py-4">
              <Shimmer className="h-3 w-24" />
              <div className="mt-3.5 space-y-2.5">
                {Array.from({ length: 5 }, (_, j) => (
                  <Shimmer key={j} className="h-3 w-full" />
                ))}
              </div>
            </div>
          ))}
        </aside>
        <div className="min-w-0">
          <div className="-mx-3 mb-3 grid h-11 grid-cols-2 border-y border-hairline sm:-mx-6 sm:mb-5 lg:hidden">
            <span className="flex flex-col items-center justify-center gap-1.5">
              <Shimmer className="h-2.5 w-9" />
              <Shimmer className="h-3 w-20" />
            </span>
            <span className="flex items-center justify-center border-l border-hairline">
              <Shimmer className="h-3 w-16" />
            </span>
          </div>
          <div className="mb-5 hidden h-12 items-center justify-between border-b border-hairline lg:flex">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-3 w-40" />
          </div>
          <ProductGridSkeleton count={12} columns={4} />
        </div>
      </div>
    </div>
  );
}
