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
 * in brass. Purely decorative, so it is hidden from screen readers; the panel's
 * heading and list carry the meaning.
 */
export function AuthArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 460"
      className={className}
      fill="none"
      aria-hidden
      focusable="false"
    >
      {/* Hairline grid, the same measure as the page's own rhythm. */}
      <g stroke="#d0a04b" strokeOpacity="0.07" strokeWidth="1">
        {[60, 120, 180, 240, 300, 360, 420].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="460" />
        ))}
        {[60, 120, 180, 240, 300, 360, 420].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="520" y2={y} />
        ))}
      </g>

      {/* Two soft washes, so the flat ground has depth without a photograph. */}
      <defs>
        <radialGradient id="auth-wash-gold" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#d0a04b" stopOpacity="0.28" />
          <stop offset="1" stopColor="#d0a04b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="auth-wash-green" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#648b78" stopOpacity="0.35" />
          <stop offset="1" stopColor="#648b78" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="380" cy="110" r="150" fill="url(#auth-wash-gold)" />
      <circle cx="130" cy="360" r="170" fill="url(#auth-wash-green)" />

      {/* The route a parcel takes: dashed, with the doorstep at the end. */}
      <path
        d="M40 404 C 150 404, 150 330, 250 330"
        stroke="#d0a04b"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="5 7"
        strokeLinecap="round"
      />
      <rect x="34" y="398" width="12" height="12" fill="#d0a04b" />

      {/* The parcel. Front, top and side faces — square, banded in brass. */}
      <g>
        <polygon points="170,190 290,132 430,132 310,190" fill="#274337" />
        <polygon points="310,190 430,132 430,278 310,336" fill="#16261f" />
        <polygon points="170,190 310,190 310,336 170,336" fill="#1e332b" />

        {/* The band, carried across all three faces so the box reads as solid. */}
        <polygon points="228,190 258,190 258,336 228,336" fill="#d0a04b" fillOpacity="0.9" />
        <polygon points="228,190 348,132 378,132 258,190" fill="#dfb96f" fillOpacity="0.85" />
        <polygon points="348,132 378,132 378,206 348,224" fill="#b8832f" fillOpacity="0.85" />

        {/* Edges, as hairlines rather than outlines. */}
        <g stroke="#648b78" strokeOpacity="0.5" strokeWidth="1.25">
          <polyline points="170,190 290,132 430,132 430,278 310,336 170,336 170,190" />
          <line x1="310" y1="190" x2="310" y2="336" />
          <line x1="310" y1="190" x2="430" y2="132" />
          <line x1="170" y1="190" x2="310" y2="190" />
        </g>
      </g>

      {/* The order, floating in front: a card with a few ruled lines. */}
      <g>
        <rect x="64" y="228" width="136" height="112" fill="#f7f5f1" />
        <rect x="64" y="228" width="136" height="112" stroke="#d0a04b" strokeOpacity="0.5" />
        <rect x="80" y="248" width="72" height="7" fill="#0b1611" fillOpacity="0.75" />
        <rect x="80" y="268" width="104" height="5" fill="#0b1611" fillOpacity="0.28" />
        <rect x="80" y="282" width="88" height="5" fill="#0b1611" fillOpacity="0.28" />
        <rect x="80" y="296" width="96" height="5" fill="#0b1611" fillOpacity="0.28" />
        <rect x="80" y="316" width="40" height="10" fill="#d0a04b" />
      </g>

      {/* Delivered. */}
      <g>
        <rect x="372" y="286" width="64" height="64" fill="#d0a04b" />
        <path
          d="M388 318 l12 12 l20 -24"
          stroke="#0b1611"
          strokeWidth="6"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </g>
    </svg>
  );
}
