import Link from "next/link";
import { cn } from "@/lib/utils";
import { BUSINESS, isFilled } from "@/config/business";
import { LOGO, LOGO_COLOURS, type LogoTone } from "./logo-art";

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

/** The W: accent, peak and tail. Paths come from scripts/build-brand.ts. */
function MarkParts({ tone }: { tone: LogoTone }) {
  const c = LOGO_COLOURS[tone];
  return (
    <>
      <path d={LOGO.mark.accent} fill={c.accent} />
      <path d={LOGO.mark.peak} fill={c.peak} />
      <path d={LOGO.mark.tail} fill={c.tail} />
    </>
  );
}

/** The W on its own. */
export function LogoMark({
  className,
  size = 28,
  tone = "light",
}: {
  className?: string;
  size?: number;
  tone?: LogoTone;
}) {
  return (
    <svg width={size} height={size} viewBox={LOGO.markViewBox} aria-hidden="true" focusable="false" className={className}>
      <MarkParts tone={tone} />
    </svg>
  );
}

const HEIGHTS = { sm: 38, md: 46, lg: 58 } as const;

/**
 * The full logo — W, "eekend" and the ruled "CART" — in one SVG. The letters
 * are outlines (see scripts/build-brand.ts), so it renders identically on every
 * device with no font request and no reflow.
 */
function Lockup({
  tone,
  size,
  className,
}: {
  tone: LogoTone;
  size: keyof typeof HEIGHTS;
  className?: string;
}) {
  const height = HEIGHTS[size];
  const width = Math.round((height * LOGO.width) / LOGO.height);
  const c = LOGO_COLOURS[tone];

  return (
    <svg
      width={width}
      height={height}
      viewBox={LOGO.viewBox}
      role="img"
      aria-label={BRAND.name}
      className={cn("shrink-0", className)}
    >
      <MarkParts tone={tone} />
      <g fill={c.word}>
        {LOGO.word.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g fill={c.tagline}>
        {LOGO.tagline.map((d) => (
          <path key={d} d={d} />
        ))}
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

/** Reversed logo for dark surfaces (footer, hero overlays). */
export function LogoLight({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return <Lockup tone="dark" size={size} className={className} />;
}
