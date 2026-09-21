"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, RotateCcw, SlidersHorizontal, Star, X } from "lucide-react";
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

const CLEAR_ALL = {
  brands: null,
  colors: null,
  minPrice: null,
  maxPrice: null,
  rating: null,
  discount: null,
  inStock: null,
  fast: null,
};

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

  // Finger-height rows in the phone sheet; tighter in the desktop rail.
  return (
    <section className="border-b border-line py-2 last:border-b-0 lg:py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap -mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center justify-between gap-2 rounded-md px-2 text-left transition-colors hover:bg-ink-50 lg:min-h-9"
      >
        <span className="t-label text-ink-900">
          {title}
          {count ? (
            <span className="ml-1.5 rounded-full bg-brand-50 px-1.5 py-px tabular-nums text-brand-700">
              {count}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-ink-500 transition-transform duration-200",
            open && "rotate-180",
          )}
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
            <div className="pb-1 pt-1.5">{children}</div>
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
  // The real input comes first so the drawn box can show keyboard focus.
  return (
    <label
      className={cn(
        "tap group -mx-2 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2.5 transition-colors duration-150 lg:py-1.5",
        checked ? "bg-brand-50/70" : "hover:bg-ink-50",
      )}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors duration-150",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500",
          checked ? "border-brand-700 bg-brand-700" : "border-line-strong bg-surface group-hover:border-brand-400",
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
      {swatch && (
        <span
          aria-hidden
          className="h-4 w-4 shrink-0 rounded-full ring-1 ring-inset ring-ink-950/10"
          style={{ backgroundColor: swatch }}
        />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px] transition-colors group-hover:text-ink-950",
          checked ? "font-medium text-ink-950" : "text-ink-700",
        )}
      >
        {label}
      </span>
      {count != null && (
        <span className="shrink-0 text-[12px] tabular-nums text-ink-500">{count}</span>
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
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-950">
          <SlidersHorizontal size={16} className="text-brand-700" aria-hidden />
          Filters
          {active.length > 0 && (
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-700 px-1.5 text-[10.5px] font-semibold leading-none tabular-nums text-white">
              {active.length}
            </span>
          )}
        </h2>
        {active.length > 0 && (
          <button
            type="button"
            onClick={() => setParams(CLEAR_ALL)}
            className="tap -mr-2 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-semibold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
          >
            <RotateCcw size={14} aria-hidden /> Clear all
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
              type="button"
              onClick={() => setShowAllBrands((s) => !s)}
              aria-expanded={showAllBrands}
              className="tap mt-1 inline-flex min-h-10 items-center text-[12.5px] font-semibold text-brand-700 transition-colors hover:text-brand-800 lg:min-h-8"
            >
              {showAllBrands ? "Show fewer" : `Show all ${facets.brands.length} brands`}
            </button>
          )}
        </Group>
      )}

      <Group title="Customer rating">
        <div className="space-y-0.5">
          {facets.ratings.map((r) => {
            const chosen = query.minRating === Number(r.value);
            return (
              <label
                key={r.value}
                className={cn(
                  "tap group -mx-2 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2.5 transition-colors duration-150 lg:py-1.5",
                  chosen ? "bg-brand-50/70" : "hover:bg-ink-50",
                )}
              >
                <input
                  type="radio"
                  name="rating"
                  checked={chosen}
                  onChange={() => setParams({ rating: r.value })}
                  className="peer sr-only"
                />
                {/* A round radio: an outlined ring, and a brand dot when chosen. */}
                <span
                  className={cn(
                    "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500",
                    chosen ? "border-brand-700" : "border-line-strong group-hover:border-brand-400",
                  )}
                >
                  {chosen && <span className="h-[9px] w-[9px] rounded-full bg-brand-700" />}
                </span>
                <span
                  className={cn(
                    "flex flex-1 items-center gap-1 text-[13px]",
                    chosen ? "font-medium text-ink-950" : "text-ink-700",
                  )}
                >
                  <span className="tabular-nums">{r.value}</span>
                  <Star size={14} className="text-gold-500" fill="currentColor" strokeWidth={0} />
                  <span className="text-ink-500">and above</span>
                </span>
                <span className="text-[12px] tabular-nums text-ink-500">{r.count}</span>
              </label>
            );
          })}
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

  // 16px text on phones: iOS zooms into any smaller field on focus.
  const field =
    "h-10 w-full rounded-md bg-surface px-3 text-[16px] tabular-nums text-ink-900 outline-none sm:text-[13px] lg:h-9";

  return (
    <div className="card-muted mt-3 p-3">
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="t-label mb-1.5 block">Min</span>
          <input
            type="number"
            value={lo}
            min={min}
            max={hi}
            onChange={(e) => setLo(Number(e.target.value))}
            className={field}
          />
        </label>
        <span aria-hidden className="mt-6 text-ink-500">
          –
        </span>
        <label className="min-w-0 flex-1">
          <span className="t-label mb-1.5 block">Max</span>
          <input
            type="number"
            value={hi}
            min={lo}
            max={max}
            onChange={(e) => setHi(Number(e.target.value))}
            className={field}
          />
        </label>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2.5 h-10 w-full bg-surface lg:h-9"
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

  // One swipeable row on phones, bleeding to the screen edge; wraps on desktop.
  return (
    <div
      role="group"
      aria-label="Active filters"
      className="no-scrollbar -mx-3 mb-4 flex items-center gap-1.5 overflow-x-auto px-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => setParams(chip.clear)}
          aria-label={`Remove filter: ${chip.label}`}
          className="tap group inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-brand-200 bg-brand-50 pl-3 pr-2 text-[12.5px] font-medium text-brand-800 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-100"
        >
          {chip.label}
          <X size={14} className="text-brand-600 transition-colors group-hover:text-brand-800" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={() => setParams(CLEAR_ALL)}
        className="tap ml-1 inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-950"
      >
        Clear all
      </button>
    </div>
  );
}
