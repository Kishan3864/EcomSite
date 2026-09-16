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
 * HONESTY ABOUT WHAT THESE ARE. This machine has no network and the repo holds
 * no vendor assets, so nothing here is traced from an official file. UPI's
 * two-bar device and Google's G are reproduced geometry. PhonePe is a
 * simplified house rendering of the brand's own device, a violet tile with a
 * white disc. Paytm has no device to borrow — its mark is a wordmark — so the
 * wordmark is what is drawn: "Pay" in its navy, "tm" in its cyan, nothing
 * around it. It was a navy rounded tile carrying one white "P" until the owner
 * caught it: that tile was ours rather than the brand's, it was the only
 * rounded corner this design added, and at 18px it read as an anonymous
 * coloured chip, which defeats the recognition argument that justifies having
 * brand marks here at all. Each mark sits beside that brand's name in visible
 * text, so it identifies rather than substitutes, and none of them implies that
 * brand endorses WeekendCart. If the owner obtains the official SVGs, swap the
 * path data in place: the call sites take a name, not geometry.
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
 * UPI — the NPCI device, two slanted bars in the scheme's green and orange.
 *
 * Replaces the dead `UpiMark` that used to sit in social-icons.tsx. That one
 * set the letters as an SVG <text> bound to `var(--font-jakarta)`, so it
 * reflowed with the font and could not be trusted at any size, and its first
 * path ran to x = -2, outside its own viewBox. It also took its green from
 * marketing.ts's `upiApps` tones, which are not the real scheme colours.
 * The wordmark is deliberately not drawn: the label beside the mark says UPI.
 */
export function UpiMark({ size = 16 }: MarkProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path fill="#0f8a45" d="M9.9 3.2h4.3l-5.2 17.6H4.7L9.9 3.2Z" />
      <path fill="#f26522" d="M15.6 3.2h4.3l-5.2 17.6h-4.3l5.2-17.6Z" />
    </svg>
  );
}

/**
 * Google Pay — Google's own four-colour G.
 *
 * The geometry and the four hexes are the ones already shipping in
 * auth/social-sign-in.tsx; this is the single copy now and that file imports
 * from here, so the mark cannot drift into two versions.
 *
 * Stated plainly because it matters: this is the Google mark, not the Google
 * Pay lockup, which pairs the G with its own wordmark. It is used here beside
 * the visible words "Google Pay" to identify the app, which is the accurate
 * half of a mark we cannot draw in full rather than an approximation of the
 * whole. Swap it the day an official asset is to hand.
 */
export function GoogleMark({ size = 16 }: MarkProps) {
  return (
    <svg {...base} width={size} height={size}>
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
    </svg>
  );
}

/**
 * PhonePe — the violet tile and white disc, with a rupee inside it above 24px.
 *
 * `rx` on an SVG rect is a geometry attribute, not the CSS `border-radius` the
 * base layer zeroes site-wide, so a brand whose device is genuinely rounded
 * keeps its corners. The square-corner rule governs page chrome; it has never
 * governed the inside of a mark — InstagramIcon has shipped `rx="5.5"` and two
 * circles for as long as the footer has existed. This tile is the brand's own
 * shape, which is the whole difference between it and the invented tile Paytm
 * used to wear.
 *
 * The rupee only renders from 24px up. Inside a 14.6-unit disc it can be no
 * more than ~11 units tall, and at the 18px the mark rows use that is a 5px
 * glyph whose three strokes sit ~2px apart — it aliases into a smudge and
 * muddies the two shapes that actually identify PhonePe at that size. Violet
 * tile, white disc, nothing in it.
 */
export function PhonePeMark({ size = 16 }: MarkProps) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="1" y="1" width="22" height="22" rx="5" fill="#5f259f" />
      <circle cx="12" cy="12" r="7.3" fill="#ffffff" />
      {size >= 24 && (
        // lucide's IndianRupee geometry, scaled to 0.62 and centred on the
        // disc: its bbox is x 6–15.7, y 3–21, so the glyph lands 6–18 in both
        // axes. Stroke 2.6 × 0.62 = 1.6 units, the house weight at this scale.
        <g
          transform="translate(5.27 4.56) scale(0.62)"
          fill="none"
          stroke="#5f259f"
          strokeWidth="2.6"
          strokeLinecap="square"
          strokeLinejoin="miter"
        >
          <path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3" />
          <path d="M9 13c6.667 0 6.667-10 0-10" />
        </g>
      )}
    </svg>
  );
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
const WORDMARK_STACK = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export function PaytmMark({ size = 16 }: MarkProps) {
  return (
    <svg
      {...base}
      viewBox="0 0 60 24"
      width={Math.round((size * 60) / 24)}
      height={size}
    >
      <text
        x="0"
        y="18"
        textLength="35"
        lengthAdjust="spacingAndGlyphs"
        fontFamily={WORDMARK_STACK}
        fontSize="19"
        fontWeight="700"
        fill="#002970"
      >
        Pay
      </text>
      <text
        x="35"
        y="18"
        textLength="25"
        lengthAdjust="spacingAndGlyphs"
        fontFamily={WORDMARK_STACK}
        fontSize="19"
        fontWeight="700"
        fill="#00baf2"
      >
        tm
      </text>
    </svg>
  );
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
  gpay: GoogleMark,
  phonepe: PhonePeMark,
  paytm: PaytmMark,
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
