import { Ink } from "./ink";

/**
 * The shop's drawn mark: a parcel with its top flap folded back, seen
 * three-quarters.
 *
 * It does a great deal of work for one drawing. It heads the catalogue when
 * there is nothing to list, it is the quiet figure on the dark editorial band,
 * and it sits inside every EmptyState — cart, wishlist, listings, orders. So it
 * has to hold together at 120px and at 320px, and in white at a quarter opacity
 * on a near-black ocean plane as readily as in ink on paper. Everything below
 * is in service of that range: few lines and long ones, nothing smaller than a
 * grid cell, one weight for the parcel and a lighter one for the tape, and a
 * single spot of colour to stop the whole thing reading as a diagram.
 *
 * It never animates, and there is deliberately no `drawnPath` in this file. It
 * is a mark, not a performance: it turns up beside an apology — an empty cart,
 * an order list with nothing in it — and a line that draws itself in front of a
 * shopper at that moment is a flourish at the wrong moment. It is also often on
 * screen twice at once, and two marks drawing themselves at different delays
 * would look like a loading state for something that is not loading.
 */

/**
 * The grid behind the parcel, in whole 8-unit cells. The outermost lines at 0
 * and 160 are left out: they would be clipped to half a stroke by the edge of
 * the viewBox, and the fade has taken them to nothing there in any case.
 */
const GRID = Array.from({ length: 19 }, (_, i) => (i + 1) * 8);

export function PaperMark({ size, className }: { size?: number; className?: string }) {
  return (
    <Ink viewBox="0 0 160 160" size={size} strokeWidth={1.25} className={className}>
      <defs>
        {/*
         * The grid has to stop before it reaches the edge of the box, or the
         * mark ends up looking like a cropped sheet of graph paper rather than
         * a drawing that sits on the page. One linear gradient only fades along
         * one axis, so there are two masks and they are nested rather than
         * combined: mask luminance multiplies as you nest, which gets the fade
         * on all four sides without a blend mode and without a radial gradient
         * that would round off a composition built entirely from straight lines.
         *
         * `white` with a varying stop opacity rather than a black-to-white ramp
         * keeps the no-hex rule honest: these values are mask machinery, never
         * colour, and nobody reading them later should mistake them for palette.
         */}
        <linearGradient id="paper-mark-fade-x" x1="0" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.35" stopColor="white" stopOpacity="1" />
          <stop offset="0.65" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="paper-mark-fade-y" x1="0" y1="0" x2="0" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.35" stopColor="white" stopOpacity="1" />
          <stop offset="0.65" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="paper-mark-mask-x" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
          <rect width="160" height="160" fill="url(#paper-mark-fade-x)" stroke="none" />
        </mask>
        <mask id="paper-mark-mask-y" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
          <rect width="160" height="160" fill="url(#paper-mark-fade-y)" stroke="none" />
        </mask>
      </defs>

      {/*
       * The grid is the measure the parcel is drawn on, left visible. It runs
       * behind the parcel and through it, because nothing here is filled — that
       * is what gives a five-line drawing the look of something set out rather
       * than sketched. It carries half the stroke of the parcel and half the
       * opacity again, so that at a quarter opacity on the dark band it drops
       * away to almost nothing and the parcel survives alone, which is the
       * order of importance we want at every size.
       */}
      <g mask="url(#paper-mark-mask-y)">
        <g mask="url(#paper-mark-mask-x)" strokeWidth={0.5} opacity={0.5}>
          {GRID.map((n) => (
            <line key={`v-${n}`} x1={n} y1="0" x2={n} y2="160" />
          ))}
          {GRID.map((n) => (
            <line key={`h-${n}`} x1="0" y1={n} x2="160" y2={n} />
          ))}
        </g>
      </g>

      {/*
       * The front face. Its 96x72 leaves 32 units of air to the left, the right
       * and below, and the flap takes the drawing up to 32 from the top, so the
       * mark is optically centred by the face — the heavy shape — rather than by
       * the bounding box of every line in it.
       */}
      <rect x="32" y="56" width="96" height="72" />

      {/*
       * The flap, folded back towards us so we are looking at its underside. It
       * is drawn as three sides only; the fourth is the top edge of the face
       * above, which is the fold itself and is already there. Stroking it twice
       * would double its weight, and at a quarter opacity on the dark band a
       * doubled line is the one thing that reads as a mistake.
       *
       * The 16-across-24-up shear is the whole three-quarter view: it is enough
       * to say the parcel has a depth and is turned slightly away, and little
       * enough that every corner still lands on the grid.
       */}
      <path d="M32 56L48 32L144 32L128 56" />

      {/*
       * The tape across the seam, at a lighter weight than the parcel so it
       * reads as something stuck on rather than another edge of the box. It sits
       * on the face immediately under the fold: with the flap folded back we are
       * looking at its underside, so a band continued onto it would have to
       * follow the shear and land on fractional coordinates, and the grid rule
       * is worth more here than the extra literalism.
       */}
      <path d="M32 64H128" strokeWidth={1} />
      <path d="M32 80H128" strokeWidth={1} />

      {/*
       * The address label, and the only colour and the only filled shape in the
       * drawing. It is a grid cell less a hairline of air on each side, which is
       * why it is 6 and not 8 — it belongs to the grid rather than floating on
       * top of it. One small aqua square against an otherwise monochrome
       * drawing is what stops the mark reading as a technical diagram, and being
       * the single filled thing means it survives at 120px, where an outline
       * this size would close up.
       */}
      <rect x="48" y="96" width="6" height="6" fill="var(--color-gold-400)" stroke="none" />
    </Ink>
  );
}
