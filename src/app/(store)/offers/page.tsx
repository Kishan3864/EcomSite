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
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Offers and deals",
  description:
    "Every coupon, bank offer and discount running on Mayura right now — with the terms written in plain language.",
  alternates: { canonical: "/offers" },
  openGraph: {
    title: "Offers and deals · Mayura",
    description: "Every coupon and discount running on Mayura right now.",
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

  return (
    <>
      <BreadcrumbJsonLd items={crumbs} />

      <div className="container-page py-5 sm:py-7">
        <Breadcrumbs items={crumbs} className="mb-5" />

        <header className="overflow-hidden rounded-2xl sm:rounded-3xl">
          <div className="peacock-surface px-6 py-10 sm:px-12 sm:py-14">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-300">
              <Sparkles size={12} /> Live right now
            </p>
            <h1 className="mt-4 max-w-2xl font-display text-[32px] leading-[1.06] tracking-[-0.03em] text-white sm:text-[46px]">
              Every offer running today, in plain language.
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-white/65">
              No inflated MRP, no fine print hidden three clicks deep. Here is exactly what each
              code does, what it needs, and when it expires.
            </p>
            <div className="mt-6 flex flex-wrap gap-6">
              {[
                { value: offers.length, label: "Coupons live" },
                { value: `${flashDeals.length}+`, label: "Deals today" },
                { value: "40%", label: "Biggest discount" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-[28px] leading-none text-gold-300">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11.5px] uppercase tracking-[0.1em] text-white/45">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-10">
          <Reveal>
            <SectionHeader
              eyebrow="Copy and paste at checkout"
              title="Coupon codes"
              description="Tap a code to copy it. Bank offers stack with product discounts; coupons do not stack with each other."
              className="mb-6"
            />
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <CouponCodeCard key={offer.id} offer={offer} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <Reveal>
            <SectionHeader
              eyebrow="Shop the discount"
              title="30% off or more"
              description="Everything in the catalogue currently discounted by at least 30%."
              href="/products?discount=30&sort=discount"
              linkLabel="See all"
              className="mb-6"
            />
          </Reveal>
          <ProductGrid products={toCardModels(bigDiscounts.items)} className="xl:grid-cols-5" />
        </section>
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

      <section className="container-page py-10 sm:py-14">
        <Reveal>
          <SectionHeader
            eyebrow="By department"
            title="Deals by category"
            className="mb-6"
          />
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/c/${category.slug}?discount=20&sort=discount`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
            >
              <span>
                <span className="block text-[13.5px] font-semibold text-ink-950 group-hover:text-brand-700">
                  {category.name}
                </span>
                <span className="mt-0.5 block text-[12px] text-ink-500">20% off and above</span>
              </span>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: category.accent }}
              >
                <BadgePercent size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="rounded-2xl border border-hairline bg-surface p-6 sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-xl tracking-[-0.015em] text-ink-950">
            <Clock size={18} className="text-brand-600" />
            How our offers work
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "One coupon per order",
                body: "Coupons do not stack. The checkout always applies the code that saves you the most if you try two.",
              },
              {
                title: "Bank offers stack",
                body: "Card and UPI offers apply on top of any coupon, as an instant discount at the payment step.",
              },
              {
                title: "Real expiry dates",
                body: `The soonest code expires on ${formatDate(
                  offers.reduce((a, b) => (a.expiresAt < b.expiresAt ? a : b)).expiresAt,
                  "short",
                )}. We do not silently extend them.`,
              },
              {
                title: "Refunds keep the discount",
                body: "If you return part of an order, the coupon is re-applied proportionally rather than clawed back.",
              },
            ].map((item) => (
              <li key={item.title}>
                <div className="flex items-start gap-2.5">
                  <Flame size={15} className="mt-0.5 shrink-0 text-gold-500" />
                  <div>
                    <p className="text-[13.5px] font-semibold text-ink-950">{item.title}</p>
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
