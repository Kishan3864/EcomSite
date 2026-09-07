import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { FlashDeals } from "@/components/home/flash-deals";
import {
  BrandStrip,
  CategoryStrip,
  FeatureBanner,
  OfferCards,
  PromoTiles,
  ValueProps,
} from "@/components/home/sections";
import { ProductRail } from "@/components/product/product-rail";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { toCardModels } from "@/lib/card";
import {
  getBanners,
  getBestsellers,
  getBrands,
  getCategories,
  getCategoryTop,
  getFlashDeals,
  getHandpicked,
  getLimitedStock,
  getNewArrivals,
  getOffers,
  getRecommended,
  getTrending,
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

export default async function HomePage() {
  const [
    banners,
    brands,
    categories,
    trending,
    bestsellers,
    newArrivals,
    flashDeals,
    limited,
    handpicked,
    recommended,
    electronics,
    offers,
  ] = await Promise.all([
    getBanners(),
    getBrands(),
    getCategories(),
    getTrending(10),
    getBestsellers(10),
    getNewArrivals(10),
    getFlashDeals(8),
    getLimitedStock(8),
    getHandpicked(10),
    getRecommended(10),
    getCategoryTop("home-living", 8),
    getOffers(),
  ]);

  return (
    <>
      <Hero banners={banners.hero} />

      <CategoryStrip categories={categories} />

      <FlashDeals products={toCardModels(flashDeals)} />

      <ProductRail
        eyebrow="Moving fast"
        title="Trending this week"
        description="What customers are adding to their bags right now, updated every few hours."
        href="/products?sort=popularity"
        linkLabel="See all trending"
        products={toCardModels(trending)}
        priority
      />

      <PromoTiles tiles={banners.promoTiles} />

      <ProductRail
        eyebrow="Proven"
        title="Bestsellers"
        description="The products that keep selling out and coming back."
        href="/products?sort=popularity"
        products={toCardModels(bestsellers)}
      />

      {banners.mid[0] && <FeatureBanner banner={banners.mid[0]} />}

      <ProductRail
        eyebrow="Just landed"
        title="New arrivals"
        description="Fresh from our maker studios this month."
        href="/products?sort=newest"
        products={toCardModels(newArrivals)}
      />

      <OfferCards offers={offers} />

      <ProductRail
        eyebrow="Almost gone"
        title="Limited stock"
        description="Small runs and last pieces. When these go, they go."
        href="/offers"
        linkLabel="See deals"
        products={toCardModels(limited)}
      />

      {banners.mid[1] && <FeatureBanner banner={banners.mid[1]} />}

      <ProductRail
        eyebrow="Chosen by us"
        title="Handpicked this season"
        description="The things the buying team argued about, and won."
        href="/products"
        products={toCardModels(handpicked)}
      />

      <ProductRail
        eyebrow="For the home"
        title="Set up your space"
        description="Furniture, lighting and soft furnishing scaled for Indian apartments."
        href="/c/home-living"
        linkLabel="Shop home"
        products={toCardModels(electronics)}
      />

      <ValueProps />

      <BrandStrip brands={brands} />

      <ProductRail
        eyebrow="Because you are here"
        title="Recommended for you"
        description="Highly rated across the catalogue — a good place to start."
        href="/products?sort=rating"
        products={toCardModels(recommended)}
      />

      <RecentlyViewed />
    </>
  );
}
