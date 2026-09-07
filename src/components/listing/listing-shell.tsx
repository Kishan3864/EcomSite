import Link from "next/link";
import { PackageSearch, SearchX } from "lucide-react";
import type { ProductFacets, ProductQuery } from "@/lib/types";
import type { ProductCardModel } from "@/lib/card";
import { Breadcrumbs, EmptyState, type Crumb } from "@/components/ui/primitives";
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
    <div className="container-page py-5 sm:py-7">
      <BreadcrumbJsonLd items={crumbs} />
      {products.length > 0 && <ItemListJsonLd items={products} name={title} />}

      <Breadcrumbs items={crumbs} className="mb-5" />

      <header className="mb-6">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-[28px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[36px]">
            {title}
          </h1>
          <span className="text-[13px] text-ink-500 tabular-nums">
            {total} {total === 1 ? "product" : "products"}
          </span>
        </div>
        {description && (
          <p className="mt-2.5 max-w-3xl text-[14px] leading-relaxed text-ink-600">
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

          <div className="mb-4 hidden lg:block">
            <ActiveChips query={query} brandLabels={brandLabels} />
          </div>

          {products.length === 0 ? (
            <EmptyState
              icon={emptyVariant === "no-results" ? <SearchX size={26} /> : <PackageSearch size={26} />}
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
                className={cn("mt-10", totalPages <= 1 && "hidden")}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
