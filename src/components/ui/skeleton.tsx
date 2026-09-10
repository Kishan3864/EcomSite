import { cn } from "@/lib/utils";

/**
 * Shimmer placeholders.
 *
 * These render on the server as a route's `loading.tsx`, so the shell appears
 * the instant a link is clicked rather than after the database answers. The
 * shapes deliberately match the real components' geometry — same aspect ratio,
 * same grid, same rhythm — because a skeleton that settles into a different
 * layout reads as a glitch rather than as loading.
 *
 * The shimmer itself is the `.skeleton` class in globals.css: a gradient swept
 * across the element. It respects prefers-reduced-motion along with every other
 * animation on the site.
 */

export function Shimmer({ className }: { className?: string }) {
  return <span aria-hidden className={cn("skeleton block", className)} />;
}

/** One product tile, matching ProductCard's 3:4 image and text block. */
export function ProductCardSkeleton() {
  return (
    <div className="bg-surface">
      <Shimmer className="aspect-[3/4] w-full" />
      <div className="px-3.5 pb-3.5 pt-4">
        <Shimmer className="h-2.5 w-16" />
        <Shimmer className="mt-3 h-3.5 w-full" />
        <Shimmer className="mt-1.5 h-3.5 w-3/5" />
        <Shimmer className="mt-3.5 h-5 w-24" />
        <Shimmer className="mt-3 h-3 w-28" />
        <Shimmer className="mt-4 h-10 w-full" />
      </div>
    </div>
  );
}

/** A full grid of tiles on the shared hairline rule. */
export function ProductGridSkeleton({
  count = 10,
  columns = 5,
}: {
  count?: number;
  columns?: 4 | 5;
}) {
  return (
    <div
      className={cn(
        "tile-grid grid-cols-2 sm:grid-cols-3",
        columns === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** The band header every section carries above its grid. */
export function BandHeaderSkeleton() {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-ink-950 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="w-full max-w-2xl">
        <Shimmer className="h-2.5 w-28" />
        <Shimmer className="mt-3.5 h-8 w-72 max-w-full" />
        <Shimmer className="mt-3 h-3.5 w-96 max-w-full" />
      </div>
      <Shimmer className="h-3 w-24 shrink-0" />
    </div>
  );
}

/** Product detail: gallery beside the buy box. */
export function ProductDetailSkeleton() {
  return (
    <div className="container-page py-5 sm:py-7">
      <Shimmer className="mb-6 h-3 w-64 max-w-full" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <Shimmer className="aspect-square w-full" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Shimmer key={i} className="h-16 w-16 shrink-0" />
            ))}
          </div>
        </div>
        <div>
          <Shimmer className="h-2.5 w-24" />
          <Shimmer className="mt-4 h-9 w-full" />
          <Shimmer className="mt-2 h-9 w-2/3" />
          <Shimmer className="mt-6 h-4 w-40" />
          <Shimmer className="mt-7 h-10 w-52" />
          <Shimmer className="mt-8 h-px w-full" />
          <Shimmer className="mt-8 h-12 w-full" />
          <Shimmer className="mt-3 h-12 w-full" />
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Shimmer key={i} className="h-3.5 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Listing pages: filter rail beside a grid. */
export function ListingSkeleton({ columns = 4 }: { columns?: 4 | 5 }) {
  return (
    <div className="container-page py-5 sm:py-7">
      <Shimmer className="mb-6 h-3 w-56 max-w-full" />
      <Shimmer className="h-9 w-72 max-w-full" />
      <Shimmer className="mt-3 h-3.5 w-96 max-w-full" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="mb-8">
              <Shimmer className="h-3 w-24" />
              <div className="mt-4 space-y-2.5">
                {Array.from({ length: 5 }, (_, j) => (
                  <Shimmer key={j} className="h-3 w-full" />
                ))}
              </div>
            </div>
          ))}
        </aside>
        <div>
          <div className="mb-5 flex items-center justify-between">
            <Shimmer className="h-3 w-32" />
            <Shimmer className="h-9 w-40" />
          </div>
          <ProductGridSkeleton count={12} columns={columns} />
        </div>
      </div>
    </div>
  );
}
