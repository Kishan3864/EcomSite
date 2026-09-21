import Link from "next/link";
import Image from "@/components/ui/image";
import {
  ArrowRight,
  BadgeCheck,
  BadgePercent,
  CreditCard,
  Quote,
  ReceiptText,
  RotateCcw,
  Star,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Banner, Category } from "@/lib/types";
import type { ProductCardModel } from "@/lib/card";
import type { ReviewHighlight } from "@/services/home-reviews";
import { BRAND } from "@/components/brand/logo";
import { BUSINESS } from "@/config/business";
import { paymentSentence, type PublicPayments } from "@/lib/payment-copy";
import { ProductCard } from "@/components/product/product-card";
import { ProductRail } from "@/components/product/product-rail";
import { SectionHeader } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn, formatDate, formatINR } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  Hero for a shop with no products yet
 * ------------------------------------------------------------------ */

export function EmptyHero({ banner }: { banner?: Banner }) {
  return (
    <section className="container-page pt-4 sm:pt-6">
      <div className="aurora relative overflow-hidden rounded-3xl border border-line px-6 py-14 sm:px-12 sm:py-20">
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0" />
        <div className="relative max-w-2xl">
          <span className="eyebrow">{banner?.eyebrow ?? BRAND.name}</span>
          <h1 className="t-display mt-4">{banner?.title ?? BRAND.tagline}</h1>
          <p className="t-body mt-3 max-w-[52ch]">{banner?.subtitle ?? BRAND.description}</p>
          <Link
            href={banner?.href ?? "/products"}
            className="group mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-ink-950 px-6 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-800"
          >
            {banner?.cta ?? "Browse the catalogue"}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Trust strip — the promises from the announcement bar, as a row
 * ------------------------------------------------------------------ */

export function TrustStrip({ freeThreshold, payments }: { freeThreshold: number; payments: PublicPayments }) {
  const pay = paymentSentence(payments);
  const items: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: Truck, title: "Free delivery", body: `On orders above ${formatINR(freeThreshold)}` },
    { icon: RotateCcw, title: `${BUSINESS.ops.returnWindowDays}-day returns`, body: "On most items" },
    { icon: CreditCard, title: "Secure payments", body: pay ? `Pay by ${pay.toLowerCase()}` : "Paid on a secure checkout" },
    { icon: ReceiptText, title: "Invoiced by us", body: "Bought and invoiced by us, not a marketplace" },
  ];

  return (
    <section className="container-page pt-4 sm:pt-5" aria-label="Why shop with us">
      <ul className="no-scrollbar -mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="card flex min-w-[232px] snap-start items-center gap-3 px-4 py-3.5 sm:min-w-0"
          >
            <span className="icon-tile">
              <Icon size={20} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ink-950">{title}</span>
              <span className="block truncate text-[12px] text-ink-500">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Shop by category — departments only. A department's collections
 *  appear once a shopper has entered it (/c/[category]).
 * ------------------------------------------------------------------ */

export function CategoryShowcase({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  const feature = categories.length >= 3 ? categories[0] : null;
  const rest = feature ? categories.slice(1) : categories;

  return (
    <section className="container-page section">
      <SectionHeader
        eyebrow="Departments"
        title="Shop by category"
        description="Pick a department to see its collections."
        href="/products"
        linkLabel="All products"
      />

      <div className={cn("grid gap-3 sm:gap-4", feature && "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]")}>
        {feature && <CategoryTile category={feature} large />}
        <ul
          className={cn(
            "grid grid-cols-2 gap-3 sm:gap-4",
            rest.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
            !feature && rest.length >= 4 && "lg:grid-cols-4",
          )}
        >
          {rest.map((category) => (
            <li key={category.slug}>
              <CategoryTile category={category} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CategoryTile({ category, large = false }: { category: Category; large?: boolean }) {
  const collections = category.subcategories.length;
  return (
    <Link
      href={`/c/${category.slug}`}
      className={cn(
        "card card-interactive group relative flex h-full flex-col overflow-hidden",
        large && "min-h-[280px] lg:min-h-full",
      )}
    >
      <div className={cn("relative overflow-hidden bg-ink-100", large ? "flex-1 max-lg:aspect-[16/10]" : "aspect-[4/3]")}>
        <Image
          src={category.image.url}
          alt={category.image.alt || category.name}
          fill
          sizes={large ? "(min-width:1024px) 36vw, 100vw" : "(min-width:1024px) 20vw, (min-width:640px) 33vw, 50vw"}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
        {large && (
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/10 to-transparent" />
        )}
        {large && (
          <span className="absolute inset-x-5 bottom-5 text-white">
            <span className="t-label block !text-white/75">Featured department</span>
            <span className="mt-1 block text-[22px] font-bold tracking-[-0.03em]">{category.name}</span>
            {category.description && (
              <span className="mt-1 line-clamp-2 block max-w-[40ch] text-[13px] text-white/80">{category.description}</span>
            )}
          </span>
        )}
      </div>
      {!large && (
        <div className="flex items-center gap-3 p-3 sm:p-3.5">
          <span className="icon-tile icon-tile-sm max-sm:hidden">
            <CategoryIcon icon={category.icon} name={category.name} size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-ink-950 group-hover:text-brand-700">
              {category.name}
            </span>
            {collections > 0 && (
              <span className="block text-[11.5px] text-ink-500">
                {collections} {collections === 1 ? "collection" : "collections"}
              </span>
            )}
          </span>
          <ArrowRight size={16} className="shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700" />
        </div>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 *  Shop by budget — real price bands, counted from the shelf
 * ------------------------------------------------------------------ */

const MIN_BANDS = 3;

function friendlyCeiling(value: number): number {
  if (value <= 500) return Math.ceil(value / 100) * 100;
  if (value <= 2000) return Math.ceil(value / 250) * 250;
  if (value <= 10000) return Math.ceil(value / 500) * 500;
  return Math.ceil(value / 1000) * 1000;
}

interface Band {
  ceiling: number | null;
  href: string;
  count: number;
}

/** Quartile ceilings, rounded to prices people say, then "everything". */
function buildPriceBands(ladder: number[]): Band[] {
  const prices = [...ladder].sort((a, b) => a - b);
  if (prices.length === 0) return [];

  const cuts = [0.25, 0.5, 0.75]
    .map((q) => friendlyCeiling(prices[Math.min(prices.length - 1, Math.floor(q * prices.length))]))
    .filter((v, i, all) => all.indexOf(v) === i)
    .sort((a, b) => a - b);

  const bands: Band[] = [];
  for (const cut of cuts) {
    const count = prices.filter((p) => p <= cut).length;
    if (count === 0 || count === prices.length) continue;
    bands.push({ ceiling: cut, href: `/products?maxPrice=${cut}&sort=price_asc`, count });
  }
  bands.push({ ceiling: null, href: "/products?sort=price_asc", count: prices.length });
  return bands;
}

export function BudgetBands({ prices }: { prices: number[] }) {
  const bands = buildPriceBands(prices);
  if (bands.length < MIN_BANDS) return null;

  return (
    <section className="container-page section-tight">
      <div className="aurora relative overflow-hidden rounded-3xl border border-line p-5 sm:p-8">
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative">
          <SectionHeader
            eyebrow="Budget"
            title="Shop by budget"
            description="Real price bands, counted from what is on the shelf today."
          />
          <ul className={cn("grid grid-cols-2 gap-3", bands.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
            {bands.map((band) => {
              const all = band.ceiling == null;
              return (
                <li key={band.href}>
                  <Link
                    href={band.href}
                    className={cn(
                      "group flex h-full flex-col justify-between gap-6 rounded-2xl p-4 transition-all duration-200 sm:p-5",
                      all
                        ? "bg-ink-950 text-white hover:bg-brand-900"
                        : "glass ring-1 ring-inset ring-white/70 hover:-translate-y-0.5 hover:shadow-lg",
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className={cn("icon-tile icon-tile-sm", all && "!bg-white/10 !text-gold-300")}>
                        <Wallet size={16} aria-hidden />
                      </span>
                      <ArrowRight
                        size={16}
                        className={cn("transition-transform group-hover:translate-x-0.5", all ? "text-white/70" : "text-ink-400")}
                      />
                    </span>
                    <span>
                      <span className={cn("t-label block", all && "!text-white/60")}>
                        {all ? "No limit" : "Under"}
                      </span>
                      <span className={cn("mt-1 block text-[20px] font-bold tracking-[-0.03em] sm:text-[24px]", !all && "text-ink-950")}>
                        {all ? "Everything" : formatINR(band.ceiling as number)}
                      </span>
                      <span className={cn("mt-0.5 block text-[12px] tabular-nums", all ? "text-white/65" : "text-ink-500")}>
                        {band.count} {band.count === 1 ? "product" : "products"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Shelves
 * ------------------------------------------------------------------ */

export interface ShelfCopy {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}

/** A grid of whole rows: 2 on phones, then 4 or 5 depending on the count. */
export function ShelfGrid({ copy, products }: { copy: ShelfCopy; products: ProductCardModel[] }) {
  if (products.length === 0) return null;
  const five = products.length % 5 === 0;
  return (
    <section className="container-page section-tight">
      <SectionHeader {...copy} />
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4", five ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            className={cn(products.length % 3 !== 0 && i === products.length - 1 && "sm:max-lg:hidden")}
            sizes={`(min-width:1024px) ${five ? 20 : 25}vw, (min-width:640px) 33vw, 50vw`}
          />
        ))}
      </div>
    </section>
  );
}

export function ShelfRail({ copy, products }: { copy: ShelfCopy; products: ProductCardModel[] }) {
  return <ProductRail {...copy} products={products} />;
}

/** Deals, on the page's one dark panel so reductions stand apart. */
export function DealsBand({ copy, products }: { copy: ShelfCopy; products: ProductCardModel[] }) {
  if (products.length === 0) return null;
  return (
    <section className="container-page section-tight">
      <div className="midnight overflow-hidden rounded-3xl p-5 sm:p-8">
        <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
          <div className="min-w-0">
            <span className="eyebrow eyebrow-dark">{copy.eyebrow}</span>
            <h2 className="t-h2 mt-2 flex items-center gap-2 !text-white">
              <BadgePercent size={24} className="text-gold-300" aria-hidden />
              {copy.title}
            </h2>
            <p className="mt-1 max-w-2xl text-[13.5px] text-white/70">{copy.description}</p>
          </div>
          <Link
            href={copy.href}
            className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-4 text-[12.5px] font-semibold text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15"
          >
            <span className="hidden sm:inline">{copy.linkLabel}</span>
            <span className="sm:hidden">View all</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:gap-4 sm:px-8">
          {products.map((product) => (
            <div key={product.id} className="snap-start">
              <ProductCard product={product} layout="rail" sizes="(min-width:640px) 224px, 164px" className="!border-transparent" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  What buyers say
 * ------------------------------------------------------------------ */

export function ReviewHighlights({ reviews }: { reviews: ReviewHighlight[] }) {
  if (reviews.length < 2) return null;
  return (
    <section className="container-page section">
      <SectionHeader
        eyebrow="Reviews"
        title="What buyers say"
        description="Recent reviews from customers, one per product."
        href="/products?sort=rating"
        linkLabel="Top rated products"
      />
      <ul className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {reviews.map((review) => (
          <li key={review.id} className="card flex w-[82vw] max-w-[340px] shrink-0 snap-start flex-col p-5 sm:w-auto sm:max-w-none">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    size={14}
                    fill="currentColor"
                    strokeWidth={0}
                    className={i < review.rating ? "text-gold-500" : "text-ink-200"}
                    aria-hidden
                  />
                ))}
              </span>
              <Quote size={20} className="text-brand-200" aria-hidden />
            </div>
            {review.title && <h3 className="t-h3 mt-3 line-clamp-1">{review.title}</h3>}
            <p className="t-body mt-1.5 line-clamp-4 flex-1 !text-[13px]">{review.body}</p>
            <div className="mt-4 flex items-center justify-between gap-3 text-[12px] text-ink-500">
              <span className="min-w-0 truncate">
                <span className="font-semibold text-ink-800">{review.author}</span>
                {review.location && <> · {review.location}</>}
              </span>
              {review.verified && (
                <span className="inline-flex shrink-0 items-center gap-1 font-medium text-brand-700">
                  <BadgeCheck size={14} aria-hidden /> Verified
                </span>
              )}
            </div>
            <Link
              href={`/p/${review.product.slug}`}
              className="group mt-4 flex items-center gap-3 rounded-xl bg-ink-50 p-2 transition-colors hover:bg-brand-50"
            >
              {review.product.image && (
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                  <Image src={review.product.image} alt="" fill sizes="40px" className="object-cover" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-ink-900 group-hover:text-brand-700">
                  {review.product.title}
                </span>
                <span className="block text-[11px] text-ink-500">{formatDate(review.createdAt)}</span>
              </span>
              <ArrowRight size={14} className="shrink-0 text-ink-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  The admin's mid-page banner, as a promo panel
 * ------------------------------------------------------------------ */

export function PromoBand({ banner }: { banner?: Banner }) {
  if (!banner) return null;
  return (
    <section className="container-page section-tight">
      <div className="midnight relative isolate grid overflow-hidden rounded-3xl lg:grid-cols-2">
        <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14">
          <span className="eyebrow eyebrow-dark">{banner.eyebrow}</span>
          <h2 className="mt-3 text-[24px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[32px]">
            {banner.title}
          </h2>
          {banner.subtitle && <p className="mt-3 max-w-[46ch] text-[14px] leading-[1.6] text-white/70">{banner.subtitle}</p>}
          <Link
            href={banner.href}
            className="group mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-gold-400 px-6 text-[13.5px] font-semibold text-ink-950 transition-colors hover:bg-gold-300"
          >
            {banner.cta}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="relative min-h-[200px] lg:min-h-full">
          <Image src={banner.image.url} alt={banner.image.alt || ""} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-brand-950/70 to-transparent lg:bg-gradient-to-r" />
        </div>
      </div>
    </section>
  );
}
