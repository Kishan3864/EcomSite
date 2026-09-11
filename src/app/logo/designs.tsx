/**
 * TEMPORARY — twenty further logo directions for /logo, each with its own
 * typeface, colours and layout. Deleted with the page once a logo is chosen.
 */
import type { CSSProperties, ReactNode } from "react";
import {
  Archivo_Black,
  Baloo_2,
  Bebas_Neue,
  Bungee,
  Cinzel,
  Fredoka,
  Josefin_Sans,
  Kaushan_Script,
  Lexend,
  Lobster,
  Montserrat,
  Oleo_Script,
  Outfit,
  Pacifico,
  Playfair_Display,
  Poppins,
  Sora,
  Space_Grotesk,
  Syne,
  Unbounded,
} from "next/font/google";

const poppins = Poppins({ weight: ["500", "800"], subsets: ["latin"], display: "swap" });
const pacifico = Pacifico({ weight: "400", subsets: ["latin"], display: "swap" });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], display: "swap" });
const fredoka = Fredoka({ weight: ["700"], subsets: ["latin"], display: "swap" });
const montserrat = Montserrat({ weight: ["900"], style: ["italic"], subsets: ["latin"], display: "swap" });
const archivo = Archivo_Black({ weight: "400", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ weight: ["700"], style: ["italic"], subsets: ["latin"], display: "swap" });
const cinzel = Cinzel({ weight: ["600"], subsets: ["latin"], display: "swap" });
const unbounded = Unbounded({ weight: ["700"], subsets: ["latin"], display: "swap" });
const josefin = Josefin_Sans({ weight: ["300"], subsets: ["latin"], display: "swap" });
const syne = Syne({ weight: ["500", "800"], subsets: ["latin"], display: "swap" });
const bungee = Bungee({ weight: "400", subsets: ["latin"], display: "swap" });
const baloo = Baloo_2({ weight: ["800"], subsets: ["latin"], display: "swap" });
const outfit = Outfit({ weight: ["400", "800"], subsets: ["latin"], display: "swap" });
const lobster = Lobster({ weight: "400", subsets: ["latin"], display: "swap" });
const sora = Sora({ weight: ["300", "700"], subsets: ["latin"], display: "swap" });
const grotesk = Space_Grotesk({ weight: ["700"], subsets: ["latin"], display: "swap" });
const kaushan = Kaushan_Script({ weight: "400", subsets: ["latin"], display: "swap" });
const oleo = Oleo_Script({ weight: ["700"], subsets: ["latin"], display: "swap" });
const lexend = Lexend({ weight: ["300", "700"], subsets: ["latin"], display: "swap" });

const ff = (font: { style: { fontFamily: string } }) => font.style.fontFamily;

export interface Design {
  key: string;
  name: string;
  font: string;
  note: string;
  render: (dark: boolean) => ReactNode;
  /** Favicon artwork on a 64-unit square. */
  icon: () => ReactNode;
}

/* ------------------------------------------------ shared artwork */

const CART = "M6 14H13L19 40H48L54 20H16";
const WCART = "M3 10H10L21 43L30.5 27L40 43L51 13";
const BAG = "M14 22H50L53 57H11Z";
const HANDLE = "M24 22V17a8 8 0 0 1 16 0V22";

function CartArt({ stroke, wheels, sw = 4.8 }: { stroke: string; wheels: string; sw?: number }) {
  return (
    <>
      <path d={CART} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="50" r="4.4" fill={wheels} />
      <circle cx="44" cy="50" r="4.4" fill={wheels} />
    </>
  );
}

function Svg({ size, children, style }: { size: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="shrink-0" style={style}>
      {children}
    </svg>
  );
}

const Tile = ({ fill, rx = 14 }: { fill: string; rx?: number }) => <rect width="64" height="64" rx={rx} fill={fill} />;
const inset = (scale: number, children: ReactNode, cx = 30, cy = 32) => (
  <g transform={`translate(32 32) scale(${scale}) translate(${-cx} ${-cy})`}>{children}</g>
);

/* ------------------------------------------------ the twenty */

export const DESIGNS: Design[] = [
  {
    key: "1",
    name: "W-Cart stack",
    font: "Poppins",
    note: "The W is the cart. \"eekend\" runs on from it, CART sits spaced beneath.",
    render: (dark) => (
      <div className="flex items-center" style={{ fontFamily: ff(poppins) }}>
        <Svg size={70}>
          <path d={WCART} fill="none" stroke="#ff6b4a" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="22" cy="54" r="4.6" fill={dark ? "#fff" : "#1b2a4a"} />
          <circle cx="39" cy="54" r="4.6" fill={dark ? "#fff" : "#1b2a4a"} />
        </Svg>
        <div className="-ml-2 leading-none">
          <div style={{ fontWeight: 800, fontSize: 36, color: dark ? "#fff" : "#1b2a4a", letterSpacing: "-0.03em" }}>eekend</div>
          <div style={{ fontWeight: 500, fontSize: 14, color: "#ff6b4a", letterSpacing: "0.52em", marginTop: 6 }}>CART</div>
        </div>
      </div>
    ),
    icon: () => (
      <>
        <Tile fill="#1b2a4a" />
        {inset(0.72, <><path d={WCART} fill="none" stroke="#ff6b4a" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="22" cy="54" r="4.6" fill="#fff" /><circle cx="39" cy="54" r="4.6" fill="#fff" /></>, 27, 32)}
      </>
    ),
  },
  {
    key: "2",
    name: "Script weekend",
    font: "Pacifico + Poppins",
    note: "Handwritten, friendly Weekend with a little cart; CART framed by rules.",
    render: (dark) => (
      <div className="leading-none">
        <div className="flex items-end gap-2">
          <span style={{ fontFamily: ff(pacifico), fontSize: 40, color: "#d6246e" }}>Weekend</span>
          <Svg size={34}><CartArt stroke={dark ? "#fff" : "#1f1f1f"} wheels="#d6246e" /></Svg>
        </div>
        <div className="mt-2 flex items-center gap-2" style={{ fontFamily: ff(poppins), fontWeight: 500, fontSize: 12, letterSpacing: "0.6em", color: dark ? "#fff" : "#1f1f1f" }}>
          <span className="h-px w-10" style={{ background: "#d6246e" }} />CART<span className="h-px w-10" style={{ background: "#d6246e" }} />
        </div>
      </div>
    ),
    icon: () => (
      <>
        <Tile fill="#d6246e" />
        <text x="33" y="45" textAnchor="middle" fontFamily={ff(pacifico)} fontSize="40" fill="#fff">W</text>
      </>
    ),
  },
  {
    key: "3",
    name: "Bold bag",
    font: "Bebas Neue + Pacifico",
    note: "A black bag with a gold W; poster-tall WEEKEND over a script cart.",
    render: (dark) => (
      <div className="flex items-center gap-3">
        <Svg size={64}>
          <path d={HANDLE} fill="none" stroke="#c9a227" strokeWidth="4.4" strokeLinecap="round" />
          <path d={BAG} fill={dark ? "#fff" : "#111"} />
          <path d="M20 32L26 47L32 37L38 47L44 32" fill="none" stroke="#c9a227" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <div className="leading-none">
          <div style={{ fontFamily: ff(bebas), fontSize: 46, letterSpacing: "0.06em", color: dark ? "#fff" : "#111" }}>WEEKEND</div>
          <div className="-mt-1" style={{ fontFamily: ff(pacifico), fontSize: 24, color: "#c9a227" }}>cart</div>
        </div>
      </div>
    ),
    icon: () => (
      <>
        <Tile fill="#c9a227" />
        {inset(0.8, <><path d={HANDLE} fill="none" stroke="#111" strokeWidth="4.4" strokeLinecap="round" /><path d={BAG} fill="#111" /><path d="M20 32L26 47L32 37L38 47L44 32" fill="none" stroke="#c9a227" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" /></>, 32, 35)}
      </>
    ),
  },
  {
    key: "4",
    name: "Cart for the C",
    font: "Fredoka",
    note: "A trolley stands in for the c: weekend[c]art. Round, playful, purple and teal.",
    render: (dark) => (
      <div className="flex items-end leading-none" style={{ fontFamily: ff(fredoka), fontWeight: 700, fontSize: 40, color: dark ? "#c4b5fd" : "#6a3df0" }}>
        weekend
        <Svg size={40} style={{ margin: "0 1px 2px 3px" }}><CartArt stroke="#14b8a6" wheels="#14b8a6" sw={6} /></Svg>
        <span style={{ color: "#14b8a6" }}>art</span>
      </div>
    ),
    icon: () => (
      <>
        <Tile fill="#6a3df0" />
        {inset(0.8, <CartArt stroke="#fff" wheels="#5eead4" sw={6} />)}
      </>
    ),
  },
  {
    key: "5",
    name: "Italic swoosh",
    font: "Montserrat Black Italic",
    note: "Fast, sporty italic caps with a yellow swoosh that ends in a cart.",
    render: (dark) => (
      <div className="leading-none" style={{ fontFamily: ff(montserrat), fontWeight: 900, fontStyle: "italic" }}>
        <div style={{ fontSize: 34, color: dark ? "#fff" : "#1e4ed8", letterSpacing: "-0.02em" }}>
          WEEKEND<span style={{ color: "#ffc93c" }}>CART</span>
        </div>
        <svg viewBox="0 0 260 24" width="260" height="24" aria-hidden="true" className="mt-1">
          <path d="M4 16C80 22 150 20 214 8" fill="none" stroke="#ffc93c" strokeWidth="5" strokeLinecap="round" />
          <g transform="translate(214 -6) scale(0.42)"><CartArt stroke={dark ? "#fff" : "#1e4ed8"} wheels="#ffc93c" sw={7} /></g>
        </svg>
      </div>
    ),
    icon: () => (
      <>
        <Tile fill="#1e4ed8" />
        {inset(0.8, <CartArt stroke="#ffc93c" wheels="#fff" sw={6} />)}
      </>
    ),
  },
  {
    key: "6",
    name: "Lime block",
    font: "Archivo Black",
    note: "A solid lime block: WEEK / END / CART stacked tight, cart in the corner.",
    render: () => (
      <div className="relative inline-block px-3 py-2" style={{ background: "#b6f23a", fontFamily: ff(archivo), color: "#0b0b0b", lineHeight: 0.86 }}>
        <div style={{ fontSize: 26 }}>WEEK</div>
        <div style={{ fontSize: 26 }}>END</div>
        <div style={{ fontSize: 26 }}>CART</div>
        <Svg size={30} style={{ position: "absolute", right: 6, bottom: 6 }}><CartArt stroke="#0b0b0b" wheels="#0b0b0b" sw={6} /></Svg>
      </div>
    ),
    icon: () => (
      <>
        <Tile fill="#b6f23a" rx={10} />
        {inset(0.82, <CartArt stroke="#0b0b0b" wheels="#0b0b0b" sw={6} />)}
      </>
    ),
  },
  {
    key: "7",
    name: "Serif luxe",
    font: "Playfair Display Italic + Cinzel",
    note: "A fine-line bag, an italic serif Weekend, and CART in spaced Roman capitals.",
    render: (dark) => (
      <div className="flex items-center gap-3">
        <Svg size={56}>
          <path d={HANDLE} fill="none" stroke="#c8a96a" strokeWidth="2.4" strokeLinecap="round" />
          <path d={BAG} fill="none" stroke="#c8a96a" strokeWidth="2.4" strokeLinejoin="round" />
        </Svg>
        <div className="leading-none">
          <div style={{ fontFamily: ff(playfair), fontStyle: "italic", fontWeight: 700, fontSize: 38, color: dark ? "#f5efe3" : "#111" }}>Weekend</div>
          <div className="mt-1" style={{ fontFamily: ff(cinzel), fontWeight: 600, fontSize: 13, letterSpacing: "0.62em", color: "#c8a96a" }}>CART</div>
        </div>
      </div>
    ),
    icon: () => (
      <>
        <Tile fill="#111" />
        {inset(0.78, <><path d={HANDLE} fill="none" stroke="#c8a96a" strokeWidth="3.4" strokeLinecap="round" /><path d={BAG} fill="none" stroke="#c8a96a" strokeWidth="3.4" strokeLinejoin="round" /></>, 32, 35)}
      </>
    ),
  },
  {
    key: "8",
    name: "Neon pill",
    font: "Unbounded",
    note: "A hot pink-to-orange pill with the cart and name inside. Loud and young.",
    render: () => (
      <div
        className="inline-flex items-center gap-2 px-5 py-2.5"
        style={{ borderRadius: 999, backgroundImage: "linear-gradient(90deg,#ff3d77,#ff9a3c)", fontFamily: ff(unbounded), fontWeight: 700, fontSize: 22, color: "#fff" }}
      >
        <Svg size={30}><CartArt stroke="#fff" wheels="#fff" sw={6} /></Svg>
        weekendcart
      </div>
    ),
    icon: () => (
      <>
        <defs>
          <linearGradient id="d8" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff3d77" /><stop offset="1" stopColor="#ff9a3c" /></linearGradient>
        </defs>
        <rect width="64" height="64" rx="20" fill="url(#d8)" />
        {inset(0.78, <CartArt stroke="#fff" wheels="#fff" sw={6} />)}
      </>
    ),
  },
  {
    key: "9",
    name: "Monoline",
    font: "Josefin Sans Light",
    note: "One thin continuous line draws a cart whose basket is a W. Calm and airy.",
    render: (dark) => {
      const c = dark ? "#5eead4" : "#0f766e";
      return (
        <div className="flex items-center gap-3">
          <Svg size={54}>
            <path d={WCART} fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="22" cy="54" r="4" fill="none" stroke={c} strokeWidth="3" />
            <circle cx="39" cy="54" r="4" fill="none" stroke={c} strokeWidth="3" />
          </Svg>
          <span style={{ fontFamily: ff(josefin), fontWeight: 300, fontSize: 24, letterSpacing: "0.32em", color: c }}>WEEKEND CART</span>
        </div>
      );
    },
    icon: () => (
      <>
        <Tile fill="#0f766e" />
        {inset(0.72, <><path d={WCART} fill="none" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="22" cy="54" r="4.4" fill="none" stroke="#fff" strokeWidth="4" /><circle cx="39" cy="54" r="4.4" fill="none" stroke="#fff" strokeWidth="4" /></>, 27, 32)}
      </>
    ),
  },
  {
    key: "10",
    name: "Orange bag, stacked",
    font: "Syne",
    note: "A bright orange bag with a bold W; WEEKEND over cart, two weights of one face.",
    render: (dark) => (
      <div className="flex items-center gap-3" style={{ fontFamily: ff(syne) }}>
        <Svg size={62}>
          <path d={HANDLE} fill="none" stroke={dark ? "#fff" : "#262626"} strokeWidth="4.4" strokeLinecap="round" />
          <path d={BAG} fill="#ff7a00" />
          <path d="M19 32L25.5 48L32 37L38.5 48L45 32" fill="none" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <div className="leading-[0.95]">
          <div style={{ fontWeight: 800, fontSize: 30, color: dark ? "#fff" : "#262626" }}>WEEKEND</div>
          <div style={{ fontWeight: 500, fontSize: 30, color: "#ff7a00" }}>cart</div>
        </div>
      </div>
    ),
    icon: () => inset(1.02, <><path d={HANDLE} fill="none" stroke="#ff7a00" strokeWidth="4.4" strokeLinecap="round" /><path d={BAG} fill="#ff7a00" /><path d="M19 32L25.5 48L32 37L38.5 48L45 32" fill="none" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" /></>, 32, 36),
  },
  {
    key: "11",
    name: "Retro poster",
    font: "Bungee",
    note: "Chunky 70s letters with a hard shadow: red WEEKEND, yellow CART, navy cart.",
    render: (dark) => {
      const shadow = dark ? "#000" : "#1d3557";
      return (
        <div className="flex items-center gap-3">
          <Svg size={56}><CartArt stroke={dark ? "#ffd166" : "#1d3557"} wheels="#e63946" sw={6} /></Svg>
          <div className="leading-none" style={{ fontFamily: ff(bungee), fontSize: 30 }}>
            <div style={{ color: "#e63946", textShadow: `3px 3px 0 ${shadow}` }}>WEEKEND</div>
            <div className="mt-1" style={{ color: "#ffd166", textShadow: `3px 3px 0 ${shadow}` }}>CART</div>
          </div>
        </div>
      );
    },
    icon: () => (
      <>
        <Tile fill="#1d3557" />
        {inset(0.8, <CartArt stroke="#ffd166" wheels="#e63946" sw={6.4} />)}
      </>
    ),
  },
  {
    key: "12",
    name: "Sticker",
    font: "Baloo 2",
    note: "A tilted yellow sticker with a white edge, like it was slapped on a parcel.",
    render: () => (
      <div
        className="inline-flex items-center gap-2 px-4 py-2"
        style={{ background: "#ffd23f", transform: "rotate(-4deg)", borderRadius: 12, boxShadow: "0 0 0 4px #fff, 0 6px 14px rgba(0,0,0,.18)", fontFamily: ff(baloo), fontWeight: 800, fontSize: 28, color: "#111" }}
      >
        <Svg size={32}><CartArt stroke="#111" wheels="#111" sw={6} /></Svg>
        weekend cart
      </div>
    ),
    icon: () => (
      <>
        <g transform="rotate(-6 32 32)"><rect x="4" y="4" width="56" height="56" rx="12" fill="#ffd23f" stroke="#fff" strokeWidth="4" /></g>
        {inset(0.72, <CartArt stroke="#111" wheels="#111" sw={6.4} />)}
      </>
    ),
  },
  {
    key: "13",
    name: "Gradient W, stacked",
    font: "Outfit",
    note: "A big gradient W on two wheels; eekend beside it, Cart right beneath.",
    render: (dark) => (
      <div className="flex items-center" style={{ fontFamily: ff(outfit) }}>
        <svg viewBox="0 0 70 70" width="72" height="72" aria-hidden="true" className="shrink-0">
          <defs>
            <linearGradient id="d13" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c3aed" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
          </defs>
          <text x="35" y="52" textAnchor="middle" fontFamily={ff(outfit)} fontWeight="800" fontSize="62" fill="url(#d13)">W</text>
          <circle cx="24" cy="63" r="4.2" fill={dark ? "#fff" : "#1e1b4b"} />
          <circle cx="46" cy="63" r="4.2" fill={dark ? "#fff" : "#1e1b4b"} />
        </svg>
        <div className="-ml-1 leading-[0.92]">
          <div style={{ fontWeight: 800, fontSize: 32, color: dark ? "#fff" : "#1e1b4b" }}>eekend</div>
          <div style={{ fontWeight: 400, fontSize: 32, backgroundImage: "linear-gradient(90deg,#7c3aed,#2563eb)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Cart</div>
        </div>
      </div>
    ),
    icon: () => (
      <>
        <defs>
          <linearGradient id="d13i" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c3aed" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#d13i)" />
        <text x="32" y="44" textAnchor="middle" fontFamily={ff(outfit)} fontWeight="800" fontSize="40" fill="#fff">W</text>
        <circle cx="24" cy="52" r="3.2" fill="#fff" /><circle cx="40" cy="52" r="3.2" fill="#fff" />
      </>
    ),
  },
  {
    key: "14",
    name: "Lobster on the move",
    font: "Lobster + Poppins",
    note: "A bouncy Weekend, a cart speeding off, and CART on an orange chip.",
    render: (dark) => (
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: ff(lobster), fontSize: 40, color: dark ? "#67e8f9" : "#0e7490" }}>Weekend</span>
        <div className="flex flex-col items-center">
          <Svg size={36}>
            <path d="M-6 26H2M-8 34H1" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
            <CartArt stroke="#f97316" wheels={dark ? "#fff" : "#0e7490"} sw={5.6} />
          </Svg>
          <span className="px-2 py-0.5" style={{ background: "#f97316", borderRadius: 6, fontFamily: ff(poppins), fontWeight: 800, fontSize: 10, letterSpacing: "0.2em", color: "#fff" }}>CART</span>
        </div>
      </div>
    ),
    icon: () => (
      <>
        <Tile fill="#f97316" />
        {inset(0.8, <CartArt stroke="#fff" wheels="#0e7490" sw={6} />)}
      </>
    ),
  },
  {
    key: "15",
    name: "The bag is the dot",
    font: "Sora",
    note: "weekend.cart — the full stop is a tiny emerald shopping bag.",
    render: (dark) => (
      <div className="flex items-end leading-none" style={{ fontFamily: ff(sora), fontSize: 36, color: dark ? "#fff" : "#0b0b0b" }}>
        <span style={{ fontWeight: 700 }}>weekend</span>
        <Svg size={20} style={{ margin: "0 3px 3px" }}>
          <path d={HANDLE} fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
          <path d={BAG} fill="#10b981" />
        </Svg>
        <span style={{ fontWeight: 300 }}>cart</span>
      </div>
    ),
    icon: () => (
      <>
        <Tile fill="#10b981" />
        {inset(0.76, <><path d={HANDLE} fill="none" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" /><path d={BAG} fill="#fff" /></>, 32, 36)}
      </>
    ),
  },
  {
    key: "16",
    name: "Emblem",
    font: "Space Grotesk",
    note: "An indigo roundel with an amber trolley; the name stacked in two lines.",
    render: (dark) => (
      <div className="flex items-center gap-3" style={{ fontFamily: ff(grotesk), fontWeight: 700 }}>
        <Svg size={60}>
          <circle cx="32" cy="32" r="31" fill="#3730a3" />
          {inset(0.62, <CartArt stroke="#fbbf24" wheels="#fbbf24" sw={6.4} />)}
        </Svg>
        <div className="leading-none">
          <div style={{ fontSize: 26, color: dark ? "#fff" : "#3730a3" }}>WEEKEND</div>
          <div className="mt-1" style={{ fontSize: 26, letterSpacing: "0.34em", color: "#f59e0b" }}>CART</div>
        </div>
      </div>
    ),
    icon: () => (
      <>
        <circle cx="32" cy="32" r="31" fill="#3730a3" />
        {inset(0.66, <CartArt stroke="#fbbf24" wheels="#fbbf24" sw={6.4} />)}
      </>
    ),
  },
  {
    key: "17",
    name: "Brush script",
    font: "Kaushan Script",
    note: "Energetic brush lettering in crimson, a brushed underline and a small bag.",
    render: (dark) => (
      <div className="leading-none">
        <div className="flex items-end gap-2">
          <span style={{ fontFamily: ff(kaushan), fontSize: 40, color: dark ? "#ff4d5a" : "#c1121f" }}>Weekend Cart</span>
          <Svg size={28}>
            <path d={HANDLE} fill="none" stroke={dark ? "#fff" : "#111"} strokeWidth="5" strokeLinecap="round" />
            <path d={BAG} fill={dark ? "#fff" : "#111"} />
          </Svg>
        </div>
        <svg viewBox="0 0 250 12" width="250" height="12" aria-hidden="true">
          <path d="M4 8C60 2 150 2 246 6" fill="none" stroke={dark ? "#fff" : "#111"} strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    ),
    icon: () => (
      <>
        <Tile fill="#c1121f" />
        <text x="32" y="46" textAnchor="middle" fontFamily={ff(kaushan)} fontSize="42" fill="#fff">W</text>
      </>
    ),
  },
  {
    key: "18",
    name: "Solid and outline",
    font: "Archivo Black",
    note: "WEEKEND solid, CART in outline, a hot pink cart between them.",
    render: (dark) => {
      const ink = dark ? "#fff" : "#0b0b0b";
      return (
        <div className="flex items-center gap-2" style={{ fontFamily: ff(archivo), fontSize: 30, lineHeight: 1 }}>
          <span style={{ color: ink }}>WEEKEND</span>
          <Svg size={34}><CartArt stroke="#ff2e88" wheels="#ff2e88" sw={6} /></Svg>
          <span style={{ color: "transparent", WebkitTextStroke: "1.6px #ff2e88" }}>CART</span>
        </div>
      );
    },
    icon: () => (
      <>
        <Tile fill="#0b0b0b" />
        {inset(0.8, <CartArt stroke="#ff2e88" wheels="#ff2e88" sw={6} />)}
      </>
    ),
  },
  {
    key: "19",
    name: "Oval badge",
    font: "Oleo Script + Poppins",
    note: "A classic shopfront badge: bag on top, script Weekend, CART on a red ribbon.",
    render: () => (
      <svg viewBox="0 0 220 110" width="220" height="110" aria-hidden="true">
        <ellipse cx="110" cy="55" rx="106" ry="51" fill="#14213d" stroke="#f5efe3" strokeWidth="3" />
        <ellipse cx="110" cy="55" rx="98" ry="44" fill="none" stroke="#f5efe3" strokeWidth="1" opacity=".5" />
        <g transform="translate(98 12) scale(0.36)">
          <path d={HANDLE} fill="none" stroke="#e63946" strokeWidth="5" strokeLinecap="round" />
          <path d={BAG} fill="#e63946" />
        </g>
        <text x="110" y="68" textAnchor="middle" fontFamily={ff(oleo)} fontWeight="700" fontSize="36" fill="#f5efe3">Weekend</text>
        <path d="M70 76H150L144 84L150 92H70L76 84Z" fill="#e63946" />
        <text x="110" y="88" textAnchor="middle" fontFamily={ff(poppins)} fontWeight="800" fontSize="10" letterSpacing="4" fill="#fff">CART</text>
      </svg>
    ),
    icon: () => (
      <>
        <circle cx="32" cy="32" r="31" fill="#14213d" stroke="#f5efe3" strokeWidth="2" />
        {inset(0.7, <><path d={HANDLE} fill="none" stroke="#e63946" strokeWidth="5" strokeLinecap="round" /><path d={BAG} fill="#e63946" /><path d="M20 32L26 47L32 37L38 47L44 32" fill="none" stroke="#f5efe3" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" /></>, 32, 36)}
      </>
    ),
  },
  {
    key: "20",
    name: "Tech loop",
    font: "Lexend",
    note: "A cart inside a looping arrow; light weekend, bold gradient cart.",
    render: (dark) => (
      <div className="flex items-center gap-3" style={{ fontFamily: ff(lexend), fontSize: 32 }}>
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true" className="shrink-0">
          <defs>
            <linearGradient id="d20" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#06b6d4" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
          </defs>
          <path d="M54 32A22 22 0 1 1 44 13.5" fill="none" stroke="url(#d20)" strokeWidth="5" strokeLinecap="round" />
          <path d="M44 6L45 14L37 16" fill="none" stroke="url(#d20)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          {inset(0.46, <CartArt stroke={dark ? "#fff" : "#0f172a"} wheels={dark ? "#fff" : "#0f172a"} sw={7} />)}
        </svg>
        <span className="leading-none">
          <span style={{ fontWeight: 300, color: dark ? "#fff" : "#0f172a" }}>weekend</span>
          <span style={{ fontWeight: 700, backgroundImage: "linear-gradient(90deg,#06b6d4,#2563eb)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>cart</span>
        </span>
      </div>
    ),
    icon: () => (
      <>
        <defs>
          <linearGradient id="d20i" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#06b6d4" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#d20i)" />
        {inset(0.74, <CartArt stroke="#fff" wheels="#fff" sw={6} />)}
      </>
    ),
  },
];
