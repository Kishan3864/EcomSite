"use client";

import { useEffect } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { useStore } from "@/store/store";
import { Price, SectionHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * The products this visitor has already looked at.
 *
 * It used to be a scroll rail of 128px thumbnails. With the three or four
 * products somebody has actually opened, the rail never overflowed, so its
 * arrows stayed hidden, the thumbnails huddled against the left edge and two
 * thirds of the band was bare canvas — a section that looked like it had
 * failed rather than one that was simply short.
 *
 * It is a grid now, and the grid's column count follows the number of items,
 * so the row is full at any count. On a 390px phone each cell is about 182px
 * against the old 128px; at the full container width six cells are about
 * 223px against 160px. Nothing scrolls, nothing is hidden behind a swipe.
 */

/* Tailwind only compiles class names it can read literally, so the column
   counts are written out rather than computed. Six is the cap because it
   divides by two, three and six — every breakpoint lands on a full row. */
const SM_COLS = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-3",
  5: "sm:grid-cols-3",
  6: "sm:grid-cols-3",
} as const;

const LG_COLS = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
} as const;

const MAX_SHOWN = 6;

export function RecentlyViewed({
  title = "Recently viewed",
  excludeId,
}: {
  title?: string;
  excludeId?: string;
}) {
  const { recent, hydrated } = useStore();
  const items = recent.filter((r) => r.productId !== excludeId);

  if (!hydrated || items.length === 0) return null;

  // The store keeps twelve; showing more than six of them turns a memory aid
  // into a second catalogue.
  const shown = items.slice(0, MAX_SHOWN);
  const n = shown.length as 1 | 2 | 3 | 4 | 5 | 6;

  return (
    <section className="container-page py-10 sm:py-16">
      {/* The heavier rule, so the tail of a product page reads as three
          deliberate bands rather than one long scroll. */}
      <div className="border-t border-rule pt-8 sm:pt-12">
        {/* No link in this header: there is no page of "things you looked at",
            and inventing one would put two calls to action in one band again. */}
        <SectionHeader
          eyebrow="Pick up where you left off"
          title={title}
          className="mb-4 sm:mb-6"
        />

        <div className={cn("tile-grid", n === 1 ? "grid-cols-1" : "grid-cols-2", SM_COLS[n], LG_COLS[n])}>
          {shown.map((item) => (
            <Link
              key={item.productId}
              href={`/p/${item.slug}`}
              className="tap group flex flex-col p-2 sm:p-3"
            >
              {/* The same 3:4 crop as the product tile and its loading
                  skeleton, so a product does not change shape between the
                  grid it came from and this band. */}
              <div className="relative aspect-[3/4] overflow-hidden bg-ink-100">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 224px, (min-width:640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                />
              </div>
              {/* Two lines reserved whether or not the title needs them, so
                  every price in the row sits on one baseline. */}
              <p className="mt-2 line-clamp-2 min-h-[2.7em] text-[13px] font-medium leading-[1.35] text-ink-900 group-hover:text-brand-700">
                {item.title}
              </p>
              <Price price={item.price} mrp={item.mrp} size="sm" className="mt-1" />
            </Link>
          ))}
        </div>
      </div>
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

  return null;
}
