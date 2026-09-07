"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { Button } from "@/components/ui/button";
import { fromCard, useCommerce } from "@/store/commerce";
import { cn, formatINR } from "@/lib/utils";

/** Frequently bought together — the anchor product plus its cross-sells. */
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
    <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
      <h2 className="font-display text-[22px] tracking-[-0.02em] text-ink-950 sm:text-[26px]">
        Frequently bought together
      </h2>
      <p className="mt-1.5 text-[13px] text-ink-500">
        Customers who bought this usually add these to the same order.
      </p>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {all.map((product, i) => (
            <div key={product.id} className="flex items-center gap-3">
              {i > 0 && <Plus size={18} className="shrink-0 text-ink-300" />}
              <Link
                href={`/p/${product.slug}`}
                className={cn(
                  "relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-ink-100 transition-all",
                  picked[product.id] ? "border-brand-600" : "border-ink-200 opacity-45",
                )}
              >
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </Link>
            </div>
          ))}
        </div>

        <div className="lg:w-[300px] lg:shrink-0">
          <ul className="space-y-2.5">
            {all.map((product, i) => (
              <li key={product.id}>
                <label className="flex cursor-pointer items-start gap-2.5">
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
                    <span className="block truncate text-[13px] font-medium text-ink-900">
                      {i === 0 && (
                        <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-600">
                          This item:
                        </span>
                      )}
                      {product.title}
                    </span>
                    <span className="text-[12.5px] font-semibold tabular-nums text-ink-700">
                      {formatINR(product.price)}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-hairline pt-4">
            <p className="text-[12px] uppercase tracking-[0.08em] text-ink-400">
              Total for {selected.length} item{selected.length > 1 ? "s" : ""}
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums text-ink-950">
                {formatINR(total)}
              </span>
              {mrpTotal > total && (
                <span className="text-[13px] text-ink-400 line-through tabular-nums">
                  {formatINR(mrpTotal)}
                </span>
              )}
            </p>
            <Button
              className="mt-3 w-full"
              disabled={selected.length === 0}
              onClick={() =>
                selected.forEach((p, i) =>
                  addToCart(fromCard(p), { silent: i < selected.length - 1 }),
                )
              }
            >
              Add {selected.length} to bag
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
