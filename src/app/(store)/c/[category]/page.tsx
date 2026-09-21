import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import Image from "@/components/ui/image";
import { CategoryIcon } from "@/components/ui/category-icon";
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
  const subs = category.subcategories;

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
      <div className="mb-6 space-y-5 sm:mb-10 sm:space-y-6">
        {subs.length > 0 && (
          <section aria-labelledby="subcategories-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3 sm:mb-4">
              <h2 id="subcategories-heading" className="t-h3">
                Shop by collection
              </h2>
              <span className="t-small tabular-nums">
                {subs.length} {subs.length === 1 ? "collection" : "collections"}
              </span>
            </div>

            {/* A swipeable rail on phones; a balanced grid from 640px. */}
            <ul
              className={cn(
                "no-scrollbar -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1",
                "sm:mx-0 sm:grid sm:snap-none sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0",
                balancedColumnClass(subs.length, 4),
              )}
            >
              {subs.map((sub, i) => (
                <li key={sub.slug} className="w-[150px] shrink-0 snap-start sm:w-auto">
                  <Link
                    href={`/c/${category.slug}/${sub.slug}`}
                    className="card card-interactive group flex h-full flex-col overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-b from-ink-50 to-ink-100/70 sm:aspect-[16/9]">
                      {sub.image?.url && (
                        <Image
                          src={sub.image.url}
                          alt=""
                          fill
                          priority={i < 2}
                          sizes="(min-width:1024px) 22vw, (min-width:640px) 30vw, 150px"
                          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                        />
                      )}
                      <span
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950/25 to-transparent"
                      />
                      <span className="icon-tile icon-tile-sm absolute bottom-2.5 left-2.5 bg-surface/90 shadow-sm ring-1 ring-inset ring-ink-950/5 backdrop-blur">
                        <CategoryIcon icon={glyphNameFor(sub.name) ?? category.icon} name={sub.name} size={16} />
                      </span>
                    </div>
                    <div className="flex flex-1 items-start justify-between gap-2 p-3 sm:p-3.5">
                      <div className="min-w-0">
                        <h3 className="t-h3 text-[13.5px] transition-colors group-hover:text-brand-700 sm:text-[14px]">
                          {sub.name}
                        </h3>
                        {sub.description && (
                          <p className="t-small mt-0.5 line-clamp-1 hidden sm:block">{sub.description}</p>
                        )}
                      </div>
                      <ArrowUpRight
                        size={16}
                        aria-hidden
                        className="mt-0.5 shrink-0 text-ink-500 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-700"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {category.highlights.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2">
            {category.highlights.map((h) => (
              <li
                key={h}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[12.5px] font-medium text-brand-800"
              >
                <Check size={14} aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ListingShell>
  );
}
