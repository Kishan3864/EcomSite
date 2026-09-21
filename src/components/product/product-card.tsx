"use client";

import { useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { Check, Eye, Heart, ShoppingBag } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { BUSINESS } from "@/config/business";
import { cn, discountPercent, formatCompact, formatINR } from "@/lib/utils";
import { RatingChip } from "@/components/ui/primitives";
import { fromCard, useCommerce } from "@/store/commerce";
import { QuickView } from "./quick-view";
import { ProductBadges } from "./badges";

/**
 * Product card — the same card on the home page, listings, search and the
 * recently-viewed rail.
 *
 * A bordered storefront card (.card) that lifts on hover, with the photograph
 * set as an inset rounded tile on a soft ground so every product — cut-out or
 * lifestyle shot — sits in the same frame. Below it: brand, name, then the
 * price as the loudest line, the discount as a small pill beside it.
 *
 * The action is gold, and it is the only gold on the tile. Ocean carries
 * structure across the site and gold carries what you press; in a grid that
 * distinction is what lets somebody buy without reading, because the button is
 * the one thing that is not the same colour as everything around it.
 */
export function ProductCard({
  product,
  priority = false,
  layout = "grid",
  className,
  sizes = "(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw",
}: {
  product: ProductCardModel;
  priority?: boolean;
  layout?: "grid" | "rail" | "compact";
  className?: string;
  sizes?: string;
}) {
  const [quickView, setQuickView] = useState(false);
  const [added, setAdded] = useState(false);
  const { addToCart, toggleWishlist, isWishlisted } = useCommerce();
  const reduce = usePrefersReducedMotion();

  const off = discountPercent(product.mrp, product.price);
  const wished = isWishlisted(product.id);
  const outOfStock = product.stock <= 0;
  const hasScore = product.reviewCount > 0 && product.rating > 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addToCart(fromCard(product));
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <>
      <article
        className={cn(
          "card card-interactive group relative flex flex-col overflow-hidden",
          // About 2.4 cards across a 390px phone, so the rail reads as scrollable.
          layout === "rail" && "w-[152px] sm:w-[236px]",
          className,
        )}
      >
        <Link
          href={`/p/${product.slug}`}
          className="tap relative m-1.5 block aspect-[4/5] overflow-hidden rounded-lg bg-ink-50 sm:m-2"
        >
          <Image
            src={product.image}
            alt={product.imageAlt || product.title}
            fill
            priority={priority}
            sizes={sizes}
            className={cn(
              "object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              "group-hover:scale-[1.03]",
              outOfStock && "opacity-45 grayscale",
            )}
          />
          {product.hoverImage && !outOfStock && (
            <Image
              src={product.hoverImage}
              alt=""
              fill
              sizes={sizes}
              aria-hidden
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}

          {outOfStock && <div className="absolute inset-0 bg-canvas/60" />}

          {/* The shared badge set — icon, colour and word — stacked in the
              corner so three of them never reach the wishlist button on a
              152px rail card. The same component draws the product page's. */}
          <ProductBadges
            product={product}
            max={3}
            className="absolute left-2 top-2 flex-col !items-start sm:left-2.5 sm:top-2.5"
          />

          {/* Round utilities that appear on intent where a pointer can hover;
              a touch screen has no hover, so there they stay put. */}
          <div className="absolute right-2 top-2 flex flex-col gap-1.5 sm:right-2.5 sm:top-2.5">
            <button
              type="button"
              aria-label={wished ? "Remove from wishlist" : "Save for later"}
              aria-pressed={wished}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(fromCard(product));
              }}
              className={cn(
                // Phones: a 40px target around a 32px square kept flush in the
                // corner; the padding sits on the inner sides, outside the paint.
                "is-circle flex h-8 w-8 items-center justify-center shadow-sm ring-1 ring-ink-950/5 transition-all duration-200",
                wished
                  ? "bg-sale-600 text-white"
                  : "bg-surface/95 text-ink-600 backdrop-blur-sm hover:bg-ink-950 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0",
              )}
            >
              <Heart size={15} className={wished ? "fill-current" : undefined} />
            </button>
            <button
              type="button"
              aria-label="Quick view"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setQuickView(true);
              }}
              className="is-circle hidden h-8 w-8 items-center justify-center bg-surface/95 text-ink-600 shadow-sm ring-1 ring-ink-950/5 backdrop-blur-sm transition-all duration-200 hover:bg-ink-950 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 sm:flex [@media(hover:hover)]:opacity-0"
            >
              <Eye size={15} />
            </button>
          </div>

          {product.colors && product.colors.length > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 sm:bottom-2.5 sm:left-2.5">
              {product.colors.slice(0, 4).map(({ name, hex }) => (
                <span
                  key={name}
                  style={{ background: hex }}
                  className="is-circle h-2.5 w-2.5 ring-1 ring-white/80"
                />
              ))}
            </div>
          )}
        </Link>

        <div className="flex flex-1 flex-col px-2.5 pb-3 pt-1.5 sm:px-3.5 sm:pb-3.5 sm:pt-2">
          {/* Ink, not gold. The accent is worth something only while it is
              rare, and a grid of twenty tiles was spending it twenty times on
              the least important line in the card. */}
          {product.brand && <p className="mb-1 truncate text-[10.5px] font-semibold uppercase tracking-[0.13em] text-ink-400">{product.brand}</p>}

          <h3 className="text-[12.5px] font-medium leading-[1.35] tracking-[-0.005em] text-ink-900 sm:text-[13.5px] sm:leading-[1.4]">
            <Link href={`/p/${product.slug}`} className="line-clamp-2 hover:text-brand-700">
              {product.title}
            </Link>
          </h3>

          {/* Prices are set in the text face, not the display face: Fraunces'
              figures are proportional, so a column of prices down a grid
              wandered left and right by a couple of pixels a row. */}
          {/* The price is the loudest line on the card. It used to sit at
              13.5px — a hair above the brand line and below the product name —
              which is the wrong order of importance for somebody scanning a
              grid to decide what to open. */}
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[16px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink-950 sm:text-[17px]">
              {formatINR(product.price)}
            </span>
            {product.mrp > product.price && (
              <>
                <span className="text-[12px] leading-none tabular-nums text-ink-400 line-through">
                  {formatINR(product.mrp)}
                </span>
                <span className="rounded-full bg-sale-50 px-1.5 py-[3px] text-[11px] font-semibold leading-none text-sale-700">
                  {off}% off
                </span>
              </>
            )}
          </div>

          {/* One line of fact, and it is never a fiction.
              `RatingChip` renders nothing until somebody has actually reviewed
              the product, so a new shop showed a row of "0.0 ★ · 0 reviews"
              chips — the worst thing on the page. When there is no score the
              line carries something true instead, at the same height so the
              rows of a grid stay aligned. */}
          <div className="mt-1.5 flex min-h-[18px] flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-500 sm:mt-2.5 sm:min-h-[20px] sm:gap-x-2.5 sm:text-[12px] lg:flex-nowrap">
            {hasScore ? (
              <>
                <RatingChip
                  value={product.rating}
                  count={product.reviewCount}
                  className="text-[11px]/[14px] sm:text-xs"
                />
                {product.soldCount > 0 && (
                  <span className="text-ink-400">{formatCompact(product.soldCount)} sold</span>
                )}
              </>
            ) : outOfStock ? (
              <span>Back in stock soon</span>
            ) : (
              <span>Dispatched in {BUSINESS.ops.dispatchDays} working days</span>
            )}
          </div>

          {/* One action, full width. */}
          <div className="mt-auto pt-2.5 sm:pt-3.5">
            <button
              type="button"
              onClick={handleAdd}
              disabled={outOfStock}
              className={cn(
                "tap relative flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[12px] font-semibold tracking-[0.01em] transition-colors duration-200",
                outOfStock
                  ? "cursor-not-allowed bg-ink-100 text-ink-400"
                  : added
                    // Confirmation flips to ocean on purpose: the button
                    // stops being an invitation the moment it has been taken,
                    // and a still-gold "Added" invites a second press.
                    ? "bg-brand-700 text-white"
                    : "bg-gold-400 text-ink-950 hover:bg-gold-300",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {added ? (
                  <motion.span
                    key="added"
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="inline-flex items-center gap-1.5 sm:gap-2"
                  >
                    <Check size={14} /> Added
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="inline-flex items-center gap-1.5 sm:gap-2"
                  >
                    <ShoppingBag size={14} />
                    {outOfStock ? "Sold out" : "Add to bag"}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </article>

      {quickView && (
        <QuickView product={product} open={quickView} onClose={() => setQuickView(false)} />
      )}
    </>
  );
}
