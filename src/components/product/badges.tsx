import Link from "next/link";
import { Award, Ban, Gem, Hourglass, Sparkles, Tag, ThumbsUp, TrendingUp, type LucideIcon } from "lucide-react";
import type { ProductBadge } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The shop's badges, as one set: the six a product can be given in the admin
 * and the three the shop works out itself (a price cut, low stock, sold out).
 * One height, one pill, one lucide glyph each. Colour is never the only
 * signal — every badge carries its word.
 */

export type BadgeKind = ProductBadge | "sale" | "low-stock" | "sold-out";

interface Spec {
  label: string;
  glyph: LucideIcon;
  className: string;
}

const SET: Record<BadgeKind, Spec> = {
  bestseller: { label: "Bestseller", glyph: Award, className: "bg-gold-50 text-gold-800 ring-gold-300" },
  new: { label: "New in", glyph: Sparkles, className: "bg-brand-50 text-brand-800 ring-brand-200" },
  trending: { label: "Trending", glyph: TrendingUp, className: "bg-iris-50 text-iris-600 ring-iris-200" },
  limited: { label: "Few left", glyph: Hourglass, className: "bg-sale-50 text-sale-700 ring-sale-200" },
  exclusive: { label: "Exclusive", glyph: Gem, className: "bg-ink-950 text-white ring-ink-950" },
  handpicked: { label: "Handpicked", glyph: ThumbsUp, className: "bg-surface text-ink-800 ring-line-strong" },
  sale: { label: "Sale", glyph: Tag, className: "bg-sale-600 text-white ring-sale-600" },
  "low-stock": { label: "Low stock", glyph: Hourglass, className: "bg-sale-50 text-sale-700 ring-sale-200" },
  "sold-out": { label: "Sold out", glyph: Ban, className: "bg-ink-100 text-ink-600 ring-ink-200" },
};

/** Which badges exist, in the order they should sit when several apply. */
export const BADGE_ORDER: BadgeKind[] = ["sold-out", "sale", "low-stock", "limited", "bestseller", "new", "trending", "exclusive", "handpicked"];

/**
 * One badge. `label` replaces the word when the mark carries a number —
 * "32% off", "Only 3 left". `sm` on cards, `md` on the product page.
 */
export function ProductBadgeMark({
  kind,
  label,
  size = "sm",
  className,
}: {
  kind: BadgeKind;
  label?: string | undefined;
  size?: "sm" | "md";
  className?: string | undefined;
}) {
  const spec = SET[kind];
  const Glyph = spec.glyph;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full font-semibold leading-none ring-1 ring-inset",
        size === "md" ? "h-6 gap-1.5 px-2.5 text-[11.5px]" : "h-5 gap-1 px-2 text-[10.5px]",
        spec.className,
        className,
      )}
    >
      <Glyph size={size === "md" ? 14 : 12} aria-hidden className="shrink-0" />
      {label ?? spec.label}
    </span>
  );
}

/**
 * The badges one product earns, worked out in one place so a card, a listing
 * row, a search result and the product page can never disagree.
 *
 * At most `max` are shown, in BADGE_ORDER: what affects buying it (sold out, a
 * price cut, running low) before what merely describes it.
 */
export function badgesFor(product: { badges: ProductBadge[]; price: number; mrp: number; stock: number }, lowStockAt = 12) {
  const out: { kind: BadgeKind; label?: string }[] = [];
  const off = product.mrp > product.price && product.mrp > 0 ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  if (product.stock <= 0) out.push({ kind: "sold-out" });
  else {
    if (off > 0) out.push({ kind: "sale", label: `${off}% off` });
    if (product.stock <= lowStockAt) out.push({ kind: "low-stock", label: `Only ${product.stock} left` });
  }
  for (const badge of product.badges) {
    // "Few left" says what "Only 3 left" already says, with less.
    if (badge === "limited" && out.some((b) => b.kind === "low-stock")) continue;
    out.push({ kind: badge });
  }
  return out.sort((a, b) => BADGE_ORDER.indexOf(a.kind) - BADGE_ORDER.indexOf(b.kind));
}

export function ProductBadges({
  product,
  max = 3,
  size = "sm",
  className,
}: {
  product: Parameters<typeof badgesFor>[0];
  max?: number;
  size?: "sm" | "md";
  className?: string | undefined;
}) {
  const badges = badgesFor(product).slice(0, max);
  if (badges.length === 0) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center", size === "md" ? "gap-1.5" : "gap-1", className)}>
      {badges.map((b) => (
        <ProductBadgeMark key={b.kind} kind={b.kind} label={b.label} size={size} />
      ))}
    </span>
  );
}

/**
 * The brand, as a brand.
 *
 * It used to be a third grey word in the same row and the same small caps as
 * the badges. It is set apart now: a square monogram tile, the name in the
 * display face at reading size, and "by" before it — a maker's line rather
 * than a label — linking to everything else from that brand.
 */
export function BrandMark({ name, href, className }: { name: string; href: string; className?: string | undefined }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <Link href={href} className={cn("group/brand inline-flex items-center gap-2", className)}>
      <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-[10px] font-bold tracking-[0.04em] text-brand-800 ring-1 ring-inset ring-brand-100">
        {initials}
      </span>
      <span className="text-[12.5px] text-ink-500">
        by
        <span className="ml-1 text-[13px] font-semibold text-ink-900 underline decoration-ink-300 decoration-1 underline-offset-[3px] transition-colors group-hover/brand:decoration-brand-700">
          {name}
        </span>
      </span>
    </Link>
  );
}
