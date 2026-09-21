"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import {
  ArrowRight,
  Check,
  CircleCheck,
  CircleAlert,
  Heart,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { BUSINESS } from "@/config/business";
import { Button } from "@/components/ui/button";
import { Price, RatingChip, Stars } from "@/components/ui/primitives";
import { fromCard, useCommerce, type AddableProduct } from "@/store/commerce";
import { DeliveryCheck } from "./delivery-check";
import { BrandMark, ProductBadges } from "./badges";
import { paymentSentence, type PublicPayments } from "@/lib/payment-copy";
import { cn, discountPercent, formatCompact, formatINR } from "@/lib/utils";

/** Round icon button used for wishlist and share. */
const ROUND_BTN =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-600 transition-colors duration-200 hover:border-brand-300 hover:text-brand-700";

export function BuyBox({
  product,
  brandName,
  payments,
}: {
  product: Product;
  /** Absent when the brand is switched off: no brand line, no brand link. */
  brandName?: string | undefined;
  /** Live payment switches; without them the payment row is left out. */
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
  const [shared, setShared] = useState(false);
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
  // No score yet → the rating line carries the dispatch promise instead.
  const hasScore = product.reviewCount > 0 && product.rating > 0;

  // COD must clear three gates: the shop offers it, this product allows it,
  // and the price is inside the limit.
  const codHere = Boolean(
    payments?.cod && product.codAvailable && price <= (payments?.codLimit ?? 0),
  );
  const paymentLine = payments
    ? paymentSentence({ ...payments, cod: codHere })
    : null;

  // The trust row. Every value comes from the product or the ops record; the
  // payment row only appears with a live answer from the admin switches.
  const trust: { icon: LucideIcon; label: string; value: string }[] = [
    {
      icon: Truck,
      label: "Delivery",
      value: `${product.deliveryDays} working day${product.deliveryDays > 1 ? "s" : ""} · ${
        product.freeShipping ? "Free shipping" : `Shipping ${formatINR(BUSINESS.ops.shippingFee)}`
      }`,
    },
    {
      icon: RotateCcw,
      label: "Returns",
      value: `${product.returnWindowDays} days · free pickup`,
    },
    { icon: ShieldCheck, label: "Warranty", value: product.warranty },
    ...(paymentLine ? [{ icon: Lock, label: "Secure payment", value: paymentLine }] : []),
  ];

  const addable: AddableProduct = fromCard({
    id: product.id,
    slug: product.slug,
    title: product.title,
    brand: brandName ?? "",
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

  // Native share sheet where there is one, otherwise copy the link.
  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      // Dismissed share sheet or blocked clipboard: nothing to do.
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Brand, badges, wishlist and share */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 pt-1.5">
          {brandName && <BrandMark name={brandName} href={`/products?brands=${product.brandSlug}`} />}
          <ProductBadges product={{ badges: product.badges, price, mrp, stock: product.stock }} size="md" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            aria-label={shared ? "Link copied" : "Share this product"}
            title={shared ? "Link copied" : "Share"}
            className={cn(ROUND_BTN, shared && "border-brand-300 text-brand-700")}
          >
            {shared ? <Check size={16} /> : <Share2 size={16} />}
          </button>
          <button
            type="button"
            onClick={() => toggleWishlist(addable)}
            aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
            aria-pressed={wished}
            className={cn(ROUND_BTN, wished && "border-sale-200 bg-sale-50 text-sale-600 hover:border-sale-200 hover:text-sale-600")}
          >
            <Heart size={16} className={cn(wished && "fill-current")} />
          </button>
          <span className="sr-only" aria-live="polite">
            {shared ? "Link copied" : ""}
          </span>
        </div>
      </div>

      {/* Title, subtitle, rating */}
      <div>
        {/* The headline may say more than the title (a size, the key spec). */}
        <h1 className="text-[22px] font-bold leading-[1.18] tracking-[-0.03em] text-ink-950 sm:text-[28px] sm:leading-[1.12]">
          {product.headline ?? product.title}
        </h1>
        <p className="t-body mt-2 max-w-[52ch] sm:text-[15px]">{product.subtitle}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-ink-500">
          {hasScore ? (
            <>
              <a
                href="#reviews"
                className="group inline-flex items-center gap-2 rounded-full"
                aria-label={`Rated ${product.rating.toFixed(1)} out of 5 from ${product.reviewCount} reviews. Read reviews`}
              >
                <Stars value={product.rating} size={14} />
                <RatingChip value={product.rating} count={product.reviewCount} className="text-[12.5px]" />
                <span className="font-semibold text-brand-700 underline-offset-4 group-hover:underline">
                  Read reviews
                </span>
              </a>
              {product.soldCount > 0 && (
                <span className="tabular-nums">· {formatCompact(product.soldCount)}+ bought</span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Truck size={14} aria-hidden />
              Dispatched in {BUSINESS.ops.dispatchDays} working days
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="card-muted rounded-xl px-4 py-3.5 sm:px-5 sm:py-4">
        <Price price={price} mrp={mrp} size="xl" />
        <p className="t-small mt-1.5">
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
        <fieldset key={group.id}>
          <legend className="mb-2.5 flex items-baseline gap-2">
            <span className="t-label">{group.name}</span>
            <span className="text-[13px] font-medium text-ink-900">
              {group.options.find((o) => o.value === selection[group.id])?.label}
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const selected = selection[group.id] === option.value;
              const pick = () => setSelection((s) => ({ ...s, [group.id]: option.value }));
              if (group.type === "color") {
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={pick}
                    disabled={!option.inStock}
                    aria-label={option.inStock ? option.label : `${option.label}, out of stock`}
                    aria-pressed={selected}
                    title={option.inStock ? option.label : `${option.label} — out of stock`}
                    className={cn(
                      // A ring outside the swatch marks the choice without moving the row.
                      "relative flex h-10 w-10 items-center justify-center rounded-full transition-shadow duration-200",
                      selected
                        ? "ring-2 ring-brand-600 ring-offset-2 ring-offset-surface"
                        : "ring-1 ring-line-strong hover:ring-ink-400",
                      !option.inStock && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <span
                      className="h-8 w-8 rounded-full shadow-[inset_0_0_0_1px_rgb(10_15_26/0.08)]"
                      style={{ backgroundColor: option.swatch }}
                    />
                    {!option.inStock && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-[1.5px] w-9 rotate-45 bg-ink-500" />
                      </span>
                    )}
                  </button>
                );
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={pick}
                  disabled={!option.inStock}
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex h-10 min-w-[52px] items-center justify-center rounded-full border px-4 text-[13px] font-medium transition-colors duration-200",
                    selected
                      ? "border-brand-700 bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-700"
                      : "border-line-strong bg-surface text-ink-800 hover:border-brand-300",
                    !option.inStock && "cursor-not-allowed border-dashed text-ink-400 line-through",
                  )}
                >
                  {option.label}
                  {option.priceDelta ? (
                    <span className={cn("ml-1.5 text-[11.5px] tabular-nums", selected ? "text-brand-700" : "text-ink-500")}>
                      +{formatINR(option.priceDelta)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* Quantity and stock */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="t-label" id="qty-label">Qty</span>
          <div
            role="group"
            aria-labelledby="qty-label"
            className="inline-flex h-11 items-center rounded-full border border-line-strong bg-surface p-1"
          >
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-950 disabled:opacity-40"
            >
              <Minus size={16} />
            </button>
            <span aria-live="polite" className="w-9 text-center text-[14px] font-semibold tabular-nums text-ink-950">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              disabled={qty >= product.stock}
              aria-label="Increase quantity"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-950 disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <p className="text-[13px]">
          {!available ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-sale-600">
              <CircleAlert size={16} aria-hidden /> Currently unavailable
            </span>
          ) : product.stock <= 12 ? (
            <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-sale-600">
              <CircleAlert size={16} aria-hidden /> Only {product.stock} left in stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-ink-800">
              <CircleCheck size={16} className="text-brand-600" aria-hidden /> In stock, ready to ship
            </span>
          )}
        </p>
      </div>

      {/* CTAs: gold "Add to bag" first, cobalt "Buy now" beside it. */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          size="lg"
          variant="accent"
          className="min-w-0 px-3 max-[360px]:text-[13px]"
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
                className="inline-flex items-center gap-2"
              >
                <Check size={18} className="max-[360px]:hidden" /> Added to bag
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                className="inline-flex items-center gap-2"
              >
                <ShoppingBag size={18} className="max-[360px]:hidden" /> Add to bag
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
        <Button
          size="lg"
          className="group min-w-0 px-3 max-[360px]:text-[13px]"
          onClick={() =>
            buyNow(addable, { quantity: qty, variantLabel: label, variantKey, priceOverride: price })
          }
          disabled={!available}
        >
          Buy now
          <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      </div>

      <DeliveryCheck deliveryDays={product.deliveryDays} codAvailable={codHere} />

      {/* Trust row. Values printed in full — the warranty as the maker wrote it. */}
      <dl className="card grid grid-cols-1 gap-px overflow-hidden bg-line p-0 min-[400px]:grid-cols-2">
        {trust.map((row) => (
          <div
            key={row.label}
            className="flex items-start gap-3 bg-surface p-3.5 min-[400px]:[&:last-child:nth-child(odd)]:col-span-2"
          >
            <span className="icon-tile icon-tile-sm">
              <row.icon size={16} aria-hidden />
            </span>
            <span className="min-w-0">
              <dt className="t-label text-[10.5px]">{row.label}</dt>
              <dd className="mt-1 text-[12.5px] font-medium leading-[1.4] text-ink-900 wrap-break-word">
                {row.value}
              </dd>
            </span>
          </div>
        ))}
      </dl>
    </div>
  );
}
