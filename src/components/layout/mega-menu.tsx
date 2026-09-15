"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { DepartmentGlyph } from "@/components/illustration/department-glyph";
import { glyphNameFor } from "@/components/illustration/glyph-name";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The department menu.
 *
 * The photograph that filled the right third of the panel has gone, and with it
 * the three promise lines printed over its scrim. A menu is a route to a shelf:
 * somebody who has already decided to look inside a department does not need to
 * be sold the department again, and the claims belong on the page they can be
 * read properly rather than in a panel that closes when the pointer leaves.
 *
 * What is left is the department's own drawn mark, its sentence, and a ruled
 * index of what is inside — which is both smaller and the only part anybody was
 * aiming for.
 */
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
                  "relative inline-flex items-center gap-1 px-3 py-2 text-[13.5px] font-medium transition-colors duration-200",
                  openSlug === category.slug
                    ? "text-ink-950"
                    : "text-ink-700 hover:text-ink-950",
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
                {/* The open department is marked with a rule rather than a
                    filled pill, and the rule is drawn by an absolutely
                    positioned span so that marking it costs the bar no height —
                    every sticky offset below the header is measured from it. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2 bottom-0 h-px transition-colors duration-200",
                    openSlug === category.slug ? "bg-ink-950" : "bg-transparent",
                  )}
                />
              </Link>
            </li>
          ))}
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
            // An ink frame rather than a soft shadow: the panel is a sheet laid
            // on the page, and a hairline would lose its edge against the white
            // tiles it floats over.
            className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(1080px,calc(100vw-4rem))] overflow-hidden border border-ink-950 bg-surface"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_260px]">
              <div className="p-6">
                <div className="mb-4 flex items-end justify-between gap-6 border-b border-ink-950 pb-4">
                  <div className="min-w-0">
                    <span className="eyebrow">{active.menuLabel}</span>
                    <h3 className="mt-2 font-display text-[22px] leading-none tracking-[-0.02em] text-ink-950">
                      {active.name}
                    </h3>
                  </div>
                  <Link
                    href={`/c/${active.slug}`}
                    className="group inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-colors duration-200 hover:text-gold-700"
                  >
                    Shop all {active.name.toLowerCase()}
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </Link>
                </div>

                {/* One line to a collection. The second line of description each
                    row used to carry was set at 11.5px, under the size anything
                    on this site is allowed to be read at, and three columns of
                    it turned the shortest route to a shelf into a page of prose. */}
                {active.subcategories.length > 0 && (
                  <ul className="grid grid-cols-3 gap-x-6">
                    {active.subcategories.map((sub) => (
                      <li key={sub.slug}>
                        <Link
                          href={`/c/${active.slug}/${sub.slug}`}
                          className="group flex h-11 items-center gap-3 border-b border-hairline"
                        >
                          {/* Its own mark, read from its own name. Every row
                              carrying the department's mark made four
                              identical drawings down one column, which reads
                              as a fault rather than as a family. */}
                          <DepartmentGlyph
                            icon={glyphNameFor(sub.name) ?? active.icon}
                            name={sub.name}
                            size={24}
                            className="shrink-0 text-ink-400 transition-colors duration-200 group-hover:text-brand-700"
                          />
                          <span className="min-w-0 truncate text-[13.5px] font-medium text-ink-900 transition-colors duration-200 group-hover:text-brand-700">
                            {sub.name}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {active.featuredBrands.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      Top brands
                    </span>
                    {active.featuredBrands.map((slug) => (
                      <Link
                        key={slug}
                        href={`/products?brands=${slug}&category=${active.slug}`}
                        className="inline-flex h-7 items-center border border-hairline px-2.5 text-[13px] text-ink-700 transition-colors duration-200 hover:border-ink-950 hover:text-ink-950"
                      >
                        {slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* The mark on canvas, in place of the photograph. It is the same
                  three kilobytes at every size and it says "department" rather
                  than showing one product and implying the rest. */}
              <Link
                href={`/c/${active.slug}`}
                className="group flex flex-col justify-center gap-5 border-l border-hairline bg-canvas p-6"
              >
                <DepartmentGlyph
                  icon={active.icon}
                  name={active.name}
                  size={96}
                  className="text-ink-900 transition-colors duration-200 group-hover:text-brand-700"
                />
                <span className="text-[13px] leading-[1.55] text-ink-600">
                  {active.description}
                </span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
