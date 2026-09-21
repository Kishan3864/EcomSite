import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, PackageOpen, Star } from "lucide-react";
import { cn, discountPercent, formatCompact, formatINR } from "@/lib/utils";
import type { ProductBadge } from "@/lib/types";

/* ------------------------------ Badge ----------------------------- */

type Tone = "brand" | "gold" | "sale" | "neutral" | "outline" | "success";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-700 text-white",
  gold: "bg-gold-100 text-gold-800 ring-1 ring-inset ring-gold-300/70",
  sale: "bg-sale-600 text-white",
  neutral: "bg-ink-950 text-white",
  outline: "bg-surface text-ink-800 ring-1 ring-inset ring-line-strong",
  success: "bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200",
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
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px]",
        "text-[10.5px] font-semibold leading-[14px] tracking-[0.01em]",
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
 * Five stars, part-filled to the average. Renders nothing with no score: five
 * empty outlines read as five people giving it nought.
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
            {/* Unchanged shape: the admin reviews page draws these too. */}
            <Star size={size} className="absolute inset-0 text-ink-300" strokeWidth={1.5} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-gold-500" fill="currentColor" strokeWidth={1.5} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** The score chip. Absent until somebody has actually scored the product. */
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
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px]", className)}>
      <span className="inline-flex items-center gap-0.5 font-semibold text-ink-900 tabular-nums">
        <Star size={12} className="text-gold-500" fill="currentColor" strokeWidth={0} />
        {value.toFixed(1)}
      </span>
      <span className="text-ink-500 tabular-nums">({formatCompact(count)})</span>
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
  // [price, mrp, percent off]
  const sizes = {
    sm: ["text-[13.5px]", "text-[11px]", "text-[10.5px]"],
    md: ["text-[15px] sm:text-[16px]", "text-[11.5px]", "text-[11px]"],
    lg: ["text-[19px] sm:text-[21px]", "text-[13px]", "text-[12px]"],
    xl: ["text-[24px] sm:text-[28px]", "text-[14px]", "text-[12.5px]"],
  }[size];

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn(sizes[0], "t-price")}>{formatINR(price)}</span>
      {mrp && mrp > price && (
        <>
          <span className={cn(sizes[1], "text-ink-400 line-through tabular-nums")}>{formatINR(mrp)}</span>
          <span className={cn(sizes[2], "font-semibold text-sale-600 tabular-nums")}>{off}% off</span>
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
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  /** Extra controls on the right, e.g. rail arrows. */
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4 sm:mb-6", className)}>
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow mb-2">{eyebrow}</span>}
        <h2 className="t-h2">{title}</h2>
        {description && <p className="t-body mt-1 max-w-2xl">{description}</p>}
      </div>
      {(href || action) && (
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {href && (
            <Link
              href={href}
              className="group inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              <span className="hidden sm:inline">{linkLabel}</span>
              <span className="sm:hidden">View all</span>
              <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
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
      <ol className="-my-1 flex items-center gap-x-1 overflow-x-auto whitespace-nowrap py-1 text-[12px] text-ink-500 no-scrollbar sm:flex-wrap sm:overflow-visible sm:whitespace-normal">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="font-medium text-ink-800">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.href} className="rounded transition-colors duration-200 hover:text-brand-700">
                    {item.name}
                  </Link>
                  <ChevronRight size={14} className="text-ink-300" aria-hidden />
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
  return <div className={cn("skeleton rounded-md", className)} />;
}

/* --------------------------- Empty state -------------------------- */

/**
 * The empty shelf every screen shares: bag, wishlist, orders, a search with
 * no results. `icon` is any 24px lucide glyph; a parcel when none is given.
 */
export function EmptyState({
  icon,
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
        "card relative flex flex-col items-center justify-center overflow-hidden px-5 py-12 text-center sm:py-16",
        className,
      )}
    >
      <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-70" />
      <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
        {icon ?? <PackageOpen size={24} />}
      </span>
      <h3 className="t-h2 relative mt-5">{title}</h3>
      {body && <p className="t-body relative mt-2 max-w-[44ch]">{body}</p>}
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}

/* ----------------------------- Divider ---------------------------- */

export function Hairline({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

/* --------------------------- Page header -------------------------- */

/**
 * The top of every inner page: breadcrumbs, a title, an optional line and an
 * optional control on the right. One shape across listings, account, help.
 */
export function PageHeader({
  crumbs,
  title,
  description,
  meta,
  action,
  className,
}: {
  crumbs?: Crumb[];
  title: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("pb-5 pt-5 sm:pb-7 sm:pt-7", className)}>
      {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} className="mb-3" />}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="t-h1">{title}</h1>
          {description && <p className="t-body mt-1.5 max-w-2xl">{description}</p>}
          {meta && <div className="t-small mt-2">{meta}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
