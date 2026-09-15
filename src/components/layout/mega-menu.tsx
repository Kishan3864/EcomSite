"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowRight } from "lucide-react";
import { DepartmentGlyph } from "@/components/illustration/department-glyph";
import { glyphNameFor } from "@/components/illustration/glyph-name";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The department menu.
 *
 * Rebuilt around one rule the old panel broke: **the sheet is the size of what
 * is on it.** It used to be 1080px wide whatever it held, with a three-column
 * grid for the subcategories — so a department with two collections opened a
 * panel two thirds empty, and the emptiness read as a page that had failed to
 * load rather than as a shop with two shelves. The column count is now taken
 * from the number of collections and the width follows it, so the panel is
 * compact when the shop is small and grows on its own as departments fill up.
 *
 * Gone with it: the 260px rail whose whole job was to hold a 96px drawing of an
 * oven. A department mark at that size beside four words of navigation is
 * decoration asking for a third of the sheet, and it was the other half of why
 * the panel looked so empty. The mark still identifies each collection at 22px,
 * where it is doing work.
 *
 * Gone too: the eyebrow. It printed the department's own name in small caps
 * directly above the department's name — "HOME & APPLIANCE" over "Home &
 * Appliance" — which is not a label, it is the same words twice.
 *
 * What is left is what somebody opening a menu is actually after: which
 * department this is, one line on what is in it, the way to all of it, and a
 * ruled index of the collections inside.
 */

/** Past this the index reads as a wall rather than a list, and wraps instead. */
const MAX_COLUMNS = 4;

/** Enough for the longest collection name the shop uses without truncating. */
const COLUMN_WIDTH = 262;

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

  /**
   * A beat before closing, so crossing the 10px gap between the bar and the
   * sheet — or sliding diagonally from one department to the next — does not
   * shut the thing under the pointer.
   */
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenSlug(null), 140);
  }

  // Escape closes it, the way every other overlay on the site behaves. Without
  // this a keyboard user who opened the panel by tabbing on to a department had
  // no way to dismiss it but to tab through everything inside.
  useEffect(() => {
    if (!openSlug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSlug]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const active = categories.find((c) => c.slug === openSlug);

  // The sheet is sized from its contents, never the other way round.
  //
  // Columns are chosen to fill the rows evenly rather than simply run to the
  // maximum: six collections in four columns is a full row above a half-empty
  // one, which is the same hole this rebuild set out to close, just smaller.
  // Taking the row count first and dividing back gives 3×2 for six, 3+2 for
  // five, 4+3 for seven — a last row that is full or nearly so, every time.
  //
  // A floor of 460px keeps a department with no collections yet, or one with a
  // single collection, from opening as a sliver.
  const count = active?.subcategories.length ?? 0;
  const rows = Math.max(1, Math.ceil(count / MAX_COLUMNS));
  const columns = Math.max(1, Math.ceil(count / rows));
  const sheetWidth = Math.max(columns * COLUMN_WIDTH + 48, 460);

  return (
    <div className="relative" onMouseLeave={scheduleClose}>
      <nav aria-label="Product categories">
        <ul className="flex items-center">
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
                    "relative inline-flex items-center px-3.5 py-2 text-[13.5px] transition-colors duration-200",
                    isOpen ? "font-semibold text-ink-950" : "font-medium text-ink-700 hover:text-ink-950",
                  )}
                >
                  {category.name}
                  {/* No chevron. With one department it pointed at a panel that
                      opens on hover anyway; with six it would be six pieces of
                      punctuation in a row saying the same thing. The rule below
                      marks the open one, and it is drawn by an absolutely
                      positioned span so that marking it costs the bar no height
                      — every sticky offset under the header is measured from
                      this bar, and a bar that grows on hover moves them all. */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-3.5 bottom-0 h-[1.5px] origin-left transition-transform duration-200 ease-out",
                      isOpen ? "scale-x-100 bg-ink-950" : "scale-x-0 bg-ink-950",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => open(active.slug)}
            style={{ width: `min(${sheetWidth}px, calc(100vw - 4rem))` }}
            // An ink frame rather than a soft shadow: the panel is a sheet laid
            // on the page, and a hairline would lose its edge against the white
            // tiles it floats over.
            className="absolute left-0 top-[calc(100%+10px)] z-50 overflow-hidden border border-ink-950 bg-surface"
          >
            {/* ── Masthead ─────────────────────────────────────────────── */}
            <div className="px-6 pb-4 pt-5">
              {/* The name and the way out of the menu share a line; the
                  sentence gets the full width underneath. Holding all three in
                  one flex row meant the description was laid out in whatever
                  the CTA left over — on a two-column sheet that was half the
                  width, and a plain sentence broke into three cramped lines
                  beside a lot of white. */}
              <div className="flex items-baseline justify-between gap-8">
                <h3 className="min-w-0 truncate font-display text-[21px] leading-none tracking-[-0.02em] text-ink-950">
                  {active.name}
                </h3>
                <Link
                  href={`/c/${active.slug}`}
                  className="group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-colors duration-200 hover:text-brand-700"
                >
                  Shop all
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
              </div>

              {/* Held to about 58 characters a line. Across a four-column sheet
                  an unconstrained sentence runs to a width nobody tracks back
                  from comfortably. */}
              {active.description && (
                <p className="mt-3 max-w-[58ch] text-[13px] leading-[1.55] text-ink-600">
                  {active.description}
                </p>
              )}
            </div>

            {/* ── The index ────────────────────────────────────────────── */}
            {active.subcategories.length > 0 && (
              <div className="px-6 pb-5">
                <ul
                  className="grid gap-x-8 border-t border-ink-950 pt-1"
                  style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                  {active.subcategories.map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        href={`/c/${active.slug}/${sub.slug}`}
                        className="group flex h-12 items-center gap-3 border-b border-hairline transition-colors duration-200 hover:border-ink-950"
                      >
                        {/* Its own mark, read from its own name. Every row
                            carrying the department's mark made four identical
                            drawings down one column, which reads as a fault
                            rather than as a family. */}
                        <DepartmentGlyph
                          icon={glyphNameFor(sub.name) ?? active.icon}
                          name={sub.name}
                          size={22}
                          className="shrink-0 text-ink-500 transition-colors duration-200 group-hover:text-brand-700"
                        />
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink-800 transition-colors duration-200 group-hover:text-brand-700">
                          {sub.name}
                        </span>
                        {/* Arrives on hover, from the left. The row already
                            reads as a link; this only confirms which one the
                            pointer has. */}
                        <ArrowRight
                          size={14}
                          aria-hidden
                          className="shrink-0 -translate-x-1 text-brand-700 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Brands ───────────────────────────────────────────────── */}
            {active.featuredBrands.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-hairline bg-canvas px-6 py-3.5">
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  Top brands
                </span>
                {active.featuredBrands.map((slug) => (
                  <Link
                    key={slug}
                    href={`/products?brands=${slug}&category=${active.slug}`}
                    className="inline-flex h-7 items-center border border-hairline bg-surface px-2.5 text-[12.5px] text-ink-700 transition-colors duration-200 hover:border-ink-950 hover:text-ink-950"
                  >
                    {slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
