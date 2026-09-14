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
    <section className={cn("container-page py-6 sm:py-14", className)}>
      {/* The rail bleeds to the screen edge by exactly the page gutter — 12px
          on phones — so it scrolls edge to edge without widening the page. */}
      <RailScroller
        label="products"
        headerClassName="mb-4 sm:mb-6"
        railClassName="-mx-3 px-3 pb-2 sm:-mx-6 sm:px-6 sm:pb-3 lg:-mx-8 lg:px-8"
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
        {/* One way out of a band, not two. The rail used to end in a dashed
            "View all" tile as well as carrying the link in its header, which
            said the same thing twice in the same eyeful. The tile was there
            because the header's link used to be hidden on phones; it is now
            shown at every width instead, which is the honest fix. */}
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            layout="rail"
            priority={priority && i < 3}
            /* Must track ProductCard's own `layout="rail"` widths. Remote
               images are served unoptimized by policy, so a stale `sizes`
               has no fallback — it simply renders soft. */
            sizes="(min-width:640px) 236px, 152px"
          />
        ))}
      </RailScroller>
    </section>
  );
}

/**
 * The catalogue grid behind every listing route.
 *
 * It is `.tile-grid` — one shared hairline between tiles — and not a gapped
 * row of cards, because the loading skeleton every listing route renders has
 * always been drawn that way. A grid of gaps settling into a grid of rules on
 * every navigation to a listing read as a glitch rather than as a page
 * arriving, and it was the grid that was wrong, not the skeleton.
 */
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
        "tile-grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        className,
      )}
    >
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < priorityCount} />
      ))}
    </div>
  );
}
