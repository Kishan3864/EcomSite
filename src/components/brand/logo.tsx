import Link from "next/link";
import { cn } from "@/lib/utils";
import { BUSINESS, isFilled } from "@/config/business";

/**
 * Brand identity, derived from the one place real business facts live.
 *
 * Nothing here is hardcoded — edit `@/config/business` and the logo, metadata,
 * footer, structured data and every policy page follow. That is what keeps the
 * site's legal name, address and contact details consistent, which is exactly
 * what a payment aggregator checks.
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
 * The WeekendCart mark: a shopping bag whose body is a brass W.
 *
 * Built as geometry rather than lettering so it stays legible at a 16px
 * favicon, survives a single-colour print, and needs no font to render. The
 * square tile matches the storefront's 2px corner policy — a pill-shaped mark
 * would be the one rounded thing left on the page.
 */
export function BagMark({
  className,
  size = 28,
  tile = "var(--color-brand-950)",
  bag = "var(--color-brand-300)",
  letter = "var(--color-gold-400)",
}: {
  className?: string;
  size?: number;
  tile?: string;
  bag?: string;
  letter?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="2" fill={tile} />
      {/* Handle */}
      <path
        d="M12 11.5V9.6a4 4 0 0 1 8 0v1.9"
        stroke={bag}
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      {/* Bag body */}
      <path
        d="M7.6 11.5h16.8l-1.15 13.1a1.6 1.6 0 0 1-1.6 1.4H10.35a1.6 1.6 0 0 1-1.6-1.4L7.6 11.5Z"
        stroke={bag}
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill="none"
      />
      {/* The W */}
      <path
        d="M11 15.6l2.4 5.4 2.6-3.7 2.6 3.7 2.4-5.4"
        stroke={letter}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Kept as an alias so older imports of the previous mark keep resolving. */
export const FeatherMark = BagMark;

export function Logo({
  className,
  size = "md",
  href = "/",
  showTagline = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string | null;
  showTagline?: boolean;
}) {
  const dims = {
    sm: { mark: 22, text: "text-[16px]" },
    md: { mark: 28, text: "text-[20px]" },
    lg: { mark: 38, text: "text-[27px]" },
  }[size];

  const inner = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BagMark size={dims.mark} className="shrink-0" />
      <span className="flex flex-col leading-none">
        {/* "Weekend" light, "Cart" heavy — the join carries the wordmark, so it
            stays recognisable even when the tile is cropped off. */}
        <span className={cn("font-display tracking-[-0.03em] text-ink-950", dims.text)}>
          <span className="font-normal">Weekend</span>
          <span className="font-semibold">Cart</span>
        </span>
        {showTagline && (
          <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-gold-700">
            {BUSINESS.tagline.replace(/\.$/, "")}
          </span>
        )}
      </span>
    </span>
  );

  if (!href) return inner;

  return (
    <Link href={href} aria-label={`${BRAND.name} — home`} className="shrink-0">
      {inner}
    </Link>
  );
}

/** Inverted variant for dark surfaces (footer, hero overlays). */
export function LogoLight({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const mark = { sm: 22, md: 28, lg: 38 }[size];
  const text = { sm: "text-[16px]", md: "text-[20px]", lg: "text-[27px]" }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BagMark
        size={mark}
        className="shrink-0"
        tile="rgba(255,255,255,0.10)"
        bag="rgba(255,255,255,0.72)"
        letter="var(--color-gold-300)"
      />
      <span className={cn("font-display tracking-[-0.03em] text-white", text)}>
        <span className="font-normal">Weekend</span>
        <span className="font-semibold">Cart</span>
      </span>
    </span>
  );
}
