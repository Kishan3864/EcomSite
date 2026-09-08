import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Order-line image snapshot. Unoptimised on purpose: the snapshot URL may
 * point at a host that is not in `images.remotePatterns`, and a thumbnail
 * this size gains nothing from the optimiser.
 */
export function ReturnThumb({ src, alt, size = 40, className }: { src: string; alt: string; size?: number; className?: string }) {
  const box = cn("shrink-0 overflow-hidden rounded-md border border-hairline bg-canvas", className);
  if (!src) {
    return (
      <span className={cn(box, "flex items-center justify-center text-ink-300")} style={{ width: size, height: size }}>
        <Package size={Math.max(14, Math.round(size / 2.5))} />
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={cn(box, "object-cover")}
      style={{ width: size, height: size }}
    />
  );
}
