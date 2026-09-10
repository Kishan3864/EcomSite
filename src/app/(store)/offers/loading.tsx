import { BandHeaderSkeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-14 sm:py-20">
      <BandHeaderSkeleton />
      <ProductGridSkeleton count={10} columns={5} />
    </div>
  );
}
