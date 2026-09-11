/**
 * TEMPORARY — twenty premium, effect-driven logo directions for /logo: foil,
 * glass, extrusion, emboss, glow, chrome, brushed metal, paper layers. Each
 * uses a technique, typeface and palette none of the earlier directions do.
 * Deleted with the page once a logo is chosen.
 */
import type { ReactNode } from "react";
import {
  Anton,
  Big_Shoulders,
  Bodoni_Moda,
  Cinzel_Decorative,
  Cormorant_Garamond,
  Gloock,
  Great_Vibes,
  Italiana,
  Marcellus,
  Michroma,
  Monoton,
  Orbitron,
  Poiret_One,
  Prata,
  Righteous,
  Rozha_One,
  Special_Elite,
  Syncopate,
  Tenor_Sans,
  Yeseva_One,
} from "next/font/google";
import type { Design } from "./designs";

const bodoni = Bodoni_Moda({ weight: ["500", "700"], subsets: ["latin"], display: "swap" });
const michroma = Michroma({ weight: "400", subsets: ["latin"], display: "swap" });
const anton = Anton({ weight: "400", subsets: ["latin"], display: "swap" });
const tenor = Tenor_Sans({ weight: "400", subsets: ["latin"], display: "swap" });
const prata = Prata({ weight: "400", subsets: ["latin"], display: "swap" });
const monoton = Monoton({ weight: "400", subsets: ["latin"], display: "swap" });
const italiana = Italiana({ weight: "400", subsets: ["latin"], display: "swap" });
const shoulders = Big_Shoulders({ weight: ["800"], subsets: ["latin"], display: "swap" });
const cormorant = Cormorant_Garamond({ weight: ["600"], style: ["italic"], subsets: ["latin"], display: "swap" });
const righteous = Righteous({ weight: "400", subsets: ["latin"], display: "swap" });
const marcellus = Marcellus({ weight: "400", subsets: ["latin"], display: "swap" });
const gloock = Gloock({ weight: "400", subsets: ["latin"], display: "swap" });
const yeseva = Yeseva_One({ weight: "400", subsets: ["latin"], display: "swap" });
const poiret = Poiret_One({ weight: "400", subsets: ["latin"], display: "swap" });
const vibes = Great_Vibes({ weight: "400", subsets: ["latin"], display: "swap" });
const orbitron = Orbitron({ weight: ["900"], subsets: ["latin"], display: "swap" });
const syncopate = Syncopate({ weight: ["700"], subsets: ["latin"], display: "swap" });
const rozha = Rozha_One({ weight: "400", subsets: ["latin"], display: "swap" });
const decorative = Cinzel_Decorative({ weight: ["700"], subsets: ["latin"], display: "swap" });
const elite = Special_Elite({ weight: "400", subsets: ["latin"], display: "swap" });

const ff = (font: { style: { fontFamily: string } }) => font.style.fontFamily;
const t = (dark: boolean) => (dark ? "d" : "l");

/** A mark drawn on a 100-unit square. */
function Mark({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="shrink-0">
      {children}
    </svg>
  );
}

/** Favicon: optional background on the 64 grid, then the 100-grid mark scaled in. */
const icon = (bg: ReactNode, mark: ReactNode, scale = 0.62) => (
  <>
    {bg}
    <g transform={`translate(32 32) scale(${scale}) translate(-50 -50)`}>{mark}</g>
  </>
);

const gradText = (image: string) => ({
  backgroundImage: image,
  WebkitBackgroundClip: "text" as const,
  backgroundClip: "text" as const,
  color: "transparent",
});

const GOLD_STOPS = [
  ["0", "#7a5a17"], [".22", "#f6e27a"], [".45", "#b8892b"], [".7", "#fff1a8"], ["1", "#8a6a1f"],
];
const Gold = ({ id }: { id: string }) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    {GOLD_STOPS.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
  </linearGradient>
);

/* Wax-seal edge: a circle with an irregular, pressed rim. Deterministic. */
const SEAL = (() => {
  const points: string[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = 45 + (i % 2 === 0 ? 2 : -1.4) + Math.sin(i * 1.7) * 1.2;
    points.push(`${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
})();

/* Art-deco sunburst rays. */
const RAYS = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2;
  return `M${(50 + 22 * Math.cos(a)).toFixed(2)} ${(50 + 22 * Math.sin(a)).toFixed(2)}L${(50 + 46 * Math.cos(a)).toFixed(2)} ${(50 + 46 * Math.sin(a)).toFixed(2)}`;
}).join("");

const BAG = "M24 36H76L80 84a4 4 0 0 1-4 4.4H24a4 4 0 0 1-4-4.4Z";
const HANDLE = "M38 36V30a12 12 0 0 1 24 0V36";

/* ------------------------------------------------------------------ */

export const PREMIUM: Design[] = [
  {
    key: "P1",
    name: "Gold foil crest",
    font: "Bodoni Moda",
    note: "A black roundel with a foil-gold W and two gold wheels, double-ringed like a watch dial.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={80}>
          <defs>
            <Gold id={`q1${t(dark)}`} />
            <filter id={`q1s${t(dark)}`}><feDropShadow dx="0" dy="1.4" stdDeviation="1.1" floodColor="#000" floodOpacity=".45" /></filter>
          </defs>
          <circle cx="50" cy="50" r="48" fill="#0d0d0d" />
          <circle cx="50" cy="50" r="44.5" fill="none" stroke={`url(#q1${t(dark)})`} strokeWidth="2.2" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={`url(#q1${t(dark)})`} strokeWidth=".7" opacity=".7" />
          <path d="M19 31H27L37 64L50 42L63 64L73 33" fill="none" stroke={`url(#q1${t(dark)})`} strokeWidth="6.4" strokeLinejoin="miter" filter={`url(#q1s${t(dark)})`} />
          <circle cx="41" cy="75" r="3.6" fill={`url(#q1${t(dark)})`} />
          <circle cx="59" cy="75" r="3.6" fill={`url(#q1${t(dark)})`} />
        </Mark>
        <div className="leading-none" style={{ fontFamily: ff(bodoni) }}>
          <div style={{ fontWeight: 700, fontSize: 30, letterSpacing: "0.16em", color: dark ? "#f3e7c6" : "#0d0d0d" }}>WEEKEND</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-px w-8" style={{ background: "#b8892b" }} />
            <span style={{ fontWeight: 500, fontSize: 13, letterSpacing: "0.55em", ...gradText("linear-gradient(90deg,#b8892b,#fff1a8,#b8892b)") }}>CART</span>
            <span className="h-px w-8" style={{ background: "#b8892b" }} />
          </div>
        </div>
      </div>
    ),
    icon: () => icon(null, <><defs><Gold id="q1i" /></defs><circle cx="50" cy="50" r="48" fill="#0d0d0d" /><circle cx="50" cy="50" r="44" fill="none" stroke="url(#q1i)" strokeWidth="3" /><path d="M19 31H27L37 64L50 42L63 64L73 33" fill="none" stroke="url(#q1i)" strokeWidth="8" /><circle cx="41" cy="76" r="4.6" fill="url(#q1i)" /><circle cx="59" cy="76" r="4.6" fill="url(#q1i)" /></>, 0.64),
  },
  {
    key: "P2",
    name: "Frosted glass bag",
    font: "Michroma",
    note: "A translucent glass bag over glowing violet and teal light, W etched into it.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={82}>
          <defs>
            <filter id={`q2b${t(dark)}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
            <linearGradient id={`q2g${t(dark)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".78" /><stop offset="1" stopColor="#fff" stopOpacity=".22" /></linearGradient>
          </defs>
          <circle cx="38" cy="62" r="20" fill="#8b5cf6" filter={`url(#q2b${t(dark)})`} />
          <circle cx="64" cy="48" r="18" fill="#14b8a6" filter={`url(#q2b${t(dark)})`} />
          <path d={HANDLE} fill="none" stroke={dark ? "#fff" : "#1e1b4b"} strokeWidth="4" strokeLinecap="round" opacity=".85" />
          <path d={BAG} fill={`url(#q2g${t(dark)})`} stroke="#fff" strokeOpacity=".9" strokeWidth="1.4" />
          <path d="M27 42L30 82" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55" />
          <path d="M37 55L43.5 72L50 61L56.5 72L63 55" fill="none" stroke={dark ? "#fff" : "#1e1b4b"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </Mark>
        <div className="leading-none" style={{ fontFamily: ff(michroma), fontSize: 19, letterSpacing: "0.14em" }}>
          <span style={{ color: dark ? "#fff" : "#1e1b4b" }}>WEEKEND</span>
          <span style={gradText("linear-gradient(90deg,#8b5cf6,#14b8a6)")}>CART</span>
        </div>
      </div>
    ),
    icon: () => icon(<rect width="64" height="64" rx="16" fill="#1e1b4b" />, <><defs><filter id="q2bi" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter></defs><circle cx="38" cy="62" r="22" fill="#8b5cf6" filter="url(#q2bi)" /><circle cx="64" cy="46" r="20" fill="#14b8a6" filter="url(#q2bi)" /><path d={HANDLE} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" /><path d={BAG} fill="#fff" fillOpacity=".35" stroke="#fff" strokeWidth="2" /><path d="M37 55L43.5 72L50 61L56.5 72L63 55" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></>, 0.7),
  },
  {
    key: "P3",
    name: "3D extruded W",
    font: "Anton",
    note: "A block W extruded into depth, riding on two solid wheels. Poster-bold.",
    render: (dark) => {
      const W = "M14 22L27 62L40 36L53 62L66 22";
      return (
        <div className="flex items-center gap-4">
          <Mark size={80}>
            <defs><linearGradient id={`q3${t(dark)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#60a5fa" /><stop offset="1" stopColor="#2563eb" /></linearGradient></defs>
            {[6, 5, 4, 3, 2, 1].map((i) => (
              <path key={i} d={W} transform={`translate(${i} ${i})`} fill="none" stroke={i === 6 ? "#0b1f5c" : "#1e3a8a"} strokeWidth="11" strokeLinejoin="miter" />
            ))}
            <path d={W} fill="none" stroke={`url(#q3${t(dark)})`} strokeWidth="11" strokeLinejoin="miter" />
            {[30, 56].map((cx) => (
              <g key={cx}><circle cx={cx + 3} cy="81" r="6.5" fill="#0b1f5c" /><circle cx={cx} cy="78" r="6.5" fill={`url(#q3${t(dark)})`} /></g>
            ))}
          </Mark>
          <div style={{ fontFamily: ff(anton), fontSize: 40, lineHeight: 1, letterSpacing: "0.02em", color: dark ? "#93c5fd" : "#2563eb", textShadow: `1px 1px 0 #1e3a8a, 2px 2px 0 #1e3a8a, 3px 3px 0 #0b1f5c` }}>
            WEEKEND CART
          </div>
        </div>
      );
    },
    icon: () => icon(<rect width="64" height="64" rx="14" fill="#eff6ff" />, <>{[5, 4, 3, 2, 1].map((i) => <path key={i} d="M14 22L27 62L40 36L53 62L66 22" transform={`translate(${i} ${i})`} fill="none" stroke="#1e3a8a" strokeWidth="12" />)}<path d="M14 22L27 62L40 36L53 62L66 22" fill="none" stroke="#3b82f6" strokeWidth="12" /><circle cx="30" cy="80" r="7" fill="#1e3a8a" /><circle cx="56" cy="80" r="7" fill="#1e3a8a" /></>, 0.66),
  },
  {
    key: "P4",
    name: "Heraldic shield",
    font: "Tenor Sans",
    note: "A burgundy shield with a gold rim, a high-contrast serif W and cart wheels. House-of-fashion.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={78}>
          <defs><Gold id={`q4${t(dark)}`} /></defs>
          <path d="M50 5L88 17V47C88 71 70 87 50 95C30 87 12 71 12 47V17Z" fill="#5b0f22" stroke={`url(#q4${t(dark)})`} strokeWidth="3" />
          <path d="M50 11L82 21V47C82 67 67 81 50 88C33 81 18 67 18 47V21Z" fill="none" stroke={`url(#q4${t(dark)})`} strokeWidth=".8" opacity=".7" />
          <path d="M27 30L36 64L50 40L64 64L73 30" fill="none" stroke="#f7ecd6" strokeWidth="2" />
          <path d="M27 30L36 64M50 40L64 64" fill="none" stroke="#f7ecd6" strokeWidth="6" />
          <circle cx="42" cy="74" r="3.2" fill={`url(#q4${t(dark)})`} />
          <circle cx="58" cy="74" r="3.2" fill={`url(#q4${t(dark)})`} />
        </Mark>
        <div className="leading-none" style={{ fontFamily: ff(tenor) }}>
          <div style={{ fontSize: 27, letterSpacing: "0.3em", color: dark ? "#f7ecd6" : "#5b0f22" }}>WEEKEND</div>
          <div className="mt-2" style={{ fontSize: 13, letterSpacing: "0.9em", color: "#b8892b" }}>CART</div>
        </div>
      </div>
    ),
    icon: () => icon(null, <><defs><Gold id="q4i" /></defs><path d="M50 3L90 15V47C90 72 71 89 50 97C29 89 10 72 10 47V15Z" fill="#5b0f22" stroke="url(#q4i)" strokeWidth="4" /><path d="M27 30L36 64L50 40L64 64L73 30" fill="none" stroke="#f7ecd6" strokeWidth="3" /><path d="M27 30L36 64M50 40L64 64" fill="none" stroke="#f7ecd6" strokeWidth="8" /></>, 0.64),
  },
  {
    key: "P5",
    name: "Ribbon-wrapped bag",
    font: "Prata",
    note: "A crimson bag wrapped in a folded pink ribbon that becomes its handle.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={78}>
          <defs><linearGradient id={`q5${t(dark)}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#be123c" /><stop offset="1" stopColor="#881337" /></linearGradient></defs>
          <path d="M37 36C37 16 63 16 63 36" fill="none" stroke="#fda4af" strokeWidth="6" strokeLinecap="round" />
          <path d={BAG} fill={`url(#q5${t(dark)})`} />
          <path d="M20 66L80 44L81 56L21 78Z" fill="#fda4af" />
          <path d="M20 66L21 78L15 70Z" fill="#e11d48" />
          <path d="M80 44L81 56L86 48Z" fill="#e11d48" />
          <path d="M40 49L44 57L48 51L52 57L56 49" fill="none" stroke="#fff1f2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-20 48 53)" />
        </Mark>
        <div className="leading-none" style={{ fontFamily: ff(prata), fontSize: 34, color: dark ? "#ffe4e6" : "#881337" }}>
          Weekend<span style={{ color: "#e11d48" }}>Cart</span>
        </div>
      </div>
    ),
    icon: () => icon(<rect width="64" height="64" rx="14" fill="#fff1f2" />, <><path d="M37 36C37 16 63 16 63 36" fill="none" stroke="#e11d48" strokeWidth="7" strokeLinecap="round" /><path d={BAG} fill="#be123c" /><path d="M20 66L80 44L81 56L21 78Z" fill="#fda4af" /></>, 0.7),
  },
  {
    key: "P6",
    name: "Neon sign",
    font: "Monoton",
    note: "A lit sign after dark: glowing pink Weekend, a cyan neon cart, on a black plate.",
    render: () => (
      <div className="inline-flex items-center gap-3 px-5 py-3" style={{ background: "#07070d", boxShadow: "inset 0 0 0 1px #1f1f2e" }}>
        <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true" className="shrink-0">
          <defs><filter id="q6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
          <g filter="url(#q6)" fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 14H13L19 40H48L54 20H16" /><circle cx="23" cy="50" r="4" /><circle cx="44" cy="50" r="4" />
          </g>
        </svg>
        <span style={{ fontFamily: ff(monoton), fontSize: 30, color: "#ffe0f0", textShadow: "0 0 3px #fff, 0 0 9px #ff2d95, 0 0 20px #ff2d95, 0 0 34px #ff2d95" }}>
          Weekend
        </span>
      </div>
    ),
    icon: () => <><rect width="64" height="64" rx="12" fill="#07070d" /><defs><filter id="q6i" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs><g filter="url(#q6i)" fill="none" stroke="#ff2d95" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" transform="translate(4 2) scale(.9)"><path d="M6 14H13L19 40H48L54 20H16" /><circle cx="23" cy="50" r="4" /><circle cx="44" cy="50" r="4" /></g></>,
  },
  {
    key: "P7",
    name: "Art-deco sunburst",
    font: "Italiana",
    note: "A black bag in a gold rim against a radiating sunburst — 1920s glamour.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={80}>
          <defs><Gold id={`q7${t(dark)}`} /></defs>
          <circle cx="50" cy="50" r="48" fill="#0b0b0b" />
          <path d={RAYS} stroke={`url(#q7${t(dark)})`} strokeWidth="1.2" opacity=".75" />
          <path d="M40 38V33a10 10 0 0 1 20 0V38" fill="none" stroke={`url(#q7${t(dark)})`} strokeWidth="3" />
          <path d="M31 38H69L72 72H28Z" fill="#0b0b0b" stroke={`url(#q7${t(dark)})`} strokeWidth="2.4" />
          <path d="M40 50L44 62L50 54L56 62L60 50" fill="none" stroke={`url(#q7${t(dark)})`} strokeWidth="2" />
        </Mark>
        <div className="leading-none" style={{ fontFamily: ff(italiana), color: dark ? "#f3e7c6" : "#0b0b0b" }}>
          <div style={{ fontSize: 30, letterSpacing: "0.22em" }}>WEEKEND</div>
          <div className="mt-1.5" style={{ fontSize: 30, letterSpacing: "0.22em", ...gradText("linear-gradient(90deg,#8a6a1f,#f6e27a,#b8892b)") }}>CART</div>
        </div>
      </div>
    ),
    icon: () => icon(null, <><defs><Gold id="q7i" /></defs><circle cx="50" cy="50" r="48" fill="#0b0b0b" /><path d={RAYS} stroke="url(#q7i)" strokeWidth="2" /><path d="M31 38H69L72 72H28Z" fill="#0b0b0b" stroke="url(#q7i)" strokeWidth="3.4" /><path d="M40 38V33a10 10 0 0 1 20 0V38" fill="none" stroke="url(#q7i)" strokeWidth="4" /></>, 0.64),
  },
  {
    key: "P8",
    name: "Hex crate",
    font: "Big Shoulders",
    note: "An isometric crate inside a hexagon, forest and copper. Warehouse-strong.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={78}>
          <path d="M50 4L90 27V73L50 96L10 73V27Z" fill="#14532d" />
          <path d="M50 4L90 27V73L50 96L10 73V27Z" fill="none" stroke="#b45309" strokeWidth="3" />
          <path d="M50 26L72 38L50 50L28 38Z" fill="#d97706" />
          <path d="M28 38L50 50V74L28 62Z" fill="#b45309" />
          <path d="M50 50L72 38V62L50 74Z" fill="#92400e" />
          <path d="M39 32L61 44V68" fill="none" stroke="#fef3c7" strokeWidth="2.6" />
        </Mark>
        <div className="leading-[0.88]" style={{ fontFamily: ff(shoulders), fontWeight: 800, fontSize: 36, letterSpacing: "0.02em" }}>
          <div style={{ color: dark ? "#fff" : "#14532d" }}>WEEKEND</div>
          <div style={{ color: "#b45309" }}>CART</div>
        </div>
      </div>
    ),
    icon: () => icon(null, <><path d="M50 2L92 26V74L50 98L8 74V26Z" fill="#14532d" /><path d="M50 26L72 38L50 50L28 38Z" fill="#d97706" /><path d="M28 38L50 50V74L28 62Z" fill="#b45309" /><path d="M50 50L72 38V62L50 74Z" fill="#92400e" /></>, 0.64),
  },
  {
    key: "P9",
    name: "Wax seal",
    font: "Cormorant Garamond Italic",
    note: "A pressed red wax seal with an embossed W and wheels, like a sealed letter.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={80}>
          <defs>
            <radialGradient id={`q9${t(dark)}`} cx=".38" cy=".32" r=".8"><stop offset="0" stopColor="#e0483a" /><stop offset=".6" stopColor="#a41d1d" /><stop offset="1" stopColor="#6b0f0f" /></radialGradient>
            <filter id={`q9s${t(dark)}`}><feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#000" floodOpacity=".35" /></filter>
          </defs>
          <path d={SEAL} fill={`url(#q9${t(dark)})`} filter={`url(#q9s${t(dark)})`} />
          <circle cx="50" cy="50" r="31" fill="none" stroke="#6b0f0f" strokeWidth="2" opacity=".6" />
          <circle cx="50" cy="51" r="31" fill="none" stroke="#f08a7e" strokeWidth="1" opacity=".5" />
          <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5">
            <path d="M31 38L39.5 62L50 45L60.5 62L69 38" stroke="#f08a7e" opacity=".55" transform="translate(-.8 -.8)" />
            <path d="M31 38L39.5 62L50 45L60.5 62L69 38" stroke="#5c0c0c" />
          </g>
          <circle cx="43" cy="70" r="3" fill="#5c0c0c" /><circle cx="57" cy="70" r="3" fill="#5c0c0c" />
        </Mark>
        <div style={{ fontFamily: ff(cormorant), fontStyle: "italic", fontWeight: 600, fontSize: 38, lineHeight: 1, color: dark ? "#fecaca" : "#7f1d1d" }}>
          Weekend Cart
        </div>
      </div>
    ),
    icon: () => icon(null, <><defs><radialGradient id="q9i" cx=".38" cy=".32" r=".8"><stop offset="0" stopColor="#e0483a" /><stop offset="1" stopColor="#7f1111" /></radialGradient></defs><path d={SEAL} fill="url(#q9i)" /><path d="M31 38L39.5 62L50 45L60.5 62L69 38" fill="none" stroke="#5c0c0c" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" /></>, 0.66),
  },
  {
    key: "P10",
    name: "Glossy orb",
    font: "Righteous",
    note: "A sunset-gradient sphere with a glass highlight and a white cart swooping across it.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={76}>
          <defs>
            <radialGradient id={`q10${t(dark)}`} cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#fbbf24" /><stop offset=".45" stopColor="#f43f5e" /><stop offset="1" stopColor="#7e22ce" /></radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill={`url(#q10${t(dark)})`} />
          <ellipse cx="40" cy="26" rx="22" ry="10" fill="#fff" opacity=".35" />
          <path d="M20 36H28L35 60H68L75 42H31" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="40" cy="71" r="4.6" fill="#fff" /><circle cx="63" cy="71" r="4.6" fill="#fff" />
        </Mark>
        <div style={{ fontFamily: ff(righteous), fontSize: 36, lineHeight: 1 }}>
          <span style={{ color: dark ? "#fff" : "#1f1147" }}>weekend</span>
          <span style={gradText("linear-gradient(90deg,#f43f5e,#7e22ce)")}>cart</span>
        </div>
      </div>
    ),
    icon: () => icon(null, <><defs><radialGradient id="q10i" cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#fbbf24" /><stop offset=".45" stopColor="#f43f5e" /><stop offset="1" stopColor="#7e22ce" /></radialGradient></defs><circle cx="50" cy="50" r="48" fill="url(#q10i)" /><ellipse cx="40" cy="26" rx="22" ry="10" fill="#fff" opacity=".35" /><path d="M20 36H28L35 60H68L75 42H31" fill="none" stroke="#fff" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="40" cy="72" r="5.4" fill="#fff" /><circle cx="63" cy="72" r="5.4" fill="#fff" /></>, 0.64),
  },
  {
    key: "P11",
    name: "Interlocked WC",
    font: "Marcellus",
    note: "A C and a W overlapped in transparent ink — the C becomes the cart's basket.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={78}>
          <g style={{ mixBlendMode: dark ? "screen" : "multiply" }}>
            <path d="M74 30A28 28 0 1 0 74 70" fill="none" stroke="#0d9488" strokeWidth="11" strokeLinecap="round" opacity=".9" />
            <path d="M24 34L34 66L46 46L58 66L68 34" fill="none" stroke={dark ? "#60a5fa" : "#1e3a8a"} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
          </g>
          <circle cx="40" cy="84" r="4" fill={dark ? "#fff" : "#1e3a8a"} /><circle cx="60" cy="84" r="4" fill={dark ? "#fff" : "#1e3a8a"} />
        </Mark>
        <div style={{ fontFamily: ff(marcellus), fontSize: 32, lineHeight: 1, letterSpacing: "0.04em", color: dark ? "#e0f2fe" : "#1e3a8a" }}>
          Weekend <span style={{ color: "#0d9488" }}>Cart</span>
        </div>
      </div>
    ),
    icon: () => icon(<rect width="64" height="64" rx="14" fill="#f0fdfa" />, <g style={{ mixBlendMode: "multiply" }}><path d="M74 30A28 28 0 1 0 74 70" fill="none" stroke="#0d9488" strokeWidth="12" strokeLinecap="round" /><path d="M24 34L34 66L46 46L58 66L68 34" fill="none" stroke="#1e3a8a" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" /></g>, 0.66),
  },
  {
    key: "P12",
    name: "Brushed-metal tag",
    font: "Gloock",
    note: "A brushed-steel tag with a grommet and an engraved WC, hung on a cord.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={80}>
          <defs>
            <linearGradient id={`q12${t(dark)}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3f4f6" /><stop offset=".35" stopColor="#9ca3af" /><stop offset=".55" stopColor="#e5e7eb" /><stop offset=".8" stopColor="#6b7280" /><stop offset="1" stopColor="#d1d5db" /></linearGradient>
            <pattern id={`q12p${t(dark)}`} width="100" height="1.4" patternUnits="userSpaceOnUse"><rect width="100" height=".6" fill="#fff" opacity=".35" /></pattern>
          </defs>
          <path d="M8 10C14 16 20 20 30 22" fill="none" stroke={dark ? "#d1d5db" : "#374151"} strokeWidth="1.6" />
          <g transform="rotate(12 55 55)">
            <path d="M26 26H80a6 6 0 0 1 6 6V82a6 6 0 0 1-6 6H26L14 57Z" fill={`url(#q12${t(dark)})`} />
            <path d="M26 26H80a6 6 0 0 1 6 6V82a6 6 0 0 1-6 6H26L14 57Z" fill={`url(#q12p${t(dark)})`} />
            <circle cx="28" cy="57" r="5" fill={dark ? "#0b1611" : "#f7f5f1"} stroke="#4b5563" strokeWidth="2.4" />
            <text x="58" y="67" textAnchor="middle" fontFamily={ff(gloock)} fontSize="26" fill="#fff" opacity=".7" transform="translate(0 1)">WC</text>
            <text x="58" y="67" textAnchor="middle" fontFamily={ff(gloock)} fontSize="26" fill="#374151">WC</text>
          </g>
        </Mark>
        <div style={{ fontFamily: ff(gloock), fontSize: 34, lineHeight: 1, color: dark ? "#e5e7eb" : "#1f2937" }}>WeekendCart</div>
      </div>
    ),
    icon: () => icon(<rect width="64" height="64" rx="14" fill="#374151" />, <><defs><linearGradient id="q12i" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3f4f6" /><stop offset=".5" stopColor="#9ca3af" /><stop offset="1" stopColor="#e5e7eb" /></linearGradient></defs><path d="M26 22H82a6 6 0 0 1 6 6V78a6 6 0 0 1-6 6H26L12 53Z" fill="url(#q12i)" /><text x="58" y="64" textAnchor="middle" fontFamily={ff(gloock)} fontSize="28" fill="#1f2937">WC</text></>, 0.68),
  },
  {
    key: "P13",
    name: "Paper cut layers",
    font: "Yeseva One",
    note: "Three paper bags cut and stacked with real shadows between them, peach to rust.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={78}>
          <defs><filter id={`q13${t(dark)}`}><feDropShadow dx="0" dy="2.4" stdDeviation="2" floodColor="#7c2d12" floodOpacity=".35" /></filter></defs>
          <g filter={`url(#q13${t(dark)})`}>
            <path d="M16 30H84L88 90H12Z" fill="#fed7aa" />
            <path d="M40 30V24a10 10 0 0 1 20 0V30" fill="none" stroke="#fed7aa" strokeWidth="5" />
          </g>
          <path d="M24 42H76L79 84H21Z" fill="#fb923c" filter={`url(#q13${t(dark)})`} />
          <path d="M32 54H68L70 78H30Z" fill="#c2410c" filter={`url(#q13${t(dark)})`} />
          <path d="M40 60L44 71L50 64L56 71L60 60" fill="none" stroke="#fff7ed" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </Mark>
        <div style={{ fontFamily: ff(yeseva), fontSize: 34, lineHeight: 1, color: dark ? "#fed7aa" : "#7c2d12" }}>Weekend Cart</div>
      </div>
    ),
    icon: () => icon(<rect width="64" height="64" rx="14" fill="#fff7ed" />, <><path d="M16 30H84L88 90H12Z" fill="#fdba74" /><path d="M24 42H76L79 84H21Z" fill="#fb923c" /><path d="M32 54H68L70 78H30Z" fill="#c2410c" /><path d="M40 30V24a10 10 0 0 1 20 0V30" fill="none" stroke="#c2410c" strokeWidth="6" /></>, 0.66),
  },
  {
    key: "P14",
    name: "Constellation",
    font: "Poiret One",
    note: "A cart traced in stars across a night-blue disc, with one bright star above.",
    render: (dark) => {
      const pts: [number, number][] = [[18, 32], [27, 32], [35, 62], [70, 62], [78, 40], [31, 40]];
      return (
        <div className="flex items-center gap-4">
          <Mark size={78}>
            <circle cx="50" cy="50" r="48" fill="#0b1437" />
            <path d={`M${pts.map((p) => p.join(" ")).join("L")}`} fill="none" stroke="#e7c873" strokeWidth=".9" opacity=".8" />
            {pts.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.1" fill="#fde68a" />)}
            <circle cx="40" cy="74" r="3" fill="#fde68a" /><circle cx="64" cy="74" r="3" fill="#fde68a" />
            <path d="M60 14L62 20L68 22L62 24L60 30L58 24L52 22L58 20Z" fill="#fff" />
          </Mark>
          <div className="leading-none" style={{ fontFamily: ff(poiret), fontSize: 30, letterSpacing: "0.18em", color: dark ? "#fde68a" : "#0b1437" }}>
            WEEKEND<br /><span style={{ color: "#c9a227" }}>CART</span>
          </div>
        </div>
      );
    },
    icon: () => icon(null, <><circle cx="50" cy="50" r="48" fill="#0b1437" /><path d="M18 32L27 32L35 62L70 62L78 40L31 40" fill="none" stroke="#fde68a" strokeWidth="3" /><circle cx="40" cy="74" r="4.4" fill="#fde68a" /><circle cx="64" cy="74" r="4.4" fill="#fde68a" /></>, 0.64),
  },
  {
    key: "P15",
    name: "Postmark",
    font: "Special Elite",
    note: "A rubber-stamp postmark: circular lettering, a bag at the centre, cancellation waves.",
    render: (dark) => {
      const ink = dark ? "#93c5fd" : "#1e3a8a";
      return (
        <svg viewBox="0 0 200 100" width="210" height="105" aria-hidden="true">
          <defs><path id={`q15${t(dark)}`} d="M50 50m-36 0a36 36 0 1 1 72 0a36 36 0 1 1-72 0" /></defs>
          <circle cx="50" cy="50" r="46" fill="none" stroke={ink} strokeWidth="2.4" />
          <circle cx="50" cy="50" r="28" fill="none" stroke={ink} strokeWidth="1.2" />
          <text fontFamily={ff(elite)} fontSize="9.4" letterSpacing="2" fill={ink}>
            <textPath href={`#q15${t(dark)}`}>WEEKEND CART • ONLINE STORE • INDIA •</textPath>
          </text>
          <g transform="translate(50 50) scale(.32) translate(-50 -58)">
            <path d={HANDLE} fill="none" stroke={ink} strokeWidth="6" />
            <path d={BAG} fill={ink} />
          </g>
          {[36, 46, 56, 66].map((y) => (
            <path key={y} d={`M104 ${y}q10-6 20 0t20 0t20 0t20 0t20 0`} fill="none" stroke={ink} strokeWidth="2.2" />
          ))}
        </svg>
      );
    },
    icon: () => icon(null, <><circle cx="50" cy="50" r="46" fill="#eff6ff" stroke="#1e3a8a" strokeWidth="5" /><circle cx="50" cy="50" r="32" fill="none" stroke="#1e3a8a" strokeWidth="2" /><g transform="translate(50 50) scale(.46) translate(-50 -58)"><path d={HANDLE} fill="none" stroke="#1e3a8a" strokeWidth="6" /><path d={BAG} fill="#1e3a8a" /></g></>, 0.64),
  },
  {
    key: "P16",
    name: "Heart handle",
    font: "Great Vibes",
    note: "A blush bag whose handle is a rose heart — love the weekend haul.",
    render: (dark) => (
      <div className="flex items-center gap-3">
        <Mark size={72}>
          <path d="M50 38C50 26 34 22 34 32C34 38 50 44 50 44C50 44 66 38 66 32C66 22 50 26 50 38Z" fill="none" stroke="#e11d48" strokeWidth="3.6" strokeLinejoin="round" />
          <path d="M22 40H78L82 86H18Z" fill="#fda4af" style={{ mixBlendMode: dark ? "normal" : "multiply" }} />
          <path d="M22 40H78L80 60H20Z" fill="#fb7185" opacity=".5" />
        </Mark>
        <div style={{ fontFamily: ff(vibes), fontSize: 48, lineHeight: 1, color: dark ? "#fecdd3" : "#be123c" }}>Weekend Cart</div>
      </div>
    ),
    icon: () => icon(<rect width="64" height="64" rx="14" fill="#fff1f2" />, <><path d="M50 38C50 26 34 22 34 32C34 38 50 44 50 44C50 44 66 38 66 32C66 22 50 26 50 38Z" fill="none" stroke="#e11d48" strokeWidth="5" strokeLinejoin="round" /><path d="M22 40H78L82 86H18Z" fill="#fb7185" /></>, 0.7),
  },
  {
    key: "P17",
    name: "Chrome speed",
    font: "Orbitron",
    note: "A chrome trolley with motion streaks and a leaning chrome wordmark. Automotive.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={80}>
          <defs>
            <linearGradient id={`q17${t(dark)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f9fafb" /><stop offset=".45" stopColor="#6b7280" /><stop offset=".55" stopColor="#1f2937" /><stop offset=".75" stopColor="#d1d5db" /><stop offset="1" stopColor="#4b5563" /></linearGradient>
            <linearGradient id={`q17s${t(dark)}`} x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#9ca3af" /><stop offset="1" stopColor="#9ca3af" stopOpacity="0" /></linearGradient>
          </defs>
          {[40, 50, 60].map((y, i) => <path key={y} d={`M2 ${y}H${26 - i * 4}`} stroke={`url(#q17s${t(dark)})`} strokeWidth="3" strokeLinecap="round" />)}
          <path d="M22 26H32L40 62H78L86 38H36" fill="none" stroke={`url(#q17${t(dark)})`} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="46" cy="75" r="6" fill={`url(#q17${t(dark)})`} /><circle cx="72" cy="75" r="6" fill={`url(#q17${t(dark)})`} />
        </Mark>
        <div style={{ fontFamily: ff(orbitron), fontWeight: 900, fontSize: 25, letterSpacing: "0.06em", transform: "skewX(-10deg)", ...gradText(dark ? "linear-gradient(180deg,#fff,#9ca3af 50%,#4b5563 52%,#e5e7eb)" : "linear-gradient(180deg,#9ca3af,#111827 50%,#374151 52%,#9ca3af)") }}>
          WEEKENDCART
        </div>
      </div>
    ),
    icon: () => icon(<rect width="64" height="64" rx="14" fill="#111827" />, <><defs><linearGradient id="q17i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f9fafb" /><stop offset=".5" stopColor="#9ca3af" /><stop offset="1" stopColor="#f3f4f6" /></linearGradient></defs><path d="M22 26H32L40 62H78L86 38H36" fill="none" stroke="url(#q17i)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="46" cy="76" r="7" fill="url(#q17i)" /><circle cx="72" cy="76" r="7" fill="url(#q17i)" /></>, 0.66),
  },
  {
    key: "P18",
    name: "Bauhaus",
    font: "Syncopate",
    note: "Pure primaries: a red half-circle handle, a blue square bag, two yellow triangles for the W.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={74}>
          <path d="M30 34A20 20 0 0 1 70 34Z" fill="#e63946" />
          <rect x="20" y="34" width="60" height="56" fill="#1d4ed8" />
          <path d="M28 44H50L39 76Z" fill="#facc15" />
          <path d="M50 44H72L61 76Z" fill="#facc15" />
        </Mark>
        <div className="leading-none" style={{ fontFamily: ff(syncopate), fontWeight: 700, fontSize: 21, letterSpacing: "0.12em", color: dark ? "#fff" : "#111" }}>
          WEEKEND<br /><span style={{ color: "#e63946" }}>CART</span>
        </div>
      </div>
    ),
    icon: () => icon(null, <><path d="M30 30A20 20 0 0 1 70 30Z" fill="#e63946" /><rect x="16" y="30" width="68" height="62" fill="#1d4ed8" /><path d="M24 40H50L37 78Z" fill="#facc15" /><path d="M50 40H76L63 78Z" fill="#facc15" /></>, 0.7),
  },
  {
    key: "P19",
    name: "Lotus bag",
    font: "Rozha One",
    note: "A gold lotus opening from a maroon bag — Indian luxury, a weekend in bloom.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={78}>
          <defs><Gold id={`q19${t(dark)}`} /></defs>
          {[-58, -30, 0, 30, 58].map((a) => (
            <ellipse key={a} cx="50" cy="38" rx="7.5" ry="20" fill={`url(#q19${t(dark)})`} stroke="#7a5a17" strokeWidth=".6" transform={`rotate(${a} 50 56)`} />
          ))}
          <path d="M18 56H82L76 88a4 4 0 0 1-4 3.4H28a4 4 0 0 1-4-3.4Z" fill="#6d1a36" />
          <path d="M18 56H82" stroke={`url(#q19${t(dark)})`} strokeWidth="3" />
        </Mark>
        <div style={{ fontFamily: ff(rozha), fontSize: 36, lineHeight: 1, color: dark ? "#f6e27a" : "#6d1a36" }}>
          Weekend<span style={gradText("linear-gradient(90deg,#8a6a1f,#e7c873,#b8892b)")}>Cart</span>
        </div>
      </div>
    ),
    icon: () => icon(<rect width="64" height="64" rx="14" fill="#6d1a36" />, <><defs><Gold id="q19i" /></defs>{[-58, -30, 0, 30, 58].map((a) => <ellipse key={a} cx="50" cy="38" rx="8" ry="21" fill="url(#q19i)" transform={`rotate(${a} 50 56)`} />)}<path d="M18 56H82L76 88H24Z" fill="#4a0f24" /></>, 0.72),
  },
  {
    key: "P20",
    name: "Keyhole vault",
    font: "Cinzel Decorative",
    note: "An emerald bag with a gold keyhole and rim — shopping, safely locked.",
    render: (dark) => (
      <div className="flex items-center gap-4">
        <Mark size={76}>
          <defs>
            <Gold id={`q20${t(dark)}`} />
            <linearGradient id={`q20e${t(dark)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#047857" /><stop offset="1" stopColor="#022c22" /></linearGradient>
          </defs>
          <path d={HANDLE} fill="none" stroke={`url(#q20${t(dark)})`} strokeWidth="4.4" strokeLinecap="round" />
          <path d={BAG} fill={`url(#q20e${t(dark)})`} stroke={`url(#q20${t(dark)})`} strokeWidth="2.6" />
          <circle cx="50" cy="56" r="7" fill={`url(#q20${t(dark)})`} />
          <path d="M46 60H54L57 76H43Z" fill={`url(#q20${t(dark)})`} />
        </Mark>
        <div className="leading-none" style={{ fontFamily: ff(decorative), fontWeight: 700, fontSize: 26, letterSpacing: "0.06em", color: dark ? "#fef3c7" : "#064e3b" }}>
          Weekend<br /><span style={gradText("linear-gradient(90deg,#8a6a1f,#f6e27a,#b8892b)")}>Cart</span>
        </div>
      </div>
    ),
    icon: () => icon(null, <><defs><Gold id="q20i" /></defs><path d={HANDLE} fill="none" stroke="url(#q20i)" strokeWidth="6" strokeLinecap="round" /><path d={BAG} fill="#065f46" stroke="url(#q20i)" strokeWidth="3.4" /><circle cx="50" cy="56" r="8" fill="url(#q20i)" /><path d="M45.5 60H54.5L58 78H42Z" fill="url(#q20i)" /></>, 0.72),
  },
];
