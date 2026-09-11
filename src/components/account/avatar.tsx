"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A customer's avatar.
 *
 * Shows their photo when there is one — their own upload, or the one their
 * Google account supplied — and a drawn avatar otherwise. If the photo fails to
 * load (the provider revoked it, the network dropped) it falls back to the
 * drawn one instead of leaving a broken-image icon in the header.
 */

/**
 * Colour sets drawn from the brand palette. Which one a person gets is derived
 * from their email, so it looks random across customers but never changes for
 * any one of them between visits.
 */
const PALETTES: [bg: string, figure: string, accent: string][] = [
  ["#16261f", "#91b0a1", "#dfb96f"],
  ["#2a2724", "#c7c2b9", "#d0a04b"],
  ["#1e332b", "#bccfc5", "#ecd5a4"],
  ["#654322", "#f5ebd3", "#dfb96f"],
  ["#305344", "#dfe8e3", "#b8832f"],
  ["#403c37", "#eeece8", "#9a6926"],
  ["#274337", "#ecd5a4", "#91b0a1"],
  ["#55391f", "#fbf7ee", "#bccfc5"],
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
  const h = hash(seed || "weekendcart");
  const [bg, figure, accent] = PALETTES[h % PALETTES.length];
  const variant = (h >>> 8) % 4;

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" fill={bg} />
      {variant === 0 && <circle cx="54" cy="8" r="18" fill={accent} opacity="0.35" />}
      {variant === 1 && <path d="M0 50 L64 18 L64 64 L0 64 Z" fill={accent} opacity="0.2" />}
      {variant === 2 && <circle cx="8" cy="58" r="20" fill={accent} opacity="0.3" />}
      {variant === 3 && (
        <path d="M-4 30 L68 12 L68 22 L-4 40 Z" fill={accent} opacity="0.28" />
      )}
      <circle cx="32" cy="25" r="11" fill={figure} />
      <path d="M11 64c0-12.2 9.4-21 21-21s21 8.8 21 21z" fill={figure} />
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
  // Remember which URL failed rather than a plain flag, so a new photo gets a
  // fresh chance to load instead of inheriting the old one's failure.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(src) && failedSrc !== src;

  return (
    <span
      className={cn("is-circle relative inline-flex shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        // Plain <img>: provider photos come from hosts the image optimiser is
        // not configured for, and an uploaded photo is already small.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          width={size}
          height={size}
          // Google's photo host can refuse requests that carry a referrer, and
          // there is no reason to tell it which page the customer is on.
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
