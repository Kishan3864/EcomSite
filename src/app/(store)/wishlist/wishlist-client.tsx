"use client";

import Image from "@/components/ui/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ShoppingBag, X } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, Price, Stars } from "@/components/ui/primitives";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { useStore } from "@/store/store";
import { useCommerce } from "@/store/commerce";
import { formatDate } from "@/lib/utils";

/**
 * Saved items, drawn as the product grid is drawn: tiles sitting on one shared
 * hairline rule rather than a row of outlined cards, so a wishlist and a
 * listing look like the same shop.
 */
export function WishlistClient() {
  const { wishlist, dispatch, hydrated } = useStore();
  const { addToCart } = useCommerce();

  if (!hydrated) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <EmptyState
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
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-ink-950 pb-3 sm:mb-5">
        <p className="min-w-0 text-[13px] text-ink-500">
          <span className="font-semibold tabular-nums text-ink-950">{wishlist.length}</span> saved
          {wishlist.length > 1 ? " items" : " item"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="-mr-2 h-10 px-3 sm:mr-0 sm:h-9 sm:px-4"
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
          Move all to bag
        </Button>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <AnimatePresence initial={false}>
          {wishlist.map((item) => (
            <motion.li
              key={item.productId}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex flex-col bg-surface transition-colors duration-300 hover:bg-ink-50/60"
            >
              <button
                onClick={() => dispatch({ type: "wishlist/remove", productId: item.productId })}
                aria-label={`Remove ${item.title} from wishlist`}
                // Phones: a 40px target around a 32px square kept flush in the
                // corner; the padding sits on the inner sides, outside the paint.
                className="tap absolute right-0 top-0 z-10 flex h-10 w-10 items-center justify-center bg-surface/85 bg-clip-content pb-2 pl-2 text-ink-600 transition-colors duration-200 hover:bg-ink-950 hover:text-white sm:h-9 sm:w-9 sm:p-0"
              >
                <X size={15} />
              </button>

              <Link
                href={`/p/${item.slug}`}
                className="tap relative aspect-[3/4] overflow-hidden bg-ink-100"
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col px-2.5 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-4">
                <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 sm:mb-1.5">
                  {item.brand}
                </p>
                <h3 className="text-[12.5px] font-medium leading-[1.35] tracking-[-0.005em] text-ink-900 sm:text-[13.5px] sm:leading-[1.4]">
                  <Link href={`/p/${item.slug}`} className="line-clamp-2 hover:text-brand-700">
                    {item.title}
                  </Link>
                </h3>
                {/* Stars draw nothing until somebody has actually scored the
                    product, so this column simply closes up on a new catalogue
                    rather than leaving five empty outlines behind. */}
                <Stars value={item.rating} size={12} className="mt-1.5" />
                <Price price={item.price} mrp={item.mrp} size="sm" className="mt-1.5 sm:mt-2.5" />
                <p className="mt-1.5 text-[11.5px] text-ink-500 sm:text-[12px]">
                  Saved {formatDate(item.addedAt, "short")}
                </p>

                {/* Narrow phone cards drop the icon and some padding so the
                    label never spills past the button's edges at 320px. */}
                <div className="mt-auto pt-2.5 sm:pt-3.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 w-full px-2 text-[11px] sm:px-4 sm:text-[12px]"
                    disabled={item.stock <= 0}
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
                    <ShoppingBag size={14} className="hidden sm:block" />
                    {item.stock <= 0 ? "Out of stock" : "Move to bag"}
                  </Button>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}
