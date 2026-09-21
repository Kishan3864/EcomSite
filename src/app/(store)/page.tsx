import type { Metadata } from "next";
import { HeroSlider } from "@/components/home/hero-slider";
import {
  BudgetBands,
  CategoryShowcase,
  DealsBand,
  EmptyHero,
  PromoBand,
  ReviewHighlights,
  ShelfGrid,
  ShelfRail,
  TrustStrip,
  type ShelfCopy,
} from "@/components/home/sections";
import { Assurance } from "@/components/home/assurance";
import { Counter } from "@/components/home/counter";
import { OrderJourney } from "@/components/home/order-journey";
import { SupportBand } from "@/components/home/support-band";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { toCardModels, type ProductCardModel } from "@/lib/card";
import { getBanners, getCatalogueSize, getCategories, getNewArrivals, getPriceLadder } from "@/services/catalog";
import { getHomeBlocks, type HomeBlockKey } from "@/services/home-ranking";
import { getReviewHighlights } from "@/services/home-reviews";
import { getPublicPaymentMethods, getStorefrontConfig } from "@/services/storefront-config";
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
 * Every product band is driven by the ranking engine (`home-ranking.ts`),
 * which fills each block only with products no earlier block took and drops a
 * block it cannot fill honestly — so a small catalogue gets a short page, not
 * the same five products repeated. Every band here renders nothing when it
 * has nothing to show.
 *
 *   hero          the top of the first block (trending, or the shelf when
 *                 there are no sales or views yet), as a slider
 *   trust strip   the shop's standing promises
 *   categories    departments only; collections live inside a department
 *   trending      the rest of the first block
 *   budget        price bands counted from the whole catalogue
 *   the rest      new arrivals, best sellers, deals, top rated, few left
 *   reviews       recent four- and five-star reviews
 *   trust         why it is safe to buy here, what happens after you pay
 *   recently viewed, help
 *
 * `getPublicPaymentMethods()` and `getStorefrontConfig()` read only cached
 * settings — never cookies — so this page stays statically revalidated.
 */

const HERO_SLIDES = 5;

const BLOCK_COPY: Record<HomeBlockKey, ShelfCopy> = {
  trending: {
    eyebrow: "Popular right now",
    title: "Trending now",
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
    title: "New arrivals",
    description: "The most recent additions to the catalogue.",
    href: "/products?sort=newest",
    linkLabel: "See what's new",
  },
  bestsellers: {
    eyebrow: "Proven",
    title: "Best sellers",
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
    title: "Top rated",
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

export default async function HomePage() {
  const { products: productCount } = await getCatalogueSize();
  if (productCount === 0) return <EmptyHome />;
  return <RankedHome />;
}

async function EmptyHome() {
  const [banners, categories, payments, config] = await Promise.all([
    getBanners(),
    getCategories(),
    getPublicPaymentMethods(),
    getStorefrontConfig(),
  ]);

  return (
    <>
      <EmptyHero banner={banners.hero[0]} />
      <TrustStrip freeThreshold={config.rates.freeThreshold} payments={payments} />
      <CategoryShowcase categories={categories} />
      <div className="section-tight">
        <Counter payments={payments} />
      </div>
      <Assurance payments={payments} />
      <OrderJourney payments={payments} />
      <RecentlyViewed />
      <SupportBand />
      <PromoBand banner={banners.mid[0]} />
    </>
  );
}

function Shelf({ block, cards }: { block: HomeBlockKey; cards: ProductCardModel[] }) {
  const copy = BLOCK_COPY[block];
  switch (block) {
    case "deals":
      return <DealsBand copy={copy} products={cards} />;
    case "top-rated":
    case "few-left":
    case "trending":
    case "shelf":
      return <ShelfRail copy={copy} products={cards} />;
    default:
      return <ShelfGrid copy={copy} products={cards} />;
  }
}

async function RankedHome() {
  const [banners, categories, blocks, priceLadder, payments, config, reviews] = await Promise.all([
    getBanners(),
    getCategories(),
    getHomeBlocks(),
    getPriceLadder(),
    getPublicPaymentMethods(),
    getStorefrontConfig(),
    getReviewHighlights(6),
  ]);

  // If the ranking could not be read at all the page must still sell.
  const shelves =
    blocks.length > 0
      ? blocks.map((b) => ({ key: b.key, cards: toCardModels(b.products) }))
      : [{ key: "shelf" as const, cards: toCardModels(await getNewArrivals(10)) }];

  const [first, ...rest] = shelves;
  const slides = first?.cards.slice(0, HERO_SLIDES) ?? [];
  const firstRest = first?.cards.slice(HERO_SLIDES) ?? [];
  const trending = first?.key === "trending";

  return (
    <>
      {slides.length > 0 ? (
        <HeroSlider
          slides={slides}
          tag={trending ? "Trending" : "Featured"}
          label={trending ? "Top trending products" : "Featured products"}
        />
      ) : (
        <EmptyHero banner={banners.hero[0]} />
      )}
      <TrustStrip freeThreshold={config.rates.freeThreshold} payments={payments} />
      <CategoryShowcase categories={categories} />
      {first && firstRest.length >= 4 && <Shelf block={first.key} cards={firstRest} />}
      {rest[0] && <Shelf block={rest[0].key} cards={rest[0].cards} />}
      <BudgetBands prices={priceLadder} />
      {rest.slice(1, 3).map((s) => (
        <Shelf key={s.key} block={s.key} cards={s.cards} />
      ))}
      <PromoBand banner={banners.mid[0]} />
      {rest.slice(3).map((s) => (
        <Shelf key={s.key} block={s.key} cards={s.cards} />
      ))}
      <ReviewHighlights reviews={reviews} />
      <RecentlyViewed />
      <div className="section-tight">
        <Counter payments={payments} />
      </div>
      <Assurance payments={payments} />
      <OrderJourney payments={payments} />
      <SupportBand />
    </>
  );
}
