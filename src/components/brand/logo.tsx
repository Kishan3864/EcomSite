import Link from "next/link";
import { cn } from "@/lib/utils";
import { BUSINESS, isFilled } from "@/config/business";
import { LOGO, LOGO_COLOURS, MARK, type LogoTone } from "./logo-art";

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
function MarkParts({
  tone,
  paths,
}: {
  tone: LogoTone;
  paths: { accent: string; peak: string; tail: string };
}) {
  const c = LOGO_COLOURS[tone];
  return (
    <>
      <path d={paths.accent} fill={c.accent} />
      <path d={paths.peak} fill={c.peak} />
      <path d={paths.tail} fill={c.tail} />
    </>
  );
}

/** The W on its own, as the favicon draws it. */
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
    <svg width={size} height={size} viewBox={MARK.viewBox} aria-hidden="true" focusable="false" className={className}>
      <MarkParts tone={tone} paths={MARK} />
    </svg>
  );
}

const HEIGHTS = { sm: 38, md: 46, lg: 58 } as const;

/**
 * The full logo — W, "eekend" and the ruled "CART" — in one SVG. The letters
 * are outlines (from scripts/brand/weekendcart-logo.svg), so it renders
 * identically on every device with no font request and no reflow.
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
      <MarkParts tone={tone} paths={LOGO.mark} />
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

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /**
   * Where the logo goes. Defaults to home, because a logo that does nothing
   * when clicked is the one convention every shopper has already learned.
   * Pass `null` only where the logo is purely a mark — a printed invoice, an
   * email — and there is no page to go to.
   */
  href?: string | null;
}

/**
 * One wrapper for both tones, so the reversed logo cannot drift from the
 * standard one. It did: `LogoLight` was a bare SVG with no link around it, and
 * the moment the header switched to the reversed logo the site's logo stopped
 * going home. Both tones now go through here.
 */
function LinkedLockup({ tone, className, size = "md", href = "/" }: LogoProps & { tone: LogoTone }) {
  const inner = <Lockup tone={tone} size={size} className={className} />;
  if (!href) return inner;

  return (
    <Link href={href} aria-label={`${BRAND.name} — home`} className="inline-flex shrink-0">
      {inner}
    </Link>
  );
}

export function Logo(props: LogoProps) {
  return <LinkedLockup tone="light" {...props} />;
}

/** Reversed logo for dark surfaces (footer band, auth panel, hero overlays). */
export function LogoLight(props: LogoProps) {
  return <LinkedLockup tone="dark" {...props} />;
}
