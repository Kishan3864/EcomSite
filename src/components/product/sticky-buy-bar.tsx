"use client";

import { useEffect, useState } from "react";
import Image from "@/components/ui/image";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import type { ProductCardModel } from "@/lib/card";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { fromCard, useCommerce } from "@/store/commerce";
import { Price } from "@/components/ui/primitives";

/**
 * Appears once the buy box scrolls out of view. Below lg it rides on top of
 * the BottomNav (61px plus the home-indicator inset), never over it.
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
            role="region"
            aria-label="Quick buy"
            initial={reduce ? { opacity: 0 } : { y: 90, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="glass fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+61px)] z-40 border-t border-line shadow-[0_-12px_32px_-18px_rgb(10_15_26/0.25)] lg:bottom-0 lg:pb-[env(safe-area-inset-bottom)]"
          >
            {/* Phones: price plus two thumb-sized actions; the title joins from sm. */}
            <div className="container-page flex items-center gap-2.5 py-2 sm:gap-3 sm:py-2.5">
              <div className="relative hidden h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-b from-ink-50 to-ink-100/70 ring-1 ring-inset ring-line sm:block">
                <Image src={product.image} alt="" fill sizes="48px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="hidden truncate text-[13px] font-medium text-ink-900 sm:block">
                  {product.title}
                </p>
                <Price price={product.price} mrp={product.mrp} size="sm" />
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="accent"
                  size="sm"
                  className="h-10 px-3 sm:h-11 sm:px-5"
                  disabled={outOfStock}
                  onClick={() => addToCart(fromCard(product), { openDrawer: true })}
                >
                  <ShoppingBag size={16} aria-hidden className="max-[380px]:hidden" />
                  Add to bag
                </Button>
                <Button
                  size="sm"
                  className="h-10 px-3 sm:h-11 sm:px-5"
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

      {/* Below lg the bar also covers the foot of the page, so it reserves its
          own height at the end of <body>, as the BottomNav does. */}
      <Portal>
        <div aria-hidden className="h-[57px] sm:h-[69px] lg:hidden" />
      </Portal>
    </>
  );
}
