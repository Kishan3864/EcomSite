import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { HeroStatic } from "@/components/home/hero-static";
import {
  CategoryMosaic,
  DealsBoard,
  EditorialBand,
  OpeningNote,
  ProductGrid,
  Spotlight,
} from "@/components/home/showcase";
import { toCardModels } from "@/lib/card";
import {
  getBanners,
  getBestsellers,
  getCatalogueSize,
  getCategories,
  getFlashDeals,
  getNewArrivals,
} from "@/services/catalog";
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
 * The full page is eight bands in five shapes — departments, deals, the
 * products at a size worth looking at, one product given a full spread, one
 * full-bleed statement. That composition needs a catalogue behind it. A real
 * shop does not start with one, so the page first asks how much there is and
 * picks a shape that the stock can actually fill:
 *
 *   no products      a typographic hero, the departments, and a plain note
 *                    about what is coming — nothing pretends to be a shelf
 *   under ten        one lead product as a spread, then the rest in one grid
 *                    that narrows to the number of products there are
 *   ten or more      the full composition below
 *
 * Nothing is duplicated to fill space: a band with nothing to show is left
 * out, and it returns by itself as the catalogue grows. No editing required.
 *
 * The delivery/returns promises are not repeated here either — the footer
 * carries them, with icons, on every page of the site.
 */

/** Below this the shop is merchandised as one shelf rather than eight bands. */
const SPARSE_BELOW = 10;

export default async function HomePage() {
  const { products: productCount } = await getCatalogueSize();

  if (productCount === 0) return <EmptyHome />;
  if (productCount < SPARSE_BELOW) return <SparseHome />;
  return <FullHome />;
}

/* ------------------------------------------------------------------ *
 *  No products yet
 * ------------------------------------------------------------------ */

async function EmptyHome() {
  const [banners, categories] = await Promise.all([getBanners(), getCategories()]);

  return (
    <>
      {banners.hero.length > 0 ? (
        <Hero banners={banners.hero} />
      ) : (
        <HeroStatic hasProducts={false} />
      )}
      <CategoryMosaic categories={categories} />
      <OpeningNote hasCategories={categories.length > 0} />
      <EditorialBand banner={banners.mid[0]} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  A handful of products
 * ------------------------------------------------------------------ */

async function SparseHome() {
  const [banners, categories, products] = await Promise.all([
    getBanners(),
    getCategories(),
    getNewArrivals(SPARSE_BELOW),
  ]);

  const cards = toCardModels(products);

  // One product is a spread on its own. Two or three fill an even row better
  // than a spread plus a lonely card would. From four there is enough left
  // over for the grid to look like a grid once the lead is taken out.
  const lead = cards.length === 1 || cards.length >= 4 ? cards[0] : undefined;
  const rest = lead ? cards.slice(1) : cards;

  return (
    <>
      {banners.hero.length > 0 ? (
        <Hero banners={banners.hero} />
      ) : (
        <HeroStatic hasProducts />
      )}

      <CategoryMosaic categories={categories} />

      <Spotlight product={lead} eyebrow="In the shop" />

      <ProductGrid
        eyebrow={lead ? "The rest of the shelf" : "The catalogue"}
        title={lead ? "Also in the store" : "Everything we stock"}
        description="Every product we hold right now. The list grows one product at a time."
        href="/products"
        linkLabel="All products"
        products={rest}
        columns={4}
        priority={!lead}
      />

      <EditorialBand banner={banners.mid[0]} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  A catalogue worth the full composition
 * ------------------------------------------------------------------ */

async function FullHome() {
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
      {banners.hero.length > 0 ? (
        <Hero banners={banners.hero} />
      ) : (
        <HeroStatic hasProducts />
      )}

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
    </>
  );
}
