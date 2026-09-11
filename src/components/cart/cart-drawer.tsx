"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Drawer } from "@/components/ui/overlay";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { useStore } from "@/store/store";
import { computeTotals } from "@/lib/pricing";
import { formatINR } from "@/lib/utils";

export function CartDrawer() {
  const { cart, cartDrawerOpen, closeCartDrawer, config, dispatch, hydrated } = useStore();
  const totals = computeTotals(cart, { delivery: null, rates: config.rates });
  const freeThreshold = config.rates.freeThreshold;
  const toFreeShipping = Math.max(0, freeThreshold - totals.itemsTotal);
  const progress = Math.min(100, (totals.itemsTotal / freeThreshold) * 100);

  return (
    <Drawer
      open={cartDrawerOpen && hydrated}
      onClose={closeCartDrawer}
      title="Your bag"
      description={cart.length ? `${cart.length} item${cart.length > 1 ? "s" : ""} ready to check out` : undefined}
      footer={
        cart.length > 0 ? (
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[13.5px] text-ink-600 sm:text-sm">Subtotal</span>
              <span className="text-[16px] font-semibold tabular-nums text-ink-950 sm:text-lg">
                {formatINR(totals.itemsTotal)}
              </span>
            </div>
            {totals.savings > 0 && (
              <p className="rounded-lg bg-brand-50 px-3 py-1.5 text-[11.5px] font-medium text-brand-800 sm:py-2 sm:text-xs">
                You are saving {formatINR(totals.savings)} on this order
              </p>
            )}
            {/* Narrower padding on phones keeps the pair even at 320px. */}
            <div className="flex gap-2">
              <Link
                href="/cart"
                onClick={closeCartDrawer}
                className={buttonClasses("outline", "md", "flex-1 px-4 sm:px-6")}
              >
                View bag
              </Link>
              <Link
                href="/checkout/address"
                onClick={closeCartDrawer}
                className={buttonClasses("primary", "md", "flex-1 px-4 sm:px-6")}
              >
                Checkout
                <ArrowRight size={16} />
              </Link>
            </div>
            <p className="text-center text-[11px] text-ink-400">
              Taxes included. Shipping calculated at checkout.
            </p>
          </div>
        ) : undefined
      }
    >
      {cart.length === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState
            icon={<ShoppingBag size={26} />}
            title="Your bag is empty"
            body="Add something you like and it will show up here. Your bag is saved on this device."
            action={
              <Link href="/products" onClick={closeCartDrawer} className={buttonClasses("primary", "md")}>
                Start shopping
              </Link>
            }
            className="border-none bg-transparent py-8 sm:py-10"
          />
        </div>
      ) : (
        <>
          <div className="border-b border-hairline bg-surface px-4 py-3 sm:px-5 sm:py-4">
            {toFreeShipping > 0 ? (
              <p className="text-[11.5px] text-ink-600 sm:text-xs">
                Add <strong className="text-ink-900">{formatINR(toFreeShipping)}</strong> more for
                free delivery
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-brand-700 sm:text-xs">
                <Truck size={13} /> Free delivery unlocked
              </p>
            )}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <motion.div
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
                className="h-full rounded-full bg-brand-600"
              />
            </div>
          </div>

          <ul className="divide-y divide-hairline">
            <AnimatePresence initial={false}>
              {cart.map((line) => (
                <motion.li
                  key={line.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-3 p-3 sm:gap-3.5 sm:p-4">
                    <Link
                      href={`/p/${line.slug}`}
                      onClick={closeCartDrawer}
                      className="tap relative h-[84px] w-[70px] shrink-0 overflow-hidden rounded-lg bg-ink-100 sm:h-24 sm:w-20"
                    >
                      <Image src={line.image} alt="" fill sizes="80px" className="object-cover" />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                        {line.brand}
                      </p>
                      <Link
                        href={`/p/${line.slug}`}
                        onClick={closeCartDrawer}
                        className="tap line-clamp-2 text-[13px] font-medium leading-snug text-ink-900 hover:text-brand-700 sm:text-[13.5px]"
                      >
                        {line.title}
                      </Link>
                      {line.variantLabel && (
                        <p className="mt-0.5 text-[11.5px] text-ink-500">{line.variantLabel}</p>
                      )}

                      {/* Wraps only in the extreme case: a six-figure line total at 320px. */}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2.5">
                        <div className="inline-flex items-center rounded-lg border border-ink-200">
                          <button
                            onClick={() =>
                              dispatch({ type: "cart/qty", id: line.id, quantity: line.quantity - 1 })
                            }
                            aria-label="Decrease quantity"
                            className="tap flex h-10 w-10 items-center justify-center rounded-l-lg text-ink-600 transition-colors hover:bg-ink-100 sm:h-8 sm:w-8"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-7 text-center text-[13px] font-semibold tabular-nums">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() =>
                              dispatch({ type: "cart/qty", id: line.id, quantity: line.quantity + 1 })
                            }
                            disabled={line.quantity >= line.stock}
                            aria-label="Increase quantity"
                            className="tap flex h-10 w-10 items-center justify-center rounded-r-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40 sm:h-8 sm:w-8"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <span className="text-[13.5px] font-semibold tabular-nums text-ink-950 sm:text-sm">
                          {formatINR(line.price * line.quantity)}
                        </span>
                      </div>
                    </div>

                    {/* On phones an invisible ::after grows the hit area to ~43px
                        without moving the icon or narrowing the text beside it. */}
                    <button
                      onClick={() => dispatch({ type: "cart/remove", id: line.id })}
                      aria-label={`Remove ${line.title}`}
                      className="tap relative -mr-1 -mt-1 h-fit rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600 max-sm:after:absolute max-sm:after:-inset-2"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="p-4 sm:p-5">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-full text-ink-500 sm:h-9"
              onClick={() => dispatch({ type: "cart/clear" })}
            >
              Clear bag
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
}
