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
  // Phones lay the head out the way a shopping app does: the title and its
  // link share one row, the description runs full width beneath. The text
  // column dissolves (`contents`) so its children can join that grid.
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-ink-950 pb-3 sm:flex sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pb-5",
        className,
      )}
    >
      <div className="contents max-w-2xl sm:block">
        <span className="eyebrow col-span-2">{eyebrow}</span>
        <h2 className="mt-1.5 font-display text-[20px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-3 sm:text-[36px]">
          {title}
        </h2>
        {description && (
          <p className="col-span-2 mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-ink-500 sm:mt-2.5 sm:text-[14px]">
            {description}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="tap group col-start-2 row-start-2 inline-flex h-10 shrink-0 items-center gap-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-950 hover:text-gold-700 sm:h-auto sm:gap-1.5 sm:text-[12px] sm:tracking-[0.12em]"
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
    <section className="container-page py-7 sm:py-20">
      <BandHeader
        eyebrow="The departments"
        title="Where would you like to start?"
        href="/products"
        linkLabel="All products"
        className="mb-4 sm:mb-8"
      />

      {/* Phones: every department as an equal tile in one edge-to-edge swipe
          row, the way a shopping app opens. From sm up the row becomes the
          hairline mosaic (these sm: utilities are `.tile-grid`, which cannot
          take a breakpoint) — six tracks on tablets so the two leads share a
          row and the rest fall in threes, four on desktop. */}
      <div className="rail -mx-3 gap-2 px-3 sm:mx-0 sm:grid sm:grid-cols-6 sm:gap-px sm:overflow-visible sm:border sm:border-hairline sm:bg-hairline sm:px-0 lg:grid-cols-4">
        {[first, second].filter(Boolean).map((category, i) => (
          <Link
            key={category.slug}
            href={`/c/${category.slug}`}
            className="tap group relative aspect-[4/5] w-[104px] overflow-hidden bg-ink-100 sm:col-span-3 sm:aspect-[16/10] sm:w-auto sm:bg-surface lg:col-span-2 lg:aspect-[4/3]"
          >
            <Image
              src={category.image.url}
              alt=""
              fill
              priority={i === 0}
              sizes="(min-width:640px) 50vw, 104px"
              className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5 sm:gap-4 sm:p-8">
              <span className="min-w-0">
                <span className="hidden text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-300 sm:block">
                  {category.subcategories.length} collections
                </span>
                <span className="block font-display text-[13px] leading-tight tracking-[-0.02em] text-white sm:mt-2 sm:text-[32px]">
                  {category.name}
                </span>
              </span>
              <span className="hidden h-10 w-10 shrink-0 items-center justify-center border border-white/40 text-white transition-colors duration-200 group-hover:border-white group-hover:bg-white group-hover:text-ink-950 sm:flex">
                <ArrowUpRight size={17} />
              </span>
            </span>
          </Link>
        ))}

        {rest.map((category) => (
          <Link
            key={category.slug}
            href={`/c/${category.slug}`}
            className="tap group relative aspect-[4/5] w-[104px] overflow-hidden bg-ink-100 sm:col-span-2 sm:aspect-[4/3] sm:w-auto sm:bg-surface lg:col-span-1"
          >
            <Image
              src={category.image.url}
              alt=""
              fill
              sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 104px"
              className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-2.5 sm:p-5">
              <span className="block font-display text-[13px] leading-tight tracking-[-0.01em] text-white sm:inline sm:text-[18px]">
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

        <div className="flex flex-col justify-center px-0 py-5 sm:py-12 lg:py-20 lg:pl-16">
          <span className="eyebrow">{eyebrow}</span>

          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400 sm:mt-6">
            {product.brand}
          </p>
          <h2 className="mt-1.5 max-w-lg font-display text-[22px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-3 sm:text-[46px]">
            {product.title}
          </h2>
          {product.subtitle && (
            <p className="mt-2.5 max-w-md text-[14px] leading-[1.65] text-ink-600 sm:mt-5 sm:text-[15px] sm:leading-[1.75]">
              {product.subtitle}
            </p>
          )}

          <div className="mt-4 flex items-baseline gap-3 border-t border-hairline pt-4 sm:mt-8 sm:pt-6">
            <span className="font-display text-[22px] leading-none tracking-[-0.03em] text-ink-950 sm:text-[34px]">
              {formatINR(product.price)}
            </span>
            {product.mrp > product.price && (
              <span className="text-[14px] text-ink-400 line-through sm:text-[15px]">
                {formatINR(product.mrp)}
              </span>
            )}
          </div>

          {/* Phones: the pair grows to fill the row (or each takes a full row
              when they no longer fit side by side). */}
          <div className="mt-4 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
            <Link
              href={`/p/${product.slug}`}
              className="tap inline-flex h-11 grow items-center justify-center gap-2 bg-ink-950 px-5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-brand-800 sm:h-12 sm:grow-0 sm:px-8 sm:text-[12px]"
            >
              View this product <ArrowRight size={15} />
            </Link>
            <Link
              href={`/c/${product.categorySlug}`}
              className="tap inline-flex h-11 grow items-center justify-center border border-ink-950 px-5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-ink-950 hover:text-white sm:h-12 sm:grow-0 sm:px-8 sm:text-[12px]"
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
    <section className="container-page py-7 sm:py-20">
      <BandHeader
        eyebrow="Reduced this week"
        title="Deals worth the scroll"
        description="Real reductions on stock we hold, not a permanent sale price dressed up as one."
        href="/offers"
        linkLabel="Every deal"
        className="mb-4 sm:mb-8"
      />

      <div className="grid gap-3 sm:gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)] lg:gap-8">
        {/* Lead deal — a full editorial panel, not a scaled-up card. */}
        <Link
          href={`/p/${lead.slug}`}
          className="tap group relative flex min-h-[260px] flex-col justify-end overflow-hidden bg-ink-950 p-4 sm:min-h-[420px] sm:p-9"
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
            <span className="mt-3 block text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/60 sm:mt-4">
              {lead.brand}
            </span>
            <span className="mt-2 block max-w-xs font-display text-[20px] leading-[1.1] tracking-[-0.025em] text-white sm:text-[32px]">
              {lead.title}
            </span>
            <span className="mt-3 flex items-baseline gap-2.5 sm:mt-5">
              <span className="font-display text-[22px] leading-none text-white sm:text-[27px]">
                {formatINR(lead.price)}
              </span>
              {lead.mrp > lead.price && (
                <span className="text-[12.5px] text-white/50 line-through sm:text-[13px]">
                  {formatINR(lead.mrp)}
                </span>
              )}
            </span>
            <span className="mt-4 inline-flex items-center gap-2 border-b border-gold-400 pb-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-gold-300 sm:mt-6">
              Shop this deal <ArrowRight size={14} />
            </span>
          </span>
        </Link>

        <div className="tile-grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3">
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
  const shown = products.slice(0, columns * 2);
  // Tablets run three across; a count that does not divide by three would
  // leave a half-empty last row of bare hairline, so those tiles sit out.
  const tabletCount = shown.length < 3 ? shown.length : shown.length - (shown.length % 3);

  return (
    <section className="container-page py-7 sm:py-20">
      <BandHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        href={href}
        linkLabel={linkLabel}
        className="mb-4 sm:mb-8"
      />

      <div
        className={cn(
          "tile-grid grid-cols-2 sm:grid-cols-3",
          columns === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
        )}
      >
        {shown.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            className={i >= tabletCount ? "sm:max-lg:hidden" : undefined}
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

      <div className="container-page relative py-10 sm:py-28">
        <div className="max-w-xl">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-300">
            {banner.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-[22px] leading-[1.04] tracking-[-0.03em] text-white sm:mt-5 sm:text-[46px]">
            {banner.title}
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-[1.65] text-white/65 sm:mt-5 sm:text-[15px] sm:leading-[1.75]">
            {banner.subtitle}
          </p>
          <Link
            href={banner.href}
            className="tap mt-5 inline-flex h-11 items-center gap-2 bg-gold-400 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-gold-300 sm:mt-9 sm:h-12 sm:px-8 sm:text-[12px]"
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
      {/* Two up from the smallest phone: four short promises stacked one per
          row made a tall band out of very little copy. */}
      <div className="container-page grid grid-cols-2 gap-x-4 divide-hairline sm:gap-x-8 lg:grid-cols-4 lg:gap-x-0 lg:divide-x">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.05}>
            <div className="px-0 py-4 sm:py-8 lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <p className="font-display text-[15px] leading-snug tracking-[-0.015em] text-ink-950 sm:text-[16px]">
                {item.title}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500 sm:mt-1.5 sm:text-[13px]">
                {item.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
