"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/store";
import type { ProductCardModel } from "@/lib/card";
import { recentlyViewedCards } from "@/services/cart-availability";
import { SectionHeader } from "@/components/ui/primitives";
import { RailScroller } from "@/components/ui/rail-scroller";
import { ProductCard } from "./product-card";

/**
 * The products this visitor has already looked at.
 *
 * The browser remembers only WHICH products; what is drawn comes from the
 * server, through the same visibility rule as every other read. It used to be
 * drawn from the browser's own snapshot, so a product from a category hidden
 * since the visit kept appearing here — at its old price, linking to a 404.
 *
 * It is the site's ordinary rail of the site's ordinary product card, at the
 * card's fixed rail width. It was once a grid whose column count followed the
 * number of items, which made a single viewed product one image the width of
 * the page. A fixed card cannot do that: one item is one card, ten items are
 * ten cards that scroll sideways on a phone, and because it is the shared
 * card, this band cannot drift from the rest of the shop again.
 */
export function RecentlyViewed({
  title = "Recently viewed",
  excludeId,
}: {
  title?: string;
  excludeId?: string;
}) {
  const { recent, hydrated } = useStore();
  const idKey = recent
    .map((r) => r.productId)
    .filter((id) => id !== excludeId)
    .join(",");
  const [loaded, setLoaded] = useState<{ key: string; cards: ProductCardModel[] } | null>(null);

  useEffect(() => {
    if (!hydrated || !idKey) return;
    let live = true;
    recentlyViewedCards(idKey.split(","))
      .then((cards) => live && setLoaded({ key: idKey, cards }))
      .catch(() => {
        /* no band is better than a band of guesses */
      });
    return () => {
      live = false;
    };
  }, [hydrated, idKey]);

  // Nothing until the server has answered: never the browser's own copy.
  const cards = loaded && loaded.key === idKey ? loaded.cards : [];
  if (cards.length === 0) return null;

  return (
    <section className="container-page section-tight">
      <RailScroller
        label="recently viewed products"
        headerClassName="mb-0"
        railClassName="-mx-3 px-3 pb-3 pt-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        header={<SectionHeader eyebrow="Pick up where you left off" title={title} />}
      >
        {cards.map((product) => (
          <ProductCard key={product.id} product={product} layout="rail" sizes="(min-width:640px) 224px, 164px" />
        ))}
      </RailScroller>
    </section>
  );
}

/** Records a product view — mounted on the PDP, renders nothing. */
export function TrackView({
  product,
}: {
  product: { id: string; slug: string; title: string; image: string; price: number; mrp: number };
}) {
  const { dispatch, hydrated } = useStore();
  const { id, slug, title, image, price, mrp } = product;

  useEffect(() => {
    if (!hydrated) return;
    dispatch({
      type: "recent/view",
      item: {
        productId: id,
        slug,
        title,
        image,
        price,
        mrp,
        viewedAt: new Date().toISOString(),
      },
    });
  }, [hydrated, dispatch, id, slug, title, image, price, mrp]);

  /**
   * One view, counted for the homepage ranking — after the page is up, and
   * without anybody waiting for it. `sendBeacon` queues the request and returns
   * at once; its answer is never read. The session note means a refresh or a
   * second visit in the same sitting is not sent at all. Every line of this is
   * allowed to fail: a blocked storage, a missing API, a dead network — none of
   * it can reach the page.
   */
  useEffect(() => {
    try {
      const key = "weekendcart.viewed";
      const seen: string[] = JSON.parse(window.sessionStorage.getItem(key) ?? "[]");
      if (seen.includes(id)) return;
      window.sessionStorage.setItem(key, JSON.stringify([...seen, id].slice(-200)));
      navigator.sendBeacon("/api/view", new Blob([JSON.stringify({ id })], { type: "application/json" }));
    } catch {
      /* not counted; nothing else changes */
    }
  }, [id]);

  return null;
}
