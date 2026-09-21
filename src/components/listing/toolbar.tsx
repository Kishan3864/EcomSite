"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpDown, Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ProductFacets, ProductQuery } from "@/lib/types";
import { SORT_OPTIONS, countActive } from "@/lib/query";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/overlay";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { FilterPanel, useFilterUrl } from "./filters";
import { ViewToggle } from "./view-mode";
import { cn } from "@/lib/utils";

/**
 * The listing toolbar.
 *
 *   phones / tablets  a frosted bar pinned under the header: Sort, Filters
 *                     (with a count) and the grid / list switch.
 *   desktop           a card row: result count left, layout switch and the
 *                     sort menu right.
 */
export function ListingToolbar({
  query,
  facets,
  total,
  page,
  totalPages,
  hideCategory,
}: {
  query: ProductQuery;
  facets: ProductFacets;
  total: number;
  page: number;
  totalPages: number;
  hideCategory?: boolean;
}) {
  // The phone sheet has its own flag so the desktop menu never also raises a
  // portalled sheet that CSS cannot hide.
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const setParams = useFilterUrl();
  const activeCount = countActive(query);
  const currentSort = query.sort ?? "relevance";
  const current = SORT_OPTIONS.find((o) => o.value === currentSort);

  function applySort(value: string) {
    setParams({ sort: value === "relevance" ? null : value });
  }

  const countLabel = (
    <>
      <span className="font-semibold tabular-nums text-ink-950">{total}</span>{" "}
      {total === 1 ? "product" : "products"}
    </>
  );

  return (
    <>
      {/* Phones and tablets: pinned under the header, full bleed. */}
      <div className="glass sticky top-(--header-h) z-30 -mx-3 mb-4 flex items-center gap-2 border-y border-line px-3 py-2 sm:-mx-6 sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setSortSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sortSheetOpen}
          className="chip tap h-9 min-w-0 flex-1 justify-center px-3 text-[12.5px] font-medium text-ink-900"
        >
          <ArrowUpDown size={14} className="shrink-0 text-ink-500" />
          <span className="sr-only">Sort: </span>
          <span className="truncate">{current?.label}</span>
        </button>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          className={cn(
            "tap inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium",
            activeCount > 0
              ? "border-brand-300 bg-brand-50 text-brand-800"
              : "border-line-strong bg-surface text-ink-900",
          )}
        >
          <SlidersHorizontal size={14} className="shrink-0" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-700 px-1.5 text-[10.5px] font-semibold leading-none tabular-nums text-white">
              {activeCount}
            </span>
          )}
        </button>

        <ViewToggle className="shrink-0" />
      </div>

      {/* Desktop. */}
      <div className="card mb-4 hidden h-14 items-center justify-between gap-4 px-4 lg:flex">
        <p className="t-small" aria-live="polite">
          {countLabel}
          {totalPages > 1 && (
            <span className="text-ink-500">
              {" "}
              · page {page} of {totalPages}
            </span>
          )}
        </p>

        <div className="flex items-center gap-3">
          <ViewToggle />
          <span aria-hidden className="h-6 w-px bg-line" />
          <SortMenu currentSort={currentSort} onPick={applySort} />
        </div>
      </div>

      <Drawer
        open={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        side="bottom"
        title="Sort by"
      >
        <ul aria-label="Sort by" className="px-2 pb-3 pt-1 sm:px-3">
          {SORT_OPTIONS.map((option) => {
            const selected = currentSort === option.value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    applySort(option.value);
                    setSortSheetOpen(false);
                  }}
                  className={cn(
                    "tap flex h-12 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-[13.5px] transition-colors duration-200",
                    selected ? "bg-brand-50 font-semibold text-brand-800" : "text-ink-700",
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

      {/* Full screen on phones, a side panel on tablets; the button sits in
          the drawer footer, outside the scroll area. */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="left"
        title="Filters"
        description={`${total} products match`}
        className="max-w-none sm:max-w-[360px]"
        footer={
          <Button className="w-full" onClick={() => setFiltersOpen(false)}>
            Show results
          </Button>
        }
      >
        <div className="px-4 pb-2 pt-1 sm:px-5">
          <FilterPanel query={query} facets={facets} hideCategory={hideCategory} />
        </div>
      </Drawer>
    </>
  );
}

/** Desktop sort menu: a pill that opens a small popover of options. */
function SortMenu({
  currentSort,
  onPick,
}: {
  currentSort: string;
  onPick: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const reduce = usePrefersReducedMotion();
  const current = SORT_OPTIONS.find((o) => o.value === currentSort);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="chip h-9 px-3.5 text-[12.5px] font-medium text-ink-900 transition-colors duration-200 hover:border-ink-300"
      >
        <ArrowUpDown size={14} className="text-ink-500" />
        <span className="text-ink-500">Sort</span>
        <span>{current?.label}</span>
        <ChevronDown
          size={14}
          className={cn("text-ink-500 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
            <motion.ul
              aria-label="Sort by"
              initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute right-0 top-[calc(100%+8px)] z-20 w-60 origin-top-right overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop"
            >
              {SORT_OPTIONS.map((option) => {
                const selected = currentSort === option.value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        onPick(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex h-10 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-[13px] transition-colors duration-150",
                        selected
                          ? "bg-brand-50 font-semibold text-brand-800"
                          : "text-ink-700 hover:bg-ink-50 hover:text-ink-950",
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
  );
}
