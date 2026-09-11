"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, RotateCcw, Star, X } from "lucide-react";
import type { ProductFacets, ProductQuery } from "@/lib/types";
import { activeFilters } from "@/lib/query";
import { Button } from "@/components/ui/button";
import { cn, formatINR } from "@/lib/utils";

/** Single hook shared by the sidebar and the mobile drawer. */
export function useFilterUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (patch: Record<string, string | null>, options: { scroll?: boolean } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      // Any filter change invalidates the current page cursor.
      if (!("page" in patch)) params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: options.scroll ?? false });
    },
    [router, pathname, searchParams],
  );
}

function toggleInList(current: string[] | undefined, value: string) {
  const set = new Set(current ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return [...set].join(",") || null;
}

/* --------------------------- Filter group -------------------------- */

function Group({
  title,
  children,
  defaultOpen = true,
  count,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Below lg this panel lives in the filter sheet, so rows grow to finger
  // height there; the desktop sidebar keeps its tighter rhythm.
  return (
    <section className="border-b border-hairline py-1.5 last:border-b-0 lg:py-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap flex min-h-10 w-full items-center justify-between gap-2 text-left lg:min-h-0"
      >
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:text-[12px]">
          {title}
          {count ? <span className="ml-1.5 text-brand-600">({count})</span> : null}
        </span>
        <ChevronDown
          size={15}
          className={cn("text-ink-400 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-1 lg:pt-3.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  count,
  swatch,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
  swatch?: string;
}) {
  return (
    <label className="tap group flex cursor-pointer items-center gap-2.5 py-2.5 lg:py-1.5">
      <span
        className={cn(
          "flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded border transition-all duration-150",
          checked
            ? "border-brand-700 bg-brand-700"
            : "border-ink-300 bg-surface group-hover:border-ink-500",
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden>
            <path
              d="M2 6.2 4.7 9 10 3"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {swatch && (
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full border border-ink-200"
          style={{ backgroundColor: swatch }}
        />
      )}
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-700 group-hover:text-ink-950 sm:text-[13px]">
        {label}
      </span>
      {count != null && (
        <span className="shrink-0 text-[11.5px] tabular-nums text-ink-400">{count}</span>
      )}
    </label>
  );
}

/* --------------------------- Price buckets ------------------------- */

function priceBuckets(min: number, max: number) {
  const presets = [
    [0, 999],
    [1000, 4999],
    [5000, 14999],
    [15000, 49999],
    [50000, 200000],
  ];
  return presets.filter(([lo, hi]) => hi >= min && lo <= max);
}

/* ------------------------------ Panel ------------------------------ */

export function FilterPanel({
  query,
  facets,
  hideCategory = false,
}: {
  query: ProductQuery;
  facets: ProductFacets;
  hideCategory?: boolean;
}) {
  const setParams = useFilterUrl();
  const buckets = useMemo(
    () => priceBuckets(facets.priceRange.min, facets.priceRange.max),
    [facets.priceRange.min, facets.priceRange.max],
  );
  const [showAllBrands, setShowAllBrands] = useState(false);

  const brandList = showAllBrands ? facets.brands : facets.brands.slice(0, 8);
  const active = activeFilters(query);

  return (
    <div className="text-ink-900">
      <div className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
        <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.1em] sm:text-[13px]">
          Filters
          {active.length > 0 && (
            <span className="ml-1.5 rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] text-white">
              {active.length}
            </span>
          )}
        </h2>
        {active.length > 0 && (
          <button
            onClick={() =>
              setParams({
                brands: null,
                colors: null,
                minPrice: null,
                maxPrice: null,
                rating: null,
                discount: null,
                inStock: null,
                fast: null,
              })
            }
            // The negative margin grows the tap area without moving the row.
            className="-my-3 inline-flex items-center gap-1 py-3 text-[12px] font-medium text-sale-600 hover:underline lg:my-0 lg:py-0"
          >
            <RotateCcw size={12} /> Clear all
          </button>
        )}
      </div>

      {!hideCategory && facets.categories.length > 1 && (
        <Group title="Category">
          <div className="space-y-0.5">
            {facets.categories.map((c) => (
              <CheckRow
                key={c.value}
                checked={query.category === c.value}
                onChange={() =>
                  setParams({ category: query.category === c.value ? null : c.value })
                }
                label={c.label}
                count={c.count}
              />
            ))}
          </div>
        </Group>
      )}

      <Group title="Price">
        <div className="space-y-0.5">
          {buckets.map(([lo, hi]) => {
            const checked = query.minPrice === lo && query.maxPrice === hi;
            return (
              <CheckRow
                key={`${lo}-${hi}`}
                checked={checked}
                onChange={() =>
                  setParams(
                    checked
                      ? { minPrice: null, maxPrice: null }
                      : { minPrice: String(lo), maxPrice: String(hi) },
                  )
                }
                label={
                  hi >= 200000
                    ? `${formatINR(lo)} and above`
                    : `${formatINR(lo)} – ${formatINR(hi)}`
                }
              />
            );
          })}
        </div>
        <PriceRange
          min={facets.priceRange.min}
          max={facets.priceRange.max}
          value={[query.minPrice, query.maxPrice]}
          onCommit={(lo, hi) => setParams({ minPrice: String(lo), maxPrice: String(hi) })}
        />
      </Group>

      {facets.brands.length > 1 && (
        <Group title="Brand" count={query.brands?.length}>
          <div className="space-y-0.5">
            {brandList.map((b) => (
              <CheckRow
                key={b.value}
                checked={query.brands?.includes(b.value) ?? false}
                onChange={() => setParams({ brands: toggleInList(query.brands, b.value) })}
                label={b.label}
                count={b.count}
              />
            ))}
          </div>
          {facets.brands.length > 8 && (
            <button
              onClick={() => setShowAllBrands((s) => !s)}
              className="inline-flex min-h-10 items-center text-[12px] font-medium text-brand-700 hover:underline lg:mt-2 lg:inline-block lg:min-h-0"
            >
              {showAllBrands ? "Show fewer" : `Show all ${facets.brands.length} brands`}
            </button>
          )}
        </Group>
      )}

      <Group title="Customer rating">
        <div className="space-y-0.5">
          {facets.ratings.map((r) => (
            <label
              key={r.value}
              className="tap group flex cursor-pointer items-center gap-2.5 py-2.5 lg:py-1.5"
            >
              <input
                type="radio"
                name="rating"
                checked={query.minRating === Number(r.value)}
                onChange={() => setParams({ rating: r.value })}
                className="sr-only"
              />
              <span
                className={cn(
                  "flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border transition-all",
                  query.minRating === Number(r.value)
                    ? "border-[5px] border-brand-700"
                    : "border-ink-300 group-hover:border-ink-500",
                )}
              />
              <span className="flex flex-1 items-center gap-1 text-[12.5px] text-ink-700 sm:text-[13px]">
                {r.value}
                <Star size={12} className="text-gold-500" fill="currentColor" strokeWidth={0} />
                <span className="text-ink-500">and above</span>
              </span>
              <span className="text-[11.5px] tabular-nums text-ink-400">{r.count}</span>
            </label>
          ))}
        </div>
      </Group>

      <Group title="Discount">
        <div className="space-y-0.5">
          {facets.discounts.map((d) => (
            <CheckRow
              key={d.value}
              checked={query.minDiscount === Number(d.value)}
              onChange={() =>
                setParams({
                  discount: query.minDiscount === Number(d.value) ? null : d.value,
                })
              }
              label={d.label}
              count={d.count}
            />
          ))}
        </div>
      </Group>

      {facets.colors.length > 0 && (
        <Group title="Colour" count={query.colors?.length} defaultOpen={false}>
          <div className="space-y-0.5">
            {facets.colors.slice(0, 12).map((c) => (
              <CheckRow
                key={c.value}
                checked={query.colors?.includes(c.value) ?? false}
                onChange={() => setParams({ colors: toggleInList(query.colors, c.value) })}
                label={c.label}
                count={c.count}
                swatch={c.swatch}
              />
            ))}
          </div>
        </Group>
      )}

      <Group title="Availability">
        <div className="space-y-0.5">
          <CheckRow
            checked={query.inStockOnly ?? false}
            onChange={() => setParams({ inStock: query.inStockOnly ? null : "1" })}
            label="In stock only"
          />
          <CheckRow
            checked={query.fastDelivery ?? false}
            onChange={() => setParams({ fast: query.fastDelivery ? null : "1" })}
            label="Delivered in 2 days or less"
          />
        </div>
      </Group>
    </div>
  );
}

/* --------------------------- Range slider -------------------------- */

function PriceRange({
  min,
  max,
  value,
  onCommit,
}: {
  min: number;
  max: number;
  value: [number | undefined, number | undefined];
  onCommit: (lo: number, hi: number) => void;
}) {
  const [lo, setLo] = useState(value[0] ?? min);
  const [hi, setHi] = useState(value[1] ?? max);

  return (
    <div className="mt-3 border-t border-hairline pt-3 lg:mt-4 lg:pt-4">
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[10.5px] uppercase tracking-[0.08em] text-ink-400">
            Min
          </span>
          <input
            type="number"
            value={lo}
            min={min}
            max={hi}
            onChange={(e) => setLo(Number(e.target.value))}
            className="h-10 w-full rounded-lg border border-ink-200 bg-surface px-2.5 text-[16px] tabular-nums outline-none focus:border-brand-500 sm:text-[13px] lg:h-9"
          />
        </label>
        <span className="mt-5 text-ink-300">—</span>
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[10.5px] uppercase tracking-[0.08em] text-ink-400">
            Max
          </span>
          <input
            type="number"
            value={hi}
            min={lo}
            max={max}
            onChange={(e) => setHi(Number(e.target.value))}
            className="h-10 w-full rounded-lg border border-ink-200 bg-surface px-2.5 text-[16px] tabular-nums outline-none focus:border-brand-500 sm:text-[13px] lg:h-9"
          />
        </label>
      </div>
      <Button
        variant="subtle"
        size="sm"
        className="mt-2.5 h-10 w-full lg:h-9"
        onClick={() => onCommit(Math.min(lo, hi), Math.max(lo, hi))}
      >
        Apply price
      </Button>
    </div>
  );
}

/* ------------------------- Active filter chips ---------------------- */

export function ActiveChips({
  query,
  brandLabels,
}: {
  query: ProductQuery;
  brandLabels: Record<string, string>;
}) {
  const setParams = useFilterUrl();
  const chips = activeFilters(query, { brands: brandLabels });

  if (chips.length === 0) return null;

  // One swipeable row on phones and tablets rather than a wrapping stack that
  // pushes the grid down; it bleeds to the screen edge like the bar above it.
  return (
    <div className="no-scrollbar -mx-3 mb-3 flex items-center gap-1.5 overflow-x-auto px-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:mb-0 lg:flex-wrap lg:overflow-visible lg:px-0">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => setParams(chip.clear)}
          className="tap inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-200 bg-surface py-2 pl-3 pr-2 text-[11.5px] font-medium text-ink-700 transition-colors hover:border-sale-500 hover:text-sale-600 sm:text-[12px] lg:py-1.5"
        >
          {chip.label}
          <X size={12} />
        </button>
      ))}
      <button
        onClick={() =>
          setParams({
            brands: null,
            colors: null,
            minPrice: null,
            maxPrice: null,
            rating: null,
            discount: null,
            inStock: null,
            fast: null,
          })
        }
        className="ml-1 shrink-0 whitespace-nowrap py-2 text-[12px] font-medium text-ink-500 underline-offset-2 hover:text-sale-600 hover:underline lg:py-0"
      >
        Clear all
      </button>
    </div>
  );
}
