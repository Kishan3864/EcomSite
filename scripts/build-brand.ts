/**
 * Builds every brand asset from the WeekendCart logo geometry below.
 *
 *   npm run brand:build
 *
 * The logo is drawn on the 751 × 251 grid of the original artwork. The W is
 * three rounded strokes — a short accent, a tall peak and a short tail — built
 * here as filled outlines, not strokes, so every tool renders them the same.
 * "eekend" is M PLUS Rounded 1c Bold and "CART" is Open Sans, both converted to
 * outlines once, so the logo needs no font on any device. Every letter is its
 * own path in its own group.
 *
 * Writes:
 *   src/components/brand/logo-art.ts   paths and colours, used by the header
 *   src/app/icon.svg, icon1.png        favicon: the W alone (SVG, PNG fallback)
 *   src/app/apple-icon.png             iOS home-screen icon
 *   public/brand/*.svg                 logo, mark and icon, light and dark
 *   public/brand/png/*.png             4K raster exports
 *   brand-reserve/weekendcart-rounded* logo and W, original and theme colours
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import opentype from "opentype.js";
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

/** The original artwork's blue, green and grey, kept for the reserve copy. */
const ORIGINAL: Palette = { accent: "#029eda", peak: "#63bb48", tail: "#63bb48", word: "#373737", tagline: "#373737" };

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

/* ---------------------------------------------------------------- type */

function font(file: string) {
  const buffer = readFileSync(out("node_modules/@fontsource", file));
  return opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}
const rounded = font("m-plus-rounded-1c/files/m-plus-rounded-1c-latin-700-normal.woff");
const sans = font("open-sans/files/open-sans-latin-400-normal.woff");

interface Glyph { char: string; d: string; x0: number; y0: number; x1: number; y1: number }

function glyph(f: opentype.Font, char: string, size: number, left: number, baseline: number): Glyph {
  const g = f.charToGlyph(char);
  const origin = g.getPath(0, 0, size).getBoundingBox();
  const path = g.getPath(left - origin.x1, baseline, size);
  const box = path.getBoundingBox();
  return { char, d: path.toPathData(2), x0: box.x1, y0: box.y1, x1: box.x2, y1: box.y2 };
}

const unitsTall = (f: opentype.Font, char: string) => {
  const box = f.charToGlyph(char).getBoundingBox();
  return box.y2 - box.y1;
};

/** "eekend": x-height 71, baseline 156, each letter where the original has it. */
const WORD_SIZE = (71 / unitsTall(rounded, "n")) * rounded.unitsPerEm;
const WORD = [240, 317, 394, 470, 547, 624].map((left, i) => glyph(rounded, "eekend"[i], WORD_SIZE, left, 156));

/** "CART": cap height 27 on baseline 216, spaced to span 325–414 as in the original. */
const TAG_SIZE = (27 / unitsTall(sans, "T")) * sans.unitsPerEm;
const TAG = (() => {
  const natural: Glyph[] = [];
  let x = 0;
  for (const char of "CART") {
    const g = glyph(sans, char, TAG_SIZE, x, 216);
    natural.push(g);
    x = g.x1;
  }
  const inkWidth = natural.reduce((w, g) => w + (g.x1 - g.x0), 0);
  const gap = (414 - 325 - inkWidth) / 3;
  let left = 325;
  return natural.map((g) => {
    const placed = glyph(sans, g.char, TAG_SIZE, left, 216);
    left = placed.x1 + gap;
    return placed;
  });
})();

const RULES = { left: "M62 200H314V204H62Z", right: "M425 200H677V204H425Z" };

/* ------------------------------------------------------------- layout */

const PAD = 2;
const ink = {
  x0: Math.min(MARK_INK.x0, 62),
  y0: Math.min(MARK_INK.y0, ...WORD.map((g) => g.y0)),
  x1: Math.max(677, ...WORD.map((g) => g.x1)),
  y1: Math.max(...TAG.map((g) => g.y1)),
};
const logoBox = {
  x: Math.floor(ink.x0 - PAD),
  y: Math.floor(ink.y0 - PAD),
  w: Math.ceil(ink.x1 + PAD) - Math.floor(ink.x0 - PAD),
  h: Math.ceil(ink.y1 + PAD) - Math.floor(ink.y0 - PAD),
};
const markSide = Math.max(MARK_INK.x1 - MARK_INK.x0, MARK_INK.y1 - MARK_INK.y0) + PAD * 2;
const markBox = {
  x: f2((MARK_INK.x0 + MARK_INK.x1) / 2 - markSide / 2),
  y: f2((MARK_INK.y0 + MARK_INK.y1) / 2 - markSide / 2),
  side: f2(markSide),
};

/* --------------------------------------------------------------- files */

const group = (id: string, fill: string, d: string) => `<g id="${id}" fill="${fill}"><path d="${d}"/></g>`;

function markGroups(c: Palette) {
  return [
    `<g id="mark">`,
    group("mark-accent", c.accent, MARK.accent),
    group("mark-peak", c.peak, MARK.peak),
    group("mark-tail", c.tail, MARK.tail),
    `</g>`,
  ].join("");
}

function logoFile(c: Palette) {
  const count: Record<string, number> = {};
  const letter = (g: Glyph, fill: string) => {
    count[g.char] = (count[g.char] ?? 0) + 1;
    return group(`letter-${g.char}${g.char === "e" ? `-${count.e}` : ""}`, fill, g.d);
  };
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logoBox.x} ${logoBox.y} ${logoBox.w} ${logoBox.h}" width="${logoBox.w * 4}" height="${logoBox.h * 4}" role="img" aria-label="WeekendCart">`,
    `<title>WeekendCart</title>`,
    `<g id="weekendcart-logo">`,
    markGroups(c),
    `<g id="wordmark">${WORD.map((g) => letter(g, c.word)).join("")}</g>`,
    `<g id="tagline">`,
    group("rule-left", c.tagline, RULES.left),
    TAG.map((g) => group(`tagline-${g.char}`, c.tagline, g.d)).join(""),
    group("rule-right", c.tagline, RULES.right),
    `</g>`,
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
    // Source copies, beside the reserved logos: original colours and theme colours.
    "brand-reserve/weekendcart-rounded.svg": logoFile(ORIGINAL),
    "brand-reserve/weekendcart-rounded-mark.svg": markFile(ORIGINAL),
    "brand-reserve/weekendcart-rounded-theme.svg": logoFile(COLOURS.light),
    "brand-reserve/weekendcart-rounded-theme-mark.svg": markFile(COLOURS.light),
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
      "export const LOGO = {",
      `  viewBox: "${logoBox.x} ${logoBox.y} ${logoBox.w} ${logoBox.h}",`,
      `  width: ${logoBox.w},`,
      `  height: ${logoBox.h},`,
      `  markViewBox: "${markBox.x} ${markBox.y} ${markBox.side} ${markBox.side}",`,
      `  mark: {`,
      `    accent: "${MARK.accent}",`,
      `    peak: "${MARK.peak}",`,
      `    tail: "${MARK.tail}",`,
      `  },`,
      `  word: ${list(WORD.map((g) => g.d))},`,
      `  tagline: ${list([RULES.left, ...TAG.map((g) => g.d), RULES.right])},`,
      "} as const;",
      "",
      `export const LOGO_COLOURS = ${JSON.stringify(COLOURS, null, 2).replace(/"(\w+)":/g, "$1:")} as const;`,
      "",
      "export type LogoTone = keyof typeof LOGO_COLOURS;",
      "",
    ].join("\n"),
  );

  console.log(`WeekendCart: logo ${logoBox.w}×${logoBox.h} · ${Object.keys(files).length} SVGs · 8 PNGs`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
