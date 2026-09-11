import { Fragment } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server-rendered so page links stay real, crawlable URLs. */
export function Pagination({
  page,
  totalPages,
  hrefFor,
  className,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "gap")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }

  // Five numbers plus the arrows is wider than a 320px phone, so a run that
  // long drops the current page's two neighbours on phones. Where that opens a
  // hole the list has no ellipsis for, one stands in on phones only.
  const crowded = pages.filter((p) => p !== "gap").length >= 5;

  const linkClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-[12.5px] font-medium transition-colors sm:text-[13px]";
  const gapClass = "px-1 text-ink-400";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1 sm:gap-1.5", className)}
    >
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          rel="prev"
          aria-label="Previous page"
          className={cn(linkClass, "tap border-ink-200 bg-surface text-ink-700 hover:border-ink-400")}
        >
          <ChevronLeft size={16} />
        </Link>
      ) : (
        <span className={cn(linkClass, "border-ink-100 bg-ink-50 text-ink-300")}>
          <ChevronLeft size={16} />
        </span>
      )}

      {pages.map((p, i) => {
        if (p === "gap") {
          return (
            <span key={`gap-${i}`} className={gapClass}>
              &hellip;
            </span>
          );
        }

        const neighbour = crowded && Math.abs(p - page) === 1 && p !== 1 && p !== totalPages;
        const phoneGap = neighbour && pages[p < page ? i - 1 : i + 1] !== "gap";

        return (
          <Fragment key={p}>
            {phoneGap && (
              <span className={cn(gapClass, "sm:hidden")} aria-hidden>
                &hellip;
              </span>
            )}
            <Link
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                linkClass,
                "tap tabular-nums",
                neighbour && "hidden sm:inline-flex",
                p === page
                  ? "border-brand-900 bg-brand-900 text-white"
                  : "border-ink-200 bg-surface text-ink-700 hover:border-ink-400",
              )}
            >
              {p}
            </Link>
          </Fragment>
        );
      })}

      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          rel="next"
          aria-label="Next page"
          className={cn(linkClass, "tap border-ink-200 bg-surface text-ink-700 hover:border-ink-400")}
        >
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span className={cn(linkClass, "border-ink-100 bg-ink-50 text-ink-300")}>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
