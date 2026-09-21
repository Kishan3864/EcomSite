import "server-only";

import { cache } from "react";
import { db } from "@/lib/db";
import { visibleProducts } from "./visibility";

export interface ReviewHighlight {
  id: string;
  author: string;
  location: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  createdAt: string;
  product: { slug: string; title: string; image: string };
}

/**
 * The home page's "what buyers say" band: recent approved reviews of four
 * stars or more, one per product, on products a shopper can actually open.
 * Returns an empty list on any failure — the band simply is not drawn.
 */
export const getReviewHighlights = cache(async (limit = 6): Promise<ReviewHighlight[]> => {
  try {
    const rows = await db.review.findMany({
      where: { status: "APPROVED", rating: { gte: 4 }, body: { not: "" }, product: visibleProducts() },
      orderBy: [{ verified: "desc" }, { createdAt: "desc" }],
      take: limit * 4,
      select: {
        id: true,
        author: true,
        location: true,
        rating: true,
        title: true,
        body: true,
        verified: true,
        createdAt: true,
        productId: true,
        product: {
          select: {
            slug: true,
            title: true,
            images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
          },
        },
      },
    });

    const seen = new Set<string>();
    const out: ReviewHighlight[] = [];
    for (const r of rows) {
      if (seen.has(r.productId)) continue;
      seen.add(r.productId);
      out.push({
        id: r.id,
        author: r.author,
        location: r.location,
        rating: r.rating,
        title: r.title,
        body: r.body,
        verified: r.verified,
        createdAt: r.createdAt.toISOString(),
        product: { slug: r.product.slug, title: r.product.title, image: r.product.images[0]?.url ?? "" },
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
});
