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

  // Round cells in a frosted pill; the current page filled in cobalt.
  const linkClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-[13px] font-medium tabular-nums transition-colors duration-200";
  const restClass = "text-ink-700 hover:bg-brand-50 hover:text-brand-800";
  const spentClass = "text-ink-300";
  const gapClass = "px-1 text-[13px] text-ink-500";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-col items-center gap-2.5", className)}
    >
      <div className="card flex max-w-full items-center gap-0.5 rounded-full p-1 sm:gap-1">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            rel="prev"
            aria-label="Previous page"
            className={cn(linkClass, "tap", restClass)}
          >
            <ChevronLeft size={16} />
          </Link>
        ) : (
          <span aria-hidden className={cn(linkClass, spentClass)}>
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
                  "tap",
                  neighbour && "hidden sm:inline-flex",
                  p === page ? "bg-brand-700 font-semibold text-white shadow-sm" : restClass,
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
            className={cn(linkClass, "tap", restClass)}
          >
            <ChevronRight size={16} />
          </Link>
        ) : (
          <span aria-hidden className={cn(linkClass, spentClass)}>
            <ChevronRight size={16} />
          </span>
        )}
      </div>
      <p className="t-small tabular-nums">
        Page {page} of {totalPages}
      </p>
    </nav>
  );
}
