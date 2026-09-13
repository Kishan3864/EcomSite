import type { Metadata } from "next";
import Link from "next/link";
import { BadgePercent, Clock, Flame, Sparkles } from "lucide-react";
import { Breadcrumbs, SectionHeader } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/motion";
import { ProductGrid, ProductRail } from "@/components/product/product-rail";
import { FeatureBanner } from "@/components/home/sections";
import { CouponCodeCard } from "./coupon-card";
import { toCardModels } from "@/lib/card";
import {
  getCategories,
  getFlashDeals,
  getLimitedStock,
  getBanners,
  getOffers,
  searchProducts,
} from "@/services/catalog";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { discountPercent, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Offers and deals",
  description:
    "Every coupon, bank offer and discount running on WeekendCart right now — with the terms written in plain language.",
  alternates: { canonical: "/offers" },
  openGraph: {
    title: "Offers and deals · WeekendCart",
    description: "Every coupon and discount running on WeekendCart right now.",
    url: "/offers",
  },
};

const crumbs = [
  { name: "Home", href: "/" },
  { name: "Offers", href: "/offers" },
];

export default async function OffersPage() {
  const [offers, flashDeals, limited, categories, bigDiscounts, banners] = await Promise.all([
    getOffers(),
    getFlashDeals(10),
    getLimitedStock(10),
    getCategories(),
    searchProducts({ minDiscount: 30, sort: "discount", perPage: 15 }),
    getBanners(),
  ]);

  // Every number on this page is read off the catalogue. "40% biggest
  // discount" used to be typed into the markup, which made it a claim that
  // stayed put whatever the shop was actually selling.
  const biggestDiscount = Math.max(
    0,
    ...bigDiscounts.items.map((p) => discountPercent(p.mrp, p.price)),
    ...flashDeals.map((p) => discountPercent(p.mrp, p.price)),
  );

  // reduce() with no initial value throws on an empty array. With the demo
  // coupons cleared this page answered 500 — from a link in the header.
  const soonestExpiry = offers.length
    ? offers.reduce((a, b) => (a.expiresAt < b.expiresAt ? a : b)).expiresAt
    : null;

  const stats = [
    ...(offers.length > 0 ? [{ value: offers.length, label: "Coupons live" }] : []),
    ...(flashDeals.length > 0 ? [{ value: `${flashDeals.length}+`, label: "Deals today" }] : []),
    ...(biggestDiscount > 0
      ? [{ value: `${biggestDiscount}%`, label: "Biggest discount" }]
      : []),
  ];

  const nothingRunning =
    offers.length === 0 && flashDeals.length === 0 && limited.length === 0 &&
    bigDiscounts.items.length === 0;

  return (
    <>
      <BreadcrumbJsonLd items={crumbs} />

      <div className="container-page py-3 sm:py-7">
        <Breadcrumbs items={crumbs} className="mb-3 sm:mb-5" />

        <header className="overflow-hidden rounded-2xl sm:rounded-3xl">
          <div className="peacock-surface px-4 py-6 sm:px-12 sm:py-14">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-300">
              <Sparkles size={12} /> Live right now
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-[24px] leading-[1.06] tracking-[-0.03em] text-white sm:mt-4 sm:text-[46px]">
              {nothingRunning
                ? "No offers running at the moment."
                : "Every offer running today, in plain language."}
            </h1>
            <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-white/65 sm:mt-3 sm:text-[14.5px]">
              {nothingRunning
                ? "When there is a coupon or a genuine reduction, it appears here first — with what it needs and when it expires. We would rather show you nothing than a discount off a price we invented."
                : "No inflated MRP, no fine print hidden three clicks deep. Here is exactly what each code does, what it needs, and when it expires."}
            </p>
            {/* Three even columns on phones so the stats sit on one line. */}
            {stats.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:mt-6 sm:flex sm:flex-wrap sm:gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <p className="font-display text-[21px] leading-none text-gold-300 sm:text-[28px]">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11.5px] uppercase tracking-[0.1em] text-white/45">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            )}
            {nothingRunning && (
              <div className="mt-5 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
                <Link
                  href="/products"
                  className="tap inline-flex h-11 grow items-center justify-center bg-gold-400 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors hover:bg-gold-300 sm:h-12 sm:grow-0 sm:px-8"
                >
                  Browse the shop
                </Link>
              </div>
            )}
          </div>
        </header>

        {offers.length > 0 && (
        <section className="mt-6 sm:mt-10">
          <Reveal>
            <SectionHeader
              eyebrow="Copy and paste at checkout"
              title="Coupon codes"
              description="Tap a code to copy it. Bank offers stack with product discounts; coupons do not stack with each other."
              className="mb-4 sm:mb-6"
            />
          </Reveal>

          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {offers.map((offer) => (
              <CouponCodeCard key={offer.id} offer={offer} />
            ))}
          </div>
        </section>
        )}

        {bigDiscounts.items.length > 0 && (
        <section className="mt-8 sm:mt-12">
          <Reveal>
            <SectionHeader
              eyebrow="Shop the discount"
              title="30% off or more"
              description="Everything in the catalogue currently discounted by at least 30%."
              href="/products?discount=30&sort=discount"
              linkLabel="See all"
              className="mb-4 sm:mb-6"
            />
          </Reveal>
          <ProductGrid products={toCardModels(bigDiscounts.items)} className="xl:grid-cols-5" />
        </section>
        )}
      </div>

      <ProductRail
        eyebrow="Ends at midnight"
        title="Deals of the day"
        description="Restocked every midnight. When a size or colour sells out, it is gone for the day."
        href="/products?sort=discount"
        products={toCardModels(flashDeals)}
      />

      {banners.mid[0] && <FeatureBanner banner={banners.mid[0]} />}

      <ProductRail
        eyebrow="Almost gone"
        title="Limited stock, still discounted"
        description="Last pieces from short production runs."
        href="/products?sort=discount"
        products={toCardModels(limited)}
      />

      {categories.length > 0 && (
      <section className="container-page py-6 sm:py-14">
        <Reveal>
          <SectionHeader
            eyebrow="By department"
            title="Deals by category"
            className="mb-4 sm:mb-6"
          />
        </Reveal>
        {/* A swipeable row of tiles on phones rather than a stack eight tall;
            the grid returns from sm up. 160px leaves a third tile peeking at
            every common phone width, so the row reads as scrollable. */}
        <div className="no-scrollbar -mx-3 flex snap-x snap-mandatory scroll-px-3 gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/c/${category.slug}?discount=20&sort=discount`}
              className="tap group flex w-[160px] shrink-0 snap-start items-center justify-between gap-2 rounded-xl border border-hairline bg-surface p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md sm:w-auto sm:gap-3 sm:p-4"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-snug text-ink-950 group-hover:text-brand-700 sm:text-[13.5px] sm:leading-normal">
                  {category.name}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-ink-500 sm:text-[12px]">20% off and above</span>
              </span>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white sm:h-9 sm:w-9"
                style={{ backgroundColor: category.accent }}
              >
                <BadgePercent size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      )}

      <section className="container-page pb-8 sm:pb-14">
        <div className="rounded-2xl border border-hairline bg-surface p-4 sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-[17px] tracking-[-0.015em] text-ink-950 sm:text-xl">
            <Clock size={18} className="text-brand-600" />
            How our offers work
          </h2>
          <ul className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {[
              {
                title: "One coupon per order",
                body: "Coupons do not stack. The checkout always applies the code that saves you the most if you try two.",
              },
              {
                title: "Bank offers stack",
                body: "Card and UPI offers apply on top of any coupon, as an instant discount at the payment step.",
              },
              ...(soonestExpiry
                ? [
                    {
                      title: "Real expiry dates",
                      body: `The soonest code expires on ${formatDate(soonestExpiry, "short")}. We do not silently extend them.`,
                    },
                  ]
                : [
                    {
                      title: "Real expiry dates",
                      body: "Every code we publish carries the date it runs out, and we do not silently extend them.",
                    },
                  ]),
              {
                title: "Refunds keep the discount",
                body: "If you return part of an order, the coupon is re-applied proportionally rather than clawed back.",
              },
            ].map((item) => (
              <li key={item.title}>
                <div className="flex items-start gap-2.5">
                  <Flame size={15} className="mt-0.5 shrink-0 text-gold-500" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink-950 sm:text-[13.5px]">{item.title}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-600">{item.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
