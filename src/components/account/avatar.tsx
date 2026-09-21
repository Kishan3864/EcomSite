"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A customer's avatar: their photo when there is one (their upload or their
 * Google photo), otherwise a monogram on a soft gradient. A photo that fails
 * to load falls back to the monogram rather than a broken image.
 */

/** Gradient pairs from the storefront palette, picked by a hash of the email. */
const PALETTES: [from: string, to: string, ink: string][] = [
  ["#1b4f74", "#5d4bcb", "#ffffff"],
  ["#22618d", "#12324a", "#f8efd6"],
  ["#dbeaf5", "#d4d0fe", "#1b4f74"],
  ["#f8efd6", "#e6cc80", "#5f4a0f"],
  ["#2f76a6", "#7262e6", "#ffffff"],
  ["#12324a", "#1b4f74", "#e6cc80"],
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function DefaultAvatar({ seed, className }: { seed: string; className?: string }) {
  const id = useId();
  const [from, to, ink] = PALETTES[hash(seed || "weekendcart") % PALETTES.length];
  const letter = (seed.trim()[0] ?? "").toUpperCase();

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${id})`} />
      {/[A-Z0-9]/.test(letter) ? (
        <text
          x="32"
          y="33"
          textAnchor="middle"
          dominantBaseline="central"
          fill={ink}
          fontSize="27"
          fontWeight="600"
          fontFamily="inherit"
        >
          {letter}
        </text>
      ) : (
        <g fill={ink} opacity="0.9">
          <circle cx="32" cy="25" r="10" />
          <path d="M14 56c0-10 8-17 18-17s18 7 18 17z" />
        </g>
      )}
    </svg>
  );
}

export function Avatar({
  src,
  seed,
  size = 36,
  className,
}: {
  /** Photo URL, or null to draw the default avatar. */
  src: string | null | undefined;
  /** Stable per person — their email — so the drawn avatar never changes. */
  seed: string;
  size?: number;
  className?: string;
}) {
  // Remember which URL failed, so a new photo gets a fresh chance to load.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(src) && failedSrc !== src;

  return (
    <span
      className={cn("is-circle relative inline-flex shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        // Plain <img>: provider photos come from hosts the optimiser is not
        // configured for, and an uploaded photo is already small.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          width={size}
          height={size}
          // Google's photo host can refuse requests that carry a referrer.
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src ?? null)}
          className="h-full w-full object-cover"
        />
      ) : (
        <DefaultAvatar seed={seed} className="h-full w-full" />
      )}
    </span>
  );
}
