"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Heart, ShoppingBag, X } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, Price, Stars } from "@/components/ui/primitives";
import { useStore } from "@/store/store";
import { useCommerce } from "@/store/commerce";
import { formatDate } from "@/lib/utils";

export function WishlistClient() {
  const { wishlist, dispatch, hydrated } = useStore();
  const { addToCart } = useCommerce();

  if (!hydrated) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-xl" />
        ))}
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <EmptyState
        icon={<Heart size={26} />}
        title="Nothing saved yet"
        body="Tap the heart on any product to keep it here. Your wishlist is stored on this device."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/products" className={buttonClasses("primary", "md")}>
              Browse products
            </Link>
            <Link href="/offers" className={buttonClasses("outline", "md")}>
              See what is on offer
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-ink-500">
          <span className="font-semibold text-ink-900 tabular-nums">{wishlist.length}</span> saved
          {wishlist.length > 1 ? " items" : " item"}
        </p>
        <Button
          variant="ghost"
          size="sm"
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
                },
                { silent: true },
              ),
            )
          }
        >
          Move all to bag
        </Button>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <AnimatePresence initial={false}>
          {wishlist.map((item) => (
            <motion.li
              key={item.productId}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface transition-shadow duration-300 hover:shadow-md"
            >
              <button
                onClick={() => dispatch({ type: "wishlist/remove", productId: item.productId })}
                aria-label={`Remove ${item.title} from wishlist`}
                className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-ink-500 shadow-sm backdrop-blur transition-colors hover:bg-sale-500 hover:text-white"
              >
                <X size={14} />
              </button>

              <Link
                href={`/p/${item.slug}`}
                className="relative aspect-[4/5] overflow-hidden bg-ink-100"
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(min-width:1024px) 20vw, 45vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </Link>

              <div className="flex flex-1 flex-col p-3 sm:p-3.5">
                <p className="mb-1 truncate text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                  {item.brand}
                </p>
                <Link
                  href={`/p/${item.slug}`}
                  className="line-clamp-2 text-[13.5px] font-medium leading-snug text-ink-950 hover:text-brand-700"
                >
                  {item.title}
                </Link>
                <Stars value={item.rating} size={12} className="mt-1.5" />
                <Price price={item.price} mrp={item.mrp} size="md" className="mt-1.5" />
                <p className="mt-1 text-[11px] text-ink-400">
                  Saved {formatDate(item.addedAt, "short")}
                </p>

                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
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
                    })
                  }
                >
                  <ShoppingBag size={14} />
                  {item.stock <= 0 ? "Out of stock" : "Move to bag"}
                </Button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}
