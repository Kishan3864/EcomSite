import type { Product } from "./types";
import { COLOR_HEX } from "@/data/products";

/**
 * The trimmed product shape that crosses the server → client boundary.
 *
 * Listing pages render up to 24 cards; sending whole `Product` objects would
 * ship descriptions, specs and reviews the card never uses. Building the view
 * model on the server keeps the RSC payload small.
 */
export interface ProductCardModel {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  brand: string;
  brandSlug: string;
  categorySlug: string;
  subcategorySlug: string;
  image: string;
  imageAlt: string;
  hoverImage: string;
  /** Every photo, for the quick view gallery. */
  images?: { url: string; alt: string }[];
  price: number;
  mrp: number;
  rating: number;
  reviewCount: number;
  stock: number;
  soldCount: number;
  badges: Product["badges"];
  deliveryDays: number;
  freeShipping: boolean;
  codAvailable: boolean;
  colors: { name: string; hex: string }[];
}

export function toCardModel(product: Product): ProductCardModel {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle,
    // Empty when the brand is switched off: every reader draws no brand line.
    brand: product.brandName ?? "",
    brandSlug: product.brandSlug,
    categorySlug: product.categorySlug,
    subcategorySlug: product.subcategorySlug,
    image: product.images[0]?.url ?? "",
    imageAlt: product.images[0]?.alt ?? product.title,
    hoverImage: product.images[1]?.url ?? product.images[0]?.url ?? "",
    images: product.images.slice(0, 10).map((i) => ({ url: i.url, alt: i.alt || product.title })),
    price: product.price,
    mrp: product.mrp,
    rating: product.rating,
    reviewCount: product.reviewCount,
    stock: product.stock,
    soldCount: product.soldCount,
    badges: product.badges,
    deliveryDays: product.deliveryDays,
    freeShipping: product.freeShipping,
    codAvailable: product.codAvailable,
    colors: product.colors.slice(0, 4).map((name) => ({
      name,
      hex: COLOR_HEX[name] ?? "#cdcdc7",
    })),
  };
}

export function toCardModels(products: Product[]): ProductCardModel[] {
  return products.map(toCardModel);
}
