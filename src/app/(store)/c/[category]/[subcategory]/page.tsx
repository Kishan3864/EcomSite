import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingShell } from "@/components/listing/listing-shell";
import { toCardModels } from "@/lib/card";
import { parseQuery, type RawSearchParams } from "@/lib/query";
import { getAllCategoryPaths, getBrands, getSubcategory, searchProducts } from "@/services/catalog";
import { cn } from "@/lib/utils";

type Params = Promise<{ category: string; subcategory: string }>;

export async function generateStaticParams() {
  const paths = await getAllCategoryPaths();
  return paths.flatMap((p) =>
    "subcategory" in p && p.subcategory
      ? [{ category: p.category, subcategory: p.subcategory }]
      : [],
  );
}

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
      <nav aria-label="Sibling categories" className="mb-8">
        <ul className="rail -mx-4 gap-2 px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
          <li>
            <Link
              href={`/c/${category.slug}`}
              className="inline-block rounded-full border border-ink-200 bg-surface px-3.5 py-2 text-[12.5px] font-medium text-ink-700 transition-colors hover:border-ink-400"
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
                  "inline-block rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors",
                  sub.slug === subcategory.slug
                    ? "border-brand-900 bg-brand-900 text-white"
                    : "border-ink-200 bg-surface text-ink-700 hover:border-ink-400",
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
