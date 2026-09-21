"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "@/components/ui/image";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowRight, ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";

/**
 * The department menu: a rail of department names in the header's second row
 * and, on hover or focus, a full-width panel under the header — every
 * department down the left, the pointed-at department's collections as photo
 * tiles in the middle, and the department itself as a feature card on the
 * right. The panel is positioned against the sticky <header>, the nearest
 * positioned ancestor.
 */
export function MegaMenu({ categories }: { categories: Category[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduce = usePrefersReducedMotion();

  function open(slug: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenSlug(slug);
  }

  function close() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenSlug(null);
  }

  /** A beat before closing, so crossing from the rail to the panel does not shut it. */
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenSlug(null), 160);
  }

  useEffect(() => {
    if (!openSlug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSlug]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const active = categories.find((c) => c.slug === openSlug);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1" onMouseLeave={scheduleClose}>
      <button
        type="button"
        onClick={() => (openSlug ? close() : open(categories[0].slug))}
        onMouseEnter={() => open(openSlug ?? categories[0].slug)}
        aria-expanded={Boolean(active)}
        aria-controls="mega-menu"
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors",
          active ? "bg-ink-950 text-white" : "bg-ink-100 text-ink-900 hover:bg-ink-200",
        )}
      >
        <LayoutGrid size={14} />
        All categories
        <ChevronDown size={14} className={cn("transition-transform duration-200", active && "rotate-180")} />
      </button>

      <nav aria-label="Product categories" className="min-w-0 flex-1">
        <ul className="dept-rail no-scrollbar flex items-center overflow-x-auto">
          {categories.map((category) => {
            const isOpen = openSlug === category.slug;
            return (
              <li key={category.slug}>
                <Link
                  href={`/c/${category.slug}`}
                  onMouseEnter={() => open(category.slug)}
                  onFocus={() => open(category.slug)}
                  aria-expanded={isOpen}
                  className={cn(
                    "relative inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-[12.5px] transition-colors duration-200",
                    isOpen ? "bg-brand-50 font-semibold text-brand-800" : "font-medium text-ink-600 hover:text-ink-950",
                  )}
                >
                  {category.menuLabel || category.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <AnimatePresence>
        {active && (
          <motion.div
            id="mega-menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => open(active.slug)}
            className="absolute inset-x-0 top-full z-50 border-t border-line bg-surface shadow-pop"
          >
            <div className="container-page grid max-h-[min(72dvh,560px)] grid-cols-[232px_minmax(0,1fr)_280px] gap-6 overflow-y-auto py-6">
              {/* Departments */}
              <ul className="space-y-0.5 border-r border-line pr-4">
                {categories.map((category) => {
                  const isActive = category.slug === active.slug;
                  return (
                    <li key={category.slug}>
                      <Link
                        href={`/c/${category.slug}`}
                        onMouseEnter={() => open(category.slug)}
                        onFocus={() => open(category.slug)}
                        className={cn(
                          "group flex h-10 items-center gap-3 rounded-lg px-2 text-[13px] transition-colors",
                          isActive ? "bg-brand-50 font-semibold text-brand-800" : "font-medium text-ink-700 hover:bg-ink-50",
                        )}
                      >
                        <span
                          className={cn(
                            "icon-tile icon-tile-sm transition-colors",
                            !isActive && "!bg-ink-50 !text-ink-500",
                          )}
                        >
                          <CategoryIcon icon={category.icon} name={category.name} size={16} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{category.name}</span>
                        <ChevronRight size={14} className={cn("text-ink-300", isActive && "text-brand-600")} />
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Collections */}
              <div className="min-w-0">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="t-h2 !text-[18px]">{active.name}</p>
                    {active.description && <p className="t-small mt-1 line-clamp-2 max-w-[60ch]">{active.description}</p>}
                  </div>
                  <Link
                    href={`/c/${active.slug}`}
                    className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:underline"
                  >
                    View all <ArrowRight size={14} />
                  </Link>
                </div>

                {active.subcategories.length > 0 ? (
                  <ul className="grid grid-cols-3 gap-3 xl:grid-cols-4">
                    {active.subcategories.map((sub) => (
                      <li key={sub.slug}>
                        <Link
                          href={`/c/${active.slug}/${sub.slug}`}
                          className="group flex items-center gap-3 rounded-xl border border-line p-2 transition-all hover:border-brand-200 hover:shadow-md"
                        >
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-50">
                            <Image
                              src={sub.image.url}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          </span>
                          <span className="min-w-0 truncate text-[13px] font-medium text-ink-900 group-hover:text-brand-700">
                            {sub.name}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="t-small">Browse everything in {active.name}.</p>
                )}

                {active.featuredBrands.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    <span className="t-label mr-1">Top brands</span>
                    {active.featuredBrands.map((slug) => (
                      <Link
                        key={slug}
                        href={`/products?brands=${slug}&category=${active.slug}`}
                        className="chip h-7 px-3 text-[12px] text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
                      >
                        {slug
                          .split("-")
                          .map((w) => w[0].toUpperCase() + w.slice(1))
                          .join(" ")}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* The department, as the door out of the menu */}
              <Link
                href={`/c/${active.slug}`}
                className="group relative block min-h-[240px] overflow-hidden rounded-2xl bg-ink-100"
              >
                <Image
                  src={active.image.url}
                  alt={active.image.alt || active.name}
                  fill
                  sizes="280px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/20 to-transparent" />
                <span className="absolute inset-x-4 bottom-4 text-white">
                  <span className="t-label block !text-gold-200">Explore</span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-[15px] font-semibold">
                    Shop all {active.name}
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-transform group-hover:translate-x-0.5">
                      <ArrowRight size={16} />
                    </span>
                  </span>
                </span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
