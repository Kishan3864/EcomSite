import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * `script-src` carries 'unsafe-inline' deliberately. The strict alternative is
 * a per-request nonce injected from middleware, but a nonce changes on every
 * request, which would force all 217 statically generated pages to render
 * dynamically — trading a large, certain speed win for a small, uncertain
 * security one. React escapes interpolated values by default and the only
 * `dangerouslySetInnerHTML` in the codebase emits our own JSON-LD built from
 * typed data, never user input, so the XSS surface a nonce would close is
 * already shut at the source.
 *
 * Everything else is locked down: no plugins, no framing, no form posts to
 * third parties, and images only from the CDNs configured below.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  // Checkout renders the bank and UPI pages inside an iframe it owns.
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com https://accounts.google.com/gsi/",
  "child-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
  // A bank's 3-D Secure page posts back through Razorpay.
  "form-action 'self' https://api.razorpay.com https://checkout.razorpay.com",
  // Razorpay's checkout script. It is loaded from their CDN and cannot be
  // self-hosted: it is versioned by them and must stay current for card
  // network and UPI changes.
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://accounts.google.com/gsi/client",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://cdn.pixabay.com https://cdn.razorpay.com https://badges.razorpay.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://platform-lookaside.fbsbx.com",
  // Checkout talks to the gateway directly from the browser, and reports its
  // own telemetry to lumberjack. Blocking either breaks the payment flow with
  // no visible error.
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com https://accounts.google.com/gsi/",
  "manifest-src 'self'",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

/** Applied to every response. */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },

  // Tell browsers to only ever reach this origin over HTTPS. Two years, with
  // subdomains, and eligible for the browser preload list.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },

  // Stop the browser guessing a response's type — the trick behind a
  // "harmless" upload being executed as script.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Belt and braces alongside frame-ancestors, for older browsers. Clickjacking
  // a checkout is the attack this closes.
  { key: "X-Frame-Options", value: "DENY" },

  // Never leak the full URL — which can carry an order id — to another origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // We ask for none of these, so deny them all rather than leaving it to a
  // future component to request one quietly.
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      // Checkout may use the Payment Request API on supported browsers.
      "payment=(self \"https://checkout.razorpay.com\")",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },

  // Keep this origin out of other tabs' process, and out of their reach.
  // same-origin-allow-popups, not same-origin: Razorpay opens the UPI and
  // bank flows in a popup and needs a handle back to this window to report the
  // result. Strict same-origin severs that and the payment silently hangs.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },

  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  /**
   * Where the build is written.
   *
   * `next start` serves chunks and prerendered pages out of this directory as
   * requests come in, so building into it while the site is live rewrites the
   * floor underneath the running process — and a build that then fails leaves
   * it there, which is how a deploy turned the shop into unstyled HTML.
   *
   * `deploy/deploy.sh` sets NEXT_DIST_DIR to build somewhere else entirely and
   * only moves the finished build into place, so the running site sees nothing
   * until there is a complete one to swap to. Unset — every local `npm run
   * dev` and `npm run build` — it is the usual `.next`.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Stop announcing the framework and its version in every response. Version
  // disclosure is the first step of picking a known exploit.
  poweredByHeader: false,

  // Trailing slashes off, enforced by a redirect, so /products/ and /products
  // never both get indexed as separate URLs.
  trailingSlash: false,

  compress: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 420, 640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [64, 96, 128, 200, 256, 320, 384],
    // A remote image is content-addressed by URL; a month of caching saves the
    // optimiser re-encoding the same photograph on every deploy.
    minimumCacheTTL: 2592000,
    // The optimiser will not process an SVG — one can carry script.
    dangerouslyAllowSVG: false,
  },

  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        // Brand images are embedded by email clients from other origins (the
        // welcome email's logo); same-origin CORP would let some of them refuse.
        // Later rules win for the same header key, so this overrides the above.
        source: "/brand/:path*",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "cross-origin" }],
      },
      {
        // Content-hashed build output never changes under the same name.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Signed-in surfaces must never sit in a shared or browser cache.
        source: "/(account|admin|checkout|cart)/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
