"use client";

import Image from "@/components/ui/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
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
          <div className="space-y-3">
            {/* The same ledger the bag and the checkout use, at its shortest. */}
            <dl>
              <div className="flex h-11 items-center justify-between gap-4">
                <dt className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  Subtotal
                </dt>
                <dd className="text-[17px] font-semibold leading-none tabular-nums text-ink-950">
                  {formatINR(totals.itemsTotal)}
                </dd>
              </div>
              {totals.savings > 0 && (
                <div className="flex h-11 items-center justify-between gap-4">
                  <dt className="min-w-0 truncate text-[13px] text-ink-600">
                    You are saving on this order
                  </dt>
                  <dd className="shrink-0 text-[13px] font-semibold tabular-nums text-sale-600">
                    {formatINR(totals.savings)}
                  </dd>
                </div>
              )}
            </dl>

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
            <p className="text-center text-[13px] leading-[1.5] text-ink-500">
              Taxes included. Shipping calculated at checkout.
            </p>
          </div>
        ) : undefined
      }
    >
      {cart.length === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState
            title="Your bag is empty"
            body="Add something you like and it will show up here. Your bag is saved on this device."
            action={
              <Link href="/products" onClick={closeCartDrawer} className={buttonClasses("primary", "md")}>
                Start shopping
              </Link>
            }
            /* The drawer is already a panel, so the empty state gives back
               both the surface and the edge that go with it. */
            className="bg-transparent py-8 shadow-none sm:py-10"
          />
        </div>
      ) : (
        <>
          <div className="card px-4 py-3 sm:px-5 sm:py-4">
            {toFreeShipping > 0 ? (
              <p className="text-[13px] leading-[1.5] text-ink-600">
                Add{" "}
                <strong className="font-semibold tabular-nums text-ink-950">
                  {formatINR(toFreeShipping)}
                </strong>{" "}
                more for free delivery
              </p>
            ) : (
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950">
                Free delivery unlocked
              </p>
            )}
            {/* A measuring rule, not a pill: a 2px hairline track with the
                travelled part drawn in ink. */}
            <div className="mt-2.5 h-0.5 w-full overflow-hidden bg-hairline">
              <motion.div
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
                className="h-full bg-ink-950"
              />
            </div>
          </div>

          <ul className="card overflow-hidden">
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
                  <div className="flex gap-3 p-4 sm:gap-3.5 sm:p-5">
                    <Link
                      href={`/p/${line.slug}`}
                      onClick={closeCartDrawer}
                      className="tap relative h-[84px] w-[70px] shrink-0 overflow-hidden bg-ink-100 sm:h-24 sm:w-20"
                    >
                      <Image src={line.image} alt="" fill sizes="80px" className="object-cover" />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      {line.brand && <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">{line.brand}</p>}
                      <Link
                        href={`/p/${line.slug}`}
                        onClick={closeCartDrawer}
                        className="tap mt-1 line-clamp-2 text-[13.5px] font-medium leading-[1.35] text-ink-900 transition-colors duration-200 hover:text-brand-700"
                      >
                        {line.title}
                      </Link>
                      {line.variantLabel && (
                        <p className="mt-1 text-[13px] leading-[1.5] text-ink-500">
                          {line.variantLabel}
                        </p>
                      )}

                      {/* Wraps only in the extreme case: a six-figure line total at 320px. */}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                        <div className="inline-flex items-center overflow-hidden">
                          <button
                            onClick={() =>
                              dispatch({ type: "cart/qty", id: line.id, quantity: line.quantity - 1 })
                            }
                            aria-label="Decrease quantity"
                            className="tap flex h-10 w-10 items-center justify-center text-ink-600 transition-colors duration-200 hover:bg-ink-950 hover:text-white sm:h-8 sm:w-8"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-9 text-center text-[13px] font-semibold tabular-nums text-ink-950">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() =>
                              dispatch({ type: "cart/qty", id: line.id, quantity: line.quantity + 1 })
                            }
                            disabled={line.quantity >= line.stock}
                            aria-label="Increase quantity"
                            className="tap flex h-10 w-10 items-center justify-center text-ink-600 transition-colors duration-200 hover:bg-ink-950 hover:text-white disabled:pointer-events-none disabled:text-ink-400 sm:h-8 sm:w-8"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <span className="text-[14px] font-semibold tabular-nums text-ink-950">
                          {formatINR(line.price * line.quantity)}
                        </span>
                      </div>
                    </div>

                    {/* On phones an invisible ::after grows the hit area to ~43px
                        without moving the icon or narrowing the text beside it. */}
                    <button
                      onClick={() => dispatch({ type: "cart/remove", id: line.id })}
                      aria-label={`Remove ${line.title}`}
                      className="tap relative -mr-1 -mt-1 h-fit p-1.5 text-ink-400 transition-colors duration-200 hover:text-sale-600 max-sm:after:absolute max-sm:after:-inset-2"
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
