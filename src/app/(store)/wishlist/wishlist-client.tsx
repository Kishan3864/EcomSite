"use client";

import { ProductBadges } from "@/components/product/badges";
import Image from "@/components/ui/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Heart, ShoppingBag, X } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, Price, Stars } from "@/components/ui/primitives";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { useStore } from "@/store/store";
import { useCommerce } from "@/store/commerce";
import { formatDate } from "@/lib/utils";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5";

/** Saved items, drawn in the product card's shape so a wishlist and a listing look alike. */
export function WishlistClient() {
  const { wishlist, dispatch, hydrated } = useStore();
  const { addToCart } = useCommerce();

  if (!hydrated) {
    return (
      <div className={GRID}>
        {[0, 1, 2, 3, 4].map((i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <EmptyState
        icon={<Heart size={24} />}
        title="Nothing saved yet"
        body="Tap the heart on any product to keep it here. Your wishlist is stored on this device."
        action={
          <Link href="/products" className={buttonClasses("primary", "md")}>
            Browse products
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <p className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[12.5px] text-ink-600 ring-1 ring-inset ring-line">
          <Heart size={14} aria-hidden className="fill-current text-sale-600" />
          <span className="font-semibold tabular-nums text-ink-950">{wishlist.length}</span> saved
          {wishlist.length > 1 ? " items" : " item"}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-3.5 sm:h-9 sm:px-4"
          onClick={() =>
            wishlist.forEach((item) =>
              addToCart(
                {
                  id: item.productId,
                  slug: item.slug,
                  title: item.title,
                  brand: item.brand,
                  categorySlug: item.categorySlug,
                  image: item.image,
                  price: item.price,
                  mrp: item.mrp,
                  stock: item.stock,
                  deliveryDays: 3,
                  freeShipping: item.price >= 999,
                  // The wishlist row does not carry it. placeOrder re-reads every
                  // line from the catalogue and refuses COD there if the product
                  // does not allow it, so this is a starting guess, not a claim.
                  codAvailable: true,
                },
                { silent: true },
              ),
            )
          }
        >
          <ShoppingBag size={16} /> Move all to bag
        </Button>
      </div>

      <ul className={GRID}>
        <AnimatePresence initial={false}>
          {wishlist.map((item) => {
            const outOfStock = item.stock <= 0;
            return (
              <motion.li
                key={item.productId}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="card card-interactive group relative flex flex-col overflow-hidden"
              >
                <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-ink-50 to-ink-100/70">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                    className={
                      "object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]" +
                      (outOfStock ? " opacity-50 grayscale" : "")
                    }
                  />
                  {/* A saved item keeps no admin badges, so these are the three the shop works out. */}
                  <ProductBadges
                    product={{ badges: [], price: item.price, mrp: item.mrp, stock: item.stock }}
                    max={2}
                    className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex-col !items-start"
                  />
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "wishlist/remove", productId: item.productId })}
                    aria-label={`Remove ${item.title} from wishlist`}
                    className="glass absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full text-ink-600 ring-1 ring-inset ring-ink-950/5 transition-colors duration-200 hover:text-sale-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex min-w-0 flex-1 flex-col px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5">
                  {item.brand && (
                    <p className="mb-0.5 truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      {item.brand}
                    </p>
                  )}
                  <h3 className="text-[13px] font-medium leading-[1.35] text-ink-900">
                    <Link
                      href={`/p/${item.slug}`}
                      className="line-clamp-2 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-brand-700 focus-visible:outline-none"
                    >
                      {item.title}
                    </Link>
                  </h3>
                  {/* Draws nothing until the product has a score. */}
                  <Stars value={item.rating} size={12} className="mt-1.5" />
                  <Price price={item.price} mrp={item.mrp} size="sm" className="mt-1.5" />
                  <p className="t-small mt-1 text-[11.5px]">Saved {formatDate(item.addedAt, "short")}</p>

                  <div className="relative z-10 mt-auto pt-3">
                    <Button
                      size="sm"
                      variant={outOfStock ? "subtle" : "accent"}
                      className="h-10 w-full rounded-full px-2 text-[12px] sm:h-9"
                      disabled={outOfStock}
                      onClick={() =>
                        addToCart({
                          id: item.productId,
                          slug: item.slug,
                          title: item.title,
                          brand: item.brand,
                          categorySlug: item.categorySlug,
                          image: item.image,
                          price: item.price,
                          mrp: item.mrp,
                          stock: item.stock,
                          deliveryDays: 3,
                          freeShipping: item.price >= 999,
                          codAvailable: true,
                        })
                      }
                    >
                      <ShoppingBag size={14} className="hidden min-[360px]:block" />
                      {outOfStock ? "Out of stock" : "Move to bag"}
                    </Button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </>
  );
}
