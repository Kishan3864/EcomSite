"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpDown, Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ProductFacets, ProductQuery } from "@/lib/types";
import { SORT_OPTIONS, countActive } from "@/lib/query";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/overlay";
import { FilterPanel, useFilterUrl } from "./filters";
import { cn } from "@/lib/utils";

/**
 * The listing toolbar.
 *
 * Drawn as a ruled bar rather than as a row of bordered pills: on a page whose
 * whole structure is hairlines, a pill is the one shape that announces itself
 * as a widget. The chosen sort is said in ink and the rest of the options in
 * grey — there is no coloured chip anywhere, because a filled panel behind a
 * menu row is the shop shouting about a preference the shopper already knows
 * they set.
 *
 * The desktop bar is 48px with a rule beneath it so that it lands on exactly
 * the same line as the filter rail's own header in the column beside it.
 */

export function ListingToolbar({
  query,
  facets,
  total,
  hideCategory,
}: {
  query: ProductQuery;
  facets: ProductFacets;
  total: number;
  hideCategory?: boolean;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  // The phone sheet has its own flag so opening the desktop dropdown never
  // also raises a portalled sheet that CSS cannot hide.
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const setParams = useFilterUrl();
  const activeCount = countActive(query);
  const currentSort = query.sort ?? "relevance";
  const current = SORT_OPTIONS.find((o) => o.value === currentSort);

  function applySort(value: string) {
    setParams({ sort: value === "relevance" ? null : value });
  }

  return (
    <>
      {/* Phones and tablets: two equal halves pinned under the header, the way
          shopping apps do it, so sort and filter are one thumb-tap away. */}
      <div className="sticky top-[57px] z-30 -mx-3 mb-3 grid grid-cols-2 bg-canvas/92 backdrop-blur-lg sm:-mx-6 sm:mb-5 lg:hidden">
        <button
          type="button"
          onClick={() => setSortSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sortSheetOpen}
          className="tap flex h-11 min-w-0 items-center justify-center gap-2 px-3"
        >
          <ArrowUpDown size={15} className="shrink-0 text-ink-400" />
          {/* The word "Sort" is the quiet half of this button: what the shopper
              needs to read at a glance is which order they are looking at. */}
          <span className="min-w-0 text-left leading-tight">
            <span className="block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              Sort
            </span>
            <span className="mt-0.5 block truncate text-[13px] font-medium text-ink-950">
              {current?.label}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          className="tap flex h-11 min-w-0 items-center justify-center gap-2 px-3"
        >
          <SlidersHorizontal size={15} className="shrink-0 text-ink-400" />
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950">
            Filters
          </span>
          {/* A stamp, not a coloured badge — the same mark the filter rail's
              own header carries, so the two agree at a glance. */}
          {activeCount > 0 && (
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center bg-ink-950 px-1 text-[10.5px] font-semibold leading-none tabular-nums text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop: count on the left, sort on the right, one rule under both. */}
      <div className="mb-5 hidden h-12 items-center justify-between gap-4 lg:flex">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          <span className="tabular-nums text-ink-950">{total}</span>{" "}
          {total === 1 ? "product" : "products"}
        </p>

        <div className="relative">
          <button
            onClick={() => setSortOpen((o) => !o)}
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
            className="inline-flex h-10 items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:text-brand-700"
          >
            <ArrowUpDown size={14} className="text-ink-400" />
            <span className="text-ink-500">Sort</span>
            <span>{current?.label}</span>
            <ChevronDown
              size={14}
              className={cn(
                "text-ink-400 transition-transform duration-200",
                sortOpen && "rotate-180",
              )}
            />
          </button>

          <AnimatePresence>
            {sortOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSortOpen(false)}
                  aria-hidden
                />
                {/* An ink frame rather than a shadow: this is a printed index
                    laid on the page, and the heavier rule is what lifts it off
                    the paper without any blur at all. */}
                <motion.ul
                  role="listbox"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 top-[calc(100%+6px)] z-20 w-60 bg-surface shadow-lg"
                >
                  {SORT_OPTIONS.map((option) => {
                    const selected = currentSort === option.value;
                    return (
                      <li
                        key={option.value}
                        role="option"
                        aria-selected={selected}
                      >
                        <button
                          onClick={() => {
                            applySort(option.value);
                            setSortOpen(false);
                          }}
                          className={cn(
                            "flex h-11 w-full items-center justify-between gap-3 px-4 text-left text-[13px] transition-colors duration-200",
                            selected
                              ? "font-semibold text-ink-950"
                              : "text-ink-600 hover:bg-ink-50 hover:text-ink-950",
                          )}
                        >
                          {option.label}
                          {selected && <Check size={14} className="shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </motion.ul>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Drawer
        open={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        side="bottom"
        title="Sort by"
      >
        {/* Full-bleed ruled rows, so the sheet reads as a list on paper rather
            than as a stack of buttons floating in a tray. */}
        <ul role="listbox" aria-label="Sort by" className="bg-surface">
          {SORT_OPTIONS.map((option) => {
            const selected = currentSort === option.value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={selected}
              >
                <button
                  type="button"
                  onClick={() => {
                    applySort(option.value);
                    setSortSheetOpen(false);
                  }}
                  className={cn(
                    "tap flex h-12 w-full items-center justify-between gap-3 px-4 text-left text-[13.5px] transition-colors duration-200 sm:px-5",
                    selected ? "font-semibold text-ink-950" : "text-ink-600",
                  )}
                >
                  {option.label}
                  {selected && <Check size={16} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Drawer>

      {/* Full screen on phones, a side panel on tablets. The button rides in
          the drawer's footer, outside the scroll area, so it stays pinned
          above the home indicator instead of floating over scrolled rows. */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="left"
        title="Filters"
        description={`${total} products match`}
        className="max-w-none sm:max-w-[340px]"
        footer={
          <Button className="w-full" onClick={() => setFiltersOpen(false)}>
            Show results
          </Button>
        }
      >
        <div className="px-4 pb-2 pt-3 sm:px-5">
          <FilterPanel query={query} facets={facets} hideCategory={hideCategory} />
        </div>
      </Drawer>
    </>
  );
}
