"use client";

import { useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { ArrowRight, Heart, Minus, Plus } from "lucide-react";
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

  // Stars and RatingChip both render nothing until somebody has actually
  // scored the product, so the row that holds them has to go with them: an
  // empty flex row still takes a gap from the column above it, which left a
  // 12px hole between the subtitle and the price on every new listing.
  const hasScore = product.reviewCount > 0 && product.rating > 0;

  // The two promises, as a ledger rather than a tinted block of icons — the
  // same four-row table the homepage spread uses under its price.
  const ledger: { label: string; value: string }[] = [
    {
      label: "Delivery",
      value: `Delivered in ${product.deliveryDays} day${product.deliveryDays > 1 ? "s" : ""}${
        product.freeShipping ? " · Free shipping" : ""
      }`,
    },
    { label: "Warranty", value: "Genuine product with brand warranty" },
  ];

  return (
    <Modal open={open} onClose={onClose} title={product.title}>
      {/* The card only offers quick view from sm up; below that this is a
          bottom sheet, so the photo is kept short and the type at app scale. */}
      <div className="grid gap-0 bg-surface sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="relative aspect-square border-b border-hairline bg-ink-100 sm:aspect-auto sm:min-h-[420px] sm:border-b-0 sm:border-r">
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            sizes="(min-width:640px) 45vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-3.5 p-4 sm:gap-4 sm:p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              {product.brand}
            </p>
            <h2 className="mt-1.5 font-display text-[20px] leading-[1.1] tracking-[-0.02em] text-ink-950 sm:text-[26px]">
              {product.title}
            </h2>
            {product.subtitle && (
              <p className="mt-2 max-w-[46ch] text-[13px] leading-[1.55] text-ink-600 sm:text-[14px]">
                {product.subtitle}
              </p>
            )}
          </div>

          {hasScore && (
            <div className="flex items-center gap-3">
              <Stars value={product.rating} />
              <RatingChip value={product.rating} count={product.reviewCount} />
            </div>
          )}

          <Price price={product.price} mrp={product.mrp} size="lg" />

          {product.colors.length > 1 && (
            <div>
              <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                Colour: <span className="text-ink-900">{color}</span>
              </p>
              {/* Square swatches, marked by a ring rather than a fatter border:
                  a border that thickens on selection shifts the colour patch
                  itself, so the row appears to twitch as you choose. */}
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setColor(c.name)}
                    aria-label={c.name}
                    aria-pressed={color === c.name}
                    className={cn(
                      "tap h-10 w-10 border transition-colors duration-200 sm:h-8 sm:w-8",
                      color === c.name
                        ? "border-ink-950 ring-1 ring-ink-950 ring-offset-2"
                        : "border-hairline hover:border-ink-400",
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center border border-hairline bg-surface">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center text-ink-600 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-950 disabled:opacity-40"
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={15} />
              </button>
              <span className="w-10 text-center text-[13.5px] font-semibold tabular-nums text-ink-950">
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="flex h-10 w-10 items-center justify-center text-ink-600 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-950 disabled:opacity-40"
                disabled={qty >= product.stock}
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>
            <span className="text-[13px] leading-[1.4] text-ink-500">
              {product.stock > 12
                ? "In stock"
                : product.stock > 0
                  ? `Only ${product.stock} left`
                  : "Out of stock"}
              {product.soldCount > 1000 && ` · ${formatCompact(product.soldCount)}+ sold`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                addToCart(fromCard(product), { quantity: qty, variantLabel: color });
                onClose();
              }}
              disabled={product.stock <= 0}
            >
              Add to bag
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                buyNow(fromCard(product), { quantity: qty, variantLabel: color });
                onClose();
              }}
              disabled={product.stock <= 0}
            >
              Buy now
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
              onClick={() => toggleWishlist(fromCard(product))}
              className={cn(wished && "border-sale-500 text-sale-500")}
            >
              <Heart size={17} fill={wished ? "currentColor" : "none"} />
            </Button>
          </div>

          <dl className="border-b border-hairline">
            {ledger.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 border-t border-hairline py-3"
              >
                <dt className="shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  {row.label}
                </dt>
                <dd className="text-right text-[13px] font-medium text-ink-900 sm:text-[13.5px]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <Link
            href={`/p/${product.slug}`}
            onClick={onClose}
            className="tap group inline-flex self-start items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors hover:text-gold-700 sm:text-[12px]"
          >
            See full details
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </Modal>
  );
}
