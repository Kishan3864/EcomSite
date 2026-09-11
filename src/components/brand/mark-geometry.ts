/**
 * The WeekendCart mark, as geometry.
 *
 * A shopping bag on two wheels — bag and cart in one shape — with a double-arc
 * smile across its front that also reads as a "w", and three speed lines for
 * delivery. Drawn on a 64-unit grid.
 *
 * This file is the only definition of the mark. The header logo renders it,
 * and scripts/build-brand.ts turns it into the favicon, the Apple touch icon
 * and every file under public/brand, so none of them can drift from the others.
 * Plain data and string builders only — no React — so the build script can
 * import it too.
 */

export const PALETTE = {
  evergreen700: "#274337",
  evergreen900: "#16261f",
  evergreen950: "#0b1611",
  brass300: "#dfb96f",
  brass400: "#d0a04b",
  brass600: "#9a6926",
  cream: "#fbf7ee",
  ink: "#0d0c0a",
} as const;

/** Handle: an arc whose feet tuck under the top edge of the bag. */
export const HANDLE = "M23 22V17.5a9 9 0 0 1 18 0V22";

/** Bag body: slightly flared toward the base, with softened corners. */
export const BAG =
  "M16.2 21H47.8a3 3 0 0 1 2.98 2.66L54.2 46.6a4 4 0 0 1-3.98 4.4H13.78a4 4 0 0 1-3.98-4.4L13.22 23.66A3 3 0 0 1 16.2 21Z";

/** Two joined arcs: a smile, and a "w" for Weekend. */
export const SMILE = "M20.5 33q5.75 9 11.5 0q5.75 9 11.5 0";

export const WHEELS: { cx: number; cy: number; r: number }[] = [
  { cx: 21, cy: 57, r: 3.6 },
  { cx: 43, cy: 57, r: 3.6 },
];

/** Speed lines to the left of the bag, staggered like motion trails. */
export const SPEED = ["M3 30.5H9", "M1.6 37H8.6", "M4 43.5H8.4"];

export type MarkTone = "light" | "dark";

/** Colours for the mark on a light ground, and on a dark one. */
export function markColours(tone: MarkTone) {
  return tone === "light"
    ? {
        bagTop: PALETTE.evergreen700,
        bagBottom: PALETTE.evergreen950,
        handle: PALETTE.brass400,
        smile: PALETTE.cream,
        wheels: PALETTE.evergreen900,
        speed: PALETTE.brass400,
      }
    : {
        bagTop: PALETTE.cream,
        bagBottom: "#efe6d2",
        handle: PALETTE.brass300,
        smile: PALETTE.evergreen900,
        wheels: PALETTE.cream,
        speed: PALETTE.brass300,
      };
}

/**
 * The mark's inner SVG markup (no <svg> wrapper), for the build script.
 * `gradientId` must be unique within the document it lands in.
 */
export function markMarkup({
  tone,
  speed = true,
  gradientId,
}: {
  tone: MarkTone;
  speed?: boolean;
  gradientId: string;
}): string {
  const c = markColours(tone);
  const lines = speed
    ? SPEED.map(
        (d) =>
          `<path d="${d}" fill="none" stroke="${c.speed}" stroke-width="2.6" stroke-linecap="round"/>`,
      ).join("")
    : "";
  const wheels = WHEELS.map(
    (w) => `<circle cx="${w.cx}" cy="${w.cy}" r="${w.r}" fill="${c.wheels}"/>`,
  ).join("");

  return [
    `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0" stop-color="${c.bagTop}"/><stop offset="1" stop-color="${c.bagBottom}"/>`,
    `</linearGradient></defs>`,
    lines,
    `<path d="${HANDLE}" fill="none" stroke="${c.handle}" stroke-width="4.2" stroke-linecap="round"/>`,
    `<path d="${BAG}" fill="url(#${gradientId})"/>`,
    `<path d="${SMILE}" fill="none" stroke="${c.smile}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    wheels,
  ].join("");
}

/**
 * The app icon: the mark, without speed lines, reversed out of an evergreen
 * tile. A tile rather than a bare mark so it holds up on both light and dark
 * browser tabs and home screens.
 */
export function iconMarkup(gradientId: string): string {
  return [
    `<rect width="64" height="64" rx="12" fill="${PALETTE.evergreen900}"/>`,
    // The mark's ink spans y 8.5–60.6; centre it on the tile and give it room.
    `<g transform="translate(32 32) scale(0.88) translate(-32 -34.6)">`,
    markMarkup({ tone: "dark", speed: false, gradientId }),
    `</g>`,
  ].join("");
}
