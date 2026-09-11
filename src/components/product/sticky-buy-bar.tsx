"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import type { ProductCardModel } from "@/lib/card";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { fromCard, useCommerce } from "@/store/commerce";
import { Price } from "@/components/ui/primitives";

/**
 * Appears once the buy box scrolls out of view, so the purchase action is
 * never more than a thumb away on mobile or a glance away on desktop.
 *
 * Below lg it rides on top of the BottomNav — 61px plus the home-indicator
 * inset, as bottom-nav.tsx draws it — rather than over it.
 */
export function StickyBuyBar({ product }: { product: ProductCardModel }) {
  const [show, setShow] = useState(false);
  const { addToCart, buyNow } = useCommerce();
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const sentinel = document.getElementById("buy-box-sentinel");
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const outOfStock = product.stock <= 0;

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { y: 90 }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: 90 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+61px)] z-40 border-t border-hairline bg-canvas/96 backdrop-blur-xl lg:bottom-0 lg:pb-[env(safe-area-inset-bottom)]"
          >
            {/* Phones keep it to one line: the price, then two actions sized
                for a thumb. A title truncated to a dozen letters tells the
                shopper nothing, so it waits for the width sm brings. */}
            <div className="container-page flex items-center gap-2 py-2 sm:gap-3 sm:py-2.5">
              <div className="relative hidden h-12 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-100 sm:block">
                <Image src={product.image} alt="" fill sizes="44px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="hidden truncate text-[13px] font-medium text-ink-900 sm:block">
                  {product.title}
                </p>
                <Price price={product.price} mrp={product.mrp} size="sm" />
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="tap h-10 px-2.5 tracking-[0.08em] sm:h-11 sm:px-5 sm:tracking-[0.12em]"
                  disabled={outOfStock}
                  onClick={() => addToCart(fromCard(product), { openDrawer: true })}
                >
                  Add to bag
                </Button>
                <Button
                  size="sm"
                  className="tap h-10 px-2.5 tracking-[0.08em] sm:h-11 sm:px-5 sm:tracking-[0.12em]"
                  disabled={outOfStock}
                  onClick={() => buyNow(fromCard(product))}
                >
                  Buy now
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Below lg the bar also covers the foot of the page, so it keeps its own
          height free at the very end of the document, as the BottomNav does
          for itself. That end is after the footer, outside <main>, which is
          why this goes to <body> rather than rendering in place. */}
      <Portal>
        <div aria-hidden className="h-[57px] sm:h-[69px] lg:hidden" />
      </Portal>
    </>
  );
}
