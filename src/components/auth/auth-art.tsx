"use client";

import { drawnPath } from "@/components/illustration/ink";
import { DrawIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

/**
 * The illustration on the sign-in panel.
 *
 * Drawn rather than photographed, for three reasons. A stock photograph of a
 * necklace says nothing about what an account is for; it cost a 200KB download
 * and a request to an image host this server cannot reliably reach; and it sat
 * behind a gradient dark enough to make it unreadable anyway.
 *
 * This is inline SVG — a couple of kilobytes in the HTML, no request, no
 * layout shift, and it sharpens rather than blurs on a retina screen. The
 * geometry follows the rest of the shop: square corners, hairlines, one accent
 * in ember. Purely decorative, so it is hidden from screen readers; the
 * panel's heading and list carry the meaning.
 *
 * Not one colour here is a hex. The drawing sat on this panel through a repaint
 * of the whole site still wearing the old evergreen and brass, which is how the
 * problem was noticed at all, and a literal colour is only a promise to be
 * stale again next time. Everything is a token or is currentColor, and the
 * default ink goes through `cn` first, so a caller that wants a different ink
 * passes its own `text-*` and replaces this one rather than fighting it.
 *
 * A client module, because the delivery tick draws itself. It is the only thing
 * on the panel that moves.
 */
export function AuthArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 460"
      className={cn("text-ink-50", className)}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Hairline grid, the same measure as the page's own rhythm. It is the
          drawing's own ink at 7% rather than a colour of its own: a grid you can
          name the colour of is a grid that is being looked at. */}
      <g stroke="currentColor" strokeOpacity="0.07" strokeWidth="1">
        {[60, 120, 180, 240, 300, 360, 420].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="460" />
        ))}
        {[60, 120, 180, 240, 300, 360, 420].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="520" y2={y} />
        ))}
      </g>

      {/* Two soft washes, so the flat ground has depth without a photograph.
          Both stops of each name the same mix and only the opacity falls away:
          a stop fading to `transparent` is fading to transparent BLACK, and a
          renderer that does not premultiply drags the wash through grey on the
          way out. */}
      <defs>
        <radialGradient id="auth-wash-ember" cx="0.5" cy="0.5" r="0.5">
          <stop
            offset="0"
            stopColor="color-mix(in oklab, var(--color-gold-500) 34%, transparent)"
          />
          <stop
            offset="1"
            stopColor="color-mix(in oklab, var(--color-gold-500) 34%, transparent)"
            stopOpacity="0"
          />
        </radialGradient>
        <radialGradient id="auth-wash-evergreen" cx="0.5" cy="0.5" r="0.5">
          <stop
            offset="0"
            stopColor="color-mix(in oklab, var(--color-brand-500) 40%, transparent)"
          />
          <stop
            offset="1"
            stopColor="color-mix(in oklab, var(--color-brand-500) 40%, transparent)"
            stopOpacity="0"
          />
        </radialGradient>
      </defs>
      <circle cx="380" cy="110" r="150" fill="url(#auth-wash-ember)" />
      <circle cx="130" cy="360" r="170" fill="url(#auth-wash-evergreen)" />

      {/* The route a parcel takes: dashed, with the doorstep at the end. The
          dash repeats every 12 units so it divides the 60-unit grid behind it
          exactly, and the caps are square — a rounded cap is the one detail
          that would put this drawing at odds with every corner on the site. */}
      <path
        d="M40 404 C 150 404, 150 330, 250 330"
        stroke="var(--color-gold-400)"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="4 8"
        strokeLinecap="square"
      />
      <rect x="34" y="398" width="12" height="12" fill="var(--color-gold-400)" />

      {/* The parcel. Front, top and side faces — square, banded in ember.
          Three steps of the one evergreen do all the shading, and the face that
          turns away is the panel's own brand-950, so the box loses itself in the
          ground there and only its edge holds the silhouette. */}
      <g>
        <polygon points="170,190 290,132 430,132 310,190" fill="var(--color-brand-700)" />
        <polygon points="310,190 430,132 430,278 310,336" fill="var(--color-brand-950)" />
        <polygon points="170,190 310,190 310,336 170,336" fill="var(--color-brand-800)" />

        {/* The band, carried across all three faces so the box reads as solid.
            One ember at three strengths — brightest where the top catches the
            light, held back where the side turns away — rather than three
            separate mixed colours doing the same job. */}
        <polygon
          points="228,190 258,190 258,336 228,336"
          fill="var(--color-gold-400)"
          fillOpacity="0.9"
        />
        <polygon
          points="228,190 348,132 378,132 258,190"
          fill="var(--color-gold-300)"
          fillOpacity="0.85"
        />
        <polygon
          points="348,132 378,132 378,206 348,224"
          fill="var(--color-gold-400)"
          fillOpacity="0.5"
        />

        {/* Edges, as hairlines rather than outlines. */}
        <g stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.25">
          <polyline points="170,190 290,132 430,132 430,278 310,336 170,336 170,190" />
          <line x1="310" y1="190" x2="310" y2="336" />
          <line x1="310" y1="190" x2="430" y2="132" />
          <line x1="170" y1="190" x2="310" y2="190" />
        </g>
      </g>

      {/* The order, floating in front: a card with a few ruled lines. The paper
          is the drawing's own ink at full strength, which is why the writing on
          it has to name the dark outright — currentColor here is the sheet, not
          the pen. */}
      <g>
        <rect x="64" y="228" width="136" height="112" fill="currentColor" />
        <rect
          x="64"
          y="228"
          width="136"
          height="112"
          stroke="var(--color-gold-400)"
          strokeOpacity="0.45"
        />
        <rect x="80" y="248" width="72" height="7" fill="var(--color-brand-950)" fillOpacity="0.75" />
        <rect x="80" y="268" width="104" height="5" fill="var(--color-brand-950)" fillOpacity="0.28" />
        <rect x="80" y="282" width="88" height="5" fill="var(--color-brand-950)" fillOpacity="0.28" />
        <rect x="80" y="296" width="96" height="5" fill="var(--color-brand-950)" fillOpacity="0.28" />
        <rect x="80" y="316" width="40" height="10" fill="var(--color-gold-400)" />
      </g>

      {/* Delivered. The tick is the one thing here that moves: it draws itself
          in half a second, so the panel makes its promise once and then holds
          still while somebody reads a form and types a password. Under reduced
          motion DrawIn renders it already finished. */}
      <g>
        <rect x="372" y="286" width="64" height="64" fill="var(--color-gold-400)" />
        <DrawIn duration={500}>
          <path
            d="M388 318 l12 12 l20 -24"
            stroke="var(--color-brand-950)"
            strokeWidth="6"
            strokeLinecap="square"
            strokeLinejoin="miter"
            {...drawnPath}
          />
        </DrawIn>
      </g>
    </svg>
  );
}
