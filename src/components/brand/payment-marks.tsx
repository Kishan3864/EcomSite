import type { ReactElement } from "react";

/**
 * Payment marks for the checkout payment step.
 *
 * WHY THESE EXIST AT ALL, given that the checkout used to ban glyphs outright:
 * a generic trust seal and a payment brand mark are different objects doing
 * different jobs. A padlock beside the word "secure" asserts a virtue about
 * ourselves — it is the badge every scam site wears, it is worth less than the
 * sentence next to it, and it stays banned. A payment brand mark asserts
 * nothing; it names a mechanism. A shopper hunting for the app they actually
 * pay with finds PhonePe violet faster than they read the word "PhonePe", and
 * every serious Indian store shows these for exactly that reason. Recognition,
 * not reassurance. Wayfinding, not decoration.
 *
 * TWO TIERS, AND WHERE THEY MEET.
 *
 *   Tier 1 — BRAND marks carry their own accurate colours, sealed inside the
 *   SVG. That is the standing precedent from auth/social-sign-in.tsx, which has
 *   shipped Google's four real hexes since launch. The house palette does not
 *   apply to somebody else's trademark and recolouring one into ocean and gold
 *   would be the misleading restyle we are supposed to avoid. Equally, those
 *   hexes never leave these files: no token is added, no class carries them.
 *
 *   Tier 2 — CATEGORY marks (cards, net banking, wallets, cash, the UPI-app
 *   phone) are house drawings in the Ink idiom: 24-unit grid, strokeWidth 1.5,
 *   square caps, mitred joins, `currentColor` only. Cards, net banking, wallets
 *   and cash have no logos, and inventing four would put counterfeits beside
 *   genuine marks — which looks far worse than no marks at all.
 *
 *   These two tiers used to be described here as "never mixed", on the theory
 *   that one saturated logo beside three hairline glyphs reads ragged. That is
 *   true of a row assembled for decoration and false of the row that ships. The
 *   gateway card lists what PayU's checkout actually opens with, and that is
 *   three named apps and four categories; splitting it by tier would mean
 *   either hiding the apps the owner asked for or inventing logos for the
 *   categories. So a row MAY hold both tiers when the list is simply true. What
 *   stays banned is the counterfeit: a house drawing dressed as somebody's
 *   logo, or a brand rendered in a shape that brand does not use.
 *
 * WHAT THESE ARE NOW: the schemes' own artwork, as files, in
 * public/brand/payments/. Tier 1 went through three rounds of being drawn by
 * hand here — the two-bar UPI device, a violet tile standing in for PhonePe, a
 * navy chip with a "P" on it for Paytm, then better versions of each — and the
 * owner rejected every round for the same reason, which was the right reason:
 * a trademark you have redrawn is a trademark you have altered. It is less
 * recognisable, which defeats the only argument for having it, and it is not
 * ours to alter. Drawing stopped; the files went in.
 *
 * Tier 2 stays drawn, because cards, net banking, wallets and cash are
 * categories with no logo to fetch — a house glyph there is a glyph, not a
 * counterfeit.
 *
 * Each mark sits beside that brand's name in visible text, so it identifies
 * rather than substitutes, and none of them implies that brand endorses
 * WeekendCart.
 *
 * Every mark is `aria-hidden` and `focusable="false"`. The word beside it
 * carries the meaning, so a screen reader hears "Google Pay" once rather than
 * twice. Do not give these `role="img"` with an `aria-label` — that was the
 * mistake in the dead UpiMark this module replaces.
 *
 * No "use client": a server component must be able to render these.
 */

/** Shared root, matching brand/social-icons.tsx so the two sets stay one hand. */
const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  focusable: "false",
} as const;

/** Tier 2 stroke settings — the Ink house hand, spread onto a <g>. */
const houseStroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
} as const;

type MarkProps = { size?: number };

/* ------------------------------ Tier 1: brands ---------------------------- */

/**
 * THE BRAND MARKS ARE THE SCHEMES' OWN PNG FILES, NOT DRAWINGS OF THEM.
 *
 * They were hand-drawn SVG for a while, and the drawings were close — but
 * close is the whole problem with a trademark. A shopper either recognises the
 * mark or does not, and a redrawn PhonePe with a straightened matra or a Visa
 * set in whatever face the device resolves is a mark that has been altered,
 * which is both less recognisable and not ours to alter. The official assets
 * live in public/brand/payments/ and are served as-is.
 *
 * Square canvases, every one, with the schemes' own padding baked in — so they
 * are rendered `object-contain` into a box and never stretched. `size` is the
 * box's edge, which keeps the API identical to the house glyphs below.
 *
 * Plain <img>, not next/image: these are fixed-size decorative marks a few
 * kilobytes each, and the optimiser's srcset and lazy-loading machinery buys
 * nothing at 28px while adding a request per mark.
 */
function PngMark({ file, alt, size }: { file: string; alt: string; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/payments/${file}.png`}
      // Empty on purpose, like the `aria-hidden` on every SVG mark here: the
      // brand's name is already written beside it, and an alt would make a
      // screen reader say "PhonePe PhonePe". `alt` is still required on an img,
      // and `title` keeps the name for anyone reading the markup.
      alt=""
      title={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-contain"
    />
  );
}

export function UpiMark({ size = 16 }: MarkProps) {
  return <PngMark file="upi-payment-icon" alt="UPI" size={size} />;
}

/**
 * Google Pay — Google's own four-colour G.
 *
 * The geometry and the four hexes are the ones already shipping in
 * auth/social-sign-in.tsx; this is the single copy now and that file imports
 * from here, so the mark cannot drift into two versions.
 *
 * This is the G on its own, which is what the sign-in button wants. The
 * payments row wants `GooglePayMark` below — the G Pay lockup.
 */
export function GoogleMark({ size = 16 }: MarkProps) {
  return (
    <svg {...base} width={size} height={size}>
      <GoogleG />
    </svg>
  );
}

export function GooglePayMark({ size = 16 }: MarkProps) {
  return <PngMark file="google-pay-icon" alt="Google Pay" size={size} />;
}

/** The G alone, shared by the plain mark and the Pay lockup. */
function GoogleG() {
  return (
    <>
      <path
        fill="#4285f4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34a853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#fbbc05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"
      />
    </>
  );
}

export function PhonePeMark({ size = 16 }: MarkProps) {
  return <PngMark file="phonepe-icon" alt="PhonePe" size={size} />;
}

export function VisaMark({ size = 16 }: MarkProps) {
  return <PngMark file="visa-icon" alt="Visa" size={size} />;
}

export function MastercardMark({ size = 16 }: MarkProps) {
  return <PngMark file="master-card-icon" alt="Mastercard" size={size} />;
}

/**
 * Paytm — the wordmark, which is the whole mark: "Pay" navy, "tm" cyan.
 *
 * There is no tile. The navy rounded square with a single white "P" that stood
 * here was our invention: Paytm has no such device, it was the one rounded
 * corner in a square-cornered shop, and at 18px an unlabelled coloured chip
 * identifies nothing. A wordmark is wide, so this mark alone is wider than it
 * is tall — 60 × 24 on the same 24-unit grid, so it keeps the row's height and
 * takes the width the word needs.
 *
 * SET IN TEXT, WHICH THE DEAD `UpiMark` WAS KILLED FOR. The difference is what
 * broke there: that one bound `font-family` to `var(--font-jakarta)`, so the
 * letters reflowed with the app's own font and the mark could not be trusted at
 * any size. Here the stack is spelled out and self-contained, and `textLength`
 * with `lengthAdjust="spacingAndGlyphs"` pins each half to an exact width — so
 * whichever face the device resolves, the mark occupies the same 60 units, the
 * two halves abut as one word rather than drifting into "Pay tm", and nothing
 * can push the row around. Drawing five letters as paths at this size would be
 * a hand-made typeface pretending to be a trademark, which is worse.
 */

export function PaytmMark({ size = 16 }: MarkProps) {
  return <PngMark file="paytm-icon" alt="Paytm" size={size} />;
}

/* ---------------------------- Tier 2: categories -------------------------- */

/**
 * A card. Body, magnetic stripe, one line of number — enough to be a card and
 * not enough to be anybody's card.
 */
export function CardsMark({ size = 16 }: MarkProps) {
  return (
    <svg {...base} width={size} height={size}>
      <g {...houseStroke}>
        <path d="M2 5.5h20v13H2Z" />
        <path d="M2 9.5h20" />
        <path d="M5 14.5h5" />
      </g>
    </svg>
  );
}

/** A bank: pediment, four columns, a plinth. Net banking, drawn as the building. */
export function NetBankingMark({ size = 16 }: MarkProps) {
  return (
    <svg {...base} width={size} height={size}>
      <g {...houseStroke}>
        <path d="M2 9.5 L12 4 L22 9.5 Z" />
        <path d="M5 9.5v8M9.6 9.5v8M14.4 9.5v8M19 9.5v8" />
        <path d="M2.5 18.5h19" />
      </g>
    </svg>
  );
}

/** A wallet with a card pocket on its face. */
export function WalletsMark({ size = 16 }: MarkProps) {
  return (
    <svg {...base} width={size} height={size}>
      <g {...houseStroke}>
        <path d="M2.5 5.5h16v13h-16Z" />
        <path d="M14 10h7.5v4H14Z" />
      </g>
    </svg>
  );
}

/**
 * Cash on delivery.
 *
 * The same banknote-and-rupee the counter band on the home page already draws
 * (illustration/counter-glyphs.tsx, the `note` glyph) so the shop pictures cash
 * one way everywhere. The paths are copied rather than imported because that
 * module is "use client" and wraps every path in `DrawIn`, which would animate
 * the mark on mount inside a payment card. Keep the two in step by hand; if the
 * note glyph is ever redrawn, redraw this with it.
 *
 * THE RUPEE IS NEW, in both places. The old one was `M14 9 A3 3 0 0 1 11 15 L9
 * 15 L15 15`: an arc whose chord is 6.71 across a diameter of 6, which the SVG
 * spec makes the browser silently scale up, so it drew a flat semicircle rather
 * than the bowl it was written as — and then retraced its own bottom bar from
 * (11,15) to (9,15) to (15,15), leaving the glyph with no stem and no leg. It
 * was not a ₹. This is lucide's IndianRupee at half size, centred in the note:
 * two bars, the bowl as a cubic (no out-of-range radii to rescale), the stub
 * and the diagonal leg.
 */
export function CodMark({ size = 16 }: MarkProps) {
  return (
    <svg {...base} width={size} height={size}>
      <g {...houseStroke}>
        <path d="M2 6 H22 V18 H2 Z" />
        <path d="M9.6 7.5 H15.6" />
        <path d="M9.6 10 H15.6" />
        <path d="M9.6 12.5 H11.1" />
        <path d="M11.1 12.5 C14.4 12.5 14.4 7.5 11.1 7.5" />
        <path d="M9.6 12.5 L13.9 16.5" />
      </g>
    </svg>
  );
}

/**
 * A phone with a rupee on its screen — "pay from your UPI app".
 *
 * Same correction as CodMark: `a2.4 2.4 0 0 1-2.6 4.8` asked for a 4.8 diameter
 * across a 5.46 chord, so the browser rescaled the radii and drew a curve
 * nobody wrote. The rupee is now lucide's, at half size, centred on the screen.
 */
export function UpiAppMark({ size = 16 }: MarkProps) {
  return (
    <svg {...base} width={size} height={size}>
      <g {...houseStroke}>
        <path d="M6.5 2h11v20h-11Z" />
        <path d="M6.5 18.5h11" />
        <path d="M9 5 H15" />
        <path d="M9 7.5 H15" />
        <path d="M9 10 H10.5" />
        <path d="M10.5 10 C13.8 10 13.8 5 10.5 5" />
        <path d="M9 10 L13.25 14" />
      </g>
    </svg>
  );
}

/* -------------------------------- Dispatcher ------------------------------ */

export type PaymentMarkName =
  | "upi"
  | "gpay"
  | "phonepe"
  | "paytm"
  | "visa"
  | "mastercard"
  | "cards"
  | "netbanking"
  | "wallets"
  | "cod"
  | "upiapp";

/**
 * A closed set, keyed statically — the footer's TRUST_ICONS idiom, not the
 * admin category icon's dynamic lookup, because every name is known here and a
 * typo should be a type error rather than a blank square at runtime.
 */
export const PAYMENT_MARKS: Record<PaymentMarkName, (props: MarkProps) => ReactElement> = {
  upi: UpiMark,
  gpay: GooglePayMark,
  phonepe: PhonePeMark,
  paytm: PaytmMark,
  visa: VisaMark,
  mastercard: MastercardMark,
  cards: CardsMark,
  netbanking: NetBankingMark,
  wallets: WalletsMark,
  cod: CodMark,
  upiapp: UpiAppMark,
};

/** Lets a row map over `[{ id, label }]` instead of a switch. */
export function PaymentMark({ name, size = 16 }: { name: PaymentMarkName; size?: number }) {
  const Mark = PAYMENT_MARKS[name];
  return <Mark size={size} />;
}
