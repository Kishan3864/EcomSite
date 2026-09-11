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
      <div className="sticky top-[57px] z-30 -mx-3 mb-3 grid grid-cols-2 border-y border-hairline bg-canvas/92 backdrop-blur-lg sm:-mx-6 sm:mb-5 lg:hidden">
        <button
          type="button"
          onClick={() => setSortSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sortSheetOpen}
          className="tap flex h-11 min-w-0 items-center justify-center gap-2 px-3 text-ink-900"
        >
          <ArrowUpDown size={15} className="shrink-0 text-ink-500" />
          <span className="min-w-0 text-left leading-tight">
            <span className="block text-[13px] font-semibold">Sort</span>
            <span className="block truncate text-[11px] text-ink-500">{current?.label}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          className="tap flex h-11 min-w-0 items-center justify-center gap-2 border-l border-hairline px-3 text-ink-900"
        >
          <SlidersHorizontal size={15} className="shrink-0 text-ink-500" />
          <span className="text-[13px] font-semibold">Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop: count on the left, sort dropdown on the right. */}
      <div className="mb-5 hidden items-center justify-between gap-3 lg:flex">
        <p className="text-[13px] text-ink-500">
          <span className="font-semibold text-ink-900 tabular-nums">{total}</span>{" "}
          {total === 1 ? "product" : "products"}
        </p>

        <div className="relative">
          <button
            onClick={() => setSortOpen((o) => !o)}
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
            className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-900 transition-colors hover:border-ink-400"
          >
            <ArrowUpDown size={14} className="text-ink-500" />
            <span>Sort:</span>
            <span className="text-ink-950">{current?.label}</span>
            <ChevronDown
              size={14}
              className={cn("text-ink-400 transition-transform", sortOpen && "rotate-180")}
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
                <motion.ul
                  role="listbox"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 top-[calc(100%+6px)] z-20 w-56 overflow-hidden rounded-xl border border-hairline bg-surface p-1.5 shadow-xl"
                >
                  {SORT_OPTIONS.map((option) => {
                    const selected = currentSort === option.value;
                    return (
                      <li key={option.value} role="option" aria-selected={selected}>
                        <button
                          onClick={() => {
                            applySort(option.value);
                            setSortOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                            selected
                              ? "bg-brand-50 font-semibold text-brand-800"
                              : "text-ink-700 hover:bg-ink-50",
                          )}
                        >
                          {option.label}
                          {selected && <Check size={14} />}
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
        <ul role="listbox" aria-label="Sort by" className="p-2">
          {SORT_OPTIONS.map((option) => {
            const selected = currentSort === option.value;
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    applySort(option.value);
                    setSortSheetOpen(false);
                  }}
                  className={cn(
                    "tap flex h-12 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-[13.5px] transition-colors",
                    selected
                      ? "bg-brand-50 font-semibold text-brand-800"
                      : "text-ink-700 hover:bg-ink-50",
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
