import { db } from "@/lib/db";
import type { Product } from "@/lib/types";
import { discountPercent } from "@/lib/utils";
import { getProductsByIds } from "./catalog";
import { visibleProducts } from "./visibility";

/**
 * What the homepage shows, decided by what shoppers actually do.
 *
 * THE SCORE — four signals, each scaled 0–1 across the visible catalogue so
 * that no unit outweighs another, then weighted:
 *
 *   0.55  sales    units in the last 14 days, each day worth 0.5^(age/7): a
 *                  sale today counts double one from a week ago. Only orders
 *                  that were paid for (or are genuinely COD) and not cancelled
 *                  or returned.
 *   0.15  views    product-page views over the same 14 days, same decay. The
 *                  lowest real weight on purpose: views are the one signal
 *                  somebody can fake with a refresh key, so they may nudge a
 *                  ranking and never decide it.
 *   0.20  rating   Bayesian — (rating×n + 4.0×5)/(n+5) — so one five-star
 *                  review cannot outrank forty at 4.6.
 *   0.10  reviews  log(1 + reviewCount).
 *
 * THE BLOCKS — filled in the order below, each taking only products no earlier
 * block took, so nothing appears twice:
 *
 *   trending     highest score (with no sales or views anywhere yet it is
 *                called what it is — the shop's shelf — not "trending")
 *   new          published in the last 30 days, newest first. NO score needed:
 *                this is the slot that keeps a fresh listing from being
 *                invisible until it has sold
 *   bestsellers  most units in 30 days; only products that have sold
 *   deals        a real reduction of 25% or more
 *   top-rated    Bayesian rating; only products with reviews
 *   few-left     stock of 12 or under
 *
 * SMALL CATALOGUES — a block needs MIN_PER_BLOCK products or it is not drawn,
 * and under SMALL_BELOW visible products the page holds at most three blocks.
 * Block size is what the catalogue can afford (N ÷ blocks, 10 at most), so ten
 * products make two blocks of five rather than five blocks of two.
 *
 * Everything is read through visibleProducts() and must be in stock — both
 * when the ranking is computed and again when it is drawn (getProductsByIds),
 * so a category hidden a second ago is gone at the next render, not at the
 * next recompute.
 *
 * CACHING — the ranking is three small queries and some arithmetic, and it is
 * still not run per visit. The result (ids only) is one StoreSetting row,
 * `home-ranking`, recomputed by the first homepage render that finds it older
 * than 15 minutes. The homepage itself is statically revalidated every 120 s,
 * so that is at most one render per two minutes reading one row, and one
 * recompute per quarter hour. No cron. If the recompute fails, the old row is
 * used; if there is none, the page falls back to newest-first.
 */

export type HomeBlockKey = "trending" | "shelf" | "new" | "bestsellers" | "deals" | "top-rated" | "few-left";

export interface HomeBlock {
  key: HomeBlockKey;
  products: Product[];
}

const W = { sales: 0.55, views: 0.15, rating: 0.2, reviews: 0.1 } as const;
const WINDOW_DAYS = 14;
const HALF_LIFE_DAYS = 7;
const BESTSELLER_DAYS = 30;
const NEW_DAYS = 30;
export const MIN_PER_BLOCK = 4;
const MAX_PER_BLOCK = 10;
const SMALL_BELOW = 20;
const TTL_MS = 15 * 60_000;
const KEY = "home-ranking";
const DAY = 86_400_000;

interface Stored {
  computedAt: string;
  visible: number;
  blocks: { key: HomeBlockKey; ids: string[] }[];
}

const decay = (at: Date, now: number) => Math.pow(0.5, Math.max(0, (now - at.getTime()) / DAY) / HALF_LIFE_DAYS);

async function compute(): Promise<Stored> {
  const now = Date.now();
  const [products, lines, views] = await Promise.all([
    db.product.findMany({
      where: visibleProducts({ stock: { gt: 0 } }),
      select: { id: true, rating: true, reviewCount: true, stock: true, price: true, mrp: true, publishedAt: true, createdAt: true },
    }),
    db.orderLine.findMany({
      where: {
        productId: { not: null },
        order: {
          placedAt: { gte: new Date(now - BESTSELLER_DAYS * DAY) },
          status: { notIn: ["CANCELLED", "RETURNED"] },
          paymentStatus: { in: ["PAID", "COD_PENDING", "PARTIALLY_REFUNDED"] },
        },
      },
      select: { productId: true, quantity: true, order: { select: { placedAt: true } } },
    }),
    db.productViewDaily.findMany({
      where: { day: { gte: new Date(now - WINDOW_DAYS * DAY) } },
      select: { productId: true, day: true, views: true },
    }),
  ]);

  const sales = new Map<string, number>();
  const units30 = new Map<string, number>();
  for (const l of lines) {
    if (!l.productId) continue;
    units30.set(l.productId, (units30.get(l.productId) ?? 0) + l.quantity);
    if (now - l.order.placedAt.getTime() <= WINDOW_DAYS * DAY)
      sales.set(l.productId, (sales.get(l.productId) ?? 0) + l.quantity * decay(l.order.placedAt, now));
  }
  const viewed = new Map<string, number>();
  for (const v of views) viewed.set(v.productId, (viewed.get(v.productId) ?? 0) + v.views * decay(v.day, now));

  const bayes = (p: { rating: number; reviewCount: number }) => (p.rating * p.reviewCount + 4.0 * 5) / (p.reviewCount + 5);
  const born = (p: { publishedAt: Date | null; createdAt: Date }) => (p.publishedAt ?? p.createdAt).getTime();
  const top = (values: number[]) => Math.max(0, ...values);
  const maxSales = top(products.map((p) => sales.get(p.id) ?? 0));
  const maxViews = top(products.map((p) => viewed.get(p.id) ?? 0));
  const maxReviews = top(products.map((p) => Math.log(1 + p.reviewCount)));
  const part = (value: number, max: number) => (max > 0 ? value / max : 0);

  const anySignal = maxSales > 0 || maxViews > 0;
  const score = new Map(
    products.map((p) => [
      p.id,
      W.sales * part(sales.get(p.id) ?? 0, maxSales) +
        W.views * part(viewed.get(p.id) ?? 0, maxViews) +
        // A product nobody has reviewed has no rating to be credited with.
        W.rating * (p.reviewCount > 0 ? (bayes(p) - 1) / 4 : 0) +
        W.reviews * part(Math.log(1 + p.reviewCount), maxReviews),
    ]),
  );
  const byScore = [...products].sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) || born(b) - born(a));

  const candidates: { key: HomeBlockKey; ids: string[] }[] = [
    { key: anySignal ? "trending" : "shelf", ids: byScore.map((p) => p.id) },
    {
      key: "new",
      ids: products
        .filter((p) => now - born(p) <= NEW_DAYS * DAY)
        .sort((a, b) => born(b) - born(a))
        .map((p) => p.id),
    },
    {
      key: "bestsellers",
      ids: products
        .filter((p) => (units30.get(p.id) ?? 0) > 0)
        .sort((a, b) => (units30.get(b.id) ?? 0) - (units30.get(a.id) ?? 0))
        .map((p) => p.id),
    },
    {
      key: "deals",
      ids: products
        .filter((p) => discountPercent(p.mrp, p.price) >= 25)
        .sort((a, b) => discountPercent(b.mrp, b.price) - discountPercent(a.mrp, a.price))
        .map((p) => p.id),
    },
    {
      key: "top-rated",
      ids: products
        .filter((p) => p.reviewCount > 0)
        .sort((a, b) => bayes(b) - bayes(a))
        .map((p) => p.id),
    },
    { key: "few-left", ids: products.filter((p) => p.stock <= 12).sort((a, b) => a.stock - b.stock).map((p) => p.id) },
  ];

  const n = products.length;
  // Sized by the blocks that can actually be filled, not by how many kinds
  // exist: planning for six and drawing three left each a third too small.
  const fillable = candidates.filter((c) => c.ids.length >= MIN_PER_BLOCK).length;
  const maxBlocks = Math.min(n < SMALL_BELOW ? 3 : candidates.length, fillable, Math.floor(n / MIN_PER_BLOCK));
  // Whole rows only: 10 or 5 across five columns, 8 or 4 across four.
  const room = maxBlocks > 0 ? Math.floor(n / maxBlocks) : 0;
  const per = room >= MAX_PER_BLOCK ? MAX_PER_BLOCK : room >= 8 ? 8 : room >= 5 ? 5 : room >= MIN_PER_BLOCK ? MIN_PER_BLOCK : 0;

  const taken = new Set<string>();
  const blocks: Stored["blocks"] = [];
  for (const c of candidates) {
    if (blocks.length >= maxBlocks) break;
    const ids = c.ids.filter((id) => !taken.has(id)).slice(0, per);
    if (ids.length < MIN_PER_BLOCK) continue; // not drawn, and its products stay free for the next block
    ids.forEach((id) => taken.add(id));
    blocks.push({ key: c.key, ids });
  }

  return { computedAt: new Date(now).toISOString(), visible: n, blocks };
}

async function ranking(): Promise<Stored | null> {
  let stored: Stored | null = null;
  try {
    const row = await db.storeSetting.findUnique({ where: { key: KEY } });
    stored = (row?.value as unknown as Stored | undefined) ?? null;
    if (stored && Date.now() - Date.parse(stored.computedAt) < TTL_MS) return stored;
    const fresh = await compute();
    const value = JSON.parse(JSON.stringify(fresh));
    await db.storeSetting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
    return fresh;
  } catch {
    return stored; // a stale ranking is a perfectly good ranking
  }
}

/**
 * The blocks to draw, as full products. Ids are resolved through the
 * visibility rule again HERE, and what is no longer visible or in stock falls
 * out; a block that drops under the minimum because of it is not drawn.
 */
export async function getHomeBlocks(): Promise<HomeBlock[]> {
  const stored = await ranking();
  if (!stored) return [];
  const blocks = await Promise.all(
    stored.blocks.map(async (b) => ({
      key: b.key,
      products: (await getProductsByIds(b.ids)).filter((p) => p.stock > 0),
    })),
  );
  return blocks.filter((b) => b.products.length >= MIN_PER_BLOCK);
}

/** Marks the cached ranking stale. Never throws. */
export async function expireHomeRanking(): Promise<void> {
  try {
    await db.storeSetting.updateMany({
      where: { key: KEY },
      data: { value: { computedAt: new Date(0).toISOString(), visible: 0, blocks: [] } },
    });
  } catch {
    /* it expires by itself */
  }
}
