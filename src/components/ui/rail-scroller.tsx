"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Held back from a full page so the card at the edge stays in view and the jump reads as a slide. */
const OVERLAP = 64;

const ARROW = cn(
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full",
  "border border-ink-200 bg-surface text-ink-700 shadow-sm",
  "transition-colors duration-200 hover:border-ink-900 hover:text-ink-950",
  "disabled:pointer-events-none disabled:opacity-40",
);

/**
 * A snap rail with previous / next controls parked in the section header.
 *
 * The rail itself stays a plain `.rail`, so touch scrolling and snapping are
 * untouched and the arrows are purely a pointer affordance: they only appear
 * once the content actually overflows, and only from `sm` up.
 */
export function RailScroller({
  label,
  header,
  headerClassName,
  railClassName,
  children,
}: {
  label: string;
  header: React.ReactNode;
  headerClassName?: string;
  railClassName?: string;
  children: React.ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const reduce = usePrefersReducedMotion();
  const count = Children.count(children);

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Snapping parks the first card against `.rail`'s scroll-padding, so a rail whose own padding
    // is wider than that never rests at zero — testing for a bare zero leaves `Previous` inert.
    const lead = parseFloat(getComputedStyle(el).paddingInlineStart) || 0;
    setOverflowing(max > 1);
    setAtStart(el.scrollLeft <= lead + 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    measure();
    // Card widths settle after images and fonts land, so the items are watched too, not just the viewport.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure, count]);

  function page(direction: 1 | -1) {
    const el = rail.current;
    if (!el) return;
    el.scrollTo({
      left: el.scrollLeft + direction * Math.max(el.clientWidth - OVERLAP, OVERLAP),
      behavior: reduce ? "auto" : "smooth",
    });
  }

  return (
    <>
      <div className={cn("mb-6 flex items-end justify-between gap-4", headerClassName)}>
        <div className="min-w-0 flex-1">{header}</div>
        {overflowing && (
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => page(-1)}
              disabled={atStart}
              aria-label={`Previous ${label}`}
              className={ARROW}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => page(1)}
              disabled={atEnd}
              aria-label={`Next ${label}`}
              className={ARROW}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        )}
      </div>

      <div ref={rail} onScroll={measure} className={cn("rail", railClassName)}>
        {children}
      </div>
    </>
  );
}
