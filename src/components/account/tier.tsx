import { Award, Crown, Medal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The loyalty tier: a lucide glyph on a small metal tile, the name and the
 * points. It states the tier and nothing else — no perks, no progress bar,
 * because no thresholds or benefits are defined anywhere in the shop.
 */

export type TierName = "Silver" | "Gold" | "WeekendCart Club";

const TIERS: Record<TierName, { icon: LucideIcon; tile: string; line: string }> = {
  Silver: {
    icon: Medal,
    tile: "bg-gradient-to-br from-ink-50 to-ink-200 text-ink-700 ring-ink-300/70",
    line: "Member",
  },
  Gold: {
    icon: Award,
    tile: "bg-gradient-to-br from-gold-100 to-gold-300 text-gold-800 ring-gold-400/60",
    line: "Gold member",
  },
  "WeekendCart Club": {
    icon: Crown,
    tile: "bg-gradient-to-br from-brand-700 to-brand-950 text-gold-300 ring-gold-400/50",
    line: "Club member",
  },
};

export function isTierName(value: string): value is TierName {
  return value in TIERS;
}

/** The tier mark alone. `size` is the tile's edge in px. */
export function TierCrest({ tier, size = 40, className }: { tier: TierName; size?: number; className?: string | undefined }) {
  const t = TIERS[tier];
  const glyph = size >= 56 ? 24 : size >= 36 ? 18 : 14;
  return (
    <span
      role="img"
      aria-label={`${tier} tier`}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[30%] ring-1 ring-inset", t.tile, className)}
      style={{ width: size, height: size }}
    >
      <t.icon size={glyph} aria-hidden />
    </span>
  );
}

/** Mark, tier name and points. `onDark` is for a midnight panel. */
export function TierBlock({
  tier,
  points,
  onDark = false,
  className,
}: {
  tier: TierName;
  points: number;
  onDark?: boolean;
  className?: string | undefined;
}) {
  const t = TIERS[tier];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <TierCrest tier={tier} size={40} />
      <div className="min-w-0 flex-1">
        <p className={cn("t-label", onDark && "text-white/60")}>{t.line}</p>
        <p className={cn("mt-1 truncate text-[14px] font-semibold", onDark ? "text-white" : "text-ink-950")}>{tier}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("t-label", onDark && "text-white/60")}>Points</p>
        <p className={cn("t-price mt-1 text-[18px] leading-none", onDark && "text-white")}>
          {points.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}

/** The tier as one small pill: mark and name. */
export function TierChip({ tier, className }: { tier: TierName; className?: string | undefined }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full bg-surface pl-1 pr-2.5 text-[12px] font-semibold text-ink-800 ring-1 ring-inset ring-line",
        className,
      )}
    >
      <TierCrest tier={tier} size={20} />
      {tier}
    </span>
  );
}
