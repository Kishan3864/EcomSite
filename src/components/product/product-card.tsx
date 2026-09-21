"use client";

import { useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { Check, Eye, Heart, ShoppingBag, Truck } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { BUSINESS } from "@/config/business";
import { cn, discountPercent, formatCompact, formatINR } from "@/lib/utils";
import { RatingChip } from "@/components/ui/primitives";
import { fromCard, useCommerce } from "@/store/commerce";
import { QuickView } from "./quick-view";
import { ProductBadges } from "./badges";

/**
 * The product card — one design on the home page, listings, search, the
 * wishlist rail and recently viewed.
 *
 *   grid / rail   photo on a soft square stage, badges top-left, wishlist
 *                 top-right, quick view on hover; below, brand, name, rating,
 *                 price and a round gold add-to-bag button.
 *   list          the same facts laid out in a row, for the listing's list
 *                 view, with a full-width button.
 *   compact       a smaller grid card for dense rails.
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
  layout?: "grid" | "rail" | "compact" | "list";
  className?: string;
  sizes?: string;
}) {
  const [quickView, setQuickView] = useState(false);
  const [added, setAdded] = useState(false);
  const { addToCart, toggleWishlist, isWishlisted } = useCommerce();

  const off = discountPercent(product.mrp, product.price);
  const wished = isWishlisted(product.id);
  const outOfStock = product.stock <= 0;
  const hasScore = product.reviewCount > 0 && product.rating > 0;
  const href = `/p/${product.slug}`;
  const list = layout === "list";

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addToCart(fromCard(product));
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  function handleWish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(fromCard(product));
  }

  const wishButton = (
    <button
      type="button"
      aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={wished}
      onClick={handleWish}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
        wished
          ? "bg-sale-50 text-sale-600 ring-1 ring-inset ring-sale-200"
          : "glass text-ink-600 ring-1 ring-inset ring-ink-950/5 hover:text-sale-600",
      )}
    >
      <Heart size={16} className={cn("transition-transform duration-200", wished && "scale-110 fill-current")} />
    </button>
  );

  const priceBlock = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className={cn("t-price leading-none", list ? "text-[18px]" : "text-[15px] sm:text-[16px]")}>
          {formatINR(product.price)}
        </span>
        {product.mrp > product.price && (
          <span className="text-[11.5px] leading-none text-ink-400 line-through tabular-nums">
            {formatINR(product.mrp)}
          </span>
        )}
      </div>
      {off > 0 && (
        <span className="mt-1 block text-[11px] font-semibold leading-none text-sale-600 tabular-nums">
          Save {off}%
        </span>
      )}
    </div>
  );

  const meta = (
    <div className="flex min-h-[18px] flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-500">
      {hasScore ? (
        <>
          <RatingChip value={product.rating} count={product.reviewCount} />
          {product.soldCount > 0 && <span>{formatCompact(product.soldCount)} sold</span>}
        </>
      ) : outOfStock ? (
        <span>Back in stock soon</span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <Truck size={14} className="text-ink-400" aria-hidden />
          {product.freeShipping ? "Free delivery" : `Ships in ${BUSINESS.ops.dispatchDays} days`}
        </span>
      )}
    </div>
  );

  return (
    <>
      <article
        className={cn(
          "card card-interactive group relative overflow-hidden",
          list ? "flex gap-3 p-2.5 sm:gap-5 sm:p-3" : "flex flex-col",
          layout === "rail" && "w-[164px] sm:w-[224px]",
          layout === "compact" && "w-[148px] sm:w-[188px]",
          className,
        )}
      >
        {/* ---------------------------- Stage ---------------------------- */}
        {/* The title link stretches over the whole card, so the stage is a
            plain box and only its buttons sit above that link. */}
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-gradient-to-b from-ink-50 to-ink-100/70",
            list ? "aspect-square w-[118px] self-start rounded-lg sm:w-[188px]" : "aspect-square",
          )}
        >
          <Image
            src={product.image}
            alt={product.imageAlt || product.title}
            fill
            priority={priority}
            sizes={list ? "188px" : sizes}
            className={cn(
              "object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]",
              outOfStock && "opacity-50 grayscale",
            )}
          />
          {product.hoverImage && product.hoverImage !== product.image && !outOfStock && (
            <Image
              src={product.hoverImage}
              alt=""
              fill
              sizes={list ? "188px" : sizes}
              className="object-cover opacity-0 transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-100"
            />
          )}

          {!list && (
            <>
              <ProductBadges
                product={product}
                max={2}
                className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex-col !items-start"
              />
              <div className="absolute right-2 top-2 z-10">{wishButton}</div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setQuickView(true);
                }}
                aria-label={`Quick view: ${product.title}`}
                className="glass absolute inset-x-2.5 bottom-2.5 z-10 hidden h-9 translate-y-2 items-center justify-center gap-1.5 rounded-full text-[12px] font-semibold text-ink-900 opacity-0 ring-1 ring-inset ring-ink-950/5 transition-all duration-200 hover:text-brand-700 focus-visible:translate-y-0 focus-visible:opacity-100 [@media(hover:hover)]:flex [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100"
              >
                <Eye size={14} /> Quick view
              </button>
            </>
          )}
        </div>

        {/* ---------------------------- Details -------------------------- */}
        <div className={cn("flex min-w-0 flex-1 flex-col", list ? "py-1 sm:py-2" : "px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5")}>
          {list && <ProductBadges product={product} max={3} className="mb-2" />}
          {product.brand && (
            <p className="mb-0.5 truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              {product.brand}
            </p>
          )}
          <h3 className={cn("font-medium leading-[1.35] text-ink-900", list ? "text-[14px] sm:text-[15px]" : "text-[13px]")}>
            <Link
              href={href}
              className="line-clamp-2 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-brand-700 focus-visible:outline-none"
            >
              {product.title}
            </Link>
          </h3>
          {list && product.subtitle && (
            <p className="t-small mt-1 line-clamp-2 hidden sm:block">{product.subtitle}</p>
          )}
          <div className="mt-1.5">{meta}</div>

          {list ? (
            <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
              {priceBlock}
              <div className="relative z-10 flex items-center gap-2">
                {wishButton}
                <AddButton added={added} outOfStock={outOfStock} onClick={handleAdd} wide />
              </div>
            </div>
          ) : (
            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
              {priceBlock}
              <div className="relative z-10">
                <AddButton added={added} outOfStock={outOfStock} onClick={handleAdd} />
              </div>
            </div>
          )}
        </div>
      </article>

      {quickView && <QuickView product={product} open={quickView} onClose={() => setQuickView(false)} />}
    </>
  );
}

function AddButton({
  added,
  outOfStock,
  onClick,
  wide = false,
}: {
  added: boolean;
  outOfStock: boolean;
  onClick: (e: React.MouseEvent) => void;
  wide?: boolean;
}) {
  const label = outOfStock ? "Sold out" : added ? "Added to bag" : "Add to bag";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={outOfStock}
      aria-label={wide ? undefined : label}
      title={wide ? undefined : label}
      className={cn(
        "flex shrink-0 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-200 active:scale-95",
        wide ? "h-9 px-4" : "h-9 w-9 sm:h-10 sm:w-10",
        outOfStock
          ? "cursor-not-allowed bg-ink-100 text-ink-400"
          : added
            ? "bg-brand-700 text-white"
            : "bg-gold-400 text-ink-950 hover:bg-gold-300 hover:shadow-[0_8px_18px_-8px_rgb(169_130_15/0.7)]",
      )}
    >
      {added ? <Check size={16} /> : <ShoppingBag size={16} />}
      {wide && <span>{label}</span>}
    </button>
  );
}
