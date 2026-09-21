"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Bookmark,
  Heart,
  Minus,
  PackageX,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, Price } from "@/components/ui/primitives";
import { OrderSummary } from "@/components/cart/order-summary";
import { CheckoutTrustRow } from "@/components/checkout/trust-row";
import { useStore } from "@/store/store";
import { useCommerce } from "@/store/commerce";
import { computeTotals } from "@/lib/pricing";
import { unavailableProductIds } from "@/services/cart-availability";

import { cn, formatINR } from "@/lib/utils";

/** The small icon+word actions under each line. */
const LINE_ACTION =
  "tap inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink-600 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-950";

export function CartClient() {
  const { cart, saved, config, dispatch, hydrated } = useStore();
  const { toggleWishlist, isWishlisted } = useCommerce();

  // The bag is the browser's own copy, so a product hidden or withdrawn since
  // it was added still sits here. Ask the server which lines can no longer be
  // bought — before checkout, not at its last step. A failed check changes
  // nothing: `placeOrder` still refuses such a line, as it always has.
  const productKey = useMemo(() => [...new Set(cart.map((l) => l.productId))].sort().join(","), [cart]);
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!hydrated || productKey === "") return;
    let live = true;
    unavailableProductIds(productKey.split(","))
      .then((ids) => live && setUnavailable(new Set(ids)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [hydrated, productKey]);
  const goneLines = cart.filter((l) => unavailable.has(l.productId));
  const blocked = goneLines.length > 0;

  if (!hydrated) {
    return (
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-36 rounded-xl sm:h-40" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-xl" />
      </div>
    );
  }

  if (cart.length === 0 && saved.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag size={24} />}
        title="Your bag is empty"
        body="Nothing here yet. Browse the catalogue and anything you add will be saved on this device."
        action={
          <Link href="/products" className={buttonClasses("primary", "md")}>
            Start shopping
          </Link>
        }
      />
    );
  }
  const totals = computeTotals(cart, {
    delivery: config.deliveryOptions[0],
    rates: config.rates,
  });

  return (
    <>
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="min-w-0 space-y-8 sm:space-y-10">
          {cart.length > 0 ? (
            <section aria-labelledby="bag-heading">
              <header className="mb-3 flex items-center justify-between gap-4">
                <h2 id="bag-heading" className="t-h3 flex items-center gap-2">
                  In your bag
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-brand-700">
                    {cart.length}
                  </span>
                </h2>
                <button
                  onClick={() => dispatch({ type: "cart/clear" })}
                  className="tap inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink-500 transition-colors duration-200 hover:bg-sale-50 hover:text-sale-600"
                >
                  <Trash2 size={14} aria-hidden />
                  Clear bag
                </button>
              </header>

              {blocked && (
                <div role="alert" className="mb-3 rounded-xl border border-sale-200 bg-sale-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="icon-tile icon-tile-sm bg-white text-sale-600" aria-hidden>
                      <PackageX size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink-950">
                        {goneLines.length === 1 ? "One item is" : `${goneLines.length} items are`} no longer available
                      </p>
                      <p className="mt-0.5 text-[13px] leading-[1.5] text-ink-600">
                        Remove {goneLines.length === 1 ? "it" : "them"} to continue to checkout. The rest of your bag is fine.
                      </p>
                      <ul className="mt-2 space-y-1">
                        {goneLines.map((line) => (
                          <li key={line.id} className="flex items-center justify-between gap-3 text-[13px] text-ink-800">
                            <span className="min-w-0 truncate">{line.title}</span>
                            <button
                              onClick={() => dispatch({ type: "cart/remove", id: line.id })}
                              className="tap inline-flex h-9 shrink-0 items-center rounded-full px-3 text-[12.5px] font-semibold text-sale-600 transition-colors duration-200 hover:bg-white hover:text-sale-700"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              <ul className="space-y-3">
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
                        codAvailable: line.codAvailable,
                      });

                    return (
                      <motion.li
                        key={line.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="card overflow-hidden"
                      >
                        <div className="flex gap-3.5 p-3.5 sm:gap-5 sm:p-5">
                          <Link
                            href={`/p/${line.slug}`}
                            className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-ink-100 ring-1 ring-inset ring-line sm:h-36 sm:w-28"
                          >
                            <Image
                              src={line.image}
                              alt=""
                              fill
                              sizes="(min-width: 640px) 112px, 96px"
                              className="object-cover"
                            />
                          </Link>

                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                {line.brand && <p className="t-label truncate text-[10px]">{line.brand}</p>}
                                <Link
                                  href={`/p/${line.slug}`}
                                  className="mt-0.5 line-clamp-2 text-[14px] font-medium leading-[1.35] text-ink-900 transition-colors duration-200 hover:text-brand-700"
                                >
                                  {line.title}
                                </Link>
                                {line.variantLabel && <p className="t-small mt-1">{line.variantLabel}</p>}
                              </div>
                              <p className="t-price hidden shrink-0 text-right text-[16px] sm:block">
                                {formatINR(line.price * line.quantity)}
                              </p>
                            </div>

                            <Price price={line.price} mrp={line.mrp} size="sm" className="mt-2" />

                            <p className="t-small mt-1.5 flex items-center gap-1.5">
                              <Truck size={14} aria-hidden className="shrink-0" />
                              {line.deliveryDays <= 2
                                ? `Delivered in ${line.deliveryDays} day${line.deliveryDays > 1 ? "s" : ""}`
                                : `Delivered in ${line.deliveryDays} days`}
                              {line.freeShipping && " · Free"}
                            </p>

                            <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-2 pt-3">
                              <div className="inline-flex items-center rounded-full bg-surface ring-1 ring-inset ring-line-strong">
                                <button
                                  onClick={() =>
                                    dispatch({
                                      type: "cart/qty",
                                      id: line.id,
                                      quantity: line.quantity - 1,
                                    })
                                  }
                                  aria-label="Decrease quantity"
                                  className="tap flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-950 sm:h-9 sm:w-9"
                                >
                                  <Minus size={14} />
                                </button>
                                <span
                                  aria-live="polite"
                                  className="w-8 text-center text-[13.5px] font-semibold tabular-nums text-ink-950"
                                >
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
                                  className="tap flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-950 disabled:pointer-events-none disabled:text-ink-300 sm:h-9 sm:w-9"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              <span className="t-price ml-auto text-[15px] sm:hidden">
                                {formatINR(line.price * line.quantity)}
                              </span>

                              {/* From sm up the actions sit beside the stepper; phones
                                  get them as a full-width strip under the item. */}
                              <div className="hidden flex-1 items-center gap-1 sm:flex">
                                <button onClick={saveForLater} className={LINE_ACTION}>
                                  <Bookmark size={14} aria-hidden />
                                  Save for later
                                </button>
                                <button onClick={wishlist} className={LINE_ACTION} aria-pressed={wishlisted}>
                                  <Heart
                                    size={14}
                                    aria-hidden
                                    className={cn(wishlisted && "fill-current text-sale-600")}
                                  />
                                  {wishlisted ? "Wishlisted" : "Wishlist"}
                                </button>
                                <button
                                  onClick={remove}
                                  className={cn(LINE_ACTION, "ml-auto hover:bg-sale-50 hover:text-sale-600")}
                                >
                                  <Trash2 size={14} aria-hidden />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Phones: three 40px targets across the line, like a native cart. */}
                        <div className="grid grid-cols-3 border-t border-line sm:hidden">
                          <button
                            onClick={saveForLater}
                            className="tap flex h-11 items-center justify-center gap-1.5 whitespace-nowrap px-2 text-[12px] font-medium text-ink-600 transition-colors duration-200 hover:text-ink-950"
                          >
                            <Bookmark size={14} aria-hidden />
                            Save for later
                          </button>
                          <button
                            onClick={wishlist}
                            aria-pressed={wishlisted}
                            className="tap flex h-11 items-center justify-center gap-1.5 whitespace-nowrap border-x border-line px-2 text-[12px] font-medium text-ink-600 transition-colors duration-200 hover:text-ink-950"
                          >
                            <Heart
                              size={14}
                              aria-hidden
                              className={cn(wishlisted && "fill-current text-sale-600")}
                            />
                            {wishlisted ? "Wishlisted" : "Wishlist"}
                          </button>
                          <button
                            onClick={remove}
                            className="tap flex h-11 items-center justify-center gap-1.5 whitespace-nowrap px-2 text-[12px] font-medium text-ink-600 transition-colors duration-200 hover:text-sale-600"
                          >
                            <Trash2 size={14} aria-hidden />
                            Remove
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
              className="py-8 sm:py-10"
            />
          )}

          {saved.length > 0 && (
            <section aria-labelledby="saved-heading">
              <h2 id="saved-heading" className="t-h3 mb-3 flex items-center gap-2">
                <Bookmark size={16} aria-hidden className="text-ink-500" />
                Saved for later
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-ink-700">
                  {saved.length}
                </span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {saved.map((line) => (
                  <li key={line.id} className="card flex gap-3 p-3 sm:gap-3.5 sm:p-3.5">
                    <Link
                      href={`/p/${line.slug}`}
                      className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-ink-100 ring-1 ring-inset ring-line"
                    >
                      <Image src={line.image} alt="" fill sizes="80px" className="object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link
                        href={`/p/${line.slug}`}
                        className="line-clamp-2 text-[13.5px] font-medium leading-[1.35] text-ink-900 transition-colors duration-200 hover:text-brand-700"
                      >
                        {line.title}
                      </Link>
                      <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1.5" />
                      {/* Both buttons may wrap at 320px and in the two-up tablet grid. */}
                      <div className="mt-auto flex flex-wrap gap-2 pt-2.5 lg:flex-nowrap">
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-10 px-3 sm:h-8"
                          onClick={() => dispatch({ type: "cart/unsave", id: line.id })}
                        >
                          <ShoppingBag size={14} aria-hidden />
                          Move to bag
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-10 px-3 sm:h-8"
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
          <aside className="min-w-0 space-y-3 sm:space-y-4 lg:sticky-under-header lg:h-fit">
            <OrderSummary
              totals={totals}
              lines={cart}
              delivery={config.deliveryOptions[0]}
              cta={blocked ? undefined : "Proceed to checkout"}
              ctaHref="/checkout/address"
            />
            <CheckoutTrustRow variant="stack" />
            <p className="t-small px-1">
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
      {cart.length > 0 && !blocked && (
        <div className="glass sticky bottom-[calc(61px_+_env(safe-area-inset-bottom))] z-30 -mx-3 mt-5 flex items-center justify-between gap-3 border-t border-line px-3 py-3 shadow-[0_-12px_28px_-18px_rgb(10_15_26/0.28)] sm:-mx-6 sm:px-6 lg:hidden">
          <p className="min-w-0">
            <span className="t-label block">Total payable</span>
            <span className="t-price mt-1 block text-[18px] leading-tight">{formatINR(totals.total)}</span>
          </p>
          <Link
            href="/checkout/address"
            className={buttonClasses("accent", "lg", "shrink-0 px-6 sm:min-w-[240px]")}
          >
            Checkout
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
