import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingShell } from "@/components/listing/listing-shell";
import { toCardModels } from "@/lib/card";
import { parseQuery, type RawSearchParams } from "@/lib/query";
import { getBrands, getSubcategory, searchProducts } from "@/services/catalog";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { glyphNameFor } from "@/components/illustration/glyph-name";

type Params = Promise<{ category: string; subcategory: string }>;

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
  const { category: c, subcategory: s } = await params;
  const found = await getSubcategory(c, s);
  if (!found) return { title: "Not found" };

  const { category, subcategory } = found;
  const title = `${subcategory.name} — ${category.name}`;
  const canonical = `/c/${category.slug}/${subcategory.slug}`;

  return {
    title,
    description: `${subcategory.description} Shop ${subcategory.name.toLowerCase()} on WeekendCart with free delivery over ₹999 and easy returns.`,
    alternates: { canonical },
    openGraph: {
      title: `${title} · WeekendCart`,
      description: subcategory.description,
      url: canonical,
      images: [{ url: subcategory.image.url, alt: subcategory.name }],
    },
  };
}

export default async function SubcategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ category: c, subcategory: s }, rawParams] = await Promise.all([params, searchParams]);
  const found = await getSubcategory(c, s);
  if (!found) notFound();

  const { category, subcategory } = found;
  const query = {
    ...parseQuery(rawParams),
    category: category.slug,
    subcategory: subcategory.slug,
  };

  const [result, brands] = await Promise.all([searchProducts(query), getBrands()]);
  const brandLabels = Object.fromEntries(brands.map((b) => [b.slug, b.name]));

  return (
    <ListingShell
      eyebrow={category.name}
      title={subcategory.name}
      description={subcategory.description}
      crumbs={[
        { name: "Home", href: "/" },
        { name: category.name, href: `/c/${category.slug}` },
        { name: subcategory.name, href: `/c/${category.slug}/${subcategory.slug}` },
      ]}
      query={query}
      facets={result.facets}
      products={toCardModels(result.items)}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      basePath={`/c/${category.slug}/${subcategory.slug}`}
      hideCategoryFilter
      brandLabels={brandLabels}
    >
      <nav aria-label="Sibling categories" className="mb-6 sm:mb-8">
        {/* One swipeable row on phones, bleeding by the page gutter; wraps on desktop. */}
        <ul className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          <li className="shrink-0">
            <Link
              href={`/c/${category.slug}`}
              className="tap inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-line-strong bg-surface pl-2.5 pr-3.5 text-[12.5px] font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <ArrowLeft size={14} aria-hidden />
              All {category.name}
            </Link>
          </li>
          {category.subcategories.map((sub) => {
            const current = sub.slug === subcategory.slug;
            return (
              <li key={sub.slug} className="shrink-0">
                <Link
                  href={`/c/${category.slug}/${sub.slug}`}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "tap inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border pl-3 pr-3.5 text-[12.5px] font-medium transition-colors",
                    current
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-line-strong bg-surface text-ink-700 hover:border-brand-300 hover:text-brand-700",
                  )}
                >
                  <CategoryIcon
                    icon={glyphNameFor(sub.name) ?? category.icon}
                    name={sub.name}
                    size={14}
                    className={current ? "text-white" : "text-ink-500"}
                  />
                  {sub.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </ListingShell>
  );
}
