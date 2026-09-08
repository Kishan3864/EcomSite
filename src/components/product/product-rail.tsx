import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProductCardModel } from "@/lib/card";
import { ProductCard } from "./product-card";
import { SectionHeader } from "@/components/ui/primitives";
import { RailScroller } from "@/components/ui/rail-scroller";
import { Reveal } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

export function ProductRail({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  products,
  className,
  priority = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  products: ProductCardModel[];
  className?: string;
  priority?: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <section className={cn("container-page py-10 sm:py-14", className)}>
      <RailScroller
        label="products"
        railClassName="-mx-4 px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        header={
          <Reveal>
            <SectionHeader
              eyebrow={eyebrow}
              title={title}
              description={description}
              href={href}
              linkLabel={linkLabel}
            />
          </Reveal>
        }
      >
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            layout="rail"
            priority={priority && i < 3}
            sizes="(min-width:640px) 212px, 172px"
          />
        ))}
        {href && (
          <Link
            href={href}
            className="group flex w-[172px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-200 bg-surface/50 p-6 text-center transition-colors hover:border-brand-500 hover:bg-brand-50 sm:w-[212px]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition-transform duration-300 group-hover:translate-x-1">
              <ArrowRight size={18} />
            </span>
            <span className="text-[13px] font-semibold text-ink-900">
              {linkLabel ?? "View all"}
            </span>
          </Link>
        )}
      </RailScroller>
    </section>
  );
}

export function ProductGrid({
  products,
  className,
  priorityCount = 0,
}: {
  products: ProductCardModel[];
  className?: string;
  priorityCount?: number;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5",
        className,
      )}
    >
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < priorityCount} />
      ))}
    </div>
  );
}
