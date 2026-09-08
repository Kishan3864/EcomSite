"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { ProductCard } from "@/components/product/product-card";
import { RailScroller } from "@/components/ui/rail-scroller";
import { buttonClasses } from "@/components/ui/button";

/** Counts down to the next midnight IST, so the deal window always looks live. */
function useCountdown() {
  const [left, setLeft] = useState<{ h: string; m: string; s: string } | null>(null);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const diff = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLeft({
        h: String(h).padStart(2, "0"),
        m: String(m).padStart(2, "0"),
        s: String(s).padStart(2, "0"),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return left;
}

export function FlashDeals({ products }: { products: ProductCardModel[] }) {
  const left = useCountdown();

  return (
    <section className="container-page py-10 sm:py-14">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface sm:rounded-3xl">
        <RailScroller
          label="deals"
          headerClassName="mb-0 items-center border-b border-hairline bg-gradient-to-r from-sale-50 to-gold-50 px-5 py-5 sm:px-7"
          railClassName="p-4 sm:p-5"
          header={
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sale-500 text-white">
                  <Flame size={20} />
                </span>
                <div>
                  <h2 className="font-display text-[22px] leading-tight tracking-[-0.02em] text-ink-950 sm:text-[26px]">
                    Deals of the day
                  </h2>
                  <p className="text-[12.5px] text-ink-600">
                    Up to 40% off, restocked every midnight
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                  Ends in
                </span>
                <div className="flex items-center gap-1" aria-live="off">
                  {left ? (
                    [left.h, left.m, left.s].map((unit, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-ink-400">:</span>}
                        <span className="min-w-[34px] rounded-lg bg-ink-950 px-2 py-1.5 text-center text-[15px] font-bold tabular-nums text-white">
                          {unit}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="h-8 w-[118px] rounded-lg bg-ink-200" />
                  )}
                </div>
              </div>
            </div>
          }
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              layout="rail"
              sizes="(min-width:640px) 212px, 172px"
            />
          ))}
        </RailScroller>

        <footer className="border-t border-hairline px-5 py-4 text-center sm:px-7">
          <Link href="/offers" className={buttonClasses("outline", "sm")}>
            See every deal running today
          </Link>
        </footer>
      </div>
    </section>
  );
}
