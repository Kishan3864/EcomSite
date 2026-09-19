import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { DepartmentGlyph } from "@/components/illustration/department-glyph";
import { glyphNameFor } from "@/components/illustration/glyph-name";
import { balancedColumnClass } from "@/lib/grid";
import { cn } from "@/lib/utils";
import { ListingShell } from "@/components/listing/listing-shell";
import { toCardModels } from "@/lib/card";
import { parseQuery, type RawSearchParams } from "@/lib/query";
import { getBrands, getCategory, searchProducts } from "@/services/catalog";

type Params = Promise<{ category: string }>;

/**
 * Rendered on demand, and said so outright.
 *
 * This page reads the filter query string, so every normal build already
 * marks it dynamic. It used to leave that to be inferred, alongside a
 * generateStaticParams listing the active categories — and on a build made
 * while EVERY category was hidden that list was empty, Next took the route for
 * a static one rendered at request time, and the query-string read threw
 * DYNAMIC_SERVER_USAGE: a 500 where a hidden category should be a plain 404.
 * A dynamic page gains nothing from static params, so they are gone.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category not found" };

  const title = `${category.name} online`;
  return {
    title,
    description: category.description,
    alternates: { canonical: `/c/${category.slug}` },
    openGraph: {
      title: `${title} · WeekendCart`,
      description: category.description,
      url: `/c/${category.slug}`,
      images: [{ url: category.image.url, alt: category.name }],
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ category: slug }, rawParams] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);
  if (!category) notFound();

  const query = { ...parseQuery(rawParams), category: category.slug };
  const [result, brands] = await Promise.all([searchProducts(query), getBrands()]);
  const brandLabels = Object.fromEntries(brands.map((b) => [b.slug, b.name]));

  return (
    <ListingShell
      eyebrow={category.menuLabel}
      title={category.name}
      description={category.description}
      crumbs={[
        { name: "Home", href: "/" },
        { name: category.name, href: `/c/${category.slug}` },
      ]}
      query={query}
      facets={result.facets}
      products={toCardModels(result.items)}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      basePath={`/c/${category.slug}`}
      hideCategoryFilter
      brandLabels={brandLabels}
    >
      <div className="mb-4 space-y-4 sm:mb-8 sm:space-y-6">
        {/* The collections, on the shared hairline grid the rest of the shop is
            drawn on. The photographs that used to head this rail showed one
            product apiece and implied a whole shelf; the department's drawn mark
            makes no such promise, costs no round trip, and is the same mark the
            menu and the homepage now use. */}
        {category.subcategories.length > 0 && (
          /* One column of ruled rows on a phone, a row of tiles from 640px.
             The tile depends on hover to say "this is a link", and a phone has
             no hover — so on a phone it is a row with a chevron instead, which
             says the same thing without one. */
          <div className={cn("tile-grid grid-cols-1", balancedColumnClass(category.subcategories.length, 4))}>
            {category.subcategories.map((sub) => (
              <Link
                key={sub.slug}
                href={`/c/${category.slug}/${sub.slug}`}
                className="tap group flex items-center gap-3 px-4 py-3.5 transition-colors duration-200 sm:flex-col sm:justify-center sm:gap-2.5 sm:px-3 sm:py-5 sm:text-center [@media(hover:hover)]:hover:bg-ink-50"
              >
                <DepartmentGlyph
                  icon={glyphNameFor(sub.name) ?? category.icon}
                  name={sub.name}
                  size={28}
                  className="shrink-0 text-ink-900 transition-colors duration-200 group-hover:text-brand-700 sm:hidden"
                />
                <DepartmentGlyph
                  icon={glyphNameFor(sub.name) ?? category.icon}
                  name={sub.name}
                  size={40}
                  className="hidden text-ink-900 transition-colors duration-200 group-hover:text-brand-700 sm:block"
                />
                <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-[1.35] text-ink-900 sm:flex-none">
                  {sub.name}
                </span>
                <ChevronRight size={15} className="shrink-0 text-ink-400 sm:hidden" />
              </Link>
            ))}
          </div>
        )}

        {/* The promises the department can actually be held to, set as a ruled
            line of text rather than a row of coloured pills: a claim reads as
            true in proportion to how quietly it is made. */}
        {category.highlights.length > 0 && (
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 py-2.5">
            {category.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2.5 text-[13px] text-ink-600">
                <span aria-hidden className="h-px w-3.5 shrink-0 bg-ink-400" />
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ListingShell>
  );
}
