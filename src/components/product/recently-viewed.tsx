"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStore } from "@/store/store";
import { Price, SectionHeader } from "@/components/ui/primitives";
import { RailScroller } from "@/components/ui/rail-scroller";

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

  return (
    <section className="container-page py-10 sm:py-14">
      <RailScroller
        label="products"
        railClassName="-mx-4 px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        header={<SectionHeader eyebrow="Pick up where you left off" title={title} />}
      >
        {items.map((item) => (
          <Link
            key={item.productId}
            href={`/p/${item.slug}`}
            className="group w-[140px] sm:w-[160px]"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-hairline bg-ink-100">
              <Image
                src={item.image}
                alt=""
                fill
                sizes="160px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <p className="mt-2 line-clamp-2 text-[12.5px] font-medium leading-snug text-ink-900 group-hover:text-brand-700">
              {item.title}
            </p>
            <Price price={item.price} mrp={item.mrp} size="sm" className="mt-1" />
          </Link>
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

  return null;
}
