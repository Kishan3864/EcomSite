import Link from "next/link";
import { cn } from "@/lib/utils";
import { BUSINESS, isFilled } from "@/config/business";
import { BAG, HANDLE, SMILE, SPEED, WHEELS, markColours, type MarkTone } from "./mark-geometry";
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
 * The bag gradients, defined once for the whole document and referenced by
 * every mark on the page. Defining them inside each mark would put the same id
 * in the DOM several times — the header, the footer and the menu all show the
 * logo — which is invalid HTML.
 */
export function BrandDefs() {
  const light = markColours("light");
  const dark = markColours("dark");
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <defs>
        <linearGradient id="wc-bag-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light.bagTop} />
          <stop offset="1" stopColor={light.bagBottom} />
        </linearGradient>
        <linearGradient id="wc-bag-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark.bagTop} />
          <stop offset="1" stopColor={dark.bagBottom} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** The mark's artwork, on the shared 64-unit grid. */
function MarkArt({ tone, speed = true }: { tone: MarkTone; speed?: boolean }) {
  const c = markColours(tone);
  return (
    <>
      {speed &&
        SPEED.map((d) => (
          <path key={d} d={d} fill="none" stroke={c.speed} strokeWidth="2.6" strokeLinecap="round" />
        ))}
      <path d={HANDLE} fill="none" stroke={c.handle} strokeWidth="4.2" strokeLinecap="round" />
      <path d={BAG} fill={`url(#wc-bag-${tone})`} />
      <path
        d={SMILE}
        fill="none"
        stroke={c.smile}
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {WHEELS.map((w) => (
        <circle key={w.cx} cx={w.cx} cy={w.cy} r={w.r} fill={c.wheels} />
      ))}
    </>
  );
}

/** The mark on its own — a bag on two wheels. */
export function BagMark({
  className,
  size = 28,
  tone = "light",
  speed = true,
}: {
  className?: string;
  size?: number;
  tone?: MarkTone;
  speed?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <MarkArt tone={tone} speed={speed} />
    </svg>
  );
}

/** Kept as an alias so older imports of the previous mark keep resolving. */
export const FeatherMark = BagMark;

const HEIGHTS = { sm: 26, md: 34, lg: 46 } as const;

/**
 * The lockup: mark and wordmark in one SVG. The wordmark is outlined Plus
 * Jakarta Sans ExtraBold (see scripts/build-brand.ts), so it renders
 * identically on every device with no font request and no reflow.
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
  const light = tone === "light";

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
        <path d={WORDMARK.weekend} fill={light ? "#0d0c0a" : "#ffffff"} />
        <path d={WORDMARK.cart} fill={light ? "#9a6926" : "#dfb96f"} />
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
