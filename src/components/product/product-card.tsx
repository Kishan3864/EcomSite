"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { Check, Eye, Heart, ShoppingBag } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { cn, discountPercent, formatCompact, formatINR } from "@/lib/utils";
import { RatingChip } from "@/components/ui/primitives";
import { fromCard, useCommerce } from "@/store/commerce";
import { QuickView } from "./quick-view";

/**
 * Product card.
 *
 * Deliberately not a card: no box, no shadow, no lift. The tile sits flat on
 * the surface and lets the photograph do the selling, which is what stops a
 * page of these reading as a wall of identical widgets. Separation comes from
 * the 1px grid the parent draws (`.tile-grid`), not from each tile outlining
 * itself.
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
  const lowStock = product.stock > 0 && product.stock <= 12;
  const outOfStock = product.stock <= 0;

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
          "group relative flex flex-col bg-surface transition-colors duration-300",
          "hover:bg-ink-50/60",
          // About 2.4 cards across a 390px phone, so the rail reads as scrollable.
          layout === "rail" && "w-[152px] sm:w-[236px]",
          className,
        )}
      >
        <Link
          href={`/p/${product.slug}`}
          className="tap relative block aspect-[3/4] overflow-hidden bg-ink-100"
        >
          <Image
            src={product.image}
            alt={product.imageAlt || product.title}
            fill
            priority={priority}
            sizes={sizes}
            className={cn(
              "object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              "group-hover:scale-[1.04]",
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

          {/* Discount reads as a typographic mark in the corner, not a sticker. */}
          {off > 0 && !outOfStock && (
            <span className="absolute left-0 top-0 bg-ink-950 px-2 py-1 text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-white sm:px-2.5 sm:py-1.5">
              {off}% off
            </span>
          )}

          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-canvas/70">
              <span className="border border-ink-950 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-950">
                Sold out
              </span>
            </div>
          )}

          {/* Utilities stay square and appear only on intent where a pointer
              can hover; a touch screen has no hover, so there they stay put. */}
          <div className="absolute right-0 top-0 flex flex-col">
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
                "flex h-10 w-10 items-center justify-center bg-clip-content pb-2 pl-2 transition-colors duration-200 sm:h-9 sm:w-9 sm:p-0",
                wished
                  ? "bg-sale-600 text-white"
                  : "bg-surface/85 text-ink-600 hover:bg-ink-950 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0",
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
              className="hidden h-9 w-9 items-center justify-center bg-surface/85 text-ink-600 transition-colors duration-200 hover:bg-ink-950 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 sm:flex [@media(hover:hover)]:opacity-0"
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
                  className="is-circle h-2.5 w-2.5 rounded-full ring-1 ring-white/80"
                />
              ))}
            </div>
          )}
        </Link>

        <div className="flex flex-1 flex-col px-2.5 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-4">
          <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-700 sm:mb-1.5">
            {product.brand}
          </p>

          <h3 className="text-[12.5px] font-medium leading-[1.35] tracking-[-0.005em] text-ink-900 sm:text-[13.5px] sm:leading-[1.4]">
            <Link href={`/p/${product.slug}`} className="line-clamp-2 hover:text-brand-700">
              {product.title}
            </Link>
          </h3>

          {/* Price in the display face — the one place the card raises its voice. */}
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:mt-2.5 sm:gap-x-2">
            <span className="font-display text-[16px] leading-none tracking-[-0.02em] text-ink-950 sm:text-[19px]">
              {formatINR(product.price)}
            </span>
            {product.mrp > product.price && (
              <span className="text-[11.5px] leading-none text-ink-400 line-through sm:text-[12px]">
                {formatINR(product.mrp)}
              </span>
            )}
          </div>

          {/* Wraps on a narrow tile rather than pushing past its edge. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 sm:mt-2.5 sm:gap-x-2.5 lg:flex-nowrap">
            <RatingChip
              value={product.rating}
              count={product.reviewCount}
              className="text-[11px]/[14px] sm:text-xs"
            />
            {product.soldCount ? (
              <span className="text-[11px] text-ink-400">
                {formatCompact(product.soldCount)} sold
              </span>
            ) : null}
          </div>

          {lowStock && (
            <p className="mt-1.5 text-[11px] font-medium text-sale-600 sm:mt-2">
              Only {product.stock} left
            </p>
          )}

          {/* One action, full width, square. It slides up on hover on desktop
              and is simply always there on touch. */}
          <div className="mt-auto pt-2.5 sm:pt-3.5">
            <button
              type="button"
              onClick={handleAdd}
              disabled={outOfStock}
              className={cn(
                "tap relative flex h-10 w-full items-center justify-center gap-2 border text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200 sm:text-[12px]",
                outOfStock
                  ? "cursor-not-allowed border-ink-200 text-ink-400"
                  : added
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-ink-950 text-ink-950 hover:bg-ink-950 hover:text-white",
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
