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
  getCatalogueSize,
  getPriceLadder,
  getCategories,
  getNewArrivals,
} from "@/services/catalog";
import { getHomeBlocks, type HomeBlockKey } from "@/services/home-ranking";
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

export default async function HomePage() {
  const { products: productCount } = await getCatalogueSize();
  if (productCount === 0) return <EmptyHome />;
  return <RankedHome />;
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
 *  A shop with products: the shelves are decided by demand
 * ------------------------------------------------------------------ */

/**
 * What each block is called. The words are chosen to be true of the rule that
 * filled it — see `home-ranking.ts` — and `shelf` is what the first block is
 * called on the day there are no sales and no views to rank by yet.
 */
const BLOCK_COPY: Record<HomeBlockKey, { eyebrow: string; title: string; description: string; href: string; linkLabel: string }> = {
  trending: {
    eyebrow: "Popular right now",
    title: "What shoppers are choosing",
    description: "Ranked by recent orders first, then by reviews and how often each product is looked at.",
    href: "/products?sort=popularity",
    linkLabel: "The full catalogue",
  },
  shelf: {
    eyebrow: "In the store",
    title: "On the shelf right now",
    description: "What we hold in stock today.",
    href: "/products",
    linkLabel: "The full catalogue",
  },
  new: {
    eyebrow: "Just landed",
    title: "New this month",
    description: "The most recent additions to the catalogue.",
    href: "/products?sort=newest",
    linkLabel: "See what's new",
  },
  bestsellers: {
    eyebrow: "Proven",
    title: "What people keep buying",
    description: "Ranked by units ordered in the last thirty days.",
    href: "/products?sort=popularity",
    linkLabel: "All bestsellers",
  },
  deals: {
    eyebrow: "Reduced this week",
    title: "Deals worth the scroll",
    description: "Real reductions on stock we hold, not a permanent sale price dressed up as one.",
    href: "/products?discount=25&sort=discount",
    linkLabel: "Every reduction",
  },
  "top-rated": {
    eyebrow: "Well reviewed",
    title: "Rated highest by buyers",
    description: "Ranked by customer reviews, weighted so one glowing review cannot outrank many good ones.",
    href: "/products?sort=rating",
    linkLabel: "Browse by rating",
  },
  "few-left": {
    eyebrow: "Nearly gone",
    title: "Last few in stock",
    description: "Low stock on these right now.",
    href: "/products",
    linkLabel: "The full catalogue",
  },
};

async function RankedHome() {
  const [banners, categories, blocks, priceLadder, payments] = await Promise.all([
    getBanners(),
    getCategories(),
    getHomeBlocks(),
    getPriceLadder(),
    getPublicPaymentMethods(),
  ]);

  // Under four products no block can be filled honestly, and if the ranking
  // could not be read at all the page must still sell: one plain shelf.
  const shelves =
    blocks.length > 0
      ? blocks.map((b) => ({ key: b.key, cards: toCardModels(b.products) }))
      : [{ key: "shelf" as const, cards: toCardModels(await getNewArrivals(10)) }];

  const lead = shelves[0]?.cards[0];
  // The spread is given to a product only when the page is long enough that
  // it is not simply the masthead's photograph again one screen later.
  const spread = shelves.length >= 2 ? shelves[0]?.cards[1] : undefined;
  const [first, ...rest] = shelves;

  const grid = (shelf: (typeof shelves)[number], priority = false) => (
    <ProductGrid
      key={shelf.key}
      {...BLOCK_COPY[shelf.key]}
      products={shelf.cards}
      columns={shelf.cards.length % 5 === 0 ? 5 : 4}
      priority={priority}
      tone={shelf.key === "deals" ? "sale" : "default"}
    />
  );

  return (
    <>
      <HeroBanner hasProducts categories={categories} lead={lead} banner={banners.hero[0]} />
      <ShopByCategory categories={categories} />
      {first && grid(first, true)}
      <ShopByPrice prices={priceLadder} />
      <Spotlight product={spread} eyebrow="In the shop" payments={payments} />
      {rest[0] && grid(rest[0])}
      <Counter payments={payments} />
      <Assurance payments={payments} />
      {rest.slice(1).map((shelf) => grid(shelf))}
      <OrderJourney payments={payments} />
      <RecentlyViewed />
      <SupportBand />
      <EditorialBand banner={banners.mid[0]} />
    </>
  );
}
