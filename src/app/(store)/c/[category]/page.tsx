import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ListingShell } from "@/components/listing/listing-shell";
import { toCardModels } from "@/lib/card";
import { parseQuery, type RawSearchParams } from "@/lib/query";
import { getBrands, getCategories, getCategory, searchProducts } from "@/services/catalog";

type Params = Promise<{ category: string }>;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ category: c.slug }));
}

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
      <div className="mb-8 space-y-6">
        <div className="rail -mx-4 px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:px-0">
          {category.subcategories.map((sub) => (
            <Link
              key={sub.slug}
              href={`/c/${category.slug}/${sub.slug}`}
              className="group flex w-[140px] flex-col gap-2.5 lg:w-auto"
            >
              <span className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink-100">
                <Image
                  src={sub.image.url}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 18vw, 140px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </span>
              <span className="flex items-center justify-between gap-1.5">
                <span className="text-[13px] font-semibold text-ink-900 group-hover:text-brand-700">
                  {sub.name}
                </span>
                <ArrowRight
                  size={14}
                  className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700"
                />
              </span>
            </Link>
          ))}
        </div>

        <ul className="flex flex-wrap gap-2">
          {category.highlights.map((h) => (
            <li
              key={h}
              className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12px] font-medium text-brand-800"
            >
              {h}
            </li>
          ))}
        </ul>
      </div>
    </ListingShell>
  );
}
