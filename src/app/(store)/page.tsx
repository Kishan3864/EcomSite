import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { HeroStatic } from "@/components/home/hero-static";
import { Counter } from "@/components/home/counter";
import { OrderJourney } from "@/components/home/order-journey";
import {
  CategoryMosaic,
  EditorialBand,
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
import { getPublicPaymentMethods } from "@/services/storefront-config";
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
 * Seven bands in a fixed order — masthead, the counter, the departments, one
 * product given a spread, the shelf, how an order actually goes, and the
 * statement. Three of those seven are made of business facts rather than
 * catalogue rows, which is the whole point: the page has to be worth reading
 * on the day the shop holds three products, and it has to say something a
 * fraudulent shop could not say.
 *
 * The composition still asks how much stock there is and drops the bands it
 * cannot fill honestly:
 *
 *   no products      masthead, counter, departments, how an order goes, the
 *                    statement — nothing pretends to be a shelf
 *   under ten        one product as a spread, the rest in a single grid that
 *                    narrows to the number of products there actually are
 *   ten or more      the full composition, three shelves deep
 *
 * A band with nothing to show is left out, and it returns by itself as the
 * catalogue grows. No editing required.
 *
 * `getPublicPaymentMethods()` is the one query here that is not about stock.
 * It reads only the cached settings — never `getAdminSession()`, which would
 * touch cookies and silently turn this statically revalidated page dynamic.
 */

/** Below this the shop is merchandised as one shelf rather than seven bands. */
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
  const [banners, categories, payments] = await Promise.all([
    getBanners(),
    getCategories(),
    getPublicPaymentMethods(),
  ]);

  return (
    <>
      {banners.hero.length > 0 ? (
        <Hero banners={banners.hero} />
      ) : (
        <HeroStatic hasProducts={false} categories={categories} />
      )}
      <Counter payments={payments} />
      <CategoryMosaic categories={categories} />
      <OrderJourney payments={payments} />
      <EditorialBand banner={banners.mid[0]} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  A handful of products
 * ------------------------------------------------------------------ */

async function SparseHome() {
  const [banners, categories, products, payments] = await Promise.all([
    getBanners(),
    getCategories(),
    getNewArrivals(SPARSE_BELOW),
    getPublicPaymentMethods(),
  ]);

  const cards = toCardModels(products);
  // The masthead shows the first product, so the spread below takes the next
  // one: the same photograph twice in one screen reads as a page that has run
  // out of things to show.
  const heroLead = cards[0];

  // One product is a spread on its own. Two or three fill an even row better
  // than a spread plus a lonely card would. From four there is enough left
  // over for the grid to look like a grid once the lead is taken out.
  const lead = cards.length >= 4 ? cards[1] : undefined;
  const rest = cards.filter((card) => card.id !== heroLead?.id && card.id !== lead?.id);

  return (
    <>
      {banners.hero.length > 0 ? (
        <Hero banners={banners.hero} />
      ) : (
        <HeroStatic hasProducts categories={categories} lead={heroLead} />
      )}

      <Counter payments={payments} />

      <CategoryMosaic categories={categories} />

      <Spotlight product={lead} eyebrow="In the shop" payments={payments} />

      <ProductGrid
        eyebrow={lead ? "The rest of the shelf" : "The catalogue"}
        title={lead ? "Also in the store" : "Everything we stock"}
        description="Every product we hold right now. The list grows one product at a time."
        href="/products"
        linkLabel="The full catalogue"
        products={rest}
        columns={4}
        priority={!lead}
      />

      <OrderJourney payments={payments} />

      <EditorialBand banner={banners.mid[0]} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  A catalogue worth the full composition
 * ------------------------------------------------------------------ */

async function FullHome() {
  const [banners, categories, flashDeals, bestsellers, newArrivals, payments] = await Promise.all([
    getBanners(),
    getCategories(),
    getFlashDeals(7),
    getBestsellers(10),
    getNewArrivals(10),
    getPublicPaymentMethods(),
  ]);

  const best = toCardModels(bestsellers);
  const heroLead = best[0];

  return (
    <>
      {banners.hero.length > 0 ? (
        <Hero banners={banners.hero} />
      ) : (
        <HeroStatic hasProducts categories={categories} lead={heroLead} />
      )}

      <Counter payments={payments} />

      <CategoryMosaic categories={categories} />

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
      <Spotlight product={best[0]} payments={payments} />

      {/* The reductions. This is the only band on the homepage that is allowed
          to use the sale colour, which is what keeps it meaning something. */}
      <ProductGrid
        eyebrow="Reduced this week"
        title="Deals worth the scroll"
        description="Real reductions on stock we hold, not a permanent sale price dressed up as one."
        href="/products?discount=25&sort=discount"
        linkLabel="Every reduction"
        products={toCardModels(flashDeals)}
        columns={4}
        tone="sale"
      />

      <ProductGrid
        eyebrow="Just landed"
        title="New this month"
        description="The most recent additions to the catalogue."
        href="/products?sort=newest"
        linkLabel="See what's new"
        products={toCardModels(newArrivals)}
        columns={5}
      />

      <OrderJourney payments={payments} />

      <EditorialBand banner={banners.mid[0]} />
    </>
  );
}
