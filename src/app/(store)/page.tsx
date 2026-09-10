import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import {
  CategoryMosaic,
  DealsBoard,
  EditorialBand,
  ProductGrid,
  Spotlight,
  TrustRow,
} from "@/components/home/showcase";
import { toCardModels } from "@/lib/card";
import {
  getBanners,
  getBestsellers,
  getCategories,
  getFlashDeals,
  getNewArrivals,
} from "@/services/catalog";
import { trustBadges } from "@/data/marketing";
import { BRAND } from "@/components/brand/logo";

export const revalidate = 120;

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    url: "/",
  },
};

/**
 * Homepage.
 *
 * Eight bands, five distinct shapes. The previous version ran the same product
 * rail seven times, so the page was long without being informative — every
 * section looked identical and nothing was given room. Here each band earns its
 * place: departments, then deals, then the products themselves at a size worth
 * looking at, with one product given a full spread and one full-bleed statement
 * to break the rhythm.
 */
export default async function HomePage() {
  const [banners, categories, flashDeals, bestsellers, newArrivals] = await Promise.all([
    getBanners(),
    getCategories(),
    getFlashDeals(7),
    getBestsellers(10),
    getNewArrivals(10),
  ]);

  const best = toCardModels(bestsellers);

  return (
    <>
      <Hero banners={banners.hero} />

      <CategoryMosaic categories={categories} />

      <DealsBoard products={toCardModels(flashDeals)} />

      <ProductGrid
        eyebrow="Proven"
        title="What people keep buying"
        description="Our best-selling products, ranked by what actually leaves the shelf."
        href="/products?sort=popularity"
        linkLabel="All bestsellers"
        products={best}
        columns={5}
        priority
      />

      {/* One product, given the space a magazine would give it. */}
      <Spotlight product={best[0]} />

      <EditorialBand banner={banners.mid[0]} />

      <ProductGrid
        eyebrow="Just landed"
        title="New this month"
        description="The most recent additions to the catalogue."
        href="/products?sort=newest"
        linkLabel="See what's new"
        products={toCardModels(newArrivals)}
        columns={5}
      />

      <TrustRow items={trustBadges.map(({ title, body }) => ({ title, body }))} />
    </>
  );
}
