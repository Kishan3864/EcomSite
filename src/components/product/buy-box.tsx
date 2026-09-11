"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import {
  Check,
  Heart,
  Minus,
  Package,
  Plus,
  RotateCcw,
  ShieldCheck,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";
import type { Offer, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Price, RatingChip, Stars } from "@/components/ui/primitives";
import { fromCard, useCommerce, type AddableProduct } from "@/store/commerce";
import { DeliveryCheck } from "./delivery-check";
import { cn, discountPercent, formatCompact, formatINR } from "@/lib/utils";

export function BuyBox({
  product,
  brandName,
  offers,
}: {
  product: Product;
  brandName: string;
  offers: Offer[];
}) {
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      product.variants.map((g) => [
        g.id,
        g.options.find((o) => o.inStock)?.value ?? g.options[0].value,
      ]),
    ),
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart, buyNow, toggleWishlist, isWishlisted } = useCommerce();
  const reduce = usePrefersReducedMotion();

  const { price, label, variantKey, available } = useMemo(() => {
    let delta = 0;
    const parts: string[] = [];
    let inStock = true;

    for (const group of product.variants) {
      const option = group.options.find((o) => o.value === selection[group.id]);
      if (!option) continue;
      delta += option.priceDelta ?? 0;
      parts.push(option.label);
      if (!option.inStock) inStock = false;
    }

    return {
      price: product.price + delta,
      label: parts.join(" · "),
      variantKey: Object.values(selection).join("|") || undefined,
      available: inStock && product.stock > 0,
    };
  }, [product, selection]);

  const mrp = product.mrp + (price - product.price);
  const off = discountPercent(mrp, price);
  const wished = isWishlisted(product.id);

  const addable: AddableProduct = fromCard({
    id: product.id,
    slug: product.slug,
    title: product.title,
    brand: brandName,
    image: product.images[0].url,
    price,
    mrp,
    stock: product.stock,
    deliveryDays: product.deliveryDays,
    freeShipping: product.freeShipping,
    rating: product.rating,
    // Fields the card model carries but the buy box does not need.
    subtitle: product.subtitle,
    brandSlug: product.brandSlug,
    categorySlug: product.categorySlug,
    subcategorySlug: product.subcategorySlug,
    imageAlt: product.images[0].alt,
    hoverImage: product.images[1]?.url ?? product.images[0].url,
    reviewCount: product.reviewCount,
    soldCount: product.soldCount,
    badges: product.badges,
    colors: [],
  });

  const applicable = offers.filter(
    (o) => (!o.categorySlug || o.categorySlug === product.categorySlug) && price >= o.minSpend,
  );

  function handleAdd() {
    addToCart(addable, { quantity: qty, variantLabel: label, variantKey, priceOverride: price });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2 sm:mb-2">
          <Link
            href={`/products?brands=${product.brandSlug}`}
            className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-brand-700 hover:underline underline-offset-4 sm:text-[12px]"
          >
            {brandName}
          </Link>
          {product.badges.slice(0, 2).map((b) => (
            <span
              key={b}
              className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-600"
            >
              {b === "bestseller" ? "Bestseller" : b === "new" ? "New in" : b}
            </span>
          ))}
        </div>

        {/* App scale on a phone, so under the full-width photo the price still
            makes the first screen. The display face stays. */}
        <h1 className="font-display text-[17px] leading-[1.3] tracking-[-0.01em] text-ink-950 sm:text-[32px] sm:leading-[1.12] sm:tracking-[-0.025em]">
          {product.title}
        </h1>
        <p className="mt-1 text-[13.5px] leading-snug text-ink-600 sm:mt-2 sm:text-[14.5px] sm:leading-relaxed">
          {product.subtitle}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-3.5 sm:gap-x-4">
          <a href="#reviews" className="tap flex items-center gap-2 hover:opacity-80">
            <Stars value={product.rating} size={15} />
            <RatingChip value={product.rating} count={product.reviewCount} />
          </a>
          <span className="text-[12px] text-ink-500 sm:text-[12.5px]">
            {formatCompact(product.soldCount)}+ bought
          </span>
        </div>
      </div>

      {/* Price block. Price's `xl` already drops to app scale (22px) below sm. */}
      <div className="rounded-xl border border-hairline bg-surface p-3 sm:p-4">
        <Price price={price} mrp={mrp} size="xl" />
        <p className="mt-1 text-[11.5px] text-ink-500 sm:mt-1.5 sm:text-[12px]">
          Inclusive of all taxes
          {off > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-brand-700">
                You save {formatINR(mrp - price)}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Offers */}
      {applicable.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:mb-2.5 sm:text-[12px]">
            Available offers
          </h2>
          <ul className="space-y-2">
            {applicable.slice(0, 3).map((offer) => (
              <li key={offer.id} className="flex items-start gap-2.5 text-[12.5px] sm:text-[13px]">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: offer.accent }}
                >
                  <Wallet size={11} />
                </span>
                <span className="min-w-0 text-ink-700">
                  <strong className="font-semibold text-ink-950">{offer.title}</strong>{" "}
                  <span className="text-ink-500">— use code</span>{" "}
                  <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[11.5px] font-bold text-ink-900">
                    {offer.code}
                  </code>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Variants */}
      {product.variants.map((group) => (
        <section key={group.id}>
          <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:mb-2.5 sm:text-[12px]">
            {group.name}:{" "}
            <span className="font-normal normal-case tracking-normal text-ink-600">
              {group.options.find((o) => o.value === selection[group.id])?.label}
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const selected = selection[group.id] === option.value;
              if (group.type === "color") {
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelection((s) => ({ ...s, [group.id]: option.value }))}
                    disabled={!option.inStock}
                    aria-label={option.label}
                    aria-pressed={selected}
                    title={option.inStock ? option.label : `${option.label} — out of stock`}
                    className={cn(
                      "tap relative h-10 w-10 rounded-full border-2 transition-all duration-200 sm:h-9 sm:w-9",
                      selected
                        ? "border-brand-700 ring-2 ring-brand-700/20 ring-offset-2"
                        : "border-ink-200 hover:border-ink-400",
                      !option.inStock && "opacity-40",
                    )}
                    style={{ backgroundColor: option.swatch }}
                  >
                    {!option.inStock && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-[1.5px] w-8 rotate-45 bg-ink-500" />
                      </span>
                    )}
                  </button>
                );
              }
              return (
                <button
                  key={option.id}
                  onClick={() => setSelection((s) => ({ ...s, [group.id]: option.value }))}
                  disabled={!option.inStock}
                  aria-pressed={selected}
                  className={cn(
                    "tap min-h-10 min-w-[52px] rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-all duration-200 sm:min-h-0 sm:px-3.5 sm:text-[13px]",
                    selected
                      ? "border-brand-900 bg-brand-900 text-white"
                      : "border-ink-200 bg-surface text-ink-800 hover:border-ink-500",
                    !option.inStock &&
                      "cursor-not-allowed border-dashed text-ink-300 line-through hover:border-ink-200",
                  )}
                >
                  {option.label}
                  {option.priceDelta ? (
                    <span className={cn("ml-1.5 text-[11px]", selected ? "text-white/70" : "text-ink-400")}>
                      +{formatINR(option.priceDelta)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {/* Quantity and stock */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="inline-flex items-center rounded-lg border border-ink-200 bg-surface">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
            className="tap flex h-10 w-10 items-center justify-center rounded-l-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40 sm:h-11 sm:w-11"
          >
            <Minus size={15} />
          </button>
          <span className="w-10 text-center text-[14px] font-semibold tabular-nums sm:w-11 sm:text-[15px]">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            disabled={qty >= product.stock}
            aria-label="Increase quantity"
            className="tap flex h-10 w-10 items-center justify-center rounded-r-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40 sm:h-11 sm:w-11"
          >
            <Plus size={15} />
          </button>
        </div>

        <p className="text-[12.5px] sm:text-[13px]">
          {!available ? (
            <span className="font-semibold text-sale-600">Currently unavailable</span>
          ) : product.stock <= 12 ? (
            <span className="font-semibold text-sale-600">
              Hurry — only {product.stock} left in stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-brand-700">
              <Check size={14} strokeWidth={2.5} /> In stock, ready to ship
            </span>
          )}
        </p>
      </div>

      {/* CTAs. On a phone they share one row — two equal actions and the save
          — with tighter lettering so all three fit; the tick on "Added to bag"
          gives way below 360px rather than push the label past the edge. */}
      <div className="flex gap-2 sm:flex-wrap sm:gap-2.5">
        <Button
          size="lg"
          variant="outline"
          className="tap min-w-0 flex-1 px-2 text-[11px] tracking-[0.06em] sm:min-w-[160px] sm:px-8 sm:text-[12px] sm:tracking-[0.12em]"
          onClick={handleAdd}
          disabled={!available}
        >
          <AnimatePresence mode="wait" initial={false}>
            {added ? (
              <motion.span
                key="added"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                className="inline-flex items-center gap-1.5 sm:gap-2"
              >
                <Check size={17} strokeWidth={2.5} className="max-[360px]:hidden" /> Added to bag
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
              >
                Add to bag
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
        <Button
          size="lg"
          className="tap min-w-0 flex-1 gap-1.5 px-2 text-[11px] tracking-[0.06em] sm:min-w-[160px] sm:gap-2.5 sm:px-8 sm:text-[12px] sm:tracking-[0.12em]"
          onClick={() =>
            buyNow(addable, { quantity: qty, variantLabel: label, variantKey, priceOverride: price })
          }
          disabled={!available}
        >
          <Zap size={16} /> Buy now
        </Button>
        <Button
          size="icon"
          variant="outline"
          className={cn(
            "tap h-12 w-12 shrink-0 sm:h-13 sm:w-13",
            wished && "border-sale-500 text-sale-500",
          )}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          onClick={() => toggleWishlist(addable)}
        >
          <Heart size={19} fill={wished ? "currentColor" : "none"} />
        </Button>
      </div>

      <DeliveryCheck deliveryDays={product.deliveryDays} codAvailable={product.codAvailable} />

      {/* Trust row. Phones set the icon beside the words, which halves its
          height; from sm the icon stacks over them, centred, as before. */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-3.5 border-t border-hairline pt-4 sm:grid-cols-4 sm:gap-3 sm:pt-5">
        {[
          { icon: Truck, label: product.freeShipping ? "Free delivery" : "₹79 delivery", sub: `In ${product.deliveryDays} day${product.deliveryDays > 1 ? "s" : ""}` },
          { icon: RotateCcw, label: `${product.returnWindowDays}-day returns`, sub: "Free pickup" },
          { icon: ShieldCheck, label: "Warranty", sub: product.warranty.split(" ").slice(0, 3).join(" ") },
          { icon: Package, label: product.codAvailable ? "COD available" : "Prepaid only", sub: product.codAvailable ? "Pay on delivery" : "Secure payment" },
        ].map((item) => (
          <li
            key={item.label}
            className="flex items-start gap-2 sm:flex-col sm:items-center sm:gap-1.5 sm:text-center"
          >
            <item.icon size={18} className="shrink-0 text-brand-600" />
            <span className="flex min-w-0 flex-col gap-0.5 sm:items-center sm:gap-1.5">
              <span className="text-[12px] font-semibold leading-tight text-ink-900">
                {item.label}
              </span>
              <span className="text-[11px] leading-tight text-ink-500">{item.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
