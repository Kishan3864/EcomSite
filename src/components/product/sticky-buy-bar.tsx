"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import type { ProductCardModel } from "@/lib/card";
import { Button } from "@/components/ui/button";
import { fromCard, useCommerce } from "@/store/commerce";
import { Price } from "@/components/ui/primitives";

/**
 * Appears once the buy box scrolls out of view, so the purchase action is
 * never more than a thumb away on mobile or a glance away on desktop.
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
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { y: 90 }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: 90 }}
          transition={{ type: "spring", stiffness: 340, damping: 34 }}
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+61px)] z-40 border-t border-hairline bg-canvas/96 backdrop-blur-xl lg:bottom-0"
        >
          <div className="container-page flex items-center gap-3 py-2.5">
            <div className="relative hidden h-12 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-100 sm:block">
              <Image src={product.image} alt="" fill sizes="44px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink-900">{product.title}</p>
              <Price price={product.price} mrp={product.mrp} size="sm" />
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="sm:h-11 sm:px-5"
                disabled={outOfStock}
                onClick={() => addToCart(fromCard(product), { openDrawer: true })}
              >
                Add to bag
              </Button>
              <Button
                size="sm"
                className="sm:h-11 sm:px-5"
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
  );
}
