"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { ProductCard } from "@/components/product/product-card";
import { RailScroller } from "@/components/ui/rail-scroller";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <section className="container-page py-6 sm:py-14">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface sm:rounded-3xl">
        <RailScroller
          label="deals"
          headerClassName="mb-0 items-center border-b border-hairline bg-gradient-to-r from-sale-50 to-gold-50 px-3 py-3 sm:px-7 sm:py-5"
          railClassName="p-3 sm:p-5"
          header={
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 sm:gap-4">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sale-500 text-white sm:h-11 sm:w-11">
                  <Flame size={20} />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-[18px] leading-tight tracking-[-0.02em] text-ink-950 sm:text-[26px]">
                    Deals of the day
                  </h2>
                  <p className="text-[12px] text-ink-600 sm:text-[12.5px]">
                    Up to 40% off, restocked every midnight
                  </p>
                </div>
              </div>

              {/* The countdown never wraps: a clock split over two lines stops
                  reading as a clock. */}
              <div className="flex shrink-0 items-center gap-2 whitespace-nowrap sm:gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                  Ends in
                </span>
                <div className="flex items-center gap-1" aria-live="off">
                  {left ? (
                    [left.h, left.m, left.s].map((unit, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-ink-400">:</span>}
                        <span className="min-w-[30px] rounded-lg bg-ink-950 px-1.5 py-1 text-center text-[14px] font-bold tabular-nums text-white sm:min-w-[34px] sm:px-2 sm:py-1.5 sm:text-[15px]">
                          {unit}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="h-7 w-[106px] rounded-lg bg-ink-200 sm:h-8 sm:w-[118px]" />
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
              sizes="(min-width:640px) 212px, 152px"
            />
          ))}
        </RailScroller>

        <footer className="border-t border-hairline px-3 py-3 text-center sm:px-7 sm:py-4">
          <Link
            href="/offers"
            className={cn(buttonClasses("outline", "sm"), "h-10 w-full sm:h-9 sm:w-auto")}
          >
            See every deal running today
          </Link>
        </footer>
      </div>
    </section>
  );
}
