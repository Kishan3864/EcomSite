"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, Price } from "@/components/ui/primitives";
import { OrderSummary } from "@/components/cart/order-summary";
import { useStore } from "@/store/store";
import { useCommerce } from "@/store/commerce";
import { computeTotals } from "@/lib/pricing";
import { unavailableProductIds } from "@/services/cart-availability";

import { cn, formatINR } from "@/lib/utils";

/**
 * The bag.
 *
 * Drawn as a ruled index rather than a stack of cards: one hairline between
 * lines, nothing boxed, nothing shadowed. A bag of six items used to be six
 * separate objects floating on the page, which made a short bag look thin and
 * a long one look like a filing cabinet. As an index it reads as one document
 * at any length, and the ledger beside it is the same document's total.
 */

/** The row of small-caps actions under each line, and its phone strip twin. */
const LINE_ACTION =
  "text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200";

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
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-px">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-36 sm:h-32" />
          ))}
        </div>
        <div className="skeleton h-72" />
      </div>
    );
  }

  if (cart.length === 0 && saved.length === 0) {
    return (
      <EmptyState
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
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_368px] lg:gap-8">
        <div className="min-w-0 space-y-8 sm:space-y-10">
          {cart.length > 0 ? (
            <section>
              <header className="mb-2.5 flex items-center justify-between gap-4 sm:mb-3">
                <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  In your bag ({cart.length})
                </h2>
                {/* Padding widens the touch target; the negative margin keeps the row.
                    Off from lg, so the desktop focus ring still hugs the words. */}
                <button
                  onClick={() => dispatch({ type: "cart/clear" })}
                  className="-my-2.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500 transition-colors duration-200 hover:text-sale-600 lg:my-0 lg:py-0"
                >
                  Clear bag
                </button>
              </header>

              {blocked && (
                <div role="alert" className="mb-3 border-l-2 border-sale-600 bg-sale-50 px-3.5 py-3 sm:px-4">
                  <p className="text-[13.5px] font-semibold text-ink-950">
                    {goneLines.length === 1 ? "One item is" : `${goneLines.length} items are`} no longer available
                  </p>
                  <p className="mt-0.5 text-[13px] leading-[1.5] text-ink-600">
                    Remove {goneLines.length === 1 ? "it" : "them"} to continue to checkout. The rest of your bag is fine.
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {goneLines.map((line) => (
                      <li key={line.id} className="flex items-center justify-between gap-3 text-[13px] text-ink-800">
                        <span className="min-w-0 truncate">{line.title}</span>
                        <button
                          onClick={() => dispatch({ type: "cart/remove", id: line.id })}
                          className={cn(LINE_ACTION, "shrink-0 text-sale-600 hover:text-sale-700")}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ul>
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
                        className="overflow-hidden"
                      >
                        <div className="table-row-line flex gap-3 py-3 sm:gap-5 sm:py-4">
                          <Link
                            href={`/p/${line.slug}`}
                            className="relative h-24 w-20 shrink-0 overflow-hidden bg-ink-100 sm:h-32 sm:w-28"
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
                            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                              {line.brand}
                            </p>
                            <Link
                              href={`/p/${line.slug}`}
                              className="mt-1 line-clamp-2 text-[13.5px] font-medium leading-[1.35] text-ink-900 transition-colors duration-200 hover:text-brand-700 sm:text-[14px]"
                            >
                              {line.title}
                            </Link>
                            {line.variantLabel && (
                              <p className="mt-1 text-[13px] leading-[1.5] text-ink-500">
                                {line.variantLabel}
                              </p>
                            )}

                            <Price price={line.price} mrp={line.mrp} size="md" className="mt-2" />

                            {/* A fact, in the same ink as every other fact on the
                                page. It used to be printed in brand ocean on
                                every line, which spent the page's structural
                                colour on its least important sentence. */}
                            <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-500">
                              {line.deliveryDays <= 2
                                ? `Delivered in ${line.deliveryDays} day${line.deliveryDays > 1 ? "s" : ""}`
                                : `Delivered in ${line.deliveryDays} days`}
                              {line.freeShipping && " · Free"}
                            </p>

                            <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
                              <div className="inline-flex items-center overflow-hidden">
                                <button
                                  onClick={() =>
                                    dispatch({
                                      type: "cart/qty",
                                      id: line.id,
                                      quantity: line.quantity - 1,
                                    })
                                  }
                                  aria-label="Decrease quantity"
                                  className="flex h-10 w-10 items-center justify-center text-ink-600 transition-colors duration-200 hover:bg-ink-950 hover:text-white sm:h-9 sm:w-9"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="w-9 text-center text-[13px] font-semibold tabular-nums text-ink-950 sm:text-[13.5px]">
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
                                  className="flex h-10 w-10 items-center justify-center text-ink-600 transition-colors duration-200 hover:bg-ink-950 hover:text-white disabled:pointer-events-none disabled:text-ink-400 sm:h-9 sm:w-9"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              {/* From sm up the actions sit beside the stepper; phones
                                  get them as a full-width strip under the item. */}
                              <button
                                onClick={saveForLater}
                                className={`hidden text-ink-500 hover:text-ink-950 sm:inline-flex ${LINE_ACTION}`}
                              >
                                Save for later
                              </button>

                              <button
                                onClick={wishlist}
                                className={`hidden text-ink-500 hover:text-ink-950 sm:inline-flex ${LINE_ACTION}`}
                              >
                                {wishlisted ? "Wishlisted" : "Wishlist"}
                              </button>

                              <button
                                onClick={remove}
                                className={`ml-auto hidden text-ink-500 hover:text-sale-600 sm:inline-flex ${LINE_ACTION}`}
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          <p className="hidden shrink-0 text-right text-[15px] font-semibold tabular-nums text-ink-950 sm:block">
                            {formatINR(line.price * line.quantity)}
                          </p>
                        </div>

                        {/* Phones: three 40px targets across the line, like a native cart. */}
                        <div className="flex sm:hidden">
                          <button
                            onClick={saveForLater}
                            className={`tap flex h-10 flex-auto items-center justify-center whitespace-nowrap px-2 text-ink-500 hover:text-ink-950 ${LINE_ACTION}`}
                          >
                            Save for later
                          </button>
                          <button
                            onClick={wishlist}
                            className={`tap flex h-10 flex-auto items-center justify-center whitespace-nowrap px-2 text-ink-500 hover:text-ink-950 ${LINE_ACTION}`}
                          >
                            {wishlisted ? "Wishlisted" : "Wishlist"}
                          </button>
                          <button
                            onClick={remove}
                            className={`tap flex h-10 flex-auto items-center justify-center whitespace-nowrap px-2 text-ink-500 hover:text-sale-600 ${LINE_ACTION}`}
                          >
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
              <h2 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:mb-3">
                Saved for later ({saved.length})
              </h2>
              {/* One shared hairline grid rather than a row of boxed cards. An
                  odd count would otherwise leave the last cell as a rectangle
                  of bare hairline, so the last tile takes the whole row. */}
              <ul className="tile-grid grid-cols-1 sm:grid-cols-2">
                {saved.map((line) => (
                  <li
                    key={line.id}
                    className={cn(
                      "flex gap-3 p-3 sm:gap-3.5 sm:p-3.5",
                      saved.length % 2 === 1 && "sm:last:col-span-2",
                    )}
                  >
                    <Link
                      href={`/p/${line.slug}`}
                      className="relative h-24 w-20 shrink-0 overflow-hidden bg-ink-100"
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
                      {/* Both buttons are wider than the text column at 320px and in
                          the two-up tablet grid, so they may wrap there. */}
                      <div className="mt-auto flex flex-wrap gap-2 pt-2.5 lg:flex-nowrap">
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-10 px-2.5 sm:h-8 sm:px-3"
                          onClick={() => dispatch({ type: "cart/unsave", id: line.id })}
                        >
                          Move to bag
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-10 px-2.5 sm:h-8 sm:px-3"
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
            <OrderSummary
              totals={totals}
              lines={cart}
              delivery={config.deliveryOptions[0]}
              cta={blocked ? undefined : "Proceed to checkout"}
              ctaHref="/checkout/address"
            />
            <p className="text-[13px] leading-[1.5] text-ink-500">
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
        <div className="sticky bottom-[calc(61px_+_env(safe-area-inset-bottom))] z-30 -mx-3 mt-4 flex items-center justify-between gap-3 bg-surface px-3 py-2.5 sm:-mx-6 sm:px-6 lg:hidden">
          <p className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              Total payable
            </span>
            <span className="mt-0.5 block text-[17px] font-semibold leading-tight tabular-nums text-ink-950">
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
