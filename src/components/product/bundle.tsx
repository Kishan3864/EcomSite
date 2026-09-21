"use client";

import { useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/primitives";
import { fromCard, useCommerce } from "@/store/commerce";
import { cn, formatINR } from "@/lib/utils";

/**
 * Frequently bought together — the anchor product plus its cross-sells, one
 * row per product (photo, name, price, switch) in a card, with the total in a
 * panel beside it.
 */
export function BundleSection({
  anchor,
  extras,
}: {
  anchor: ProductCardModel;
  extras: ProductCardModel[];
}) {
  const all = [anchor, ...extras];
  const [picked, setPicked] = useState<Record<string, boolean>>(
    Object.fromEntries(all.map((p) => [p.id, true])),
  );
  const { addToCart } = useCommerce();

  const selected = all.filter((p) => picked[p.id]);
  const total = selected.reduce((sum, p) => sum + p.price, 0);
  const mrpTotal = selected.reduce((sum, p) => sum + p.mrp, 0);

  if (extras.length === 0) return null;

  return (
    <section>
      <SectionHeader
        eyebrow="Add to the order"
        title="Frequently bought together"
        description="Customers who bought this usually add these to the same order."
      />

      <div className="card overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <ul className="divide-y divide-line">
          {all.map((product, i) => {
            const on = picked[product.id] ?? false;
            return (
              <li key={product.id} className="relative flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                {i > 0 && (
                  <span
                    aria-hidden
                    className="absolute -top-2.5 left-[36px] z-10 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-ink-500 ring-1 ring-line sm:left-[46px]"
                  >
                    <Plus size={14} />
                  </span>
                )}
                <Link
                  href={`/p/${product.slug}`}
                  className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-b from-ink-50 to-ink-100/70 sm:h-20 sm:w-20"
                >
                  <Image
                    src={product.image}
                    alt={product.imageAlt || product.title}
                    fill
                    sizes="80px"
                    className={cn(
                      "object-cover transition-opacity duration-200",
                      !on && "opacity-40 grayscale",
                    )}
                  />
                </Link>

                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <span className="min-w-0 flex-1">
                    {i === 0 && <span className="t-label mb-1 block text-[10.5px]">This item</span>}
                    <span className={cn("line-clamp-2 text-[13.5px] font-medium leading-[1.4]", on ? "text-ink-900" : "text-ink-500")}>
                      {product.title}
                    </span>
                    <span className="t-price mt-1 block text-[14px]">{formatINR(product.price)}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={i === 0}
                    onChange={() => setPicked((p) => ({ ...p, [product.id]: !p[product.id] }))}
                    className="h-5 w-5 shrink-0 disabled:opacity-60"
                    aria-label={i === 0 ? `${product.title} (this item, always included)` : `Include ${product.title}`}
                  />
                </label>
              </li>
            );
          })}
        </ul>

        <div className="card-muted m-3 flex flex-col justify-center rounded-xl p-5 lg:m-4">
          <p className="t-label">
            Total for {selected.length} item{selected.length > 1 ? "s" : ""}
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2.5">
            <span className="t-price text-[26px] leading-none">{formatINR(total)}</span>
            {mrpTotal > total && (
              <span className="text-[14px] leading-none text-ink-400 line-through tabular-nums">
                {formatINR(mrpTotal)}
              </span>
            )}
          </p>
          <Button
            variant="accent"
            className="mt-5 w-full"
            disabled={selected.length === 0}
            onClick={() =>
              selected.forEach((p, i) =>
                addToCart(fromCard(p), { silent: i < selected.length - 1 }),
              )
            }
          >
            <ShoppingBag size={16} aria-hidden />
            {/* One span so the numeral is not spaced off by the flex gap. */}
            <span>
              Add <span className="tabular-nums">{selected.length}</span> to bag
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}
