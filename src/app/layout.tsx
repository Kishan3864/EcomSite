import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { BRAND } from "@/components/brand/logo";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/json-ld";
import { EnvironmentBadge } from "@/components/layout/environment-badge";

/**
 * The two typefaces, served from this repository rather than fetched.
 *
 * `next/font/google` downloads the files at build time, which quietly makes
 * every production build depend on the build machine reaching
 * fonts.googleapis.com. The VPS stopped being able to, and the build failed
 * with the site half-deployed — a dependency on somebody else's uptime, in the
 * one step that must not fail. The woff2 files (latin subset, variable weight)
 * now live in ./fonts and are committed, so the build needs no network at all
 * and the browser makes no request to Google either.
 *
 * Same files Google was serving, same subset. To refresh them, download the
 * URLs in fonts/README.md and replace the two files.
 */
const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  variable: "--font-jakarta",
  display: "swap",
  weight: "200 800",
  style: "normal",
});

const fraunces = localFont({
  src: "./fonts/fraunces-latin.woff2",
  variable: "--font-fraunces",
  display: "swap",
  weight: "400 700",
  style: "normal",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.url),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: [
    "online shopping India",
    "handloom",
    "electronics",
    "home and living",
    "Indian brands",
    "buy online",
  ],
  authors: [{ name: BRAND.legalName }],
  creator: BRAND.legalName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: BRAND.url,
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "shopping",
  // Installed from "Add to Home Screen", the site opens full-screen like an app.
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
  // iOS would otherwise underline prices and order numbers as phone numbers.
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  // The page canvas, so the browser's status bar and the sticky header read as
  // one surface, the way an app's top bar does.
  themeColor: "#f7f5f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Root layout carries only what every surface shares: fonts, global styles and
 * site-wide structured data. The storefront chrome lives in `(store)/layout`
 * and the admin panel brings its own shell.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IN"
      // Tells Next to suppress our smooth scrolling during route transitions.
      data-scroll-behavior="smooth"
      className={`${jakarta.variable} ${fraunces.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-900 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>

        {children}

        <EnvironmentBadge />

        <OrganizationJsonLd />
        <WebsiteJsonLd />
      </body>
    </html>
  );
}
