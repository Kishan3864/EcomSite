import Link from "next/link";
import type { ProductBadge } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The shop's badges, as one set.
 *
 * Nine marks — the six a product can be given in the admin, and the three the
 * shop works out for itself (a price cut, low stock, sold out) — drawn to one
 * specification so that two or three of them sit together as a row rather than
 * as a collision: one height, square corners like everything else here, a
 * 12px glyph, small caps, a tint of the mark's own hue behind it and a hairline
 * of the same hue around it. The price cut is the one solid mark, because it is
 * the one a shopper scans a grid for.
 *
 * Every glyph is drawn here, as inline SVG on a 16-unit grid in currentColor.
 * No image requests, no icon font, nothing borrowed: a badge costs a few
 * hundred bytes of markup and cannot arrive late.
 *
 * Colour is never the only signal — every badge carries its word.
 */

export type BadgeKind = ProductBadge | "sale" | "low-stock" | "sold-out";

type Glyph = () => React.ReactElement;

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A rosette: the medal a best seller wears. */
const Rosette: Glyph = () => (
  <>
    <circle cx="8" cy="6" r="3.6" {...stroke} />
    <path d="M5.8 9 4.6 14.2 8 12.4l3.4 1.8L10.2 9" {...stroke} />
    <path d="m8 4.3.6 1.2 1.3.2-.95.9.22 1.3L8 7.3l-1.17.6.22-1.3-.95-.9 1.3-.2Z" fill="currentColor" />
  </>
);

/** A four-point spark with a smaller one beside it: something just arrived. */
const Spark: Glyph = () => (
  <>
    <path d="M7 2.2c.5 2.7 1.6 3.8 4.3 4.3C8.6 7 7.500 8.100 7 10.800 6.500 8.100 5.400 7 2.700 6.500 5.400 6 6.500 4.900 7 2.200Z" fill="currentColor" />
    <path d="M12.3 9.600c.25 1.35.8 1.900 2.150 2.150-1.350.250-1.900.800-2.150 2.150-.250-1.350-.800-1.900-2.150-2.150 1.350-.250 1.900-.800 2.150-2.150Z" fill="currentColor" />
  </>
);

/** A rising line ending in an arrowhead: moving up the charts. */
const Rising: Glyph = () => (
  <>
    <path d="M2 11.500 6.200 7.300l2.600 2.600L14 4.700" {...stroke} />
    <path d="M10.200 4.500H14v3.800" {...stroke} />
  </>
);

/** An hourglass, running out. */
const Hourglass: Glyph = () => (
  <>
    <path d="M4 2.500h8M4 13.500h8" {...stroke} />
    <path d="M4.800 2.500c0 3 3.200 3.700 3.200 5.500s-3.200 2.500-3.200 5.500M11.200 2.500c0 3-3.200 3.700-3.200 5.500s3.200 2.500 3.200 5.500" {...stroke} />
    <path d="M6.400 12.700h3.200L8 10.900Z" fill="currentColor" />
  </>
);

/** A cut gem. */
const Gem: Glyph = () => (
  <>
    <path d="M4.500 2.800h7L14 6.300 8 13.500 2 6.300Z" {...stroke} />
    <path d="M2 6.300h12M6.200 2.800 5.300 6.300 8 13.500l2.700-7.200-.9-3.500" {...stroke} strokeWidth={1.1} />
  </>
);

/** A tick inside a leaf: chosen by a person. */
const Chosen: Glyph = () => (
  <>
    <path d="M13.500 2.500C7 2.500 3 5.600 3 10.200c0 1.100.300 2.100.800 3 4.700.600 9.700-2.800 9.700-10.700Z" {...stroke} />
    <path d="m5.900 8.800 1.800 1.800 3.300-3.800" {...stroke} />
  </>
);

/** A price tag with a percent sign punched in it. */
const Tag: Glyph = () => (
  <>
    <path d="M2.500 2.500h5.200l6 6-5.200 5.200-6-6Z" {...stroke} />
    <circle cx="5.500" cy="5.500" r="1" fill="currentColor" />
  </>
);

/** A circle with a bar through it. */
const Barred: Glyph = () => (
  <>
    <circle cx="8" cy="8" r="5.500" {...stroke} />
    <path d="m4.200 11.800 7.600-7.600" {...stroke} />
  </>
);

interface Spec {
  label: string;
  glyph: Glyph;
  /** Tint, text and hairline. Literal where the scale has no such hue. */
  className: string;
}

const SET: Record<BadgeKind, Spec> = {
  bestseller: { label: "Bestseller", glyph: Rosette, className: "bg-gold-50 text-gold-800 ring-gold-500/35" },
  new: { label: "New in", glyph: Spark, className: "bg-brand-50 text-brand-800 ring-brand-500/35" },
  trending: { label: "Trending", glyph: Rising, className: "bg-[#fbefe6] text-[#8f4519] ring-[#c9763f]/35" },
  limited: { label: "Few left", glyph: Hourglass, className: "bg-sale-50 text-sale-700 ring-sale-500/35" },
  exclusive: { label: "Exclusive", glyph: Gem, className: "bg-[#f2edf8] text-[#563a73] ring-[#8a68ad]/35" },
  handpicked: { label: "Handpicked", glyph: Chosen, className: "bg-[#e7f4ea] text-[#1c6636] ring-[#3f9a5c]/35" },
  sale: { label: "Sale", glyph: Tag, className: "bg-sale-600 text-white ring-sale-700" },
  "low-stock": { label: "Low stock", glyph: Hourglass, className: "bg-sale-50 text-sale-700 ring-sale-500/35" },
  "sold-out": { label: "Sold out", glyph: Barred, className: "bg-ink-100 text-ink-600 ring-ink-300" },
};

/** Which badges exist, in the order they should sit when several apply. */
export const BADGE_ORDER: BadgeKind[] = ["sold-out", "sale", "low-stock", "limited", "bestseller", "new", "trending", "exclusive", "handpicked"];

/**
 * One badge.
 *
 * `label` replaces the word when the mark carries a number — "32% off",
 * "Only 3 left". `size` is `sm` on a card and in a listing, `md` on the product
 * page; both share a baseline so a row of them lines up.
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
  const px = size === "md" ? 13 : 11;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full font-semibold uppercase leading-none ring-1 ring-inset",
        size === "md" ? "h-[24px] gap-1.5 px-2 text-[10.5px] tracking-[0.09em]" : "h-[20px] gap-1 px-1.5 text-[9.5px] tracking-[0.08em]",
        spec.className,
        className,
      )}
    >
      <svg width={px} height={px} viewBox="0 0 16 16" aria-hidden focusable="false" className="shrink-0">
        <Glyph />
      </svg>
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
      <span aria-hidden className="flex h-6 w-6 items-center justify-center bg-brand-900 text-[10px] font-bold tracking-[0.04em] text-white">
        {initials}
      </span>
      <span className="text-[12.5px] text-ink-500">
        by
        <span className="ml-1.5 font-display text-[15px] text-ink-950 underline decoration-ink-300 decoration-1 underline-offset-[3px] transition-colors group-hover/brand:decoration-brand-700">
          {name}
        </span>
      </span>
    </Link>
  );
}
