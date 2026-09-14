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
 * third parties. Images may come from any https host: the browser fetches
 * remote ones directly (see src/lib/image-loader.ts).
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  // Nothing is framed but Google's sign-in. The gateway takes a whole page.
  "frame-src 'self' https://accounts.google.com/gsi/",
  // The gateway hand-off is a form this site posts to PayU. Every PayU host is
  // allowed, not just the two the form points at, because form-action governs
  // the whole redirect chain: posting to test.payu.in/_payment lands on
  // apitest.payu.in/public/, and naming only the first host blocks the second.
  // The failure is silent and looks like the site's own bug — the browser
  // reports the URL the form named, not the redirect it actually refused.
  "form-action 'self' https://payu.in https://*.payu.in",
  // Only Google's sign-in script is third-party. The gateway needs none:
  // the hand-off is a form post, not a script.
  "script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "font-src 'self' data:",
  // Any https host: a product photo may be a URL pasted into the admin panel,
  // and the browser loads it directly (see src/lib/image-loader.ts).
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://accounts.google.com/gsi/",
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
  // The gateway navigates the whole page rather than opening a popup, so
  // nothing needs a handle back to this window.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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

  /**
   * Type-checking during the production build, unless told not to.
   *
   * `next build` runs the TypeScript compiler over the whole project after it
   * has finished bundling, and on the VPS that step was killed by the kernel
   * for running the box out of memory — so a deploy could not complete at all.
   *
   * deploy/deploy.sh therefore sets SKIP_TYPE_CHECK=1. Nothing goes unchecked
   * by it: `npx tsc --noEmit` and `npx eslint src` run on the development
   * machine before every commit, over the same code, so a type error is caught
   * before it is ever pushed. Locally the flag is unset and a plain
   * `npm run build` still type-checks everything. (Next 16 no longer runs
   * ESLint during the build at all, so there is nothing to switch off there.)
   */
  typescript: { ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === "1" },

  // Stop announcing the framework and its version in every response. Version
  // disclosure is the first step of picking a known exploit.
  poweredByHeader: false,

  // Trailing slashes off, enforced by a redirect, so /products/ and /products
  // never both get indexed as separate URLs.
  trailingSlash: false,

  compress: true,

  images: {
    // No remotePatterns, deliberately. The optimiser would download a remote
    // image *from this server*, which cannot reach the internet reliably, and
    // hang until nginx answered 504. Remote photos are instead left to the
    // browser by src/components/ui/image.tsx, and a remote URL that somehow
    // reaches the optimiser is refused at once rather than hanging.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 420, 640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [64, 96, 128, 200, 256, 320, 384],
    // Uploads are content-addressed by key and never change; a month of caching
    // saves the optimiser re-encoding the same photograph on every deploy.
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
