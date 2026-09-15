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

/**
 * One product tile, block for block as ProductCard sets it: the 3:4 photograph,
 * the small-caps brand line, two lines of title, the price, the one line of
 * fact, and the 40px action pinned to the foot. The heights are the type sizes
 * of the real tile rather than round numbers, because the whole value of a
 * skeleton is that nothing moves when the data lands.
 */
export function ProductCardSkeleton() {
  return (
    <div className="bg-surface shadow-sm">
      <Shimmer className="aspect-[3/4] w-full" />
      <div className="px-2.5 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-4">
        <Shimmer className="h-[11px] w-14 sm:w-16" />
        <Shimmer className="mt-2 h-[13.5px] w-full sm:mt-2.5" />
        <Shimmer className="mt-1 h-[13.5px] w-3/5" />
        <Shimmer className="mt-2.5 h-[14px] w-20 sm:mt-3 sm:w-24" />
        <Shimmer className="mt-2.5 h-3 w-24 sm:mt-3 sm:w-28" />
        <Shimmer className="mt-2.5 h-10 w-full sm:mt-3.5" />
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

/** Product detail: gallery beside the buy box. */
export function ProductDetailSkeleton() {
  return (
    <div className="container-page py-5 sm:py-7">
      <Shimmer className="mb-4 h-3 w-64 max-w-full sm:mb-6" />
      <div className="grid gap-5 sm:gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <Shimmer className="aspect-square w-full" />
          {/* Clipped, not scrolled: five 64px thumbs are wider than a 320px screen. */}
          <div className="mt-3 flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <Shimmer key={i} className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
            ))}
          </div>
        </div>
        <div>
          <Shimmer className="h-2.5 w-24" />
          <Shimmer className="mt-3 h-7 w-full sm:mt-4 sm:h-9" />
          <Shimmer className="mt-2 h-7 w-2/3 sm:h-9" />
          <Shimmer className="mt-4 h-4 w-40 sm:mt-6" />
          <Shimmer className="mt-5 h-8 w-40 sm:mt-7 sm:h-10 sm:w-52" />
          <Shimmer className="mt-6 h-px w-full sm:mt-8" />
          <Shimmer className="mt-6 h-12 w-full sm:mt-8" />
          <Shimmer className="mt-3 h-12 w-full" />
          <div className="mt-6 space-y-3 sm:mt-8">
            {Array.from({ length: 4 }, (_, i) => (
              <Shimmer key={i} className="h-3.5 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
