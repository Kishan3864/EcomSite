/**
 * Builds every brand asset from src/components/brand/mark-geometry.ts.
 *
 *   npm run brand:build
 *
 * The wordmark is set in Plus Jakarta Sans ExtraBold and converted to outlines
 * here, once. An SVG that uses <text> renders in whatever font the viewing
 * machine happens to have — Georgia, Arial, a fallback — which is what the old
 * logo files did. Outlines render identically everywhere, with no font request
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
import { PALETTE, iconMarkup, markMarkup, type MarkTone } from "../src/components/brand/mark-geometry";

const root = process.cwd();
const out = (...parts: string[]) => join(root, ...parts);

function loadFont(weight: 700 | 800) {
  const file = out(
    "node_modules/@fontsource/plus-jakarta-sans/files",
    `plus-jakarta-sans-latin-${weight}-normal.woff`,
  );
  const buffer = readFileSync(file);
  return opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

/**
 * Outline `text`, splitting the path data at `splitAt` so the two halves can
 * be coloured separately. Kerning is applied pair by pair; tracking is in em.
 */
function outline(
  font: opentype.Font,
  text: string,
  size: number,
  tracking: number,
  splitAt = text.length,
) {
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  let x = 0;
  let first = "";
  let second = "";
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  glyphs.forEach((glyph, i) => {
    const path = glyph.getPath(x, 0, size);
    const data = path.toPathData(2);
    if (i < splitAt) first += data;
    else second += data;

    const box = path.getBoundingBox();
    if (box.x2 > box.x1) {
      minX = Math.min(minX, box.x1);
      maxX = Math.max(maxX, box.x2);
      minY = Math.min(minY, box.y1);
      maxY = Math.max(maxY, box.y2);
    }

    let advance = (glyph.advanceWidth ?? 0) * scale;
    if (i < glyphs.length - 1) advance += font.getKerningValue(glyph, glyphs[i + 1]) * scale;
    x += advance + tracking * size;
  });

  return { first, second, minX, maxX, minY, maxY };
}

const bold = loadFont(800);
const medium = loadFont(700);

/* ------------------------------------------------------------ geometry */

// Wordmark set at 40 units on the mark's 64-unit grid, baseline on the bag's
// base (y 51), so the cap height runs from about the bag's top edge down.
const WORD_SIZE = 40;
const WORD_BASELINE = 51;
const WORD_X = 66;
const word = outline(bold, "WeekendCart", WORD_SIZE, -0.02, 7);

// Ink of the mark with speed lines, round caps included.
const MARK_INK = { x0: 0.3, y0: 6.4, x1: 54.2, y1: 60.6 };

const lockup = {
  x0: 0,
  y0: Math.floor(MARK_INK.y0) - 1,
  width: Math.ceil(WORD_X + word.maxX) + 2,
  height: Math.ceil(MARK_INK.y1) + 2 - (Math.floor(MARK_INK.y0) - 1),
};

const translate = (d: string, dx: number, dy: number) =>
  `<g transform="translate(${dx} ${dy})"><path d="${d}"/></g>`;

type Tone = { mark: MarkTone; weekend: string; cart: string; tagline: string };
const LIGHT: Tone = { mark: "light", weekend: PALETTE.ink, cart: PALETTE.brass600, tagline: "#55504a" };
const DARK: Tone = { mark: "dark", weekend: "#ffffff", cart: PALETTE.brass300, tagline: "#c7c2b9" };

function horizontal(tone: Tone, id: string) {
  const viewBox = `${lockup.x0} ${lockup.y0} ${lockup.width} ${lockup.height}`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${lockup.width * 4}" height="${lockup.height * 4}" role="img" aria-label="WeekendCart">`,
    `<title>WeekendCart</title>`,
    markMarkup({ tone: tone.mark, gradientId: id }),
    `<g fill="${tone.weekend}">${translate(word.first, WORD_X, WORD_BASELINE)}</g>`,
    `<g fill="${tone.cart}">${translate(word.second, WORD_X, WORD_BASELINE)}</g>`,
    `</svg>`,
  ].join("");
}

// Stacked: mark centred above the wordmark, tagline beneath.
const TAG_SIZE = 11;
const tag = outline(medium, "ONLINE STORE", TAG_SIZE, 0.32);

function stacked(tone: Tone, id: string) {
  const markScale = 1.5;
  const markWidth = (MARK_INK.x1 - MARK_INK.x0) * markScale;
  const wordWidth = word.maxX - word.minX;
  const tagWidth = tag.maxX - tag.minX;
  const width = Math.ceil(Math.max(markWidth, wordWidth, tagWidth) + 48);
  const centre = width / 2;

  const markTop = 16;
  const markBottom = markTop + (MARK_INK.y1 - MARK_INK.y0) * markScale;
  const wordBaseline = markBottom + 18 + (-word.minY);
  const tagBaseline = wordBaseline + 26;
  const height = Math.ceil(tagBaseline + 20);

  const markX = centre - (MARK_INK.x0 + (MARK_INK.x1 - MARK_INK.x0) / 2) * markScale;
  const markY = markTop - MARK_INK.y0 * markScale;
  const wordX = centre - (word.minX + wordWidth / 2);
  const tagX = centre - (tag.minX + tagWidth / 2);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 4}" height="${height * 4}" role="img" aria-label="WeekendCart — Online Store">`,
    `<title>WeekendCart</title>`,
    `<g transform="translate(${markX.toFixed(2)} ${markY.toFixed(2)}) scale(${markScale})">`,
    markMarkup({ tone: tone.mark, gradientId: id }),
    `</g>`,
    `<g fill="${tone.weekend}">${translate(word.first, wordX, wordBaseline)}</g>`,
    `<g fill="${tone.cart}">${translate(word.second, wordX, wordBaseline)}</g>`,
    `<g fill="${tone.tagline}">${translate(tag.first, tagX, tagBaseline)}</g>`,
    `</svg>`,
  ].join("");
}

const markFile = (tone: MarkTone, id: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512" role="img" aria-label="WeekendCart"><title>WeekendCart</title>${markMarkup({ tone, gradientId: id })}</svg>`;

const iconFile = (rounded: boolean) => {
  const body = iconMarkup("wc-icon");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${
    rounded ? body : body.replace('rx="12"', 'rx="0"')
  }</svg>`;
};

/* -------------------------------------------------------------- write */

async function png(svg: string, width: number, file: string, square = false) {
  const intrinsic = Number(/width="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? width);
  const density = Math.min(2400, Math.max(72, (72 * width) / intrinsic));
  await sharp(Buffer.from(svg), { density })
    .resize(square ? { width, height: width, fit: "contain" } : { width })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

async function main() {
  mkdirSync(out("public/brand/png"), { recursive: true });

  const files: Record<string, string> = {
    "public/brand/weekendcart-logo.svg": horizontal(LIGHT, "wc-logo"),
    "public/brand/weekendcart-logo-light.svg": horizontal(DARK, "wc-logo-light"),
    "public/brand/weekendcart-logo-stacked.svg": stacked(LIGHT, "wc-stacked"),
    "public/brand/weekendcart-logo-stacked-light.svg": stacked(DARK, "wc-stacked-light"),
    "public/brand/weekendcart-mark.svg": markFile("light", "wc-mark"),
    "public/brand/weekendcart-mark-light.svg": markFile("dark", "wc-mark-light"),
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

  const generated = [
    "// Generated by scripts/build-brand.ts from Plus Jakarta Sans ExtraBold.",
    "// Do not edit by hand — change the script or the geometry and run",
    "// `npm run brand:build`.",
    "",
    "export const WORDMARK = {",
    `  viewBox: "${lockup.x0} ${lockup.y0} ${lockup.width} ${lockup.height}",`,
    `  width: ${lockup.width},`,
    `  height: ${lockup.height},`,
    `  x: ${WORD_X},`,
    `  baseline: ${WORD_BASELINE},`,
    `  weekend: "${word.first}",`,
    `  cart: "${word.second}",`,
    "} as const;",
    "",
  ].join("\n");
  writeFileSync(out("src/components/brand/wordmark.ts"), generated);

  console.log(`lockup ${lockup.width}×${lockup.height} · ${Object.keys(files).length} SVGs · 8 PNGs`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
