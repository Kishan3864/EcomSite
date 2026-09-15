"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowRight, Check, Heart, Minus, Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { BUSINESS } from "@/config/business";
import { Button } from "@/components/ui/button";
import { Price, RatingChip, Stars } from "@/components/ui/primitives";
import { fromCard, useCommerce, type AddableProduct } from "@/store/commerce";
import { DeliveryCheck } from "./delivery-check";
import { paymentSentence, type PublicPayments } from "@/lib/payment-copy";
import { cn, discountPercent, formatCompact, formatINR } from "@/lib/utils";

export function BuyBox({
  product,
  brandName,
  payments,
}: {
  product: Product;
  brandName: string;
  /**
   * The live payment switches, read on the server. Optional only so that this
   * still renders if a future caller forgets to pass them — in which case the
   * payment row is left out rather than guessed at.
   */
  payments?: PublicPayments;
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
  // Stars and RatingChip render nothing until somebody has actually scored the
  // product, which is every product in the shop today. The line they sit on
  // carries a fact we can stand behind instead of an empty row.
  const hasScore = product.reviewCount > 0 && product.rating > 0;

  // Cash on delivery has to clear three gates: the shop offers it at all, this
  // product allows it, and this price is inside the limit. Any one of them
  // failing means it is not on the table for this basket.
  const codHere = Boolean(
    payments?.cod && product.codAvailable && price <= (payments?.codLimit ?? 0),
  );
  const paymentLine = payments
    ? paymentSentence({ ...payments, cod: codHere })
    : null;

  // The four questions asked before anybody pays, answered in one ledger
  // rather than in four little icon tiles. Every value comes from the
  // product or from the operations record — nothing here is decorative.
  const ledger: { label: string; value: string }[] = [
    {
      label: "Delivery",
      value: `${product.deliveryDays} working day${product.deliveryDays > 1 ? "s" : ""}`,
    },
    {
      label: "Shipping",
      value: product.freeShipping ? "Free" : formatINR(BUSINESS.ops.shippingFee),
    },
    {
      label: "Returns",
      value: `${product.returnWindowDays} days · free pickup`,
    },
    { label: "Warranty", value: product.warranty },
    // What this product can actually be paid with, according to the switches
    // in the admin panel rather than to a flag on the product row. The page
    // used to announce "Cash on Delivery available" on every product whose own
    // flag was set, including on days when the owner had COD switched off —
    // a promise the checkout would then refuse. With no live answer to hand
    // the row is simply not shown; a blank is better than a guess.
    ...(paymentLine ? [{ label: "Payment", value: paymentLine }] : []),
  ];

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
    codAvailable: product.codAvailable ?? true,
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

  function handleAdd() {
    addToCart(addable, { quantity: qty, variantLabel: label, variantKey, priceOverride: price });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href={`/products?brands=${product.brandSlug}`}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500 transition-colors hover:text-brand-700"
          >
            {brandName}
          </Link>
          {product.badges.slice(0, 2).map((b) => (
            <span
              key={b}
              className="rounded-md border border-hairline px-2 py-1 text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-ink-600"
            >
              {b === "bestseller" ? "Bestseller" : b === "new" ? "New in" : b}
            </span>
          ))}
        </div>

        {/* 20px is the floor for the display face anywhere on the site —
            below it Fraunces stops being a voice and becomes a small serif —
            so the phone gets 20px rather than the 17px it used to run. */}
        <h1 className="font-display text-[20px] leading-[1.2] tracking-[-0.015em] text-ink-950 sm:text-[32px] sm:leading-[1.12] sm:tracking-[-0.025em]">
          {product.title}
        </h1>
        <p className="mt-2 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:mt-2.5 sm:text-[15px] sm:leading-[1.6]">
          {product.subtitle}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-ink-500 sm:mt-3.5">
          {hasScore ? (
            <>
              <a href="#reviews" className="tap flex items-center gap-2 hover:opacity-80">
                <Stars value={product.rating} size={15} />
                <RatingChip value={product.rating} count={product.reviewCount} />
              </a>
              {product.soldCount > 0 && (
                <span className="tabular-nums">{formatCompact(product.soldCount)}+ bought</span>
              )}
            </>
          ) : (
            <span className="tabular-nums">
              Dispatched in {BUSINESS.ops.dispatchDays} working days
            </span>
          )}
        </div>
      </div>

      {/* Price. Ruled top and bottom rather than boxed — `xl` is 22px on a
          phone and 30px from 640px, in Jakarta with tabular figures. */}
      <div className="border-y border-hairline py-3.5 sm:py-4">
        <Price price={price} mrp={mrp} size="xl" />
        <p className="mt-1.5 text-[13px] text-ink-500">
          Inclusive of all taxes
          {off > 0 && (
            <>
              {" · "}
              <span className="font-semibold tabular-nums text-sale-700">
                You save {formatINR(mrp - price)}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Variants */}
      {product.variants.map((group) => (
        <section key={group.id}>
          <h2 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            {group.name}:{" "}
            <span className="font-medium normal-case tracking-normal text-ink-900">
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
                      // The colour sits inset inside its own frame, so the
                      // chosen one is marked by the frame going to ink rather
                      // than by a ring that would shift the row as it lands.
                      "tap relative flex h-10 w-10 items-center justify-center border p-[3px] transition-colors duration-200 sm:h-9 sm:w-9",
                      selected ? "border-ink-950" : "border-hairline hover:border-ink-400",
                      !option.inStock && "opacity-40",
                    )}
                  >
                    <span
                      className="h-full w-full"
                      style={{ backgroundColor: option.swatch }}
                    />
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
                    "tap min-h-10 min-w-[52px] border px-3 py-2 text-[13px] font-medium transition-colors duration-200 sm:min-h-0 sm:px-3.5",
                    selected
                      ? "border-ink-950 bg-ink-950 text-white"
                      : "border-hairline bg-surface text-ink-800 hover:border-ink-950",
                    !option.inStock &&
                      "cursor-not-allowed border-dashed text-ink-400 line-through hover:border-hairline",
                  )}
                >
                  {option.label}
                  {option.priceDelta ? (
                    <span
                      className={cn(
                        "ml-1.5 text-[11.5px] tabular-nums",
                        selected ? "text-white/70" : "text-ink-400",
                      )}
                    >
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
        <div className="inline-flex items-center overflow-hidden rounded-lg border border-hairline bg-surface">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
            className="tap flex h-10 w-10 items-center justify-center text-ink-600 transition-colors duration-200 hover:bg-ink-100 disabled:opacity-40 sm:h-11 sm:w-11"
          >
            <Minus size={15} />
          </button>
          <span className="w-10 text-center text-[14px] font-semibold tabular-nums text-ink-900 sm:w-11 sm:text-[15px]">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            disabled={qty >= product.stock}
            aria-label="Increase quantity"
            className="tap flex h-10 w-10 items-center justify-center text-ink-600 transition-colors duration-200 hover:bg-ink-100 disabled:opacity-40 sm:h-11 sm:w-11"
          >
            <Plus size={15} />
          </button>
        </div>

        <p className="text-[13px]">
          {!available ? (
            <span className="font-semibold text-sale-600">Currently unavailable</span>
          ) : product.stock <= 12 ? (
            <span className="font-semibold tabular-nums text-sale-600">
              Only {product.stock} left in stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-ink-900">
              <Check size={14} strokeWidth={2} className="text-ink-400" /> In stock, ready to
              ship
            </span>
          )}
        </p>
      </div>

      {/* CTAs. On a phone they share one row — two equal actions and the save
          — with tighter lettering so all three fit; the tick on "Added to bag"
          gives way below 360px rather than push the label past the edge. */}
      {/* items-stretch so the save button is exactly as tall as the two beside
          it, whatever the label inside them wraps to. It used to be sized by
          hand at sm:h-13 — a class the theme does not define — and sat a few
          pixels proud of the row. */}
      <div className="flex items-stretch gap-2 sm:gap-2.5">
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
          Buy now <ArrowRight size={15} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className={cn(
            // Square, and the same height as the buttons beside it.
            "tap h-auto w-12 shrink-0 self-stretch",
            wished && "border-sale-500 text-sale-500",
          )}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          onClick={() => toggleWishlist(addable)}
        >
          <Heart size={19} fill={wished ? "currentColor" : "none"} />
        </Button>
      </div>

      <DeliveryCheck deliveryDays={product.deliveryDays} codAvailable={codHere} />

      {/* The ledger. Four icon tiles said less than five ruled lines do, and
          the warranty no longer has to be cut to its first three words to fit
          a tile — it is printed as the manufacturer wrote it. */}
      <dl className="border-b border-hairline">
        {ledger.map((row) => (
          <div
            key={row.label}
            className="flex min-h-[44px] items-center justify-between gap-4 border-t border-hairline py-2"
          >
            <dt className="shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              {row.label}
            </dt>
            <dd className="min-w-0 text-right text-[13.5px] font-medium tabular-nums text-ink-900">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
