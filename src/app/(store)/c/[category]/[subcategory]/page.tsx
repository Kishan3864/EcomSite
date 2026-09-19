import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingShell } from "@/components/listing/listing-shell";
import { toCardModels } from "@/lib/card";
import { parseQuery, type RawSearchParams } from "@/lib/query";
import { getAllCategoryPaths, getBrands, getSubcategory, searchProducts } from "@/services/catalog";
import { cn } from "@/lib/utils";

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
      <nav aria-label="Sibling categories" className="mb-4 sm:mb-8">
        {/* The rail bleeds to the screen edge by exactly the page gutter. */}
        <ul className="rail -mx-3 gap-2 px-3 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
          <li>
            <Link
              href={`/c/${category.slug}`}
              className="tap inline-block whitespace-nowrap bg-surface px-3 py-2 text-[12px] font-medium text-ink-700 transition-colors sm:px-3.5 sm:text-[12.5px]"
            >
              All {category.name}
            </Link>
          </li>
          {category.subcategories.map((sub) => (
            <li key={sub.slug}>
              <Link
                href={`/c/${category.slug}/${sub.slug}`}
                aria-current={sub.slug === subcategory.slug ? "page" : undefined}
                className={cn(
                  "tap inline-block whitespace-nowrap px-3 py-2 text-[12px] font-medium transition-colors sm:px-3.5 sm:text-[12.5px]",
                  sub.slug === subcategory.slug
                    ? "bg-brand-900 text-white"
                    : "bg-surface text-ink-700",
                )}
              >
                {sub.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </ListingShell>
  );
}
