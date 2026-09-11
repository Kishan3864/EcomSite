/**
 * The WeekendCart mark, as geometry.
 *
 * Each logo direction is a Concept: its artwork on a 64-unit grid, its app
 * icon, and how its wordmark is set. `ACTIVE` picks the one the site uses.
 * Switching direction is a one-word change here followed by
 * `npm run brand:build`, which regenerates the favicon, the Apple icon, the
 * outlined wordmark the header draws, and every file under public/brand.
 *
 * Plain data and string builders only — no React — so the build script can
 * import it as well as the components.
 */

export const PALETTE = {
  evergreen700: "#274337",
  evergreen900: "#16261f",
  evergreen950: "#0b1611",
  brass300: "#dfb96f",
  brass400: "#d0a04b",
  brass600: "#9a6926",
  amber: "#c4782a",
  emerald: "#2f7a5f",
  cream: "#fbf7ee",
  ink: "#0d0c0a",
} as const;

export type MarkTone = "light" | "dark";

export interface Concept {
  name: string;
  /**
   * Gradients and other shared definitions, with fixed ids. The site defines
   * these once per document (BrandDefs) because the logo appears several times
   * on a page and repeated ids are invalid HTML.
   */
  defs(tone: MarkTone): string;
  /** The mark's artwork, referencing the ids from defs(). */
  body(tone: MarkTone): string;
  /** Bounding box of the mark's ink, strokes included, on the 64-unit grid. */
  ink: { x0: number; y0: number; x1: number; y1: number };
  /**
   * The favicon / app icon, self-contained, on a 64-unit square. `opaque`
   * asks for a solid background — iOS paints a transparent icon black.
   */
  icon(opts?: { opaque?: boolean }): string;
  word: {
    text: string;
    /** Glyphs before this index take the first colour, the rest the second. */
    splitAt: number;
    weight: 500 | 700 | 800;
    /** Weight for the second half, when it differs. */
    secondWeight?: 500 | 700 | 800;
    size: number;
    /** Letter-spacing in em. */
    tracking: number;
    /** Baseline on the mark's grid. */
    baseline: number;
    /** Gap between the mark's ink and the first glyph, in grid units. */
    gap: number;
    colours: Record<MarkTone, { first: string; second: string }>;
  };
}

const gid = (name: string, tone: MarkTone) => `wc-${name}-${tone}`;

/* ------------------------------------------------ classic: bag on wheels */

const CLASSIC_BAG =
  "M16.2 21H47.8a3 3 0 0 1 2.98 2.66L54.2 46.6a4 4 0 0 1-3.98 4.4H13.78a4 4 0 0 1-3.98-4.4L13.22 23.66A3 3 0 0 1 16.2 21Z";

function classicColours(tone: MarkTone) {
  return tone === "light"
    ? { top: PALETTE.evergreen700, bottom: PALETTE.evergreen950, handle: PALETTE.brass400, smile: PALETTE.cream, wheels: PALETTE.evergreen900, speed: PALETTE.brass400 }
    : { top: PALETTE.cream, bottom: "#efe6d2", handle: PALETTE.brass300, smile: PALETTE.evergreen900, wheels: PALETTE.cream, speed: PALETTE.brass300 };
}

function classicBody(tone: MarkTone, speed = true) {
  const c = classicColours(tone);
  return [
    speed
      ? ["M3 30.5H9", "M1.6 37H8.6", "M4 43.5H8.4"]
          .map((d) => `<path d="${d}" fill="none" stroke="${c.speed}" stroke-width="2.6" stroke-linecap="round"/>`)
          .join("")
      : "",
    `<path d="M23 22V17.5a9 9 0 0 1 18 0V22" fill="none" stroke="${c.handle}" stroke-width="4.2" stroke-linecap="round"/>`,
    `<path d="${CLASSIC_BAG}" fill="url(#${gid("classic", tone)})"/>`,
    `<path d="M20.5 33q5.75 9 11.5 0q5.75 9 11.5 0" fill="none" stroke="${c.smile}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<circle cx="21" cy="57" r="3.6" fill="${c.wheels}"/><circle cx="43" cy="57" r="3.6" fill="${c.wheels}"/>`,
  ].join("");
}

const classic: Concept = {
  name: "Classic — bag on wheels",
  defs: (tone) => {
    const c = classicColours(tone);
    return `<linearGradient id="${gid("classic", tone)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.top}"/><stop offset="1" stop-color="${c.bottom}"/></linearGradient>`;
  },
  body: (tone) => classicBody(tone),
  ink: { x0: 0.3, y0: 6.4, x1: 54.2, y1: 60.6 },
  icon: () =>
    [
      `<defs>${classic.defs("dark")}</defs>`,
      `<rect width="64" height="64" rx="12" fill="${PALETTE.evergreen900}"/>`,
      `<g transform="translate(32 32) scale(0.88) translate(-32 -34.6)">${classicBody("dark", false)}</g>`,
    ].join(""),
  word: {
    text: "WeekendCart",
    splitAt: 7,
    weight: 800,
    size: 40,
    tracking: -0.02,
    baseline: 51,
    gap: 11.8,
    colours: {
      light: { first: PALETTE.ink, second: PALETTE.brass600 },
      dark: { first: "#ffffff", second: PALETTE.brass300 },
    },
  },
};

/* ------------------------------------------------ A: W-Cart */

/**
 * The letter W is the cart's basket: one stroke runs from the handle grip down
 * through the W, and two wheels sit beneath it.
 */
const WCART_STROKE = "M3 10H10L21 43L30.5 27L40 43L51 13";

function wcartBody(tone: MarkTone) {
  const stroke = tone === "light" ? PALETTE.evergreen900 : PALETTE.cream;
  const wheels = tone === "light" ? PALETTE.brass400 : PALETTE.brass300;
  return [
    `<path d="${WCART_STROKE}" fill="none" stroke="${stroke}" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<circle cx="22" cy="54" r="4.6" fill="${wheels}"/><circle cx="39" cy="54" r="4.6" fill="${wheels}"/>`,
  ].join("");
}

const wcart: Concept = {
  name: "A — W-Cart",
  defs: () => "",
  body: wcartBody,
  ink: { x0: -0.1, y0: 6.9, x1: 54.1, y1: 58.6 },
  icon: () =>
    [
      `<rect width="64" height="64" rx="15" fill="${PALETTE.evergreen900}"/>`,
      // Ink centre is (27, 32.75); centre it on the tile with room around it.
      `<g transform="translate(32 32) scale(0.74) translate(-27 -32.75)">${wcartBody("dark")}</g>`,
    ].join(""),
  word: {
    text: "weekendcart",
    splitAt: 7,
    weight: 800,
    size: 40,
    tracking: -0.035,
    // On the W's base, so the wheels hang below the line like descenders.
    baseline: 46,
    gap: 13.9,
    colours: {
      light: { first: PALETTE.ink, second: PALETTE.brass600 },
      dark: { first: "#ffffff", second: PALETTE.brass300 },
    },
  },
};

/* ------------------------------------------------ B: Folded bag */

/**
 * A bag folded from two panels — the right one in shadow — with a W cut clean
 * through its front. Brass-to-amber, the warmest of the directions.
 */
function foldedBody(tone: MarkTone, handle?: string) {
  const handleColour = handle ?? (tone === "light" ? PALETTE.evergreen900 : PALETTE.brass300);
  const cut = tone === "light" ? PALETTE.cream : PALETTE.evergreen950;
  return [
    `<path d="M24 20V16a8 8 0 0 1 16 0V20" fill="none" stroke="${handleColour}" stroke-width="4.4" stroke-linecap="round"/>`,
    `<path d="M13 20H51L55 55a3.5 3.5 0 0 1-3.5 3.8H12.5A3.5 3.5 0 0 1 9 55Z" fill="url(#${gid("folded", tone)})"/>`,
    `<path d="M40 20H51L55 55a3.5 3.5 0 0 1-3.5 3.8H48Z" fill="#000" opacity=".12"/>`,
    `<path d="M17 31L24.5 47L32 35L39.5 47L47 31" fill="none" stroke="${cut}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join("");
}

const folded: Concept = {
  name: "B — Folded bag",
  defs: (tone) =>
    `<linearGradient id="${gid("folded", tone)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PALETTE.brass300}"/><stop offset="1" stop-color="${PALETTE.amber}"/></linearGradient>`,
  body: (tone) => foldedBody(tone),
  ink: { x0: 9, y0: 5.8, x1: 55, y1: 58.8 },
  icon: (opts) =>
    [
      `<defs>${folded.defs("light")}</defs>`,
      opts?.opaque ? `<rect width="64" height="64" fill="${PALETTE.cream}"/>` : "",
      // No tile: the brass bag holds its own on light and dark tabs alike. The
      // handle goes brass rather than evergreen, which would vanish on a dark tab.
      `<g transform="translate(32 32) scale(${opts?.opaque ? 0.84 : 0.98}) translate(-32 -32.3)">${foldedBody("light", PALETTE.brass600)}</g>`,
    ].join(""),
  word: {
    text: "WeekendCart",
    splitAt: 7,
    weight: 800,
    secondWeight: 500,
    size: 40,
    tracking: -0.03,
    baseline: 48,
    gap: 12.6,
    colours: {
      light: { first: PALETTE.ink, second: PALETTE.amber },
      dark: { first: "#ffffff", second: PALETTE.brass300 },
    },
  },
};

/* ------------------------------------------------ C: Monogram */

/**
 * A handle over a W makes the bag. The mark is the tile itself — an app icon
 * from the start — beside a wide-tracked, fashion-house wordmark.
 */
function monogramBody(tone: MarkTone) {
  return [
    `<rect width="64" height="64" rx="18" fill="url(#${gid("monogram", tone)})"/>`,
    `<path d="M25.5 23a6.5 6.5 0 0 1 13 0" fill="none" stroke="${PALETTE.brass300}" stroke-width="3.8" stroke-linecap="round"/>`,
    `<path d="M15 26L23 45L32 31L41 45L49 26" fill="none" stroke="${PALETTE.cream}" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join("");
}

const monogram: Concept = {
  name: "C — Monogram",
  defs: (tone) =>
    `<linearGradient id="${gid("monogram", tone)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PALETTE.emerald}"/><stop offset="1" stop-color="${PALETTE.evergreen950}"/></linearGradient>`,
  body: monogramBody,
  ink: { x0: 0, y0: 0, x1: 64, y1: 64 },
  icon: () => `<defs>${monogram.defs("light")}</defs>${monogramBody("light")}`,
  word: {
    text: "WEEKENDCART",
    splitAt: 7,
    weight: 700,
    size: 26,
    tracking: 0.16,
    // Cap height centred on the tile.
    baseline: 41.4,
    gap: 14,
    colours: {
      light: { first: PALETTE.evergreen900, second: PALETTE.evergreen900 },
      dark: { first: "#ffffff", second: "#ffffff" },
    },
  },
};

export const CONCEPTS = { classic, wcart, folded, monogram } as const;

/** The direction the site uses. Change it, then run `npm run brand:build`. */
export const ACTIVE: Concept = CONCEPTS.monogram;
