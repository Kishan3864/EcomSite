"use client";

import Image from "@/components/ui/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Minus, PartyPopper, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Drawer } from "@/components/ui/overlay";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { useStore } from "@/store/store";
import { computeTotals } from "@/lib/pricing";
import { cn, formatINR } from "@/lib/utils";

export function CartDrawer() {
  const { cart, cartDrawerOpen, closeCartDrawer, config, dispatch, hydrated } = useStore();
  const totals = computeTotals(cart, { delivery: null, rates: config.rates });
  const freeThreshold = config.rates.freeThreshold;
  const toFreeShipping = Math.max(0, freeThreshold - totals.itemsTotal);
  const progress = Math.min(100, (totals.itemsTotal / freeThreshold) * 100);
  const unlocked = toFreeShipping <= 0;

  return (
    <Drawer
      open={cartDrawerOpen && hydrated}
      onClose={closeCartDrawer}
      title="Your bag"
      description={cart.length ? `${cart.length} item${cart.length > 1 ? "s" : ""} ready to check out` : undefined}
      footer={
        cart.length > 0 ? (
          <div className="space-y-3">
            <dl className="space-y-1">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[13.5px] font-semibold text-ink-900">Subtotal</dt>
                <dd className="t-price text-[19px] leading-none">{formatINR(totals.itemsTotal)}</dd>
              </div>
              {totals.savings > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="t-small min-w-0 truncate">You are saving on this order</dt>
                  <dd className="shrink-0 text-[12.5px] font-semibold tabular-nums text-sale-600">
                    {formatINR(totals.savings)}
                  </dd>
                </div>
              )}
            </dl>

            {/* Narrower padding on phones keeps the pair even at 320px. */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/cart"
                onClick={closeCartDrawer}
                className={buttonClasses("outline", "lg", "w-full px-4")}
              >
                View bag
              </Link>
              <Link
                href="/checkout/address"
                onClick={closeCartDrawer}
                className={buttonClasses("accent", "lg", "w-full px-4")}
              >
                Checkout
                <ArrowRight size={16} />
              </Link>
            </div>
            <p className="t-small text-center">Taxes included. Shipping calculated at checkout.</p>
          </div>
        ) : undefined
      }
    >
      {cart.length === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState
            icon={<ShoppingBag size={24} />}
            title="Your bag is empty"
            body="Add something you like and it will show up here. Your bag is saved on this device."
            action={
              <Link href="/products" onClick={closeCartDrawer} className={buttonClasses("primary", "md")}>
                Start shopping
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
          {/* Free-delivery progress, against the shop's configured threshold. */}
          <div className="card px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span
                className={cn("icon-tile icon-tile-sm", unlocked && "bg-gold-100 text-gold-800")}
                aria-hidden
              >
                {unlocked ? <PartyPopper size={16} /> : <Truck size={16} />}
              </span>
              {unlocked ? (
                <p className="text-[13px] font-semibold text-ink-900">Free delivery unlocked</p>
              ) : (
                <p className="text-[13px] leading-[1.45] text-ink-600">
                  Add{" "}
                  <strong className="font-semibold tabular-nums text-ink-950">
                    {formatINR(toFreeShipping)}
                  </strong>{" "}
                  more for free delivery
                </p>
              )}
            </div>
            <div
              role="progressbar"
              aria-label="Progress to free delivery"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-100"
            >
              <motion.div
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
                className="h-full rounded-full bg-linear-to-r from-brand-600 via-brand-400 to-gold-400"
              />
            </div>
          </div>

          <ul className="card card-divided overflow-hidden">
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
                  <div className="flex gap-3 p-3.5 sm:gap-3.5 sm:p-4">
                    <Link
                      href={`/p/${line.slug}`}
                      onClick={closeCartDrawer}
                      className="tap relative h-[88px] w-[72px] shrink-0 overflow-hidden rounded-md bg-ink-100 ring-1 ring-inset ring-line sm:h-24 sm:w-20"
                    >
                      <Image src={line.image} alt="" fill sizes="80px" className="object-cover" />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          {line.brand && <p className="t-label truncate text-[10px]">{line.brand}</p>}
                          <Link
                            href={`/p/${line.slug}`}
                            onClick={closeCartDrawer}
                            className="tap mt-0.5 line-clamp-2 text-[13.5px] font-medium leading-[1.35] text-ink-900 transition-colors duration-200 hover:text-brand-700"
                          >
                            {line.title}
                          </Link>
                          {line.variantLabel && <p className="t-small mt-0.5">{line.variantLabel}</p>}
                        </div>
                        <button
                          onClick={() => dispatch({ type: "cart/remove", id: line.id })}
                          aria-label={`Remove ${line.title}`}
                          className="tap -mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors duration-200 hover:bg-sale-50 hover:text-sale-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Wraps only in the extreme case: a six-figure line total at 320px. */}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2.5">
                        <div className="inline-flex items-center rounded-full bg-surface ring-1 ring-inset ring-line-strong">
                          <button
                            onClick={() =>
                              dispatch({ type: "cart/qty", id: line.id, quantity: line.quantity - 1 })
                            }
                            aria-label="Decrease quantity"
                            className="tap flex h-9 w-9 items-center justify-center rounded-full text-ink-700 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-950"
                          >
                            <Minus size={14} />
                          </button>
                          <span
                            aria-live="polite"
                            className="w-7 text-center text-[13px] font-semibold tabular-nums text-ink-950"
                          >
                            {line.quantity}
                          </span>
                          <button
                            onClick={() =>
                              dispatch({ type: "cart/qty", id: line.id, quantity: line.quantity + 1 })
                            }
                            disabled={line.quantity >= line.stock}
                            aria-label="Increase quantity"
                            className="tap flex h-9 w-9 items-center justify-center rounded-full text-ink-700 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-950 disabled:pointer-events-none disabled:text-ink-300"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="t-price text-[14.5px]">{formatINR(line.price * line.quantity)}</span>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-full text-ink-500 hover:text-sale-600"
            onClick={() => dispatch({ type: "cart/clear" })}
          >
            <Trash2 size={14} />
            Clear bag
          </Button>
        </div>
      )}
    </Drawer>
  );
}
