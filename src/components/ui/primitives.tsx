import * as React from "react";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { cn, discountPercent, formatCompact, formatINR } from "@/lib/utils";
import type { ProductBadge } from "@/lib/types";

/* ------------------------------ Badge ----------------------------- */

type Tone = "brand" | "gold" | "sale" | "neutral" | "outline" | "success";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-900 text-white",
  gold: "bg-gold-400 text-ink-950",
  sale: "bg-sale-500 text-white",
  neutral: "bg-ink-900/85 text-white backdrop-blur",
  outline: "border border-ink-300 bg-surface/90 text-ink-700 backdrop-blur",
  success: "bg-brand-100 text-brand-800",
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
        "text-[10px] font-semibold uppercase tracking-[0.08em] leading-none",
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

export function Stars({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
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

export function RatingChip({
  value,
  count,
  className,
}: {
  value: number;
  count?: number;
  className?: string;
}) {
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
          <span className={cn(sizes[2], "font-semibold text-sale-600 tabular-nums")}>
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
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 sm:mb-2">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-[20px] leading-[1.1] tracking-[-0.02em] text-ink-950 sm:text-[32px]">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-600 sm:mt-2 sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group hidden shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-50 sm:inline-flex"
        >
          {linkLabel}
          <ChevronRight
            size={15}
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
      <ol className="-my-1 flex items-center gap-x-1.5 gap-y-1 overflow-x-auto whitespace-nowrap py-1 text-[12.5px] text-ink-500 no-scrollbar sm:my-0 sm:flex-wrap sm:overflow-visible sm:whitespace-normal sm:py-0 sm:text-[13px]">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="font-medium text-ink-800">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-brand-700 hover:underline underline-offset-2"
                  >
                    {item.name}
                  </Link>
                  <ChevronRight size={13} className="text-ink-300" aria-hidden />
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
  return <div className={cn("skeleton rounded-lg", className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
      <Skeleton className="aspect-[4/5] rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

/* --------------------------- Empty state -------------------------- */

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
        // Vertical padding is one fluid class (~32–40px on a phone, 4rem from
        // 640px up) rather than py-10 sm:py-16: callers pass a plain py-*, and
        // a surviving sm:py-16 would override theirs on desktop.
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-surface px-4 py-[min(4rem,10vw)] text-center sm:px-6",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 sm:mb-5 sm:h-16 sm:w-16">
          {icon}
        </div>
      )}
      <h3 className="font-display text-[17px] tracking-[-0.01em] text-ink-950 sm:text-xl">{title}</h3>
      {body && (
        <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-600 sm:mt-2 sm:text-sm">
          {body}
        </p>
      )}
      {action && <div className="mt-5 sm:mt-6">{action}</div>}
    </div>
  );
}

/* ----------------------------- Divider ---------------------------- */

export function Hairline({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-hairline", className)} />;
}
