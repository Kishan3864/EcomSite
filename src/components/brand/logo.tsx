import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Brand identity lives here and nowhere else. Replacing the mark, wordmark or
 * tagline is a single-file change.
 */

export const BRAND = {
  name: "Mayura",
  legalName: "Mayura Commerce Private Limited",
  tagline: "Made well. Priced honestly.",
  description:
    "Mayura is an Indian storefront for things made well — handloom, hardware and homeware from 16 studios, priced honestly and delivered fast.",
  url: "https://mayura.example",
  supportEmail: "hello@mayura.in",
  supportPhone: "+91 80 4718 2200",
  social: {
    instagram: "https://instagram.com",
    twitter: "https://x.com",
    youtube: "https://youtube.com",
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
