import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, Copy } from "lucide-react";
import type { Banner, Brand, Category, Offer, PromoTile } from "@/lib/types";
import { SectionHeader } from "@/components/ui/primitives";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { buttonClasses } from "@/components/ui/button";
import { cn, formatINR } from "@/lib/utils";

/* ------------------------- Shop by category ------------------------ */

export function CategoryStrip({ categories }: { categories: Category[] }) {
  return (
    <section className="container-page py-10 sm:py-14">
      <Reveal>
        <SectionHeader
          eyebrow="Start here"
          title="Shop by category"
          description="Eight departments, 120 products, every one of them stocked because someone on the team uses it."
          href="/products"
          linkLabel="All products"
          className="mb-6"
        />
      </Reveal>

      <StaggerGroup className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-8">
        {categories.map((category) => (
          <StaggerItem key={category.slug}>
            <Link
              href={`/c/${category.slug}`}
              className="group flex flex-col items-center gap-3 rounded-xl border border-hairline bg-surface p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:border-ink-200 hover:shadow-md sm:p-4"
            >
              <span className="relative aspect-square w-full overflow-hidden rounded-lg bg-ink-100">
                <Image
                  src={category.image.url}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 12vw, (min-width:640px) 22vw, 44vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <span
                  className="absolute inset-x-0 bottom-0 h-1/3 opacity-70 transition-opacity group-hover:opacity-90"
                  style={{
                    background: `linear-gradient(to top, ${category.accent}dd, transparent)`,
                  }}
                />
              </span>
              <span className="text-[12.5px] font-semibold leading-tight text-ink-900 group-hover:text-brand-700 sm:text-[13px]">
                {category.name}
              </span>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

/* --------------------------- Promo tiles --------------------------- */

export function PromoTiles({ tiles }: { tiles: PromoTile[] }) {
  return (
    <section className="container-page py-10 sm:py-14">
      <StaggerGroup className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <StaggerItem key={tile.id}>
            <Link
              href={tile.href}
              className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl bg-ink-950 sm:aspect-square"
            >
              <Image
                src={tile.image.url}
                alt=""
                fill
                sizes="(min-width:1024px) 24vw, 46vw"
                className="object-cover opacity-85 transition-transform duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/35 to-transparent" />
              <span className="relative p-4 sm:p-5">
                <span className="block font-display text-lg leading-tight tracking-[-0.01em] text-white sm:text-xl">
                  {tile.title}
                </span>
                <span className="mt-1 block text-[12px] text-white/65">{tile.subtitle}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-gold-300">
                  {tile.cta}
                  <ArrowRight
                    size={13}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </span>
              </span>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

/* -------------------------- Feature banner ------------------------- */

export function FeatureBanner({ banner }: { banner: Banner }) {
  const dark = banner.theme === "dark";

  return (
    <section className="container-page py-10 sm:py-14">
      <Reveal>
        <div
          className={cn(
            "relative grid overflow-hidden rounded-2xl sm:rounded-3xl lg:grid-cols-2",
            dark ? "bg-brand-950" : "bg-gold-50",
            banner.align === "right" && "lg:[&>*:first-child]:order-2",
          )}
        >
          <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[380px]">
            <Image
              src={banner.image.url}
              alt={banner.image.alt}
              fill
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          <div className="flex flex-col justify-center gap-4 p-7 sm:p-10 lg:p-14">
            <span
              className={cn(
                "inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em]",
                dark ? "bg-white/10 text-gold-300" : "bg-gold-200 text-gold-900",
              )}
            >
              {banner.eyebrow}
            </span>
            <h2
              className={cn(
                "font-display text-[28px] leading-[1.08] tracking-[-0.025em] sm:text-[38px]",
                dark ? "text-white" : "text-ink-950",
              )}
            >
              {banner.title}
            </h2>
            <p
              className={cn(
                "max-w-md text-[14.5px] leading-relaxed",
                dark ? "text-white/65" : "text-ink-600",
              )}
            >
              {banner.subtitle}
            </p>
            <Link
              href={banner.href}
              className={cn(
                buttonClasses(dark ? "accent" : "primary", "lg"),
                "mt-2 w-fit",
              )}
            >
              {banner.cta}
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* --------------------------- Offer cards --------------------------- */

export function OfferCards({ offers }: { offers: Offer[] }) {
  return (
    <section className="container-page py-10 sm:py-14">
      <Reveal>
        <SectionHeader
          eyebrow="Save more"
          title="Coupons live right now"
          description="Apply any of these at checkout. Bank offers stack with product discounts."
          href="/offers"
          linkLabel="All offers"
          className="mb-6"
        />
      </Reveal>

      <div className="rail -mx-4 px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {offers.map((offer) => (
          <article
            key={offer.id}
            className="relative w-[268px] overflow-hidden rounded-xl border border-hairline bg-surface p-5 transition-shadow duration-300 hover:shadow-md"
          >
            <span
              className="absolute inset-x-0 top-0 h-1"
              style={{ backgroundColor: offer.accent }}
            />
            <div className="flex items-start justify-between gap-3">
              <BadgePercent size={20} style={{ color: offer.accent }} />
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                {offer.type === "bank" ? "Bank offer" : offer.type === "shipping" ? "Shipping" : "Coupon"}
              </span>
            </div>
            <h3 className="mt-3 text-[15px] font-semibold leading-snug text-ink-950">
              {offer.title}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-500">
              {offer.description}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-dashed border-ink-300 bg-ink-50 px-3 py-2.5">
              <code className="font-mono text-[13px] font-bold tracking-[0.06em] text-ink-950">
                {offer.code}
              </code>
              <Copy size={14} className="text-ink-400" />
            </div>
            <p className="mt-2.5 text-[11px] text-ink-400">
              Minimum spend {formatINR(offer.minSpend)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Brand strip --------------------------- */

export function BrandStrip({ brands }: { brands: Brand[] }) {
  return (
    <section className="border-y border-hairline bg-surface">
      <div className="container-page py-10 sm:py-12">
        <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
          Sixteen studios. One storefront.
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:grid-cols-8">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/products?brands=${brand.slug}`}
              className="group flex flex-col items-center gap-1 text-center"
            >
              <span className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink-500 transition-colors duration-200 group-hover:text-brand-700">
                {brand.name}
              </span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-ink-300 transition-colors group-hover:text-ink-400">
                {brand.origin}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Editorial ---------------------------- */

export function ValueProps() {
  const items = [
    {
      title: "We name the maker",
      body: "Every product page tells you which studio made it and in which city. If we cannot say, we do not stock it.",
    },
    {
      title: "The price is the price",
      body: "No inflated MRP that quietly returns after the sale. Our discounts are real and our margins are boring.",
    },
    {
      title: "Returns without a fight",
      body: "Free pickup from every serviceable pincode and refunds initiated within 48 hours of the item reaching us.",
    },
  ];

  return (
    <section className="container-page py-12 sm:py-16">
      <StaggerGroup className="grid gap-6 sm:grid-cols-3 sm:gap-8">
        {items.map((item, i) => (
          <StaggerItem key={item.title}>
            <div className="border-t-2 border-brand-800 pt-5">
              <span className="font-display text-[13px] font-semibold tabular-nums text-brand-600">
                0{i + 1}
              </span>
              <h3 className="mt-2 font-display text-xl tracking-[-0.015em] text-ink-950">
                {item.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{item.body}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
