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
  //
  // same-origin-allow-popups, not same-origin. Google Identity Services signs
  // a customer in through a popup that has to hand the credential back to the
  // window that opened it. Strict same-origin severs that handle: the popup
  // opens, shows a blank page, and can never report anything — which is
  // exactly how this broke once, when the setting was tightened on the
  // assumption that nothing here used popups any more.
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
    // Every width listed here is a variant the optimiser may be asked to encode
    // for every photograph, and each one is a separate AVIF encode the first
    // time. Sixteen widths meant a product page could ask for twenty uncached
    // variants at once. These ten are the widths the layout really renders:
    //
    //   64 128        bag, checkout, search and gallery thumbnails (44–80 px, 1–2x)
    //   256 384       product cards: 152 px rail and ~190 px grid on phones,
    //                 224–290 px on desktop, at 1x and 2x
    //   480 640       cards at 3x; the homepage feature on tablets
    //   828 1080      the gallery on a phone (360–430 px wide at 2–3x)
    //   1440 1920     the gallery and hero on desktop (up to ~800 px at 2x), lightbox
    deviceSizes: [480, 640, 828, 1080, 1440, 1920],
    imageSizes: [64, 128, 256, 384],
    // A year. An upload is content-addressed and a catalogue file is named for
    // its product, so neither changes under the same URL; to replace a
    // photograph, give the new file a new name. With the cache now kept across
    // deploys (deploy/link-image-cache.mjs) this is what stops a photograph
    // being re-encoded every month for no reason.
    minimumCacheTTL: 31536000,
    // The cache outlives releases now, so it is given a ceiling: least recently
    // used variants are dropped beyond 1 GB.
    maximumDiskCacheSize: 1_000_000_000,
    // 75 is the site default (see src/components/ui/image.tsx for why it went
    // back from 90). 90 stays on the list so one image can still ask for it;
    // Next refuses any quality that is not listed here.
    qualities: [75, 90],
    // The optimiser will not process an SVG — one can carry script.
    dangerouslyAllowSVG: false,
  },

  /**
   * Version-skew protection — the fix for "it worked a minute ago".
   *
   * A browser that had the shop open before a deploy is still running the old
   * build's JavaScript. Its Server Action ids and its chunk URLs belong to a
   * build that no longer exists on disk, so the next form submission answers
   * "Failed to find Server Action …", and a client-side navigation can ask for
   * a chunk that 404s. Both look to the shopper like the site randomly broke.
   *
   * With a deploymentId set, Next stamps `?dpl=` on static assets and sends an
   * `x-deployment-id` header on navigations. When the server sees an id that is
   * not its own it forces a hard navigation instead of a soft one, so the
   * browser picks up the new build rather than failing against it.
   *
   * It comes from the environment, and `deploy/deploy.sh` sets it to the commit
   * being released — so it is identical across every rebuild of the same commit
   * and changes exactly when the code does. Unset (a local `next dev`/`build`),
   * it is undefined and Next behaves as before.
   */
  deploymentId: process.env.DEPLOYMENT_ID,

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
        // The same, for the JPEG twins scripts/email-image-twins.mjs writes
        // beside product photos. They exist only to be embedded in email — the
        // order confirmation's lines, the review request's cards — and were
        // still carrying same-origin CORP, which a client that enforces it
        // answers with a broken image (a headless Chromium refused them with
        // ERR_BLOCKED_BY_RESPONSE.NotSameOrigin; Gmail's image proxy fetches
        // server-side and never noticed). The site's own product photos keep
        // same-origin: the pages serve them through the image optimiser.
        source: "/products/:path*/:file(.+\\.email\\.jpg)",
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
