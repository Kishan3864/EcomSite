"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MegaMenu({ categories }: { categories: Category[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduce = usePrefersReducedMotion();

  function open(slug: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenSlug(slug);
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenSlug(null), 140);
  }

  const active = categories.find((c) => c.slug === openSlug);

  return (
    <div className="relative" onMouseLeave={scheduleClose}>
      <nav aria-label="Product categories">
        <ul className="flex items-center gap-0.5">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/c/${category.slug}`}
                onMouseEnter={() => open(category.slug)}
                onFocus={() => open(category.slug)}
                aria-expanded={openSlug === category.slug}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-200",
                  openSlug === category.slug
                    ? "bg-ink-100 text-ink-950"
                    : "text-ink-700 hover:bg-ink-50 hover:text-ink-950",
                )}
              >
                {category.name}
                <ChevronDown
                  size={13}
                  className={cn(
                    "text-ink-400 transition-transform duration-200",
                    openSlug === category.slug && "rotate-180",
                  )}
                />
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/offers"
              onMouseEnter={scheduleClose}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] font-semibold text-sale-600 transition-colors hover:bg-sale-50"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sale-500 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sale-500" />
              </span>
              Deals
            </Link>
          </li>
        </ul>
      </nav>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => open(active.slug)}
            className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(1080px,calc(100vw-4rem))] overflow-hidden rounded-2xl border border-hairline bg-surface shadow-xl"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_260px]">
              <div className="p-6">
                <div className="mb-5 flex items-end justify-between gap-6 border-b border-hairline pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
                      {active.menuLabel}
                    </p>
                    <h3 className="mt-1 font-display text-xl tracking-[-0.02em] text-ink-950">
                      {active.name}
                    </h3>
                  </div>
                  <Link
                    href={`/c/${active.slug}`}
                    className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:underline underline-offset-4"
                  >
                    Shop all {active.name.toLowerCase()}
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-x-6 gap-y-1">
                  {active.subcategories.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/c/${active.slug}/${sub.slug}`}
                      className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-ink-50"
                    >
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-ink-100">
                        <Image
                          src={sub.image.url}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-medium text-ink-900 group-hover:text-brand-700">
                          {sub.name}
                        </span>
                        <span className="mt-0.5 block line-clamp-1 text-[11.5px] text-ink-500">
                          {sub.description}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                    Top brands
                  </span>
                  {active.featuredBrands.map((slug) => (
                    <Link
                      key={slug}
                      href={`/products?brands=${slug}&category=${active.slug}`}
                      className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-700"
                    >
                      {slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                href={`/c/${active.slug}`}
                className="group relative block overflow-hidden bg-ink-950"
              >
                <Image
                  src={active.image.url}
                  alt=""
                  fill
                  sizes="260px"
                  className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold-300">
                    Why we stock it
                  </p>
                  <ul className="mt-2 space-y-1">
                    {active.highlights.map((h) => (
                      <li key={h} className="text-[12.5px] leading-snug text-white/90">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
