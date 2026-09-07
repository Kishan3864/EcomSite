"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpDown, Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ProductFacets, ProductQuery } from "@/lib/types";
import { SORT_OPTIONS, countActive } from "@/lib/query";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const setParams = useFilterUrl();
  const activeCount = countActive(query);
  const current = SORT_OPTIONS.find((o) => o.value === (query.sort ?? "relevance"));

  return (
    <>
      <div className="sticky top-[57px] z-30 -mx-4 mb-5 border-y border-hairline bg-canvas/92 px-4 py-2.5 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-[13px] text-ink-500 lg:block">
            <span className="font-semibold text-ink-900 tabular-nums">{total}</span>{" "}
            {total === 1 ? "product" : "products"}
          </p>

          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-900 transition-colors hover:border-ink-400 lg:hidden"
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>

          <p className="text-[13px] text-ink-500 lg:hidden">
            <span className="font-semibold text-ink-900 tabular-nums">{total}</span> results
          </p>

          <div className="relative">
            <button
              onClick={() => setSortOpen((o) => !o)}
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
              className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-900 transition-colors hover:border-ink-400"
            >
              <ArrowUpDown size={14} className="text-ink-500" />
              <span className="hidden sm:inline">Sort:</span>
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
                      const selected = (query.sort ?? "relevance") === option.value;
                      return (
                        <li key={option.value} role="option" aria-selected={selected}>
                          <button
                            onClick={() => {
                              setParams({
                                sort: option.value === "relevance" ? null : option.value,
                              });
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
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="left"
        title="Filters"
        description={`${total} products match`}
        className="max-w-[340px]"
      >
        <div className="px-5 pb-2">
          <FilterPanel
            query={query}
            facets={facets}
            hideCategory={hideCategory}
            onDone={() => setFiltersOpen(false)}
          />
        </div>
      </Drawer>
    </>
  );
}
