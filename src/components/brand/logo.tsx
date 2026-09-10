import Link from "next/link";
import { cn } from "@/lib/utils";
import { BUSINESS, isFilled } from "@/config/business";

/**
 * Brand identity, derived from the one place real business facts live.
 *
 * Nothing here is hardcoded any more — edit `@/config/business` and the logo,
 * metadata, footer, structured data and every policy page follow. That is what
 * keeps the site's legal name, address and contact details consistent, which is
 * exactly what a payment aggregator checks.
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

export function FeatherMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
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
      {/* A peacock plume, reduced to its eye — the mark Mayura is named for. */}
      <rect width="32" height="32" rx="9" className="fill-brand-900" />
      <ellipse cx="16" cy="16" rx="7.2" ry="9.2" className="fill-brand-500" />
      <ellipse cx="16" cy="15.4" rx="4" ry="5.4" className="fill-gold-400" />
      <ellipse cx="16" cy="15" rx="1.7" ry="2.4" className="fill-brand-950" />
      <path
        d="M7.4 9.2C10 12 10.4 15.6 9.2 19.6M24.6 9.2C22 12 21.6 15.6 22.8 19.6"
        className="stroke-brand-400"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}

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
    sm: { mark: 22, text: "text-[17px]" },
    md: { mark: 28, text: "text-[21px]" },
    lg: { mark: 38, text: "text-[28px]" },
  }[size];

  const inner = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <FeatherMark size={dims.mark} className="shrink-0" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-semibold tracking-[-0.025em] text-ink-950",
            dims.text,
          )}
        >
          Mayura
        </span>
        {showTagline && (
          <span className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.2em] text-ink-500">
            Made well
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
export function LogoLight({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: 22, md: 28, lg: 38 }[size];
  const text = { sm: "text-[17px]", md: "text-[21px]", lg: "text-[28px]" }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width={dims} height={dims} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#ffffff" fillOpacity="0.14" />
        <ellipse cx="16" cy="16" rx="7.2" ry="9.2" className="fill-brand-400" />
        <ellipse cx="16" cy="15.4" rx="4" ry="5.4" className="fill-gold-400" />
        <ellipse cx="16" cy="15" rx="1.7" ry="2.4" className="fill-brand-950" />
        <path
          d="M7.4 9.2C10 12 10.4 15.6 9.2 19.6M24.6 9.2C22 12 21.6 15.6 22.8 19.6"
          stroke="#ffffff"
          strokeOpacity="0.45"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className={cn("font-display font-semibold tracking-[-0.025em] text-white", text)}>
        Mayura
      </span>
    </span>
  );
}
