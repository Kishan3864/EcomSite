"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
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

  return (
    <Modal open={open} onClose={onClose} title={product.title}>
      {/* The card only offers quick view from sm up; below that this is a
          bottom sheet, so the photo is kept short and the type at app scale. */}
      <div className="grid gap-0 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="relative aspect-square bg-ink-100 sm:aspect-auto sm:min-h-[420px]">
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            sizes="(min-width:640px) 45vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              {product.brand}
            </p>
            <h2 className="mt-1 font-display text-[18px] leading-tight tracking-[-0.02em] text-ink-950 sm:mt-1.5 sm:text-2xl">
              {product.title}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-600 sm:mt-1.5 sm:text-sm">
              {product.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Stars value={product.rating} />
            <RatingChip value={product.rating} count={product.reviewCount} />
          </div>

          <Price price={product.price} mrp={product.mrp} size="lg" />

          {product.colors.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                Colour: <span className="text-ink-900">{color}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setColor(c.name)}
                    aria-label={c.name}
                    aria-pressed={color === c.name}
                    className={cn(
                      "tap h-10 w-10 rounded-full border-2 transition-all duration-200 sm:h-8 sm:w-8",
                      color === c.name
                        ? "border-brand-700 ring-2 ring-brand-700/20 ring-offset-1"
                        : "border-ink-200 hover:border-ink-400",
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center rounded-lg border border-ink-200 bg-surface">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-l-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40"
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={15} />
              </button>
              <span className="w-10 text-center text-sm font-semibold tabular-nums">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-r-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40"
                disabled={qty >= product.stock}
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>
            <span className="text-xs text-ink-500">
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

          <div className="space-y-2 rounded-lg bg-ink-50 p-3 text-xs text-ink-600 sm:p-3.5">
            <p className="flex items-center gap-2">
              <Truck size={14} className="text-brand-600" />
              {product.deliveryDays <= 2
                ? `Delivered in ${product.deliveryDays} day${product.deliveryDays > 1 ? "s" : ""}`
                : `Delivered in ${product.deliveryDays} days`}
              {product.freeShipping && " · Free shipping"}
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-brand-600" />
              Genuine product with brand warranty
            </p>
          </div>

          <Link
            href={`/p/${product.slug}`}
            onClick={onClose}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline underline-offset-4"
          >
            See full details
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </Modal>
  );
}
