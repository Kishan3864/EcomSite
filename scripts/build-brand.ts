/**
 * Builds every brand asset from the active concept in
 * src/components/brand/mark-geometry.ts.
 *
 *   npm run brand:build
 *
 * The wordmark is set in Plus Jakarta Sans and converted to outlines here,
 * once. An SVG that uses <text> renders in whatever font the viewing machine
 * happens to have; outlines render identically everywhere, with no font request
 * and no flash of the wrong typeface.
 *
 * Writes:
 *   src/components/brand/wordmark.ts   outlined wordmark, used by the header
 *   src/app/icon.svg, icon1.png        favicon (SVG, with a PNG fallback)
 *   src/app/apple-icon.png             iOS home-screen icon
 *   public/brand/*.svg                 lockups for print, invoices, onboarding
 *   public/brand/png/*.png             full-HD raster exports
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import opentype from "opentype.js";
import sharp from "sharp";
import { ACTIVE, type MarkTone } from "../src/components/brand/mark-geometry";

const root = process.cwd();
const out = (...parts: string[]) => join(root, ...parts);

const fonts = new Map<number, opentype.Font>();
function font(weight: 500 | 700 | 800) {
  if (!fonts.has(weight)) {
    const buffer = readFileSync(
      out("node_modules/@fontsource/plus-jakarta-sans/files", `plus-jakarta-sans-latin-${weight}-normal.woff`),
    );
    fonts.set(weight, opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)));
  }
  return fonts.get(weight)!;
}

/** Outline a run of text from x = `start`, with pairwise kerning and tracking in em. */
function outline(f: opentype.Font, text: string, size: number, tracking: number, start = 0) {
  const glyphs = f.stringToGlyphs(text);
  const scale = size / f.unitsPerEm;
  let x = start;
  let d = "";
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  glyphs.forEach((glyph, i) => {
    const path = glyph.getPath(x, 0, size);
    d += path.toPathData(2);
    const box = path.getBoundingBox();
    if (box.x2 > box.x1) {
      minX = Math.min(minX, box.x1);
      maxX = Math.max(maxX, box.x2);
      minY = Math.min(minY, box.y1);
      maxY = Math.max(maxY, box.y2);
    }
    let advance = (glyph.advanceWidth ?? 0) * scale;
    if (i < glyphs.length - 1) advance += f.getKerningValue(glyph, glyphs[i + 1]) * scale;
    x += advance + tracking * size;
  });

  return { d, end: x, minX, maxX, minY, maxY };
}

/* ------------------------------------------------------------ geometry */

const W = ACTIVE.word;
const ink = ACTIVE.ink;

const firstRun = outline(font(W.weight), W.text.slice(0, W.splitAt), W.size, W.tracking);
const secondRun = outline(font(W.secondWeight ?? W.weight), W.text.slice(W.splitAt), W.size, W.tracking, firstRun.end);
const word = {
  first: firstRun.d,
  second: secondRun.d,
  minX: Math.min(firstRun.minX, secondRun.minX),
  maxX: Math.max(firstRun.maxX, secondRun.maxX),
  minY: Math.min(firstRun.minY, secondRun.minY),
  maxY: Math.max(firstRun.maxY, secondRun.maxY),
};

// Place the wordmark so its first glyph's ink starts `gap` after the mark's ink.
const WORD_X = +(ink.x1 + W.gap - word.minX).toFixed(2);

const top = Math.floor(Math.min(ink.y0, W.baseline + word.minY)) - 1;
const bottom = Math.ceil(Math.max(ink.y1, W.baseline + word.maxY)) + 1;
const left = Math.floor(Math.min(ink.x0, 0)) - 1;
const lockup = {
  x0: left,
  y0: top,
  width: Math.ceil(WORD_X + word.maxX) + 2 - left,
  height: bottom - top,
};

const translate = (d: string, dx: number, dy: number) =>
  `<g transform="translate(${dx} ${dy})"><path d="${d}"/></g>`;

const mark = (tone: MarkTone) => `<defs>${ACTIVE.defs(tone)}</defs>${ACTIVE.body(tone)}`;
const TAGLINE_FILL: Record<MarkTone, string> = { light: "#55504a", dark: "#c7c2b9" };

function horizontal(tone: MarkTone) {
  const c = W.colours[tone];
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${lockup.x0} ${lockup.y0} ${lockup.width} ${lockup.height}" width="${lockup.width * 4}" height="${lockup.height * 4}" role="img" aria-label="WeekendCart">`,
    `<title>WeekendCart</title>`,
    mark(tone),
    `<g fill="${c.first}">${translate(word.first, WORD_X, W.baseline)}</g>`,
    `<g fill="${c.second}">${translate(word.second, WORD_X, W.baseline)}</g>`,
    `</svg>`,
  ].join("");
}

const tag = outline(font(700), "ONLINE STORE", 11, 0.32);

function stacked(tone: MarkTone) {
  const c = W.colours[tone];
  const markScale = 1.5;
  const markW = (ink.x1 - ink.x0) * markScale;
  const wordW = word.maxX - word.minX;
  const tagW = tag.maxX - tag.minX;
  const width = Math.ceil(Math.max(markW, wordW, tagW) + 48);
  const centre = width / 2;

  const markTop = 16;
  const markBottom = markTop + (ink.y1 - ink.y0) * markScale;
  const wordBaseline = markBottom + 18 - word.minY;
  const tagBaseline = wordBaseline + 26;
  const height = Math.ceil(tagBaseline + 20);

  const markX = centre - (ink.x0 + (ink.x1 - ink.x0) / 2) * markScale;
  const markY = markTop - ink.y0 * markScale;
  const wordX = centre - (word.minX + wordW / 2);
  const tagX = centre - (tag.minX + tagW / 2);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 4}" height="${height * 4}" role="img" aria-label="WeekendCart — Online Store">`,
    `<title>WeekendCart</title>`,
    `<g transform="translate(${markX.toFixed(2)} ${markY.toFixed(2)}) scale(${markScale})">${mark(tone)}</g>`,
    `<g fill="${c.first}">${translate(word.first, wordX, wordBaseline)}</g>`,
    `<g fill="${c.second}">${translate(word.second, wordX, wordBaseline)}</g>`,
    `<g fill="${TAGLINE_FILL[tone]}">${translate(tag.d, tagX, tagBaseline)}</g>`,
    `</svg>`,
  ].join("");
}

/** The mark alone, on a square canvas centred on its ink. */
function markFile(tone: MarkTone) {
  const side = Math.max(ink.x1 - ink.x0, ink.y1 - ink.y0) + 4;
  const cx = (ink.x0 + ink.x1) / 2;
  const cy = (ink.y0 + ink.y1) / 2;
  const vb = `${(cx - side / 2).toFixed(2)} ${(cy - side / 2).toFixed(2)} ${side.toFixed(2)} ${side.toFixed(2)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="512" height="512" role="img" aria-label="WeekendCart"><title>WeekendCart</title>${mark(tone)}</svg>`;
}

const iconFile = (rounded: boolean) => {
  const body = ACTIVE.icon({ opaque: !rounded });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${
    rounded ? body : body.replace(/rx="\d+(?:\.\d+)?"/, 'rx="0"')
  }</svg>`;
};

/* -------------------------------------------------------------- write */

async function png(svg: string, width: number, file: string, square = false) {
  const intrinsic = Number(/width="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? width);
  const density = Math.min(2400, Math.max(72, (72 * width) / intrinsic));
  await sharp(Buffer.from(svg), { density })
    .resize(square ? { width, height: width, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } } : { width })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

async function main() {
  mkdirSync(out("public/brand/png"), { recursive: true });

  const files: Record<string, string> = {
    "public/brand/weekendcart-logo.svg": horizontal("light"),
    "public/brand/weekendcart-logo-light.svg": horizontal("dark"),
    "public/brand/weekendcart-logo-stacked.svg": stacked("light"),
    "public/brand/weekendcart-logo-stacked-light.svg": stacked("dark"),
    "public/brand/weekendcart-mark.svg": markFile("light"),
    "public/brand/weekendcart-mark-light.svg": markFile("dark"),
    "public/brand/weekendcart-icon.svg": iconFile(true),
    "src/app/icon.svg": iconFile(true),
  };
  for (const [file, svg] of Object.entries(files)) writeFileSync(out(file), svg + "\n");

  await png(files["public/brand/weekendcart-logo.svg"], 1920, out("public/brand/png/weekendcart-logo-1920.png"));
  await png(files["public/brand/weekendcart-logo-light.svg"], 1920, out("public/brand/png/weekendcart-logo-light-1920.png"));
  await png(files["public/brand/weekendcart-logo-stacked.svg"], 1200, out("public/brand/png/weekendcart-logo-stacked-1200.png"));
  await png(files["public/brand/weekendcart-mark.svg"], 1024, out("public/brand/png/weekendcart-mark-1024.png"), true);
  await png(files["public/brand/weekendcart-icon.svg"], 1024, out("public/brand/png/weekendcart-icon-1024.png"), true);
  await png(files["public/brand/weekendcart-icon.svg"], 512, out("public/brand/png/weekendcart-icon-512.png"), true);
  // iOS rounds the corners itself; a pre-rounded tile would get a double edge.
  await png(iconFile(false), 180, out("src/app/apple-icon.png"), true);
  await png(iconFile(true), 64, out("src/app/icon1.png"), true);

  writeFileSync(
    out("src/components/brand/wordmark.ts"),
    [
      `// Generated by scripts/build-brand.ts for "${ACTIVE.name}".`,
      "// Do not edit by hand — change mark-geometry.ts and run `npm run brand:build`.",
      "",
      "export const WORDMARK = {",
      `  viewBox: "${lockup.x0} ${lockup.y0} ${lockup.width} ${lockup.height}",`,
      `  width: ${lockup.width},`,
      `  height: ${lockup.height},`,
      `  x: ${WORD_X},`,
      `  baseline: ${W.baseline},`,
      `  first: "${word.first}",`,
      `  second: "${word.second}",`,
      "} as const;",
      "",
    ].join("\n"),
  );

  console.log(`${ACTIVE.name}: lockup ${lockup.width}×${lockup.height} · ${Object.keys(files).length} SVGs · 8 PNGs`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
