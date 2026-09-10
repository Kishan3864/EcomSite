import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Banner, Category } from "@/lib/types";
import type { ProductCardModel } from "@/lib/card";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/ui/motion";
import { cn, discountPercent, formatINR } from "@/lib/utils";

/**
 * Homepage showcase bands.
 *
 * The old homepage ran the same rail of the same card eight times over, which
 * made a long page that said one thing. These bands each have a different
 * shape — a mosaic, a single-product spread, an asymmetric board, a flat grid,
 * a full-bleed statement — so scrolling feels like moving through a shop
 * rather than paging a spreadsheet. Corners stay square throughout.
 */

/* ------------------------------------------------------------------ *
 *  Shared header
 * ------------------------------------------------------------------ */

function BandHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "View all",
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-ink-950 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="mt-3 font-display text-[27px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:text-[36px]">
          {title}
        </h2>
        {description && (
          <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-ink-500">{description}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-950 hover:text-gold-700"
        >
          {linkLabel}
          <ArrowRight
            size={14}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  1 — Category mosaic
 *  Two departments get real estate, the rest share a band beneath them.
 * ------------------------------------------------------------------ */

export function CategoryMosaic({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  const [first, second, ...rest] = categories;

  return (
    <section className="container-page py-14 sm:py-20">
      <BandHeader
        eyebrow="The departments"
        title="Where would you like to start?"
        href="/products"
        linkLabel="All products"
        className="mb-8"
      />

      <div className="tile-grid grid-cols-2 lg:grid-cols-4">
        {[first, second].filter(Boolean).map((category, i) => (
          <Link
            key={category.slug}
            href={`/c/${category.slug}`}
            className="group relative col-span-2 aspect-[16/10] overflow-hidden lg:aspect-[4/3]"
          >
            <Image
              src={category.image.url}
              alt=""
              fill
              priority={i === 0}
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 sm:p-8">
              <span className="min-w-0">
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-300">
                  {category.subcategories.length} collections
                </span>
                <span className="mt-2 block font-display text-[24px] leading-tight tracking-[-0.02em] text-white sm:text-[32px]">
                  {category.name}
                </span>
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/40 text-white transition-colors duration-200 group-hover:border-white group-hover:bg-white group-hover:text-ink-950">
                <ArrowUpRight size={17} />
              </span>
            </span>
          </Link>
        ))}

        {rest.map((category) => (
          <Link
            key={category.slug}
            href={`/c/${category.slug}`}
            className="group relative aspect-[4/3] overflow-hidden"
          >
            <Image
              src={category.image.url}
              alt=""
              fill
              sizes="(min-width:1024px) 25vw, 50vw"
              className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <span className="font-display text-[15px] leading-tight tracking-[-0.01em] text-white sm:text-[18px]">
                {category.name}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  2 — Spotlight
 *  One product, given the space a magazine would give it.
 * ------------------------------------------------------------------ */

export function Spotlight({
  product,
  eyebrow = "Product of the moment",
}: {
  product?: ProductCardModel;
  eyebrow?: string;
}) {
  if (!product) return null;
  const off = discountPercent(product.mrp, product.price);

  return (
    <section className="border-y border-ink-950 bg-surface">
      <div className="container-page grid items-stretch gap-0 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden bg-ink-100 lg:aspect-auto lg:min-h-[560px]">
          <Image
            src={product.image}
            alt={product.imageAlt || product.title}
            fill
            sizes="(min-width:1024px) 50vw, 100vw"
            className="object-cover"
          />
          {off > 0 && (
            <span className="absolute left-0 top-0 bg-ink-950 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
              {off}% off
            </span>
          )}
        </div>

        <div className="flex flex-col justify-center px-0 py-12 lg:py-20 lg:pl-16">
          <span className="eyebrow">{eyebrow}</span>

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">
            {product.brand}
          </p>
          <h2 className="mt-3 max-w-lg font-display text-[32px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:text-[46px]">
            {product.title}
          </h2>
          {product.subtitle && (
            <p className="mt-5 max-w-md text-[15px] leading-[1.75] text-ink-600">
              {product.subtitle}
            </p>
          )}

          <div className="mt-8 flex items-baseline gap-3 border-t border-hairline pt-6">
            <span className="font-display text-[34px] leading-none tracking-[-0.03em] text-ink-950">
              {formatINR(product.price)}
            </span>
            {product.mrp > product.price && (
              <span className="text-[15px] text-ink-400 line-through">
                {formatINR(product.mrp)}
              </span>
            )}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/p/${product.slug}`}
              className="inline-flex h-12 items-center gap-2 bg-ink-950 px-8 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-brand-800"
            >
              View this product <ArrowRight size={15} />
            </Link>
            <Link
              href={`/c/${product.categorySlug}`}
              className="inline-flex h-12 items-center border border-ink-950 px-8 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-ink-950 hover:text-white"
            >
              More like this
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  3 — Deals board
 *  One deal leads; four follow in a tight grid beside it.
 * ------------------------------------------------------------------ */

export function DealsBoard({ products }: { products: ProductCardModel[] }) {
  if (products.length === 0) return null;
  const [lead, ...others] = products;
  const off = discountPercent(lead.mrp, lead.price);

  return (
    <section className="container-page py-14 sm:py-20">
      <BandHeader
        eyebrow="Reduced this week"
        title="Deals worth the scroll"
        description="Real reductions on stock we hold, not a permanent sale price dressed up as one."
        href="/offers"
        linkLabel="Every deal"
        className="mb-8"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)] lg:gap-8">
        {/* Lead deal — a full editorial panel, not a scaled-up card. */}
        <Link
          href={`/p/${lead.slug}`}
          className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden bg-ink-950 p-7 sm:p-9"
        >
          <Image
            src={lead.image}
            alt={lead.imageAlt || lead.title}
            fill
            sizes="(min-width:1024px) 38vw, 100vw"
            className="object-cover opacity-60 transition-[transform,opacity] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:opacity-70"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/10" />

          <span className="relative">
            {off > 0 && (
              <span className="inline-block bg-gold-500 px-2.5 py-1.5 text-[10.5px] font-bold uppercase leading-none tracking-[0.12em] text-ink-950">
                Save {off}%
              </span>
            )}
            <span className="mt-4 block text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/60">
              {lead.brand}
            </span>
            <span className="mt-2 block max-w-xs font-display text-[26px] leading-[1.1] tracking-[-0.025em] text-white sm:text-[32px]">
              {lead.title}
            </span>
            <span className="mt-5 flex items-baseline gap-2.5">
              <span className="font-display text-[27px] leading-none text-white">
                {formatINR(lead.price)}
              </span>
              {lead.mrp > lead.price && (
                <span className="text-[13px] text-white/50 line-through">
                  {formatINR(lead.mrp)}
                </span>
              )}
            </span>
            <span className="mt-6 inline-flex items-center gap-2 border-b border-gold-400 pb-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-gold-300">
              Shop this deal <ArrowRight size={14} />
            </span>
          </span>
        </Link>

        <div className="tile-grid grid-cols-2 lg:grid-cols-3">
          {others.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  4 — Flat product grid
 *  No arrows, no rail. Everything visible, on one shared hairline grid.
 * ------------------------------------------------------------------ */

export function ProductGrid({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  products,
  columns = 5,
  priority = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  products: ProductCardModel[];
  columns?: 4 | 5;
  priority?: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <section className="container-page py-14 sm:py-20">
      <BandHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        href={href}
        linkLabel={linkLabel}
        className="mb-8"
      />

      <div
        className={cn(
          "tile-grid grid-cols-2 sm:grid-cols-3",
          columns === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
        )}
      >
        {products.slice(0, columns * 2).map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={priority && i < columns}
            sizes={
              columns === 5
                ? "(min-width:1024px) 20vw, (min-width:640px) 33vw, 50vw"
                : "(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            }
          />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  5 — Editorial band
 *  Full-bleed dark plane. One statement, one action.
 * ------------------------------------------------------------------ */

export function EditorialBand({ banner }: { banner?: Banner }) {
  if (!banner) return null;

  return (
    <section className="peacock-surface relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 lg:block">
        <Image
          src={banner.image.url}
          alt=""
          fill
          sizes="50vw"
          className="object-cover opacity-35"
        />
        <span className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/55 to-transparent" />
      </div>

      <div className="container-page relative py-20 sm:py-28">
        <div className="max-w-xl">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-300">
            {banner.eyebrow}
          </span>
          <h2 className="mt-5 font-display text-[32px] leading-[1.04] tracking-[-0.03em] text-white sm:text-[46px]">
            {banner.title}
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-[1.75] text-white/65">
            {banner.subtitle}
          </p>
          <Link
            href={banner.href}
            className="mt-9 inline-flex h-12 items-center gap-2 bg-gold-400 px-8 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-gold-300"
          >
            {banner.cta} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  6 — Trust row
 *  Typographic, not four icons in four boxes.
 * ------------------------------------------------------------------ */

export function TrustRow({ items }: { items: { title: string; body: string }[] }) {
  return (
    <section className="border-y border-hairline bg-surface">
      <div className="container-page grid divide-y divide-hairline sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.05}>
            <div className="px-0 py-8 lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <p className="font-display text-[16px] leading-snug tracking-[-0.015em] text-ink-950">
                {item.title}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{item.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
