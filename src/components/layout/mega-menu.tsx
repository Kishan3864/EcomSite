"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "@/components/ui/image";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { balancedColumns } from "@/lib/grid";

/**
 * The department menu.
 *
 * Photographs, because a menu is where somebody decides which shelf to walk to
 * and a picture of the shelf decides it faster than its name does. Every
 * department and every collection already carries its own image — the same ones
 * the category pages use — so this costs no new artwork and nothing to
 * maintain: a collection added in the admin panel arrives here with its picture
 * already attached.
 *
 * The sheet is still the size of what is on it. The column count comes from the
 * number of collections and is chosen to fill its rows evenly, so two
 * collections open a compact sheet and twelve open a wide one, and neither
 * leaves a half-empty row. That is the one thing kept from the drawn-mark
 * version, because it is what stopped the panel reading as a page that had
 * failed to load.
 *
 * The right rail is the department's own photograph, carrying the way through
 * to all of it. It is the only place the department is named twice over, and
 * deliberately: the heading says which department this is, the rail is the door
 * out of the menu into it.
 */

/** Past this the index reads as a wall of tiles rather than a list, and wraps. */
const MAX_COLUMNS = 4;

/** A tile wide enough for a photograph to be read as one, plus its gutter. */
const TILE_WIDTH = 172;
const TILE_GAP = 14;

/** The department photograph down the right-hand edge. */
const RAIL_WIDTH = 296;

/** The sheet's own padding, both sides. */
const PADDING = 48;

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
  // Columns fill their rows evenly rather than running to the maximum: six
  // collections in four columns is a full row above a half-empty one, which is
  // the hole this menu was rebuilt to close. Taking the row count first and
  // dividing back gives 3x2 for six, 3+2 for five, 4+3 for seven.
  const count = active?.subcategories.length ?? 0;
  const columns = balancedColumns(count, MAX_COLUMNS);
  const indexWidth = columns * TILE_WIDTH + (columns - 1) * TILE_GAP + PADDING;
  // A floor with two jobs. It stops a department whose collections are not set
  // up yet from opening as a sliver beside a photograph, and it keeps a
  // department with one or two of them from being out-weighed by its own rail —
  // at the tile's natural width, two collections left the sentence in a column
  // narrower than the picture next to it. The tiles are `1fr` each, so the
  // extra width goes into the photographs rather than into white space.
  const sheetWidth = Math.max(indexWidth, 520) + RAIL_WIDTH;

  return (
    <div className="relative" onMouseLeave={scheduleClose}>
      {/* One line, always. Eleven departments do not fit a 1408px container,
          and a wrapping rail pushes the page down by a row and collides with
          the links on the right. It scrolls sideways instead — the scrollbar
          is hidden, and the panels still open from wherever a name lands. */}
      <nav aria-label="Product categories" className="min-w-0 flex-1">
        <ul className="no-scrollbar flex items-center overflow-x-auto">
          {categories.map((category) => {
            const isOpen = openSlug === category.slug;
            return (
              <li key={category.slug}>
                <Link
                  href={`/c/${category.slug}`}
                  onMouseEnter={() => open(category.slug)}
                  onFocus={() => open(category.slug)}
                  aria-expanded={isOpen}
                  // Ink on the light rail, and a brand-coloured marker under
                  // the open department: the one thing in the masthead that
                  // says "you are pointing at this".
                  className={cn(
                    "relative inline-flex shrink-0 whitespace-nowrap items-center px-3.5 py-2 text-[13.5px] transition-colors duration-200",
                    isOpen ? "font-semibold text-ink-950" : "font-medium text-ink-700 hover:text-ink-950",
                  )}
                >
                  {category.name}
                  {/* The rule is drawn by an absolutely positioned span so that
                      marking the open department costs the bar no height —
                      every sticky offset under the header is measured from this
                      bar, and a bar that grows on hover moves them all. */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-3.5 bottom-0 h-[2px] origin-left bg-brand-600 transition-transform duration-200 ease-out",
                      isOpen ? "scale-x-100" : "scale-x-0",
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
            // A hairline and a real shadow, not the old ink frame. The frame
            // gave the sheet an edge against the white tiles it floats over,
            // but the black outline made it look like a dialog; the elevation
            // does the same job without the weight.
            className="absolute left-0 top-[calc(100%+10px)] z-50 overflow-hidden bg-surface shadow-xl"
          >
            <div
              className="grid"
              style={{ gridTemplateColumns: `minmax(0,1fr) ${RAIL_WIDTH}px` }}
            >
              {/* ── The index ──────────────────────────────────────────── */}
              <div className="p-6">
                <h3 className="font-display text-[21px] leading-none tracking-[-0.02em] text-ink-950">
                  {active.name}
                </h3>
                {/* Held to about 58 characters a line. Across a four-column
                    sheet an unconstrained sentence runs to a width nobody
                    tracks back from comfortably. */}
                {active.description && (
                  <p className="mt-2.5 max-w-[58ch] text-[13px] leading-[1.55] text-ink-600">
                    {active.description}
                  </p>
                )}

                {active.subcategories.length > 0 && (
                  <ul
                    className="mt-5 grid pt-5"
                    style={{
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      gap: `${TILE_GAP}px`,
                    }}
                  >
                    {active.subcategories.map((sub) => (
                      <li key={sub.slug}>
                        <Link
                          href={`/c/${active.slug}/${sub.slug}`}
                          className="group block"
                        >
                          {/* 4:3, the shape the catalogue's photographs are cut
                              to everywhere else. `overflow-hidden` on the frame
                              rather than the image so the zoom is cropped by
                              the frame instead of pushing the tile about. */}
                          <div className="relative aspect-[4/3] overflow-hidden bg-canvas">
                            <Image
                              src={sub.image.url}
                              alt={sub.image.alt || sub.name}
                              fill
                              sizes={`${TILE_WIDTH}px`}
                              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                            />
                          </div>
                          <span className="mt-2.5 flex items-center gap-1.5">
                            <span className="min-w-0 truncate text-[13.5px] font-medium text-ink-900 transition-colors duration-200 group-hover:text-brand-700">
                              {sub.name}
                            </span>
                            <ArrowRight
                              size={13}
                              aria-hidden
                              className="shrink-0 -translate-x-1 text-brand-700 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                            />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {active.featuredBrands.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 pt-4">
                    <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      Top brands
                    </span>
                    {active.featuredBrands.map((slug) => (
                      <Link
                        key={slug}
                        href={`/products?brands=${slug}&category=${active.slug}`}
                        className="inline-flex h-7 items-center px-2.5 text-[12.5px] text-ink-700 transition-colors duration-200 hover:text-ink-950"
                      >
                        {slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* ── The department, and the door out of the menu ────────── */}
              <Link
                href={`/c/${active.slug}`}
                className="group relative overflow-hidden bg-canvas"
              >
                <Image
                  src={active.image.url}
                  alt={active.image.alt || active.name}
                  fill
                  sizes={`${RAIL_WIDTH}px`}
                  className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
                />
                {/* A scrim rather than a flat tint: white type has to hold its
                    contrast over whatever photograph a department is given, and
                    a department photo is chosen for the shelf it shows, not for
                    how dark its bottom third happens to be. */}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-transparent"
                />
                <span className="absolute inset-x-5 bottom-5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-white">
                  Shop all {active.name.toLowerCase()}
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
