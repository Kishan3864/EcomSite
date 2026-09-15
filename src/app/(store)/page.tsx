import type { Metadata } from "next";
import { HeroBanner } from "@/components/home/hero-banner";
import { Assurance } from "@/components/home/assurance";
import { ShopByCategory } from "@/components/home/shop-by-category";
import { ShopByPrice } from "@/components/home/shop-by-price";
import { SupportBand } from "@/components/home/support-band";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { Counter } from "@/components/home/counter";
import { OrderJourney } from "@/components/home/order-journey";
import {
  EditorialBand,
  ProductGrid,
  Spotlight,
} from "@/components/home/showcase";
import { toCardModels } from "@/lib/card";
import {
  getBanners,
  getBestsellers,
  getCatalogueSize,
  getPriceLadder,
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
 * Rebuilt around a shopper who has never heard of this shop, in the order they
 * ask their questions: what is this (masthead), is it real (the facts band),
 * what do you sell (departments), show me (the shelves), why is it safe to pay
 * you (assurance), and what happens after I do (the journey).
 *
 * Three of those bands are made of business facts rather than catalogue rows,
 * which is the point: the page has to be worth reading on the day the shop
 * holds five products, and it has to say things a fraudulent shop could not.
 *
 * The composition still asks how much stock there is and drops the bands it
 * cannot fill honestly:
 *
 *   no products      masthead, facts, departments, assurance, journey — nothing
 *                    pretends to be a shelf
 *   under ten        one shelf and one product given a spread. Three separate
 *                    rails of "bestsellers", "deals" and "new in" drawn from
 *                    five products is the same five products three times, and
 *                    it reads as a shop pretending to be bigger than it is
 *   ten or more      the full composition, three shelves deep
 *
 * A band with nothing to show is left out and returns by itself as the
 * catalogue grows. No editing required.
 *
 * `getPublicPaymentMethods()` is the one query here that is not about stock.
 * It reads only the cached settings — never `getAdminSession()`, which would
 * touch cookies and silently turn this statically revalidated page dynamic.
 */

/** Below this the shop is merchandised as one shelf rather than three. */
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
      <HeroBanner hasProducts={false} categories={categories} banner={banners.hero[0]} />
      <ShopByCategory categories={categories} />
      <Counter payments={payments} />
      <Assurance payments={payments} />
      <OrderJourney payments={payments} />
      <RecentlyViewed />
      <SupportBand />
      <EditorialBand banner={banners.mid[0]} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  A handful of products
 * ------------------------------------------------------------------ */

async function SparseHome() {
  const [banners, categories, products, priceLadder, payments] = await Promise.all([
    getBanners(),
    getCategories(),
    getNewArrivals(SPARSE_BELOW),
    getPriceLadder(),
    getPublicPaymentMethods(),
  ]);

  const cards = toCardModels(products);
  // The masthead shows the first product, so the spread below takes the next
  // one: the same photograph twice in one screen reads as a page that has run
  // out of things to show.
  const heroLead = cards[0];
  const spread = cards.length >= 4 ? cards[1] : undefined;
  const rest = cards.filter((c) => c.id !== heroLead?.id && c.id !== spread?.id);

  return (
    <>
      <HeroBanner hasProducts categories={categories} lead={heroLead} banner={banners.hero[0]} />
      <ShopByCategory categories={categories} />

      <ProductGrid
        eyebrow={spread ? "The rest of the shelf" : "The catalogue"}
        title={spread ? "Also in the store" : "Everything we stock"}
        description="Every product we hold right now. The list grows one product at a time."
        href="/products"
        linkLabel="The full catalogue"
        products={rest}
        columns={4}
        priority={!spread}
      />

      {/* Budget doors sit under the one shelf rather than above it: with a
          catalogue this size the shelf IS the catalogue, and a filter offered
          before anything has been shown is a filter on nothing. */}
      <ShopByPrice prices={priceLadder} />

      <Spotlight product={spread} eyebrow="In the shop" payments={payments} />

      <Counter payments={payments} />
      <Assurance payments={payments} />
      <OrderJourney payments={payments} />
      <RecentlyViewed />
      <SupportBand />
      <EditorialBand banner={banners.mid[0]} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  A catalogue worth the full composition
 * ------------------------------------------------------------------ */

async function FullHome() {
  const [banners, categories, flashDeals, bestsellers, newArrivals, priceLadder, payments] =
    await Promise.all([
      getBanners(),
      getCategories(),
      getFlashDeals(7),
      getBestsellers(10),
      getNewArrivals(10),
      getPriceLadder(),
      getPublicPaymentMethods(),
    ]);

  const best = toCardModels(bestsellers);

  return (
    <>
      <HeroBanner hasProducts categories={categories} lead={best[0]} banner={banners.hero[0]} />
      <ShopByCategory categories={categories} />
      <ShopByPrice prices={priceLadder} />

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

      {/* The reductions. This is the only band on the homepage allowed to use
          the sale colour, which is what keeps it meaning something. */}
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

      <Counter payments={payments} />
      <Assurance payments={payments} />

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
      <RecentlyViewed />
      <SupportBand />
      <EditorialBand banner={banners.mid[0]} />
    </>
  );
}
