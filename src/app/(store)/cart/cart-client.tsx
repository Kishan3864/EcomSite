"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BookmarkPlus,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import type { Offer } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, Price } from "@/components/ui/primitives";
import { CouponBox } from "@/components/cart/coupon-box";
import { OrderSummary } from "@/components/cart/order-summary";
import { useStore } from "@/store/store";
import { useCommerce } from "@/store/commerce";
import { computeTotals, evaluateCoupon } from "@/lib/pricing";

import { formatINR } from "@/lib/utils";

export function CartClient({ offers }: { offers: Offer[] }) {
  const { cart, saved, coupon, config, dispatch, hydrated } = useStore();
  const { toggleWishlist, isWishlisted } = useCommerce();

  if (!hydrated) {
    return (
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-2 sm:space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-36 rounded-xl sm:h-32" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-xl" />
      </div>
    );
  }

  if (cart.length === 0 && saved.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag size={26} />}
        title="Your bag is empty"
        body="Nothing here yet. Browse the catalogue and anything you add will be saved on this device."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/products" className={buttonClasses("primary", "md")}>
              Start shopping
            </Link>
            <Link href="/offers" className={buttonClasses("outline", "md")}>
              See today&rsquo;s deals
            </Link>
          </div>
        }
      />
    );
  }

  const itemsTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const cartCategories = [...new Set(cart.map((l) => l.categorySlug))];
  const appliedOffer = offers.find((o) => o.code === coupon) ?? null;
  const check = appliedOffer
    ? evaluateCoupon(appliedOffer, itemsTotal, cartCategories)
    : { ok: false, discount: 0 };

  const totals = computeTotals(cart, {
    delivery: config.deliveryOptions[0],
    rates: config.rates,
    coupon:
      appliedOffer && check.ok
        ? { code: appliedOffer.code, discount: check.discount, type: appliedOffer.type }
        : null,
  });

  return (
    <>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_368px] lg:gap-8">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          {cart.length > 0 ? (
            <section>
              <header className="mb-2 flex items-center justify-between sm:mb-3">
                <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:text-[13px]">
                  In your bag ({cart.length})
                </h2>
                {/* Padding widens the touch target; the negative margin keeps the row.
                    Off from lg, so the desktop focus ring still hugs the words. */}
                <button
                  onClick={() => dispatch({ type: "cart/clear" })}
                  className="-my-2.5 py-2.5 text-[12px] font-medium text-ink-500 underline-offset-2 hover:text-sale-600 hover:underline sm:text-[12.5px] lg:my-0 lg:py-0"
                >
                  Clear bag
                </button>
              </header>

              <ul className="space-y-2 sm:space-y-3">
                <AnimatePresence initial={false}>
                  {cart.map((line) => {
                    const saveForLater = () => dispatch({ type: "cart/save", id: line.id });
                    const remove = () => dispatch({ type: "cart/remove", id: line.id });
                    const wishlisted = isWishlisted(line.productId);
                    const wishlist = () =>
                      toggleWishlist({
                        id: line.productId,
                        slug: line.slug,
                        title: line.title,
                        brand: line.brand,
                        categorySlug: line.categorySlug,
                        image: line.image,
                        price: line.price,
                        mrp: line.mrp,
                        stock: line.stock,
                        deliveryDays: line.deliveryDays,
                        freeShipping: line.freeShipping,
                      });

                    return (
                      <motion.li
                        key={line.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden rounded-xl border border-hairline bg-surface"
                      >
                        <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                          <Link
                            href={`/p/${line.slug}`}
                            className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-100 sm:h-32 sm:w-28"
                          >
                            <Image
                              src={line.image}
                              alt=""
                              fill
                              sizes="(min-width: 640px) 112px, 80px"
                              className="object-cover"
                            />
                          </Link>

                          <div className="flex min-w-0 flex-1 flex-col">
                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                              {line.brand}
                            </p>
                            <Link
                              href={`/p/${line.slug}`}
                              className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug text-ink-950 hover:text-brand-700 sm:text-[14px]"
                            >
                              {line.title}
                            </Link>
                            {line.variantLabel && (
                              <p className="mt-0.5 text-[11.5px] text-ink-500 sm:mt-1 sm:text-[12px]">
                                {line.variantLabel}
                              </p>
                            )}

                            <Price
                              price={line.price}
                              mrp={line.mrp}
                              size="md"
                              className="mt-1 sm:mt-2"
                            />

                            <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-brand-700 sm:mt-1.5">
                              <Truck size={12} className="shrink-0" />
                              {line.deliveryDays <= 2
                                ? `Delivered in ${line.deliveryDays} day${line.deliveryDays > 1 ? "s" : ""}`
                                : `Delivered in ${line.deliveryDays} days`}
                              {line.freeShipping && " · Free"}
                            </p>

                            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 sm:pt-3">
                              <div className="inline-flex items-center rounded-lg border border-ink-200">
                                <button
                                  onClick={() =>
                                    dispatch({
                                      type: "cart/qty",
                                      id: line.id,
                                      quantity: line.quantity - 1,
                                    })
                                  }
                                  aria-label="Decrease quantity"
                                  className="flex h-10 w-10 items-center justify-center rounded-l-lg text-ink-600 transition-colors hover:bg-ink-100 sm:h-9 sm:w-9"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="w-7 text-center text-[13px] font-semibold tabular-nums sm:w-8 sm:text-[13.5px]">
                                  {line.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    dispatch({
                                      type: "cart/qty",
                                      id: line.id,
                                      quantity: line.quantity + 1,
                                    })
                                  }
                                  disabled={line.quantity >= line.stock}
                                  aria-label="Increase quantity"
                                  className="flex h-10 w-10 items-center justify-center rounded-r-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40 sm:h-9 sm:w-9"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              {/* From sm up the actions sit beside the stepper; phones
                                  get them as a full-width strip under the item. */}
                              <button
                                onClick={saveForLater}
                                className="hidden items-center gap-1.5 text-[12.5px] font-medium text-ink-600 transition-colors hover:text-brand-700 sm:inline-flex"
                              >
                                <BookmarkPlus size={14} /> Save for later
                              </button>

                              <button
                                onClick={wishlist}
                                className="hidden items-center gap-1.5 text-[12.5px] font-medium text-ink-600 transition-colors hover:text-sale-600 sm:inline-flex"
                              >
                                <Heart size={14} fill={wishlisted ? "currentColor" : "none"} />
                                Wishlist
                              </button>

                              <button
                                onClick={remove}
                                className="ml-auto hidden items-center gap-1.5 text-[12.5px] font-medium text-ink-500 transition-colors hover:text-sale-600 sm:inline-flex"
                              >
                                <Trash2 size={14} /> Remove
                              </button>
                            </div>
                          </div>

                          <p className="hidden shrink-0 text-right text-[15px] font-semibold tabular-nums text-ink-950 sm:block">
                            {formatINR(line.price * line.quantity)}
                          </p>
                        </div>

                        {/* Phones: three 40px targets across the card, like a native cart. */}
                        <div className="flex divide-x divide-hairline border-t border-hairline sm:hidden">
                          <button
                            onClick={saveForLater}
                            className="tap flex h-10 flex-auto items-center justify-center gap-1.5 whitespace-nowrap px-2 text-[12px] font-medium text-ink-600 transition-colors hover:text-brand-700"
                          >
                            <BookmarkPlus size={14} /> Save for later
                          </button>
                          <button
                            onClick={wishlist}
                            className="tap flex h-10 flex-auto items-center justify-center gap-1.5 whitespace-nowrap px-2 text-[12px] font-medium text-ink-600 transition-colors hover:text-sale-600"
                          >
                            <Heart size={14} fill={wishlisted ? "currentColor" : "none"} />
                            Wishlist
                          </button>
                          <button
                            onClick={remove}
                            className="tap flex h-10 flex-auto items-center justify-center gap-1.5 whitespace-nowrap px-2 text-[12px] font-medium text-ink-500 transition-colors hover:text-sale-600"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ) : (
            <EmptyState
              icon={<ShoppingBag size={24} />}
              title="Nothing in your bag"
              body="You still have items saved for later below."
              action={
                <Link href="/products" className={buttonClasses("primary", "md")}>
                  Browse products
                </Link>
              }
              className="py-7 sm:py-10"
            />
          )}

          {saved.length > 0 && (
            <section>
              <h2 className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:mb-3 sm:text-[13px]">
                Saved for later ({saved.length})
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                {saved.map((line) => (
                  <li
                    key={line.id}
                    className="flex gap-3 rounded-xl border border-hairline bg-surface p-3 sm:gap-3.5 sm:p-3.5"
                  >
                    <Link
                      href={`/p/${line.slug}`}
                      className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-100"
                    >
                      <Image src={line.image} alt="" fill sizes="80px" className="object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link
                        href={`/p/${line.slug}`}
                        className="line-clamp-2 text-[13px] font-medium leading-snug text-ink-950 hover:text-brand-700"
                      >
                        {line.title}
                      </Link>
                      <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1.5" />
                      {/* Both buttons are wider than the text column at 320px and in
                          the two-up tablet grid, so they may wrap there. */}
                      <div className="mt-auto flex flex-wrap gap-2 pt-2 lg:flex-nowrap">
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-10 px-2 sm:h-8 sm:px-3"
                          onClick={() => dispatch({ type: "cart/unsave", id: line.id })}
                        >
                          Move to bag
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-10 px-2 sm:h-8 sm:px-3"
                          onClick={() => dispatch({ type: "cart/removeSaved", id: line.id })}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {cart.length > 0 && (
          <aside className="min-w-0 space-y-3 sm:space-y-4 lg:sticky lg:top-[132px] lg:h-fit">
            <CouponBox
              offers={offers}
              itemsTotal={itemsTotal}
              categories={cartCategories}
            />
            <OrderSummary
              totals={totals}
              lines={cart}
              delivery={config.deliveryOptions[0]}
              cta="Proceed to checkout"
              ctaHref="/checkout/address"
            />
            <p className="text-center text-[11.5px] leading-relaxed text-ink-400">
              Prices and availability are confirmed at checkout. Items in your bag are not reserved.
            </p>
          </aside>
        )}
      </div>

      {/* Below lg the summary stacks under the items, so the total and the way
          to checkout ride along at the bottom, on top of the BottomNav (61px
          plus the home-indicator inset; keep in step with it). Sticky rather
          than fixed: it parks at the end of the bag instead of covering the
          footer. */}
      {cart.length > 0 && (
        <div className="sticky bottom-[calc(61px_+_env(safe-area-inset-bottom))] z-30 -mx-3 mt-4 flex items-center justify-between gap-3 border-t border-hairline bg-surface px-3 py-2.5 sm:-mx-6 sm:px-6 lg:hidden">
          <p className="min-w-0">
            <span className="block text-[11.5px] text-ink-500">Total payable</span>
            <span className="block text-[17px] font-semibold leading-tight tabular-nums text-ink-950">
              {formatINR(totals.total)}
            </span>
          </p>
          <Link
            href="/checkout/address"
            className={buttonClasses("primary", "md", "shrink-0 px-5 sm:min-w-[240px]")}
          >
            Checkout
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
