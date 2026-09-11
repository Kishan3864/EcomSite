/**
 * TEMPORARY — ten further logo directions, shown only on /logo for choosing.
 * Once one is picked it moves into mark-geometry.ts, and this file and the
 * /logo page are deleted.
 */
import { PALETTE, type Concept, type MarkTone } from "./mark-geometry";

const P = { ...PALETTE, teal: "#1f6f6a", rust: "#a4611f", sand: "#efe6d2" };
const gid = (name: string, tone: MarkTone, part = "g") => `wc-${name}-${tone}-${part}`;
const grad = (id: string, a: string, b: string, diagonal = true) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${diagonal ? 1 : 0}" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const tile = (fill = P.evergreen900, rx = 14) => `<rect width="64" height="64" rx="${rx}" fill="${fill}"/>`;
const place = (cx: number, cy: number, scale: number, body: string) =>
  `<g transform="translate(32 32) scale(${scale}) translate(${-cx} ${-cy})">${body}</g>`;
const dual = (light: [string, string], dark: [string, string]) => ({
  light: { first: light[0], second: light[1] },
  dark: { first: dark[0], second: dark[1] },
});

/* D — Price tag, tilted, with the W on it */
function tagBody(tone: MarkTone) {
  const w = tone === "light" ? P.cream : P.evergreen900;
  return `<g transform="rotate(-20 32 32)"><path d="M8 32L21 18H52a4 4 0 0 1 4 4V42a4 4 0 0 1-4 4H21Z" fill="url(#${gid("tag", tone)})"/>
<circle cx="19" cy="32" r="3.2" fill="none" stroke="${P.brass400}" stroke-width="2.4"/>
<path d="M28 26L33 38L39.5 29L46 38L51 26" fill="none" stroke="${w}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}
const tag: Concept = {
  name: "D — Price tag",
  defs: (tone) => grad(gid("tag", tone), tone === "light" ? P.emerald : P.cream, tone === "light" ? P.evergreen950 : P.sand),
  body: tagBody,
  ink: { x0: 9, y0: 10, x1: 60, y1: 49.5 },
  icon: () => `<defs>${tag.defs("dark")}</defs>${tile()}${place(34.4, 29.8, 0.82, tagBody("dark"))}`,
  word: { text: "WeekendCart", splitAt: 7, weight: 800, size: 40, tracking: -0.025, baseline: 44, gap: 10, colours: dual([P.ink, P.emerald], ["#fff", P.brass300]) },
};

/* E — Isometric parcel, taped, with a delivery smile */
function parcelBody() {
  return `<path d="M32 8L54 20L32 32L10 20Z" fill="${P.brass300}"/>
<path d="M10 20L32 32V56L10 44Z" fill="${P.brass400}"/>
<path d="M32 32L54 20V44L32 56Z" fill="${P.rust}"/>
<path d="M21 14L43 26V50" fill="none" stroke="${P.cream}" stroke-width="3.4" stroke-linejoin="round"/>
<path d="M14.5 37.5q6.5 6.5 13 4" fill="none" stroke="${P.evergreen900}" stroke-width="3" stroke-linecap="round"/>
<path d="M24.6 38.9l3.1 2.6-2.4 3.2" fill="none" stroke="${P.evergreen900}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const parcel: Concept = {
  name: "E — Parcel",
  defs: () => "",
  body: parcelBody,
  ink: { x0: 9.5, y0: 7.5, x1: 54.5, y1: 56.5 },
  icon: (o) => `${o?.opaque ? `<rect width="64" height="64" fill="${P.cream}"/>` : ""}${place(32, 32, 1.08, parcelBody())}`,
  word: { text: "weekendcart", splitAt: 7, weight: 700, size: 40, tracking: -0.02, baseline: 44, gap: 10, colours: dual([P.ink, P.rust], ["#fff", P.brass300]) },
};

/* F — Weekend sun: the handle is a rising sun */
function sunBody(tone: MarkTone) {
  const sun = tone === "light" ? P.brass400 : P.brass300;
  const smile = tone === "light" ? P.cream : P.evergreen900;
  return `<path d="M22 28a10 10 0 0 1 20 0" fill="none" stroke="${sun}" stroke-width="4" stroke-linecap="round"/>
<path d="M32 13V9M21.4 17.4L18.6 14.6M42.6 17.4L45.4 14.6" fill="none" stroke="${sun}" stroke-width="3" stroke-linecap="round"/>
<path d="M12 28H52L49 56a3 3 0 0 1-3 2.6H18a3 3 0 0 1-3-2.6Z" fill="url(#${gid("sun", tone)})"/>
<path d="M24 40q8 7 16 0" fill="none" stroke="${smile}" stroke-width="3.4" stroke-linecap="round"/>`;
}
const sun: Concept = {
  name: "F — Weekend sun",
  defs: (tone) => grad(gid("sun", tone), tone === "light" ? P.evergreen700 : P.cream, tone === "light" ? P.evergreen950 : P.sand, false),
  body: sunBody,
  ink: { x0: 11.5, y0: 7.5, x1: 52.5, y1: 59 },
  icon: () => `<defs>${sun.defs("dark")}</defs>${tile()}${place(32, 33.2, 0.8, sunBody("dark"))}`,
  word: { text: "WeekendCart", splitAt: 7, weight: 500, secondWeight: 800, size: 40, tracking: -0.02, baseline: 47, gap: 10, colours: dual([P.ink, P.brass600], ["#fff", P.brass300]) },
};

/* G — Location pin carrying a cart: delivered to you */
function pinBody(tone: MarkTone) {
  return `<path d="M32 60C32 60 12 40 12 26a20 20 0 0 1 40 0C52 40 32 60 32 60Z" fill="url(#${gid("pin", tone)})"/>
<path d="M19.5 17.5H23.5L27 30.5H41L44 21H25" fill="none" stroke="${P.cream}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="29" cy="35" r="2.3" fill="${P.cream}"/><circle cx="39" cy="35" r="2.3" fill="${P.cream}"/>`;
}
const pin: Concept = {
  name: "G — Delivery pin",
  defs: (tone) => grad(gid("pin", tone), P.brass300, P.amber),
  body: pinBody,
  ink: { x0: 12, y0: 6, x1: 52, y1: 60 },
  icon: (o) => `<defs>${pin.defs("light")}</defs>${o?.opaque ? `<rect width="64" height="64" fill="${P.cream}"/>` : ""}${place(32, 33, 1.02, pinBody("light"))}`,
  word: { text: "WEEKENDCART", splitAt: 7, weight: 800, size: 36, tracking: 0.02, baseline: 43, gap: 10, colours: dual([P.evergreen900, P.amber], ["#fff", P.brass300]) },
};

/* H — Ribbon W with a sparkle */
function ribbonBody(tone: MarkTone) {
  return `<path d="M8 18C12 40 18 48 24 48C30 48 30 30 32 30C34 30 34 48 40 48C46 48 52 40 56 18" fill="none" stroke="url(#${gid("ribbon", tone)})" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M32 8L34 14L40 16L34 18L32 24L30 18L24 16L30 14Z" fill="${tone === "light" ? P.brass400 : P.brass300}"/>`;
}
const ribbon: Concept = {
  name: "H — Ribbon",
  defs: (tone) =>
    `<linearGradient id="${gid("ribbon", tone)}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${tone === "light" ? P.emerald : P.cream}"/><stop offset="1" stop-color="${tone === "light" ? P.brass400 : P.brass300}"/></linearGradient>`,
  body: ribbonBody,
  ink: { x0: 4.5, y0: 8, x1: 59.5, y1: 51.5 },
  icon: () => `<defs>${ribbon.defs("dark")}</defs>${tile()}${place(32, 29.75, 0.78, ribbonBody("dark"))}`,
  word: { text: "weekendcart", splitAt: 7, weight: 800, size: 40, tracking: -0.04, baseline: 42, gap: 10, colours: dual([P.ink, P.emerald], ["#fff", P.brass300]) },
};

/* I — Pixel W: a W built from nine tiles */
function pixelBody(tone: MarkTone) {
  // Four rows, so the W has its outer strokes and a centre apex that read.
  const on: [number, number][] = [[0, 0], [0, 4], [1, 0], [1, 4], [2, 0], [2, 2], [2, 4], [3, 1], [3, 3]];
  const colour = (r: number, c: number) => {
    if (r === 2 && c === 2) return tone === "light" ? P.brass400 : P.brass300;
    if (tone === "dark") return r === 3 ? P.brass300 : P.cream;
    return r < 2 ? P.evergreen900 : r === 2 ? P.evergreen700 : P.emerald;
  };
  return on
    .map(([r, c]) => `<rect x="${4 + c * 11.5}" y="${8 + r * 11.5}" width="9" height="9" rx="2.4" fill="${colour(r, c)}"/>`)
    .join("");
}
const pixel: Concept = {
  name: "I — Pixel W",
  defs: () => "",
  body: pixelBody,
  ink: { x0: 4, y0: 8, x1: 59, y1: 51.5 },
  icon: () => `${tile()}${place(31.5, 29.75, 0.84, pixelBody("dark"))}`,
  word: { text: "WEEKENDCART", splitAt: 7, weight: 700, size: 34, tracking: 0.1, baseline: 42, gap: 10, colours: dual([P.evergreen900, P.brass600], ["#fff", P.brass300]) },
};

/* J — Cart with a forward arrow in its basket */
function arrowBody(tone: MarkTone) {
  const s = tone === "light" ? P.evergreen900 : P.cream;
  const a = tone === "light" ? P.brass400 : P.brass300;
  return `<path d="M4 13H11L17 37H46L52 20H14" fill="none" stroke="${s}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M22 28.5H40M35 23.5L40 28.5L35 33.5" fill="none" stroke="${a}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="21" cy="47" r="4" fill="${s}"/><circle cx="42" cy="47" r="4" fill="${s}"/>`;
}
const arrow: Concept = {
  name: "J — Fast cart",
  defs: () => "",
  body: arrowBody,
  ink: { x0: 1.7, y0: 10.7, x1: 54.3, y1: 51 },
  icon: () => `${tile()}${place(28, 31, 0.8, arrowBody("dark"))}`,
  word: { text: "weekendcart", splitAt: 7, weight: 800, size: 40, tracking: -0.03, baseline: 42, gap: 10, colours: dual([P.ink, P.brass600], ["#fff", P.brass300]) },
};

/* K — A circle split in two by a W */
function splitBody(tone: MarkTone) {
  const top = tone === "light" ? P.brass400 : P.brass300;
  const bottom = tone === "light" ? P.evergreen900 : P.cream;
  const line = tone === "light" ? P.cream : P.evergreen950;
  const clip = gid("split", tone, "clip");
  return `<g clip-path="url(#${clip})"><rect width="64" height="64" fill="${bottom}"/>
<path d="M0 0H64V26H58L45 44L32 30L19 44L6 26H0Z" fill="${top}"/>
<path d="M4 26H6L19 44L32 30L45 44L58 26H60" fill="none" stroke="${line}" stroke-width="3" stroke-linejoin="round"/></g>`;
}
const split: Concept = {
  name: "K — Split circle",
  defs: (tone) => `<clipPath id="${gid("split", tone, "clip")}"><circle cx="32" cy="32" r="26"/></clipPath>`,
  body: splitBody,
  ink: { x0: 6, y0: 6, x1: 58, y1: 58 },
  icon: (o) => `<defs>${split.defs("light")}</defs>${o?.opaque ? `<rect width="64" height="64" fill="${P.cream}"/>` : ""}${place(32, 32, 1.14, splitBody("light"))}`,
  word: { text: "WeekendCart", splitAt: 7, weight: 700, size: 40, tracking: 0.01, baseline: 46, gap: 10, colours: dual([P.evergreen900, P.brass600], ["#fff", P.brass300]) },
};

/* L — Two bags, one behind the other */
function stackBody(tone: MarkTone) {
  const back = tone === "light" ? P.evergreen900 : P.cream;
  const frontHandle = tone === "light" ? P.brass600 : P.brass300;
  const cut = tone === "light" ? P.cream : P.evergreen950;
  return `<path d="M35 16V13a6 6 0 0 1 12 0V16" fill="none" stroke="${back}" stroke-width="3.4" stroke-linecap="round"/>
<path d="M28 16H54L56 50H26Z" fill="${back}"/>
<path d="M17 24V20a7 7 0 0 1 14 0V24" fill="none" stroke="${frontHandle}" stroke-width="3.6" stroke-linecap="round"/>
<path d="M10 24H38L41 58H7Z" fill="url(#${gid("stack", tone)})"/>
<path d="M14 36L18 46L24 39L30 46L34 36" fill="none" stroke="${cut}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const stack: Concept = {
  name: "L — Two bags",
  defs: (tone) => grad(gid("stack", tone), P.brass300, P.amber),
  body: stackBody,
  ink: { x0: 7, y0: 5.2, x1: 56, y1: 58 },
  icon: () => `<defs>${stack.defs("dark")}</defs>${tile()}${place(31.5, 31.6, 0.82, stackBody("dark"))}`,
  word: { text: "WeekendCart", splitAt: 7, weight: 800, size: 40, tracking: -0.02, baseline: 45, gap: 10, colours: dual([P.ink, P.amber], ["#fff", P.brass300]) },
};

/* M — A gift box: the weekend treat */
function giftBody(tone: MarkTone) {
  const lid = tone === "light" ? P.evergreen700 : P.sand;
  return `<path d="M32 22C24 22 18 12 24 10C28 8.5 31 16 32 22Z" fill="${P.brass300}"/>
<path d="M32 22C40 22 46 12 40 10C36 8.5 33 16 32 22Z" fill="${P.brass300}"/>
<path d="M12 30H52V56a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2Z" fill="url(#${gid("gift", tone)})"/>
<path d="M9 22H55V30H9Z" fill="${lid}"/>
<rect x="29" y="22" width="6" height="36" fill="${P.brass400}"/>`;
}
const gift: Concept = {
  name: "M — Gift box",
  defs: (tone) => grad(gid("gift", tone), tone === "light" ? P.evergreen900 : P.cream, tone === "light" ? P.evergreen950 : P.sand, false),
  body: giftBody,
  ink: { x0: 9, y0: 8.5, x1: 55, y1: 58 },
  icon: () => `<defs>${gift.defs("dark")}</defs>${tile()}${place(32, 33.25, 0.82, giftBody("dark"))}`,
  word: { text: "weekendcart", splitAt: 7, weight: 700, size: 40, tracking: -0.02, baseline: 45, gap: 10, colours: dual([P.evergreen900, P.brass600], ["#fff", P.brass300]) },
};

export const DRAFTS: { key: string; concept: Concept; note: string }[] = [
  { key: "D", concept: tag, note: "A tilted price tag with the W printed on it — sale, deals, value." },
  { key: "E", concept: parcel, note: "An isometric parcel, taped, with a delivery smile. Very e-commerce." },
  { key: "F", concept: sun, note: "The bag's handle is a rising sun: the weekend, literally." },
  { key: "G", concept: pin, note: "A location pin carrying a cart — delivered to your door." },
  { key: "H", concept: ribbon, note: "One flowing ribbon forms the W, with a sparkle above it." },
  { key: "I", concept: pixel, note: "A W built from tiles. Digital, geometric, very current." },
  { key: "J", concept: arrow, note: "A cart with a forward arrow in its basket — speed." },
  { key: "K", concept: split, note: "A circle split in two by a W. Bold, badge-like, memorable." },
  { key: "L", concept: stack, note: "Two bags, one behind the other — more to take home." },
  { key: "M", concept: gift, note: "A gift box with a bow — every order a weekend treat." },
];
