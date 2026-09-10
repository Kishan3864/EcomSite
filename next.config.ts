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
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://cdn.pixabay.com",
  "connect-src 'self'",
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
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },

  // Keep this origin out of other tabs' process, and out of their reach.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },

  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
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
