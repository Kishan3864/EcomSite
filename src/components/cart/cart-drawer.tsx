"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Drawer } from "@/components/ui/overlay";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { useStore } from "@/store/store";
import { computeTotals, FREE_SHIPPING_THRESHOLD } from "@/lib/pricing";
import { formatINR } from "@/lib/utils";

export function CartDrawer() {
  const { cart, cartDrawerOpen, closeCartDrawer, dispatch, hydrated } = useStore();
  const totals = computeTotals(cart, { delivery: null });
  const toFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - totals.itemsTotal);
  const progress = Math.min(100, (totals.itemsTotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <Drawer
      open={cartDrawerOpen && hydrated}
      onClose={closeCartDrawer}
      title="Your bag"
      description={cart.length ? `${cart.length} item${cart.length > 1 ? "s" : ""} ready to check out` : undefined}
      footer={
        cart.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-600">Subtotal</span>
              <span className="text-lg font-semibold tabular-nums text-ink-950">
                {formatINR(totals.itemsTotal)}
              </span>
            </div>
            {totals.savings > 0 && (
              <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800">
                You are saving {formatINR(totals.savings)} on this order
              </p>
            )}
            <div className="flex gap-2">
              <Link
                href="/cart"
                onClick={closeCartDrawer}
                className={buttonClasses("outline", "md", "flex-1")}
              >
                View bag
              </Link>
              <Link
                href="/checkout/address"
                onClick={closeCartDrawer}
                className={buttonClasses("primary", "md", "flex-1")}
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
        <div className="p-5">
          <EmptyState
            icon={<ShoppingBag size={26} />}
            title="Your bag is empty"
            body="Add something you like and it will show up here. Your bag is saved on this device."
            action={
              <Link href="/products" onClick={closeCartDrawer} className={buttonClasses("primary", "md")}>
                Start shopping
              </Link>
            }
            className="border-none bg-transparent py-10"
          />
        </div>
      ) : (
        <>
          <div className="border-b border-hairline bg-surface px-5 py-4">
            {toFreeShipping > 0 ? (
              <p className="text-xs text-ink-600">
                Add <strong className="text-ink-900">{formatINR(toFreeShipping)}</strong> more for
                free delivery
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs font-medium text-brand-700">
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
                  <div className="flex gap-3.5 p-4">
                    <Link
                      href={`/p/${line.slug}`}
                      onClick={closeCartDrawer}
                      className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-100"
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
                        className="line-clamp-2 text-[13.5px] font-medium leading-snug text-ink-900 hover:text-brand-700"
                      >
                        {line.title}
                      </Link>
                      {line.variantLabel && (
                        <p className="mt-0.5 text-[11.5px] text-ink-500">{line.variantLabel}</p>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
                        <div className="inline-flex items-center rounded-lg border border-ink-200">
                          <button
                            onClick={() =>
                              dispatch({ type: "cart/qty", id: line.id, quantity: line.quantity - 1 })
                            }
                            aria-label="Decrease quantity"
                            className="flex h-8 w-8 items-center justify-center rounded-l-lg text-ink-600 transition-colors hover:bg-ink-100"
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
                            className="flex h-8 w-8 items-center justify-center rounded-r-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-ink-950">
                          {formatINR(line.price * line.quantity)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => dispatch({ type: "cart/remove", id: line.id })}
                      aria-label={`Remove ${line.title}`}
                      className="-mr-1 -mt-1 h-fit rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="p-5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-ink-500"
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
