import { cn } from "@/lib/utils";

/**
 * The loyalty tier, drawn.
 *
 * Three tiers — Silver, Gold and WeekendCart Club — each a small crest: the
 * same shield for all three so they read as one ladder, with the metal and the
 * device inside changing as it climbs. Silver carries one chevron, Gold two,
 * the Club a star over a laurel. All of it is inline SVG with gradients built
 * here; there is no image, and the ids are per-tier so two crests on one page
 * cannot borrow each other's paint.
 *
 * It states the tier and the points and nothing else. What a tier is WORTH is
 * shop policy, and none is written down anywhere, so no perk is claimed here.
 *
 * There are no points thresholds anywhere in the shop — a tier is given, not
 * reached — so nothing here draws a progress bar toward the next one. If
 * thresholds are ever defined, that is where it would go.
 */

export type TierName = "Silver" | "Gold" | "WeekendCart Club";

const TIERS: Record<TierName, { key: string; from: string; to: string; edge: string; ink: string; line: string }> = {
  Silver: { key: "silver", from: "#f4f6f8", to: "#aeb8c2", edge: "#8d99a5", ink: "#3a4652", line: "Member" },
  Gold: { key: "gold", from: "#fbeab0", to: "#c9992a", edge: "#a87d17", ink: "#5a4108", line: "Gold member" },
  "WeekendCart Club": { key: "club", from: "#3b6579", to: "#15232b", edge: "#c9992a", ink: "#fbeab0", line: "Club member" },
};

export function isTierName(value: string): value is TierName {
  return value in TIERS;
}

/** The crest alone. `size` is its height in px. */
export function TierCrest({ tier, size = 40, className }: { tier: TierName; size?: number; className?: string | undefined }) {
  const t = TIERS[tier];
  const id = `tier-${t.key}`;
  return (
    <svg
      width={(size * 40) / 46}
      height={size}
      viewBox="0 0 40 46"
      role="img"
      aria-label={`${tier} tier`}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.from} />
          <stop offset="1" stopColor={t.to} />
        </linearGradient>
      </defs>
      {/* The shield. */}
      <path d="M20 1.500 37.500 7v15.500c0 10.500-7 18-17.500 22C9.500 40.500 2.500 33 2.500 22.500V7Z" fill={`url(#${id})`} stroke={t.edge} strokeWidth="1.500" strokeLinejoin="round" />
      <path d="M20 5 34 9.400v13.100c0 8.600-5.600 14.800-14 18.200-8.400-3.400-14-9.600-14-18.200V9.400Z" fill="none" stroke={t.ink} strokeOpacity="0.28" strokeWidth="1" />
      {tier === "Silver" && <path d="m12 25 8-7 8 7" fill="none" stroke={t.ink} strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />}
      {tier === "Gold" && (
        <>
          <path d="m12 22 8-7 8 7" fill="none" stroke={t.ink} strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m12 30 8-7 8 7" fill="none" stroke={t.ink} strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {tier === "WeekendCart Club" && (
        <>
          <path d="m20 10.500 2.500 5.200 5.700.700-4.200 3.900 1.100 5.600L20 23.100l-5.100 2.800 1.100-5.600-4.200-3.900 5.700-.700Z" fill={t.ink} />
          <path d="M10.500 27c1.500 4.500 5 7.500 9.500 8.500 4.500-1 8-4 9.500-8.500" fill="none" stroke={t.ink} strokeWidth="1.600" strokeLinecap="round" />
          <path d="M12.500 31.200l-2.200.300M15.800 34l-1.600 1.500M24.200 34l1.600 1.500M27.500 31.200l2.200.300" stroke={t.ink} strokeWidth="1.400" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/**
 * Crest, tier name and points, for the account panel.
 *
 * `onDark` is the account sidebar's deep panel; without it the block is set for
 * a light page — an order confirmation, say.
 */
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
    <div className={cn("flex items-center gap-3.5", className)}>
      <TierCrest tier={tier} size={46} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[10.5px] font-semibold uppercase tracking-[0.14em]", onDark ? "text-white/50" : "text-ink-500")}>{t.line}</p>
        <p className={cn("truncate font-display text-[18px] leading-tight tracking-[-0.01em]", onDark ? "text-white" : "text-ink-950")}>{tier}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("text-[10.5px] font-semibold uppercase tracking-[0.14em]", onDark ? "text-white/50" : "text-ink-500")}>Points</p>
        <p className={cn("font-display text-[22px] leading-none tabular-nums", onDark ? "text-white" : "text-ink-950")}>
          {points.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}

/** The tier as one small line, for an order page or a header: crest and name. */
export function TierChip({ tier, className }: { tier: TierName; className?: string | undefined }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-800", className)}>
      <TierCrest tier={tier} size={18} />
      {tier}
    </span>
  );
}
