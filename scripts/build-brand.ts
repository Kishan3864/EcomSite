/**
 * Builds every brand asset.
 *
 *   npm run brand:build
 *
 * The full logo — W, "eekend" and the ruled "CART" — comes from the finished
 * artwork in scripts/brand/weekendcart-logo.svg, recoloured for light and dark
 * backgrounds. Its letters are already outlines, so it needs no font on any
 * device; every stroke and letter is written as its own path in its own group.
 *
 * The favicon's W is drawn below on the 751 × 251 grid of the original artwork:
 * three rounded strokes — a short accent, a tall peak and a short tail — as
 * filled outlines, so every tool renders them the same.
 *
 * Writes:
 *   src/components/brand/logo-art.ts   paths and colours, used by the header
 *   src/app/icon.svg, icon1.png        favicon: the W alone (SVG, PNG fallback)
 *   src/app/apple-icon.png             iOS home-screen icon
 *   public/brand/*.svg                 logo, mark and icon, light and dark
 *   public/brand/png/*.png             4K raster exports
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const out = (...parts: string[]) => join(root, ...parts);

/* ------------------------------------------------------------- colours */

/** The site's evergreen and brass, in place of the original blue and green. */
const COLOURS = {
  /** For light backgrounds. */
  light: { accent: "#d0a04b", peak: "#2f7a5f", tail: "#2f7a5f", word: "#16261f", tagline: "#16261f" },
  /** For dark backgrounds. */
  dark: { accent: "#dfb96f", peak: "#5aa886", tail: "#5aa886", word: "#fbf7ee", tagline: "#fbf7ee" },
} as const;
type Palette = Record<"accent" | "peak" | "tail" | "word" | "tagline", string>;

/** Favicon tile. */
const TILE = "#fbf7ee";

/* ---------------------------------------------------------------- the W */

type Pt = readonly [number, number];
const R = 12; // stroke radius: the strokes are 24 units wide

const ACCENT: [Pt, Pt] = [[56.8, 57], [76, 105]];
const PEAK: [Pt, Pt, Pt] = [[93.4, 154], [133, 57], [172.6, 154]];
const TAIL: [Pt, Pt] = [[215.3, 57], [196.1, 105]];

const f2 = (n: number) => +n.toFixed(2);
const at = (p: Pt, v: Pt, k: number): Pt => [p[0] + v[0] * k, p[1] + v[1] * k];
const pt = (p: Pt) => `${f2(p[0])} ${f2(p[1])}`;
function unit(a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
  return [dx / l, dy / l];
}
const normal = (u: Pt): Pt => [-u[1], u[0]];
const arc = (to: Pt, sweep: 0 | 1) => `A${R} ${R} 0 0 ${sweep} ${pt(to)}`;

/** A straight stroke with round ends, as a filled outline. */
function capsule([p, q]: [Pt, Pt]) {
  const n = normal(unit(p, q));
  return `M${pt(at(p, n, R))}L${pt(at(q, n, R))}${arc(at(q, n, -R), 0)}L${pt(at(p, n, -R))}${arc(at(p, n, R), 0)}Z`;
}

/** Two strokes meeting in a round-topped peak, as one filled outline. */
function peak([p1, c, p2]: [Pt, Pt, Pt]) {
  const u1 = unit(p1, c), n1 = normal(u1);
  const u2 = unit(c, p2), n2 = normal(u2);
  // Where the two inner edges cross, under the peak.
  const a = at(p1, n1, R), b = at(p2, n2, R);
  const t = ((b[0] - a[0]) * u2[1] - (b[1] - a[1]) * u2[0]) / (u1[0] * u2[1] - u1[1] * u2[0]);
  const inner = at(a, u1, t);
  return [
    `M${pt(at(p1, n1, -R))}`,
    `L${pt(at(c, n1, -R))}`,
    arc(at(c, n2, -R), 1),
    `L${pt(at(p2, n2, -R))}`,
    arc(at(p2, n2, R), 1),
    `L${pt(inner)}`,
    `L${pt(at(p1, n1, R))}`,
    arc(at(p1, n1, -R), 1),
    "Z",
  ].join("");
}

const MARK = { accent: capsule(ACCENT), peak: peak(PEAK), tail: capsule(TAIL) };
const MARK_INK = {
  x0: ACCENT[0][0] - R,
  y0: ACCENT[0][1] - R,
  x1: TAIL[0][0] + R,
  y1: PEAK[0][1] + R,
};

/* ----------------------------------------------------------- the lockup */

/**
 * The full logo is finished by hand in a design tool and kept as
 * scripts/brand/weekendcart-logo.svg: the six letters of "eekend", the ruled
 * "CART" (rule, C, A, R, T, rule), then the W's accent, peak and tail, in that
 * order. Its own colours are ignored; the palettes above are applied here.
 */
const SOURCE = readFileSync(out("scripts/brand/weekendcart-logo.svg"), "utf8");
const SOURCE_PATHS = [...SOURCE.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
if (SOURCE_PATHS.length !== 15) {
  throw new Error(`weekendcart-logo.svg: expected 15 paths, found ${SOURCE_PATHS.length}`);
}
const LOCKUP = {
  viewBox: /viewBox="([^"]+)"/.exec(SOURCE)![1],
  word: SOURCE_PATHS.slice(0, 6),
  tagline: SOURCE_PATHS.slice(6, 12),
  mark: { accent: SOURCE_PATHS[12], peak: SOURCE_PATHS[13], tail: SOURCE_PATHS[14] },
};
const [, , LOCKUP_WIDTH, LOCKUP_HEIGHT] = LOCKUP.viewBox.split(/\s+/).map(Number);
const WORD_IDS = ["letter-e-1", "letter-e-2", "letter-k", "letter-e-3", "letter-n", "letter-d"];
const TAGLINE_IDS = ["rule-left", "tagline-C", "tagline-A", "tagline-R", "tagline-T", "rule-right"];

/* ------------------------------------------------------------- layout */

const PAD = 2;
const markSide = Math.max(MARK_INK.x1 - MARK_INK.x0, MARK_INK.y1 - MARK_INK.y0) + PAD * 2;
const markBox = {
  x: f2((MARK_INK.x0 + MARK_INK.x1) / 2 - markSide / 2),
  y: f2((MARK_INK.y0 + MARK_INK.y1) / 2 - markSide / 2),
  side: f2(markSide),
};

/* --------------------------------------------------------------- files */

const group = (id: string, fill: string, d: string) => `<g id="${id}" fill="${fill}"><path d="${d}"/></g>`;

function markGroups(c: Palette, paths: { accent: string; peak: string; tail: string } = MARK) {
  return [
    `<g id="mark">`,
    group("mark-accent", c.accent, paths.accent),
    group("mark-peak", c.peak, paths.peak),
    group("mark-tail", c.tail, paths.tail),
    `</g>`,
  ].join("");
}

function logoFile(c: Palette) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOCKUP.viewBox}" width="${LOCKUP_WIDTH}" height="${LOCKUP_HEIGHT}" role="img" aria-label="WeekendCart">`,
    `<title>WeekendCart</title>`,
    `<g id="weekendcart-logo">`,
    markGroups(c, LOCKUP.mark),
    `<g id="wordmark">${LOCKUP.word.map((d, i) => group(WORD_IDS[i], c.word, d)).join("")}</g>`,
    `<g id="tagline">${LOCKUP.tagline.map((d, i) => group(TAGLINE_IDS[i], c.tagline, d)).join("")}</g>`,
    `</g>`,
    `</svg>`,
  ].join("");
}

function markFile(c: Palette) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${markBox.x} ${markBox.y} ${markBox.side} ${markBox.side}" width="512" height="512" role="img" aria-label="WeekendCart"><title>WeekendCart</title>${markGroups(c)}</svg>`;
}

/** The W alone on a 64-unit tile: the favicon. */
function iconFile(rounded: boolean) {
  const width = MARK_INK.x1 - MARK_INK.x0;
  const height = MARK_INK.y1 - MARK_INK.y0;
  const scale = 56 / width;
  const tx = 32 - (MARK_INK.x0 + width / 2) * scale;
  const ty = 32 - (MARK_INK.y0 + height / 2) * scale;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">`,
    `<rect id="tile" width="64" height="64" rx="${rounded ? 14 : 0}" fill="${TILE}"/>`,
    `<g transform="translate(${f2(tx)} ${f2(ty)}) scale(${scale.toFixed(4)})">${markGroups(COLOURS.light)}</g>`,
    `</svg>`,
  ].join("");
}

async function png(svg: string, width: number, file: string, square = false) {
  const intrinsic = Number(/width="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? width);
  const density = Math.min(4800, Math.max(72, (72 * width) / intrinsic));
  await sharp(Buffer.from(svg), { density })
    .resize(square ? { width, height: width, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } } : { width })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

async function main() {
  mkdirSync(out("public/brand/png"), { recursive: true });

  const files: Record<string, string> = {
    "public/brand/weekendcart-logo.svg": logoFile(COLOURS.light),
    "public/brand/weekendcart-logo-light.svg": logoFile(COLOURS.dark),
    "public/brand/weekendcart-mark.svg": markFile(COLOURS.light),
    "public/brand/weekendcart-mark-light.svg": markFile(COLOURS.dark),
    "public/brand/weekendcart-icon.svg": iconFile(true),
    "src/app/icon.svg": iconFile(true),
  };
  for (const [file, svg] of Object.entries(files)) writeFileSync(out(file), svg + "\n");

  // 4K: 3840 wide for the logo, 4096 square for the mark and icon.
  await png(files["public/brand/weekendcart-logo.svg"], 3840, out("public/brand/png/weekendcart-logo-4k.png"));
  await png(files["public/brand/weekendcart-logo-light.svg"], 3840, out("public/brand/png/weekendcart-logo-light-4k.png"));
  await png(files["public/brand/weekendcart-mark.svg"], 4096, out("public/brand/png/weekendcart-mark-4k.png"), true);
  await png(files["public/brand/weekendcart-mark-light.svg"], 4096, out("public/brand/png/weekendcart-mark-light-4k.png"), true);
  await png(files["public/brand/weekendcart-icon.svg"], 4096, out("public/brand/png/weekendcart-icon-4k.png"), true);
  await png(files["public/brand/weekendcart-icon.svg"], 512, out("public/brand/png/weekendcart-icon-512.png"), true);
  // iOS rounds the corners itself; a pre-rounded tile would get a double edge.
  await png(iconFile(false), 180, out("src/app/apple-icon.png"), true);
  await png(iconFile(true), 64, out("src/app/icon1.png"), true);

  const list = (items: string[]) => `[\n${items.map((d) => `    "${d}",`).join("\n")}\n  ]`;
  writeFileSync(
    out("src/components/brand/logo-art.ts"),
    [
      "// Generated by scripts/build-brand.ts.",
      "// Do not edit by hand — change the script and run `npm run brand:build`.",
      "",
      "/** The full logo, from scripts/brand/weekendcart-logo.svg. */",
      "export const LOGO = {",
      `  viewBox: "${LOCKUP.viewBox}",`,
      `  width: ${LOCKUP_WIDTH},`,
      `  height: ${LOCKUP_HEIGHT},`,
      `  mark: {`,
      `    accent: "${LOCKUP.mark.accent}",`,
      `    peak: "${LOCKUP.mark.peak}",`,
      `    tail: "${LOCKUP.mark.tail}",`,
      `  },`,
      `  word: ${list(LOCKUP.word)},`,
      `  tagline: ${list(LOCKUP.tagline)},`,
      "} as const;",
      "",
      "/** The W alone, as the favicon draws it. */",
      "export const MARK = {",
      `  viewBox: "${markBox.x} ${markBox.y} ${markBox.side} ${markBox.side}",`,
      `  accent: "${MARK.accent}",`,
      `  peak: "${MARK.peak}",`,
      `  tail: "${MARK.tail}",`,
      "} as const;",
      "",
      `export const LOGO_COLOURS = ${JSON.stringify(COLOURS, null, 2).replace(/"(\w+)":/g, "$1:")} as const;`,
      "",
      "export type LogoTone = keyof typeof LOGO_COLOURS;",
      "",
    ].join("\n"),
  );

  console.log(`WeekendCart: logo ${LOCKUP_WIDTH}×${LOCKUP_HEIGHT} · ${Object.keys(files).length} SVGs · 8 PNGs`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
