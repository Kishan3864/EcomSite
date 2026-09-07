"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ProductCardModel } from "@/lib/card";
import { useStore, type WishlistItem } from "./store";
import { useToast } from "@/components/ui/toast";

/** Anything that can be added to the cart resolves to this minimal shape. */
export interface AddableProduct {
  id: string;
  slug: string;
  title: string;
  brand: string;
  categorySlug: string;
  image: string;
  price: number;
  mrp: number;
  stock: number;
  deliveryDays: number;
  freeShipping: boolean;
  rating?: number;
}

export function fromCard(card: ProductCardModel): AddableProduct {
  return {
    id: card.id,
    slug: card.slug,
    title: card.title,
    brand: card.brand,
    categorySlug: card.categorySlug,
    image: card.image,
    price: card.price,
    mrp: card.mrp,
    stock: card.stock,
    deliveryDays: card.deliveryDays,
    freeShipping: card.freeShipping,
    rating: card.rating,
  };
}

export interface AddOptions {
  quantity?: number;
  variantLabel?: string;
  variantKey?: string;
  priceOverride?: number;
  silent?: boolean;
  openDrawer?: boolean;
}

export function useCommerce() {
  const { cart, wishlist, dispatch, openCartDrawer } = useStore();
  const toast = useToast();
  const router = useRouter();

  const addToCart = useCallback(
    (product: AddableProduct, options: AddOptions = {}) => {
      dispatch({
        type: "cart/add",
        quantity: options.quantity ?? 1,
        line: {
          productId: product.id,
          slug: product.slug,
          title: product.title,
          brand: product.brand,
          categorySlug: product.categorySlug,
          image: product.image,
          price: options.priceOverride ?? product.price,
          mrp: product.mrp + ((options.priceOverride ?? product.price) - product.price),
          quantity: options.quantity ?? 1,
          variantLabel: options.variantLabel,
          variantKey: options.variantKey,
          stock: product.stock,
          deliveryDays: product.deliveryDays,
          freeShipping: product.freeShipping,
        },
      });

      if (!options.silent) {
        toast({
          title: "Added to bag",
          description: product.title,
          image: product.image,
          action: { label: "View bag", href: "/cart" },
        });
      }
      if (options.openDrawer) openCartDrawer();
    },
    [dispatch, toast, openCartDrawer],
  );

  const buyNow = useCallback(
    (product: AddableProduct, options: AddOptions = {}) => {
      addToCart(product, { ...options, silent: true });
      router.push("/checkout/address");
    },
    [addToCart, router],
  );

  const toggleWishlist = useCallback(
    (product: AddableProduct) => {
      const exists = wishlist.some((w) => w.productId === product.id);
      const item: WishlistItem = {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        brand: product.brand,
        categorySlug: product.categorySlug,
        image: product.image,
        price: product.price,
        mrp: product.mrp,
        rating: product.rating ?? 4.5,
        stock: product.stock,
        addedAt: new Date().toISOString(),
      };
      dispatch({ type: "wishlist/toggle", item });
      toast({
        title: exists ? "Removed from wishlist" : "Saved to wishlist",
        description: product.title,
        tone: exists ? "info" : "wishlist",
        action: exists ? undefined : { label: "View wishlist", href: "/wishlist" },
      });
      return !exists;
    },
    [wishlist, dispatch, toast],
  );

  const isWishlisted = useCallback(
    (productId: string) => wishlist.some((w) => w.productId === productId),
    [wishlist],
  );

  const inCart = useCallback(
    (productId: string) => cart.some((l) => l.productId === productId),
    [cart],
  );

  return { addToCart, buyNow, toggleWishlist, isWishlisted, inCart };
}
