import { ProductDetailSkeleton, Shimmer } from "@/components/ui/skeleton";

/**
 * The product page is a different shape on a phone — an edge-to-edge photo
 * with no thumbnail strip, an app-scale title, the price box and one row of
 * actions — so phones get an outline of that. From sm the shared skeleton,
 * gallery beside buy box, already matches.
 */
export default function Loading() {
  return (
    <>
      <div className="container-page py-3 sm:hidden">
        <Shimmer className="mb-3 h-3 w-56 max-w-full" />
        <Shimmer className="-mx-3 aspect-[4/5]" />

        <Shimmer className="mt-4 h-2.5 w-20" />
        <Shimmer className="mt-2.5 h-4 w-full" />
        <Shimmer className="mt-1.5 h-4 w-3/4" />
        <Shimmer className="mt-2.5 h-3.5 w-2/3" />
        <Shimmer className="mt-3 h-3.5 w-44" />

        <Shimmer className="mt-4 h-[74px] w-full" />
        <Shimmer className="mt-4 h-10 w-[122px]" />
        <div className="mt-4 flex gap-2">
          <Shimmer className="h-12 flex-1" />
          <Shimmer className="h-12 flex-1" />
          <Shimmer className="h-12 w-12 shrink-0" />
        </div>
      </div>

      <div className="hidden sm:block">
        <ProductDetailSkeleton />
      </div>
    </>
  );
}
