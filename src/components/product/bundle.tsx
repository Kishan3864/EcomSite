"use client";

import { useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import type { ProductCardModel } from "@/lib/card";
import { Button } from "@/components/ui/button";
import { fromCard, useCommerce } from "@/store/commerce";
import { cn, formatINR } from "@/lib/utils";

/**
 * Frequently bought together — the anchor product plus its cross-sells.
 *
 * It used to be a scrolling row of photographs on one side and the very same
 * products listed again as ticked lines on the other, so every name and every
 * price was printed twice. One ruled line per product carries the picture, the
 * name, the price and the switch together, and a list of lines cannot come out
 * ragged however many cross-sells the shop has attached — which a row of tiles
 * three or five across certainly can.
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
      <div className="border-b border-hairline pb-3 sm:pb-4">
        <span className="eyebrow">Add to the order</span>
        <h2 className="mt-1.5 font-display text-[22px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-3 sm:text-[32px]">
          Frequently bought together
        </h2>
        <p className="mt-1.5 max-w-[46ch] text-[13px] leading-[1.55] text-ink-500 sm:mt-2.5 sm:text-[14px]">
          Customers who bought this usually add these to the same order.
        </p>
      </div>
      {/* The thick rule and the thin one, three pixels apart, that heads every
          band on the site. */}
      <div aria-hidden className="mt-[3px] h-px w-full bg-rule" />

      <div className="mt-5 grid gap-5 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <ul className="tile-grid grid-cols-1">
          {all.map((product, i) => (
            <li key={product.id} className="flex items-center gap-3 p-2.5 sm:gap-4 sm:p-3.5">
              <Link
                href={`/p/${product.slug}`}
                className="tap relative h-[70px] w-14 shrink-0 overflow-hidden bg-ink-100 sm:h-20 sm:w-16"
              >
                {/* A dropped product keeps its line and loses its colour, so
                    the shape of the list never moves as things are ticked. */}
                <Image
                  src={product.image}
                  alt={product.imageAlt || product.title}
                  fill
                  sizes="64px"
                  className={cn(
                    "object-cover transition-opacity duration-200",
                    !picked[product.id] && "opacity-40 grayscale",
                  )}
                />
              </Link>

              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 sm:gap-3">
                <input
                  type="checkbox"
                  checked={picked[product.id] ?? false}
                  disabled={i === 0}
                  onChange={() =>
                    setPicked((p) => ({ ...p, [product.id]: !p[product.id] }))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-700)] disabled:opacity-60"
                />
                <span className="min-w-0 flex-1">
                  {/* Ink, not evergreen. The one coloured word in the whole band
                      was sitting on its least important line — the label that
                      only says which of these is the product already open. */}
                  {i === 0 && (
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                      This item
                    </span>
                  )}
                  <span className="block text-[13px] font-medium leading-[1.4] text-ink-900 sm:text-[13.5px]">
                    {product.title}
                  </span>
                  <span className="mt-1 block text-[13px] font-semibold leading-none tabular-nums text-ink-900 sm:text-[13.5px]">
                    {formatINR(product.price)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        {/* The total is ruled off from the list rather than boxed: a hairline
            above it on a phone, and beside it once there is room for a column. */}
        <div className="border-t border-hairline pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Total for {selected.length} item{selected.length > 1 ? "s" : ""}
          </p>
          <p className="mt-2.5 flex items-baseline gap-3">
            <span className="text-[24px] font-semibold leading-none tabular-nums text-ink-950 sm:text-[28px]">
              {formatINR(total)}
            </span>
            {mrpTotal > total && (
              <span className="text-[13.5px] leading-none tabular-nums text-ink-400 line-through sm:text-[15px]">
                {formatINR(mrpTotal)}
              </span>
            )}
          </p>
          <Button
            className="mt-5 w-full"
            disabled={selected.length === 0}
            onClick={() =>
              selected.forEach((p, i) =>
                addToCart(fromCard(p), { silent: i < selected.length - 1 }),
              )
            }
          >
            {/* One span, not three children: the button is a flex row with a
                gap, and a bare numeral between two text nodes would be spaced
                off from its own sentence. */}
            <span>
              Add <span className="tabular-nums">{selected.length}</span> to bag
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}
