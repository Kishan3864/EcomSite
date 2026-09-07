"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { Eye, Heart, ShoppingBag, Truck, Check } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { cn, discountPercent, formatCompact } from "@/lib/utils";
import { Price, ProductBadgePill, RatingChip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { fromCard, useCommerce } from "@/store/commerce";
import { QuickView } from "./quick-view";

export function ProductCard({
  product,
  priority = false,
  layout = "grid",
  className,
  sizes = "(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 45vw",
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
          "group relative flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface",
          "transition-[box-shadow,border-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "hover:-translate-y-1 hover:border-ink-200 hover:shadow-lg",
          layout === "rail" && "w-[172px] sm:w-[212px]",
          className,
        )}
      >
        <Link
          href={`/p/${product.slug}`}
          className="relative block aspect-[4/5] overflow-hidden bg-ink-100"
          aria-label={product.title}
        >
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            sizes={sizes}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className={cn(
              "object-cover transition-[transform,opacity] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              !reduce && "group-hover:scale-[1.06] group-hover:opacity-0",
            )}
          />
          {!reduce && (
            <Image
              src={product.hoverImage}
              alt=""
              fill
              sizes={sizes}
              aria-hidden
              className="scale-[1.06] object-cover opacity-0 transition-[transform,opacity] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100 group-hover:opacity-100"
            />
          )}

          {/* Badges */}
          <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {product.badges.slice(0, 1).map((b) => (
              <ProductBadgePill key={b} badge={b} />
            ))}
            {off >= 25 && (
              <span className="rounded-full bg-sale-500 px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.06em] text-white">
                {off}% off
              </span>
            )}
          </div>

          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-canvas/75 backdrop-blur-[1px]">
              <span className="rounded-full bg-ink-950 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                Out of stock
              </span>
            </div>
          )}

          {/* Hover actions — always reachable on touch via the visible buttons below */}
          <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(fromCard(product));
              }}
              aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
              aria-pressed={wished}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur transition-all duration-200",
                wished
                  ? "bg-sale-500 text-white"
                  : "bg-surface/90 text-ink-600 hover:bg-surface hover:text-sale-500",
              )}
            >
              <motion.span
                key={String(wished)}
                initial={reduce ? false : { scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 16 }}
              >
                <Heart size={14} fill={wished ? "currentColor" : "none"} strokeWidth={2} />
              </motion.span>
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setQuickView(true);
              }}
              aria-label={`Quick view ${product.title}`}
              className="hidden h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-ink-600 opacity-0 shadow-sm backdrop-blur transition-all duration-200 hover:bg-surface hover:text-brand-700 group-hover:opacity-100 sm:flex"
            >
              <Eye size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Colour swatches */}
          {product.colors.length > 1 && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1">
              {product.colors.map((c) => (
                <span
                  key={c.name}
                  title={c.name}
                  className="h-3 w-3 rounded-full border border-white/70 shadow-sm"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          )}
        </Link>

        <div className="flex flex-1 flex-col p-3 sm:p-3.5">
          <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
            {product.brand}
          </p>
          <h3 className="mb-1.5 text-[13.5px] font-medium leading-snug tracking-[-0.005em] text-ink-900 sm:text-sm">
            <Link href={`/p/${product.slug}`} className="line-clamp-2 hover:text-brand-700">
              {product.title}
            </Link>
          </h3>

          <RatingChip value={product.rating} count={product.reviewCount} className="mb-2.5" />

          <Price price={product.price} mrp={product.mrp} size="md" className="mb-2" />

          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
            {product.deliveryDays <= 2 && (
              <span className="inline-flex items-center gap-1 font-medium text-brand-700">
                <Truck size={12} /> {product.deliveryDays === 1 ? "Next day" : "2-day"} delivery
              </span>
            )}
            {lowStock && (
              <span className="font-medium text-sale-600">Only {product.stock} left</span>
            )}
            {!lowStock && product.soldCount > 2000 && (
              <span>{formatCompact(product.soldCount)}+ sold</span>
            )}
          </div>

          <div className="mt-auto flex gap-1.5">
            <Button
              size="sm"
              variant={added ? "primary" : "outline"}
              className="flex-1"
              onClick={handleAdd}
              disabled={outOfStock}
            >
              <AnimatePresence mode="wait" initial={false}>
                {added ? (
                  <motion.span
                    key="added"
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -6 }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Check size={14} strokeWidth={2.5} /> Added
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -6 }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <ShoppingBag size={14} /> {outOfStock ? "Notify me" : "Add"}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2.5 sm:hidden"
              onClick={(e) => {
                e.preventDefault();
                setQuickView(true);
              }}
              aria-label={`Quick view ${product.title}`}
            >
              <Eye size={15} />
            </Button>
          </div>
        </div>
      </article>

      <QuickView product={product} open={quickView} onClose={() => setQuickView(false)} />
    </>
  );
}
