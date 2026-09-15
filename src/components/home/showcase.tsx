import Image from "@/components/ui/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { Banner, Category } from "@/lib/types";
import type { ProductCardModel } from "@/lib/card";
import { BRAND } from "@/components/brand/logo";
import { BUSINESS } from "@/config/business";
import { DepartmentGlyph } from "@/components/illustration/department-glyph";
import { PaperMark } from "@/components/illustration/paper-mark";
import { ProductCard } from "@/components/product/product-card";
import { paymentSentence, type PublicPayments } from "@/lib/payment-copy";
import { cn, discountPercent, formatINR } from "@/lib/utils";

/**
 * Homepage bands.
 *
 * The rule that governs all of them: a band earns its height by telling the
 * visitor something they did not already know. A photograph of a kitchen with
 * a department's name written across it fails that test — it costs a third of
 * a screen to repeat a word already in the menu — so there are no category
 * photographs here any more. Departments are a drawn mark and a list of what
 * is actually inside them, which is both smaller and more useful.
 *
 * Structure comes from alignment and from objects with real edges: a corner, a
 * hairline and a short shadow, so a tile reads as something laid on the page
 * that you could pick up. That replaces the older scheme here, which drew
 * everything flat in hairlines on paper — beautiful, and the reason the shop
 * read as a printed catalogue rather than a place to buy a kettle.
 *
 * Colour is spent to one rule: evergreen is structure and orientation, ember
 * is the thing to press. A band may carry one ember object and no more.
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
  //
  // The band used to be closed by a thick rule over a thin one — the old
  // book-typography trick for starting a section. It is a beautiful device and
  // it was the single strongest reason the shop read as a printed catalogue:
  // ruled bands stack down the page like chapters. A shelf in a shop is not a
  // chapter, so the rule is gone and the shelf is marked the way a shop marks
  // one — a short ember tick, the name, and a way through to the rest of it.
  return (
    <div className={className}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:flex sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="contents sm:block">
          <span className="eyebrow col-span-2">{eyebrow}</span>
          <h2 className="mt-1.5 font-display text-[22px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-3 sm:text-[32px]">
            {title}
          </h2>
          {description && (
            <p className="col-span-2 mt-1.5 max-w-[46ch] text-[13px] leading-[1.55] text-ink-500 sm:mt-2.5 sm:text-[14px]">
              {description}
            </p>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="tap group col-start-2 row-start-2 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-surface px-4 text-[12.5px] font-semibold text-brand-700 shadow-xs transition-colors duration-200 hover:border-brand-200 hover:bg-brand-50 sm:h-10 sm:px-5 sm:text-[13px]"
          >
            {linkLabel}
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  1 — Departments
 *
 *  Three shapes for three sizes of shop, because a mosaic built for eight
 *  departments looks broken holding one, and a spread built for one looks
 *  absurd repeated eight times.
 * ------------------------------------------------------------------ */

export function CategoryMosaic({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  if (categories.length === 1) return <CategorySpread category={categories[0]} />;
  if (categories.length <= 3) return <CategoryRow categories={categories} />;
  return <CategoryGrid categories={categories} />;
}

/** The whole shop, when the whole shop is one department. */
function CategorySpread({ category }: { category: Category }) {
  return (
    <section className="container-page py-10 sm:py-20">
      <BandHeader
        eyebrow="The department"
        title="What we stock"
        href="/products"
        linkLabel="Every department"
        className="mb-6 sm:mb-10"
      />

      <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-8">
        {/* The mark, inside a register frame — the offset square a printer
            uses to check that two plates line up. It is the one piece of pure
            ornament on the page, and it is there because a lone glyph in a
            column of white space looks like a missing image. */}
        <div className="lg:col-span-5">
          <div className="relative mx-auto aspect-square w-[148px] lg:mx-0 lg:w-[240px]">
            <span
              aria-hidden
              className="absolute inset-[6%] translate-x-[10px] translate-y-[10px] border border-rule lg:translate-x-[14px] lg:translate-y-[14px]"
            />
            <DepartmentGlyph
              icon={category.icon}
              name={category.name}
              strokeWidth={1}
              className="relative h-full w-full text-ink-900"
            />
          </div>
        </div>

        <div className="min-w-0 lg:col-span-6 lg:col-start-7">
          <h3 className="font-display text-[26px] leading-[1.1] tracking-[-0.02em] text-ink-950 sm:text-[36px]">
            {category.name}
          </h3>
          <p className="mt-3 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:text-[15px] sm:leading-[1.6]">
            {category.description}
          </p>

          {category.subcategories.length > 0 && (
            <>
              <p className="mt-7 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                Browse by collection
              </p>
              {/* A ruled index, not a row of pills. This is the shortest route
                  from the homepage to the shelf somebody actually came for,
                  and an index is how a reader expects to be given one. */}
              <ul className="mt-2 border-b border-hairline">
                {category.subcategories.map((sub) => (
                  <li key={sub.slug}>
                    <Link
                      href={`/c/${category.slug}/${sub.slug}`}
                      className="tap group flex h-[52px] items-center justify-between gap-4 border-t border-hairline text-[13.5px] font-medium text-ink-900 transition-colors hover:text-brand-700"
                    >
                      {sub.name}
                      <ChevronRight
                        size={14}
                        className="shrink-0 text-ink-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-700"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <Link
            href={`/c/${category.slug}`}
            className="tap group mt-6 inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors hover:text-gold-700"
          >
            Everything in {category.name}
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Two or three departments, each given an equal share of one row. */
function CategoryRow({ categories }: { categories: Category[] }) {
  return (
    <section className="container-page py-10 sm:py-20">
      <BandHeader
        eyebrow="The departments"
        title="Where would you like to start?"
        href="/products"
        linkLabel="Every department"
        className="mb-6 sm:mb-10"
      />

      {/* Ruled rows on a phone, tiles from 640px. A tile leans on its hover
          state to say it is a link, and a phone has no hover — so there it is a
          row with a chevron, which says the same thing without one. */}
      <div className={cn("tile-grid grid-cols-1", categories.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/c/${category.slug}`}
            className="tap group flex items-center gap-4 px-4 py-4 transition-colors duration-200 sm:flex-col sm:justify-center sm:gap-4 sm:py-8 sm:text-center [@media(hover:hover)]:hover:bg-ink-50"
          >
            <DepartmentGlyph
              icon={category.icon}
              name={category.name}
              size={40}
              className="shrink-0 text-ink-900 transition-colors duration-200 group-hover:text-brand-700 sm:hidden"
            />
            <DepartmentGlyph
              icon={category.icon}
              name={category.name}
              size={72}
              className="hidden text-ink-900 transition-colors duration-200 group-hover:text-brand-700 sm:block"
            />
            <span className="min-w-0 flex-1 sm:flex-none">
              <span className="block font-display text-[20px] leading-tight tracking-[-0.02em] text-ink-950">
                {category.name}
              </span>
              {category.subcategories.length > 0 && (
                <span className="mt-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  {category.subcategories.length}{" "}
                  {category.subcategories.length === 1 ? "collection" : "collections"}
                </span>
              )}
            </span>
            <ChevronRight size={16} className="shrink-0 text-ink-400 sm:hidden" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Four or more: a plain index of the whole shop, at a glance. */
function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section className="container-page py-10 sm:py-20">
      <BandHeader
        eyebrow="The departments"
        title="Where would you like to start?"
        href="/products"
        linkLabel="Every department"
        className="mb-6 sm:mb-10"
      />

      {/* Two square tiles across on a phone rather than one long column: with
          four departments or more the grid is the point, and a square is big
          enough to read as a target without a hover state to help it. */}
      <div className="tile-grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/c/${category.slug}`}
            className="tap group flex aspect-square flex-col items-center justify-center gap-3 px-3 text-center transition-colors duration-200 [@media(hover:hover)]:hover:bg-ink-50"
          >
            <DepartmentGlyph
              icon={category.icon}
              name={category.name}
              size={56}
              className="text-ink-900 transition-colors duration-200 group-hover:text-brand-700 sm:hidden"
            />
            <DepartmentGlyph
              icon={category.icon}
              name={category.name}
              size={72}
              className="hidden text-ink-900 transition-colors duration-200 group-hover:text-brand-700 sm:block"
            />
            <span className="text-[13.5px] font-medium leading-[1.35] text-ink-900">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  2 — The Spread
 *  One product, given the space a magazine would give it, and a ledger
 *  answering the four questions asked before anybody pays.
 * ------------------------------------------------------------------ */

export function Spotlight({
  product,
  eyebrow = "Product of the moment",
  payments,
}: {
  product?: ProductCardModel;
  eyebrow?: string;
  /** The live payment switches. Omitted, the payment row simply is not shown. */
  payments?: PublicPayments;
}) {
  if (!product) return null;
  const off = discountPercent(product.mrp, product.price);
  const ops = BUSINESS.ops;

  // A row whose value we do not actually know is not rendered. An empty or
  // guessed line in a table of promises is worse than a shorter table.
  const codApplies =
    payments?.cod && product.codAvailable && product.price <= (payments?.codLimit ?? 0);
  const paymentLine = payments
    ? [paymentSentence({ ...payments, cod: Boolean(codApplies) })].filter(Boolean)[0]
    : null;

  const ledger: { label: string; value: string }[] = [
    {
      label: "Delivery",
      value: `${product.deliveryDays}–${ops.deliveryDaysMax} working days`,
    },
    {
      label: "Returns",
      value: `${ops.returnWindowDays} days from delivery`,
    },
    ...(paymentLine ? [{ label: "Payment", value: paymentLine }] : []),
    {
      label: "Shipping",
      value:
        product.freeShipping || product.price >= ops.freeShippingThreshold
          ? `Free over ${formatINR(ops.freeShippingThreshold)}`
          : formatINR(ops.shippingFee),
    },
  ];

  return (
    <section className="container-page py-10 sm:py-20">
      <div className="grid items-start gap-7 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-hairline bg-ink-100 shadow-sm">
            <Image
              src={product.image}
              alt={product.imageAlt || product.title}
              fill
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover"
            />
            {off > 0 && (
              <span className="absolute left-0 top-0 bg-ink-950 px-3 py-1.5 text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-white">
                {off}% off
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 lg:col-span-5 lg:col-start-8">
          <span className="eyebrow">{eyebrow}</span>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            {product.brand}
          </p>
          <h2 className="mt-1.5 font-display text-[26px] leading-[1.1] tracking-[-0.02em] text-ink-950 sm:text-[36px]">
            {product.title}
          </h2>
          {product.subtitle && (
            <p className="mt-3 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:text-[15px] sm:leading-[1.6]">
              {product.subtitle}
            </p>
          )}

          {/* The reduction is the black stamp in the corner of the photograph
              and nowhere else. Printed again beside the price it stops being a
              mark and starts being a shop shouting. */}
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-[20px] font-semibold leading-none tabular-nums text-ink-900 sm:text-[24px]">
              {formatINR(product.price)}
            </span>
            {product.mrp > product.price && (
              <span className="text-[13.5px] tabular-nums text-ink-400 line-through sm:text-[15px]">
                {formatINR(product.mrp)}
              </span>
            )}
          </div>

          {/* The ledger. Four short rows that between them answer when it
              arrives, what happens if it is wrong, how it can be paid for and
              what the postage costs — which is every question a first-time
              customer of an unknown shop actually has. */}
          <dl className="mt-6 border-b border-hairline">
            {ledger.map((row) => (
              <div
                key={row.label}
                className="flex h-11 items-center justify-between gap-4 border-t border-hairline"
              >
                <dt className="shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  {row.label}
                </dt>
                <dd className="truncate text-right text-[13.5px] font-medium text-ink-900">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
            <Link
              href={`/p/${product.slug}`}
              className="tap inline-flex h-12 items-center justify-center gap-2 bg-ink-950 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-brand-800 sm:px-8 sm:text-[12px]"
            >
              See the full detail <ArrowRight size={15} />
            </Link>
            <Link
              href={`/c/${product.categorySlug}`}
              className="tap inline-flex h-12 items-center justify-center border border-ink-950 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-ink-950 hover:text-white sm:px-8 sm:text-[12px]"
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
 *  3 — The Shelf
 *  No arrows, no rail. Everything visible, on one shared hairline grid.
 * ------------------------------------------------------------------ */

/** Written out because Tailwind only sees class names it can read literally. */
const SM_COLS = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" } as const;
const LG_COLS = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
} as const;

export function ProductGrid({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  products,
  columns = 5,
  priority = false,
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  products: ProductCardModel[];
  columns?: 4 | 5;
  priority?: boolean;
  /** `sale` is the only place a reduction is announced on the homepage. */
  tone?: "default" | "sale";
}) {
  if (products.length === 0) return null;
  const shown = products.slice(0, columns * 2);

  // The grid narrows to what there is. A five-track row holding two cards
  // leaves three cells of bare hairline, which reads as a shop that has run
  // out rather than one that is small on purpose; with two products the row
  // runs two across and the cards are simply larger.
  const lgCols = Math.min(columns, Math.max(2, shown.length)) as 2 | 3 | 4 | 5;
  const smCols = Math.min(3, Math.max(2, shown.length)) as 2 | 3;

  // Tablets run three across; a count that does not divide by three would
  // leave a half-empty last row of bare hairline, so those tiles sit out. The
  // same is true of the desktop row, which used to be left ragged.
  const tabletCount =
    shown.length < smCols ? shown.length : shown.length - (shown.length % smCols);
  const desktopCount =
    shown.length < lgCols ? shown.length : shown.length - (shown.length % lgCols);

  const maxOff =
    tone === "sale"
      ? shown.reduce((best, p) => Math.max(best, discountPercent(p.mrp, p.price)), 0)
      : 0;

  return (
    <section className="container-page py-10 sm:py-20">
      <BandHeader
        eyebrow={eyebrow}
        title={title}
        description={
          tone === "sale" && maxOff > 0
            ? `Up to ${maxOff}% off. ${description ?? ""}`.trim()
            : description
        }
        href={href}
        linkLabel={linkLabel}
        className="mb-6 sm:mb-10"
      />

      <div className={cn("grid grid-cols-2 gap-2.5 sm:gap-4", SM_COLS[smCols], LG_COLS[lgCols])}>
        {shown.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            className={cn(i >= tabletCount && "sm:max-lg:hidden", i >= desktopCount && "lg:hidden")}
            priority={priority && i < lgCols}
            sizes={`(min-width:1024px) ${Math.round(100 / lgCols)}vw, (min-width:640px) ${Math.round(100 / smCols)}vw, 50vw`}
          />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  4 — The Statement
 *  The page's one dark plane, placed last so it lands as a full stop
 *  rather than competing with the masthead for the same attention.
 * ------------------------------------------------------------------ */

export function EditorialBand({ banner }: { banner?: Banner }) {
  return (
    <section className="deep-plane relative overflow-hidden">
      {banner && (
        <div className="absolute inset-y-0 right-0 hidden w-1/2 lg:block">
          <Image src={banner.image.url} alt="" fill sizes="50vw" className="object-cover opacity-30" />
          <span className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/60 to-transparent" />
        </div>
      )}

      <div className="container-page relative py-12 sm:py-24">
        <div className="flex items-center justify-between gap-10">
          <div className="max-w-xl">
            <span className="eyebrow eyebrow-dark">{banner?.eyebrow ?? BRAND.name}</span>
            <h2 className="mt-4 font-display text-[24px] leading-[1.1] tracking-[-0.02em] text-white sm:mt-5 sm:text-[40px]">
              {banner?.title ?? BRAND.description}
            </h2>
            {banner?.subtitle && (
              <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.6] text-white/70 sm:text-[15px]">
                {banner.subtitle}
              </p>
            )}
            <Link
              href={banner?.href ?? "/products"}
              className="tap mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-gold-400 px-6 text-[14px] font-bold text-ink-950 shadow-sm transition-colors duration-200 hover:bg-gold-300 sm:mt-9 sm:px-8"
            >
              {banner?.cta ?? "Browse the catalogue"} <ArrowRight size={15} />
            </Link>
          </div>

          {/* Only when there is no photograph to hold the other half. */}
          {!banner && (
            <PaperMark size={220} className="hidden shrink-0 text-white/25 lg:block" />
          )}
        </div>
      </div>
    </section>
  );
}
