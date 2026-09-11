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
    <section className="container-page py-6 sm:py-14">
      {/* Bleeds by exactly the page gutter; these are bare thumbnails rather
          than tiles, so phones get a real gap instead of the rail's 1px rule. */}
      <RailScroller
        label="products"
        headerClassName="mb-4 sm:mb-6"
        railClassName="-mx-3 gap-2 px-3 pb-2 sm:-mx-6 sm:gap-px sm:px-6 lg:-mx-8 lg:px-8"
        header={<SectionHeader eyebrow="Pick up where you left off" title={title} />}
      >
        {items.map((item) => (
          <Link
            key={item.productId}
            href={`/p/${item.slug}`}
            className="tap group w-[128px] sm:w-[160px]"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-hairline bg-ink-100">
              <Image
                src={item.image}
                alt=""
                fill
                sizes="(min-width:640px) 160px, 128px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <p className="mt-1.5 line-clamp-2 text-[12px] font-medium leading-snug text-ink-900 group-hover:text-brand-700 sm:mt-2 sm:text-[12.5px]">
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
