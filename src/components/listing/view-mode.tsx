"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { LayoutGrid, List } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { ProductCard } from "@/components/product/product-card";
import { cn } from "@/lib/utils";

/**
 * Grid / list choice for the listing. A viewer preference, not part of the
 * query, so it lives in localStorage and survives paging and filtering.
 */
export type ViewMode = "grid" | "list";

const KEY = "wc:listing-view";
const EVENT = "wc:listing-view";

function read(): ViewMode {
  try {
    return localStorage.getItem(KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function useStoredView() {
  const view = useSyncExternalStore(subscribe, read, () => "grid" as ViewMode);
  const setView = useCallback((next: ViewMode) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the choice lasts for this render only */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [view, setView] as const;
}

const ViewContext = createContext<readonly [ViewMode, (v: ViewMode) => void]>(["grid", () => {}]);

export function ListingViewProvider({ children }: { children: React.ReactNode }) {
  const value = useStoredView();
  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useListingView() {
  return useContext(ViewContext);
}

/** Segmented grid / list switch. */
export function ViewToggle({ className }: { className?: string }) {
  const [view, setView] = useListingView();
  const options = [
    { value: "grid" as const, label: "Grid view", Icon: LayoutGrid },
    { value: "list" as const, label: "List view", Icon: List },
  ];

  return (
    <div
      role="group"
      aria-label="Layout"
      className={cn("inline-flex items-center gap-0.5 rounded-full bg-ink-100 p-0.5", className)}
    >
      {options.map(({ value, label, Icon }) => {
        const on = view === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={on}
            title={label}
            onClick={() => setView(value)}
            className={cn(
              "tap flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
              on ? "bg-surface text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-900",
            )}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}

/** The product grid, or the list, per the viewer's choice. */
export function ListingResults({
  products,
  priorityCount = 2,
}: {
  products: ProductCardModel[];
  priorityCount?: number;
}) {
  const [view] = useListingView();

  if (view === "list") {
    return (
      <div className="reveal grid gap-3 xl:grid-cols-2">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} layout="list" priority={i < priorityCount} />
        ))}
      </div>
    );
  }

  return (
    <div className="reveal grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-5">
      {products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={i < priorityCount}
          sizes="(min-width:1280px) 20vw, (min-width:640px) 30vw, 50vw"
        />
      ))}
    </div>
  );
}
