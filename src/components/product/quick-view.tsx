"use client";

import { ProductBadges } from "./badges";
import { useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Price, RatingChip, Stars } from "@/components/ui/primitives";
import { fromCard, useCommerce } from "@/store/commerce";
import { cn, formatCompact } from "@/lib/utils";

export function QuickView({
  product,
  open,
  onClose,
}: {
  product: ProductCardModel;
  open: boolean;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState(product.colors[0]?.name);
  const { addToCart, buyNow, toggleWishlist, isWishlisted } = useCommerce();
  const wished = isWishlisted(product.id);

  // The rating row goes entirely when there is no score, so it leaves no gap.
  const hasScore = product.reviewCount > 0 && product.rating > 0;

  const ledger = [
    {
      icon: Truck,
      label: "Delivery",
      value: `Delivered in ${product.deliveryDays} day${product.deliveryDays > 1 ? "s" : ""}${
        product.freeShipping ? " · Free shipping" : ""
      }`,
    },
    { icon: ShieldCheck, label: "Warranty", value: "Genuine product with brand warranty" },
  ];

  return (
    <Modal open={open} onClose={onClose} title={product.title}>
      <div className="grid gap-0 bg-surface sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="p-3 sm:p-4 sm:pr-0">
          <QuickGallery
            images={product.images?.length ? product.images : [{ url: product.image, alt: product.imageAlt }]}
          />
        </div>

        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div>
            {product.brand && <p className="t-label">{product.brand}</p>}
            <ProductBadges product={product} size="md" className="mt-2" />
            <h2 className="t-h2 mt-2">{product.title}</h2>
            {product.subtitle && <p className="t-body mt-1.5 max-w-[52ch]">{product.subtitle}</p>}
          </div>

          {hasScore && (
            <div className="flex items-center gap-2.5">
              <Stars value={product.rating} />
              <RatingChip value={product.rating} count={product.reviewCount} className="text-[12.5px]" />
            </div>
          )}

          <Price price={product.price} mrp={product.mrp} size="lg" />

          {product.colors.length > 1 && (
            <fieldset>
              <legend className="mb-2.5 flex items-baseline gap-2">
                <span className="t-label">Colour</span>
                <span className="text-[13px] font-medium text-ink-900">{color}</span>
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    aria-label={c.name}
                    aria-pressed={color === c.name}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full transition-shadow duration-200",
                      color === c.name
                        ? "ring-2 ring-brand-600 ring-offset-2 ring-offset-surface"
                        : "ring-1 ring-line-strong hover:ring-ink-400",
                    )}
                  >
                    <span
                      className="h-8 w-8 rounded-full shadow-[inset_0_0_0_1px_rgb(10_15_26/0.08)]"
                      style={{ backgroundColor: c.hex }}
                    />
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div
              role="group"
              aria-label="Quantity"
              className="inline-flex h-11 items-center rounded-full border border-line-strong bg-surface p-1"
            >
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-950 disabled:opacity-40"
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span aria-live="polite" className="w-9 text-center text-[14px] font-semibold tabular-nums text-ink-950">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-950 disabled:opacity-40"
                disabled={qty >= product.stock}
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
            <span className="t-small">
              {product.stock > 12
                ? "In stock"
                : product.stock > 0
                  ? `Only ${product.stock} left`
                  : "Out of stock"}
              {product.soldCount > 1000 && ` · ${formatCompact(product.soldCount)}+ sold`}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              className="min-w-0 flex-1 px-3"
              variant="accent"
              onClick={() => {
                addToCart(fromCard(product), { quantity: qty, variantLabel: color });
                onClose();
              }}
              disabled={product.stock <= 0}
            >
              <ShoppingBag size={16} aria-hidden className="max-[360px]:hidden" />
              Add to bag
            </Button>
            <Button
              className="min-w-0 flex-1 px-3"
              onClick={() => {
                buyNow(fromCard(product), { quantity: qty, variantLabel: color });
                onClose();
              }}
              disabled={product.stock <= 0}
            >
              Buy now
            </Button>
            <button
              type="button"
              aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
              aria-pressed={wished}
              onClick={() => toggleWishlist(fromCard(product))}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                wished
                  ? "border-sale-200 bg-sale-50 text-sale-600"
                  : "border-line-strong text-ink-600 hover:border-brand-300 hover:text-brand-700",
              )}
            >
              <Heart size={18} className={cn(wished && "fill-current")} />
            </button>
          </div>

          <dl className="card-muted divide-y divide-line rounded-xl px-4">
            {ledger.map((row) => (
              <div key={row.label} className="flex items-center gap-3 py-3">
                <row.icon size={16} aria-hidden className="shrink-0 text-brand-700" />
                <dt className="t-label w-20 shrink-0 text-[10.5px]">{row.label}</dt>
                <dd className="min-w-0 text-[13px] font-medium text-ink-900">{row.value}</dd>
              </div>
            ))}
          </dl>

          <Link
            href={`/p/${product.slug}`}
            onClick={onClose}
            className="group inline-flex items-center gap-1.5 self-start rounded-full text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
          >
            See full details
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </Modal>
  );
}

/** Every photo, shown whole (contained, never cropped), with arrows, swipe and thumbnails. */
function QuickGallery({ images }: { images: { url: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const count = images.length;
  const go = (i: number) => setIndex(((i % count) + count) % count);
  const current = images[index] ?? images[0];

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div
        className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-b from-ink-50 to-ink-100/70 sm:aspect-auto sm:min-h-[420px] sm:flex-1"
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX == null) return;
          const dx = e.changedTouches[0].clientX - touchX;
          setTouchX(null);
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(index + 1);
          else if (e.key === "ArrowLeft") go(index - 1);
        }}
      >
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt}
          fill
          sizes="(min-width:640px) 45vw, 100vw"
          className="object-contain p-4"
        />
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous image"
              className="glass absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-800 ring-1 ring-inset ring-ink-950/10 transition-colors hover:text-brand-700"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next image"
              className="glass absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-800 ring-1 ring-inset ring-ink-950/10 transition-colors hover:text-brand-700"
            >
              <ChevronRight size={18} />
            </button>
            <span className="glass absolute bottom-2 right-2 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ink-800">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-50 transition-shadow",
                i === index ? "ring-2 ring-brand-600" : "ring-1 ring-line hover:ring-ink-300",
              )}
            >
              <Image src={img.url} alt="" fill sizes="56px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
