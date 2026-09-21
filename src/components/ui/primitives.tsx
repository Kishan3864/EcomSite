import * as React from "react";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { PaperMark } from "@/components/illustration/paper-mark";
import { cn, discountPercent, formatCompact, formatINR } from "@/lib/utils";
import type { ProductBadge } from "@/lib/types";

/* ------------------------------ Badge ----------------------------- */

type Tone = "brand" | "gold" | "sale" | "neutral" | "outline" | "success";

/**
 * Six flat stamps, each one of the ramps and nothing in between. They are
 * printed rather than glazed: the translucent, blurred fills two of them used
 * to carry were there to survive being laid over a photograph, and a flat ink
 * stamp does that better — it is what the reduction in the corner of every
 * product tile already is.
 *
 * `outline` carries `shadow-xs` for the 1px ink ring in its first layer, because
 * a flat stamp still needs an edge when its fill matches its ground: it draws no
 * outline despite the name — it is plain white, so "Recommended" on a white
 * payment card was letters floating with no stamp under them at all.
 *
 * `success` needed the opposite fix. It was bg-brand-100, which is exactly the
 * selected option card's fill, so the "Default" badge on a chosen address
 * vanished into the card holding it — and the ring did not rescue it: composited
 * over brand-100 that edge is ~#ccd8de against a brand-100 stamp, 1.15:1, no
 * boundary at all. A ring cannot separate two identical fills. brand-200 can:
 * 1.26:1 off the selected card, 1.40:1 off the white ones, with brand-900 text
 * at 9.6:1 on it. No ring, because the fill is now doing the work.
 */
const TONES: Record<Tone, string> = {
  brand: "bg-brand-900 text-white",
  gold: "bg-gold-400 text-ink-950",
  sale: "bg-sale-500 text-white",
  neutral: "bg-ink-950 text-white",
  outline: "bg-surface text-ink-950 shadow-xs",
  success: "bg-brand-200 text-brand-900",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
        "text-[11px] font-semibold leading-none tracking-[0.01em]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const BADGE_LABELS: Record<ProductBadge, { label: string; tone: Tone }> = {
  bestseller: { label: "Bestseller", tone: "gold" },
  new: { label: "New in", tone: "brand" },
  trending: { label: "Trending", tone: "neutral" },
  limited: { label: "Few left", tone: "sale" },
  exclusive: { label: "Exclusive", tone: "brand" },
  handpicked: { label: "Handpicked", tone: "outline" },
};

export function ProductBadgePill({ badge }: { badge: ProductBadge }) {
  const meta = BADGE_LABELS[badge];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/* ------------------------------ Rating ---------------------------- */

/**
 * Five stars, part-filled to the average.
 *
 * With nothing to average it renders nothing at all. A row of five empty
 * outlines beside a product no one has reviewed yet reads as five people
 * giving it nought out of five, which is the opposite of the truth and the
 * fastest way to lose a shopper who was otherwise ready to buy.
 */
export function Stars({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  if (!(value > 0)) return null;

  return (
    <span className={cn("inline-flex items-center gap-px", className)} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-ink-300" strokeWidth={1.5} />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                size={size}
                className="text-gold-500"
                fill="currentColor"
                strokeWidth={1.5}
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * The score chip. Absent until somebody has actually scored the product —
 * see `Stars`. A "0.0 ★ · 0 reviews" chip was appearing on every product in
 * the shop, which told every visitor the same untrue thing at once.
 */
export function RatingChip({
  value,
  count,
  className,
}: {
  value: number;
  count?: number;
  className?: string;
}) {
  if (!count || !(value > 0)) return null;

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] sm:text-xs", className)}>
      <span className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-1.5 py-0.5 font-semibold text-white tabular-nums">
        {value.toFixed(1)}
        <Star size={10} fill="currentColor" strokeWidth={0} />
      </span>
      {count != null && (
        <span className="text-ink-500 tabular-nums">
          {formatCompact(count)} {count === 1 ? "review" : "reviews"}
        </span>
      )}
    </span>
  );
}

/* ------------------------------ Price ----------------------------- */

export function Price({
  price,
  mrp,
  size = "md",
  className,
}: {
  price: number;
  mrp?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const off = mrp ? discountPercent(mrp, price) : 0;
  // [price, mrp, percent off]. `xl` is the product page's main price.
  const sizes = {
    sm: ["text-[13.5px] font-semibold sm:text-sm", "text-[11px]", "text-[11px]"],
    md: [
      "text-[16px] font-semibold sm:text-[17px]",
      "text-[11.5px] sm:text-xs",
      "text-[11.5px] sm:text-xs",
    ],
    lg: [
      "text-[20px] font-semibold sm:text-2xl",
      "text-[13.5px] sm:text-sm",
      "text-[13.5px] sm:text-sm",
    ],
    xl: [
      "text-[22px] font-semibold tracking-[-0.02em] sm:text-3xl",
      "text-[14px] sm:text-[15px]",
      "text-[12.5px] sm:text-[13px]",
    ],
  }[size];

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn(sizes[0], "text-ink-900 tabular-nums")}>{formatINR(price)}</span>
      {mrp && mrp > price && (
        <>
          <span className={cn(sizes[1], "text-ink-400 line-through tabular-nums")}>
            {formatINR(mrp)}
          </span>
          <span className={cn(sizes[2], "rounded-full bg-sale-50 px-2 py-0.5 font-semibold text-sale-700 tabular-nums")}>
            {off}% off
          </span>
        </>
      )}
    </span>
  );
}

/* ---------------------------- Section ----------------------------- */

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "View all",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 sm:gap-6", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <span className="eyebrow mb-2 sm:mb-3">{eyebrow}</span>
        )}
        <h2 className="block font-display text-[22px] leading-[1.08] tracking-[-0.03em] text-ink-950 sm:text-[32px]">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-600 sm:mt-2 sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {/* Shown at every width. It used to be hidden below 640px, which is why
          rails grew a second "View all" tile at their far end to give phones a
          way out — two links saying one thing. The link belongs here. */}
      {href && (
        <Link
          href={href}
          className="chip tap group h-9 shrink-0 px-4 text-[12.5px] font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50 sm:h-10 sm:px-5 sm:text-[13px]"
        >
          {linkLabel}
          <ChevronRight
            size={14}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}

/* --------------------------- Breadcrumbs -------------------------- */

export interface Crumb {
  name: string;
  href: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      {/* One swipeable line on phones instead of a trail wrapping over three.
          The py/-my pair keeps focus rings clear of the scroll clip. */}
      <ol className="-my-1 flex items-center gap-x-1.5 gap-y-1 overflow-x-auto whitespace-nowrap py-1 text-[12.5px] text-ink-500 no-scrollbar sm:my-0 sm:flex-wrap sm:overflow-visible sm:whitespace-normal sm:py-0">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="font-medium text-ink-900">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className="underline-offset-2 transition-colors duration-200 hover:text-brand-700 hover:underline"
                  >
                    {item.name}
                  </Link>
                  {/* The chevron is a glyph stroke, not a word: ink-400 is
                      where decorative marks live, and it keeps the trail
                      reading as names with marks between them. */}
                  <ChevronRight size={13} className="text-ink-400" aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------------------------- Skeletons --------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/* --------------------------- Empty state -------------------------- */

/**
 * The apology every empty shelf on the site is written on: cart, wishlist,
 * orders, a search that found nothing.
 *
 * It is headed by the shop's own drawn mark rather than by a bought glyph in a
 * tinted rounded square. A parcel drawn in the same hand as the rest of the
 * site says "a shelf of ours with nothing on it just now" in a way a
 * shopping-bag pictogram never could, and it is the same mark the masthead and
 * the editorial band use, so an empty screen still belongs to the shop. The
 * frame around it is a hairline: a dashed border says the thing inside is a
 * placeholder waiting to be replaced, and none of these screens is one.
 *
 * `icon` is still accepted so that every caller still handing it a lucide glyph
 * keeps working, and is deliberately not drawn: the mark is the same on all of
 * these screens on purpose.
 */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Vertical padding is one fluid class (~32–40px on a phone, 4rem from
        // 640px up) rather than py-10 sm:py-16: callers pass a plain py-*, and
        // a surviving sm:py-16 would override theirs on desktop.
        "flex flex-col items-center justify-center card px-4 py-[min(4rem,10vw)] text-center sm:px-6",
        className,
      )}
    >
      <PaperMark size={120} className="text-ink-700" />
      <h3 className="mt-5 font-display text-[20px] leading-[1.15] tracking-[-0.02em] text-ink-950 sm:mt-6 sm:text-[24px]">
        {title}
      </h3>
      {body && (
        <p className="mt-2.5 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:text-[15px]">
          {body}
        </p>
      )}
      {action && <div className="mt-6 sm:mt-7">{action}</div>}
    </div>
  );
}

/* ----------------------------- Divider ---------------------------- */

export function Hairline({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}
