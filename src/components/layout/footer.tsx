import Link from "next/link";
import {
  ChevronDown,
  Headset,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { BRAND, Logo } from "@/components/brand/logo";
import { BUSINESS, formatAddress, isFilled, isGstRegistered } from "@/config/business";
import { InstagramIcon, YoutubeIcon } from "@/components/brand/social-icons";
import { getCategories } from "@/services/catalog";
import { trustBadges } from "@/data/marketing";
import { NewsletterForm } from "./newsletter-form";
import { mailConfigured } from "@/lib/mail";

const TRUST_ICONS = {
  truck: Truck,
  "rotate-ccw": RotateCcw,
  "shield-check": ShieldCheck,
  headset: Headset,
} as const;

const LINK_COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/products" },
      { label: "New arrivals", href: "/products?sort=newest" },
      { label: "Bestsellers", href: "/products?sort=popularity" },
      { label: "Under ₹999", href: "/products?maxPrice=999" },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
      { label: "My orders", href: "/account/orders" },
      { label: "Track an order", href: "/track" },
      { label: "Returns and refunds", href: "/account/returns" },
      { label: "Wishlist", href: "/wishlist" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: `About ${BUSINESS.brandName}`, href: "/about" },
      { label: "What we do", href: "/services" },
      { label: "Contact us", href: "/contact" },
      { label: "Help and FAQ", href: "/faq" },
      { label: "Track an order", href: "/track" },
    ],
  },
  {
    // Every policy page reachable from every page, without logging in. Payment
    // aggregators check this specifically during merchant review.
    title: "Policies",
    links: [
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Terms of use", href: "/legal/terms" },
      { label: "Refund and cancellation", href: "/legal/refunds" },
      { label: "Shipping and delivery", href: "/legal/shipping" },
      { label: "Payments and security", href: "/legal/payments" },
      { label: "Disclaimer", href: "/legal/disclaimer" },
    ],
  },
];

export async function Footer() {
  const categories = await getCategories();
  return (
    // No top margin below lg: the <main> above already ends in pb-16 there.
    <footer className="bg-surface lg:mt-20">
      {/* Trust strip. Four rows on one shared hairline grid, the way the rest
          of the site draws a set of equal things — the coloured chip behind each
          glyph was the last card look left in the chrome. All four stay: this is
          the only place the return window is printed on the screen somebody is
          standing on when they decide whether to buy. */}
      <div>
        <div className="container-page py-4 sm:py-8">
          <div className="tile-grid overflow-hidden grid-cols-2 lg:grid-cols-4">
            {trustBadges.map((badge) => {
              const Icon = TRUST_ICONS[badge.icon as keyof typeof TRUST_ICONS];
              return (
                <div key={badge.title} className="flex items-start gap-2.5 p-3 sm:gap-3.5 sm:p-5">
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    aria-hidden
                    className="mt-px shrink-0 text-ink-900"
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-[1.35] tabular-nums text-ink-950 sm:text-[13.5px]">
                      {badge.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-[1.45] text-ink-500">
                      {badge.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Newsletter. The one dark plane in the chrome, so it gets the shared
          eyebrow class rather than the hand-rolled gold label it used to carry. */}
      <div className="deep-plane">
        <div className="container-page grid gap-4 py-8 sm:gap-8 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <span className="eyebrow eyebrow-dark">The WeekendCart Dispatch</span>
            <h2 className="mt-3 font-display text-[22px] leading-[1.1] tracking-[-0.02em] text-white sm:mt-4 sm:text-[32px]">
              New drops and genuine offers. No noise, no spam.
            </h2>
            <p className="mt-3 max-w-[46ch] text-[14px] leading-[1.55] text-white/70 sm:mt-4 sm:text-[15px] sm:leading-[1.6]">
              We write about what we have stocked and why, plus first word when something is back
              in stock. Unsubscribe in one click.
            </p>
          </div>
          <NewsletterForm welcomeEmail={mailConfigured()} />
        </div>
      </div>

      {/* Links */}
      <div className="container-page grid gap-6 py-7 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 sm:py-14 md:grid-cols-4 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:gap-12">
        <div className="sm:col-span-2 md:col-span-4 lg:col-span-1">
          <Logo />
          <p className="mt-3.5 max-w-[46ch] text-[13px] leading-[1.55] text-ink-600 sm:mt-4 sm:text-[14px] sm:leading-[1.6]">
            {BRAND.description}
          </p>
          {/* The glyphs are decoration beside text that already says what each
              line is, so they sit at ink-400 with the rest of the drawn marks
              rather than pulling brand colour into a repeating list. */}
          <ul className="mt-4 space-y-2.5 text-[13px] text-ink-600 sm:mt-5 sm:text-[13.5px]">
            <li className="flex items-center gap-2.5">
              <Phone size={14} strokeWidth={1.5} aria-hidden className="shrink-0 text-ink-400" />
              <a
                href={`tel:${BRAND.supportPhoneTel}`}
                className="tap tabular-nums transition-colors duration-200 hover:text-brand-700"
              >
                {BRAND.supportPhone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail size={14} strokeWidth={1.5} aria-hidden className="shrink-0 text-ink-400" />
              <a
                href={`mailto:${BRAND.supportEmail}`}
                className="tap min-w-0 break-all transition-colors duration-200 hover:text-brand-700"
              >
                {BRAND.supportEmail}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin size={14} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-ink-400" />
              <span className="min-w-0 leading-[1.5]">{formatAddress()}</span>
            </li>
          </ul>
          <div className="mt-5 flex gap-1.5 sm:mt-6">
            {[
              { href: BRAND.social.instagram, icon: InstagramIcon, label: "Instagram" },
              { href: BRAND.social.youtube, icon: YoutubeIcon, label: "YouTube" },
            ]
              // A dead social link is a trust signal reviewers notice. Render
              // only the profiles that actually exist.
              .filter(({ href }) => isFilled(href))
              .map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noreferrer noopener"
                className="tap is-circle flex h-10 w-10 items-center justify-center text-ink-600 transition-colors duration-200 hover:bg-ink-50 hover:text-ink-950 lg:h-9 lg:w-9"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {LINK_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="hidden sm:block">
            <h3 className="mb-4 pb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950">
              {column.title}
            </h3>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-ink-600 transition-colors duration-200 hover:text-brand-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {/* Phones get the same columns as an accordion, the way an app lists them:
            four tidy rows instead of four stacked lists. Only one set is ever
            displayed, so assistive tech never meets the links twice. */}
        <div className="sm:hidden">
          {LINK_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <details name="footer-links" className="group">
                <summary className="tap flex h-11 list-none items-center justify-between [&::-webkit-details-marker]:hidden">
                  <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950">
                    {column.title}
                  </h3>
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className="text-ink-400 transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <ul className="pb-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="tap flex h-10 items-center text-[13px] text-ink-600"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </nav>
          ))}
        </div>
      </div>

      {/* Category sitemap. Left out entirely while there are no departments —
          a heading with nothing under it reads as something that failed to
          load, and it comes back by itself with the first category. */}
      {categories.length > 0 && (
      <div>
        <div className="container-page py-5 sm:py-8">
          <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:mb-4">
            Browse every category
          </h3>
          {/* On phones the chips wrap inside a wide strip that scrolls sideways,
              a few rows deep, rather than stacking a dozen rows down the page.

              They are ruled boxes now, not pills: a department is drawn with a
              full ink edge and a collection with a hairline, so the hierarchy is
              read from the weight of the rule instead of from two shades of
              grey fill. */}
          <div className="-mx-3 overflow-x-auto px-3 no-scrollbar sm:mx-0 sm:overflow-visible sm:px-0">
            <ul className="flex w-max max-w-[72rem] flex-wrap gap-x-1.5 gap-y-1.5 sm:w-auto sm:max-w-none">
              {categories.flatMap((c) => [
                <li key={c.slug}>
                  <Link
                    href={`/c/${c.slug}`}
                    className="tap inline-block px-2.5 py-1.5 text-[13px] font-medium text-ink-950 transition-colors duration-200 hover:bg-ink-950 hover:text-white sm:px-3"
                  >
                    {c.name}
                  </Link>
                </li>,
                ...c.subcategories.map((s) => (
                  <li key={`${c.slug}-${s.slug}`}>
                    <Link
                      href={`/c/${c.slug}/${s.slug}`}
                      className="tap inline-block px-2.5 py-1.5 text-[13px] text-ink-600 transition-colors duration-200 hover:text-ink-950 sm:px-3"
                    >
                      {s.name}
                    </Link>
                  </li>
                )),
              ])}
            </ul>
          </div>
        </div>
      </div>
      )}

      {/* Legal. No bottom-nav clearance here: BottomNav leaves its own spacer
          after the footer, and only on the pages where it actually shows. */}
      <div className="bg-canvas">
        <div className="container-page flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-6">
          <p className="text-[13px] leading-[1.5] tabular-nums text-ink-500">
            &copy; {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.
            {isGstRegistered ? ` GSTIN ${BUSINESS.gstin}.` : ""}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-5">
            {[
              { label: "Privacy", href: "/legal/privacy" },
              { label: "Terms", href: "/legal/terms" },
              { label: "Refunds", href: "/legal/refunds" },
              { label: "Shipping", href: "/legal/shipping" },
              { label: "Payments", href: "/legal/payments" },
              { label: "Disclaimer", href: "/legal/disclaimer" },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="tap text-[13px] text-ink-500 transition-colors duration-200 hover:text-brand-700"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
