import Link from "next/link";
import { cn } from "@/lib/utils";
import { BUSINESS, isFilled } from "@/config/business";
import { ACTIVE, type MarkTone } from "./mark-geometry";
import { WORDMARK } from "./wordmark";

/**
 * Brand identity, derived from the one place real business facts live.
 *
 * Edit `@/config/business` and the logo, metadata, footer, structured data and
 * every policy page follow. That is what keeps the site's legal name, address
 * and contact details consistent, which is exactly what a payment aggregator
 * checks.
 */

/** Until a real domain is configured, keep URLs valid so builds do not fail. */
const SITE_URL = isFilled(BUSINESS.url) ? BUSINESS.url : "http://localhost:3000";

export const BRAND = {
  name: BUSINESS.brandName,
  legalName: BUSINESS.legalName,
  tagline: BUSINESS.tagline,
  description: BUSINESS.description,
  url: SITE_URL,
  supportEmail: BUSINESS.supportEmail,
  supportPhone: BUSINESS.supportPhone,
  social: {
    instagram: BUSINESS.social.instagram,
    facebook: BUSINESS.social.facebook,
    youtube: BUSINESS.social.youtube,
  },
} as const;

/**
 * The mark's shared definitions (gradients), once for the whole document and
 * referenced by every mark on the page. Inside each mark they would repeat the
 * same ids several times — header, footer and menu all show the logo — which
 * is invalid HTML.
 *
 * The markup comes from mark-geometry.ts: static strings written in this
 * repository, never user input.
 */
export function BrandDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <defs dangerouslySetInnerHTML={{ __html: ACTIVE.defs("light") + ACTIVE.defs("dark") }} />
    </svg>
  );
}

/** The active concept's artwork, on its 64-unit grid. */
function MarkArt({ tone }: { tone: MarkTone }) {
  return <g dangerouslySetInnerHTML={{ __html: ACTIVE.body(tone) }} />;
}

/** A square viewBox centred on the mark's ink, with a little room. */
const MARK_BOX = (() => {
  const { x0, y0, x1, y1 } = ACTIVE.ink;
  const side = Math.max(x1 - x0, y1 - y0) + 4;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return `${(cx - side / 2).toFixed(2)} ${(cy - side / 2).toFixed(2)} ${side.toFixed(2)} ${side.toFixed(2)}`;
})();

/** The mark on its own. */
export function BagMark({
  className,
  size = 28,
  tone = "light",
}: {
  className?: string;
  size?: number;
  tone?: MarkTone;
}) {
  return (
    <svg width={size} height={size} viewBox={MARK_BOX} aria-hidden="true" focusable="false" className={className}>
      <MarkArt tone={tone} />
    </svg>
  );
}

/** Kept as an alias so older imports of the previous mark keep resolving. */
export const FeatherMark = BagMark;

const HEIGHTS = { sm: 26, md: 34, lg: 46 } as const;

/**
 * The lockup: mark and wordmark in one SVG. The wordmark is outlined Plus
 * Jakarta Sans (see scripts/build-brand.ts), so it renders identically on every
 * device with no font request and no reflow.
 */
function Lockup({
  tone,
  size,
  className,
}: {
  tone: MarkTone;
  size: keyof typeof HEIGHTS;
  className?: string;
}) {
  const height = HEIGHTS[size];
  const width = Math.round((height * WORDMARK.width) / WORDMARK.height);
  const colours = ACTIVE.word.colours[tone];

  return (
    <svg
      width={width}
      height={height}
      viewBox={WORDMARK.viewBox}
      role="img"
      aria-label={BRAND.name}
      className={cn("shrink-0", className)}
    >
      <MarkArt tone={tone} />
      <g transform={`translate(${WORDMARK.x} ${WORDMARK.baseline})`}>
        <path d={WORDMARK.first} fill={colours.first} />
        <path d={WORDMARK.second} fill={colours.second} />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  size = "md",
  href = "/",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string | null;
}) {
  const inner = <Lockup tone="light" size={size} className={className} />;
  if (!href) return inner;

  return (
    <Link href={href} aria-label={`${BRAND.name} — home`} className="inline-flex shrink-0">
      {inner}
    </Link>
  );
}

/** Reversed lockup for dark surfaces (footer, hero overlays). */
export function LogoLight({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return <Lockup tone="dark" size={size} className={className} />;
}
