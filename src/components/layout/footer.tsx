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
      { label: "Today's offers", href: "/offers" },
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
    <footer className="border-t border-hairline bg-surface lg:mt-20">
      {/* Trust strip */}
      <div className="border-b border-hairline">
        <div className="container-page grid grid-cols-2 gap-x-3 gap-y-4 py-5 sm:gap-x-6 sm:gap-y-7 sm:py-9 lg:grid-cols-4">
          {trustBadges.map((badge) => {
            const Icon = TRUST_ICONS[badge.icon as keyof typeof TRUST_ICONS];
            return (
              <div key={badge.title} className="flex items-start gap-2.5 sm:gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:h-10 sm:w-10">
                  <Icon size={18} className="size-4 sm:size-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-ink-950 sm:text-[13px]">
                    {badge.title}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500 sm:text-[12px]">
                    {badge.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Newsletter */}
      <div className="peacock-surface">
        <div className="container-page grid gap-4 py-8 sm:gap-8 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">
              The WeekendCart Dispatch
            </p>
            <h2 className="mt-2 font-display text-[21px] leading-[1.1] tracking-[-0.02em] text-white sm:mt-3 sm:text-[38px]">
              New drops and genuine offers. No noise, no spam.
            </h2>
            <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-white/60 sm:mt-3 sm:text-sm">
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
          <Logo href={null} />
          <p className="mt-3 max-w-sm text-[12.5px] leading-relaxed text-ink-600 sm:mt-4 sm:text-[13px]">
            {BRAND.description}
          </p>
          <ul className="mt-4 space-y-2 text-[12.5px] text-ink-600 sm:mt-5 sm:text-[13px]">
            <li className="flex items-center gap-2.5">
              <Phone size={14} className="shrink-0 text-brand-600" />
              <a href={`tel:${BRAND.supportPhone}`} className="tap hover:text-brand-700">
                {BRAND.supportPhone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail size={14} className="shrink-0 text-brand-600" />
              <a
                href={`mailto:${BRAND.supportEmail}`}
                className="tap min-w-0 break-all hover:text-brand-700"
              >
                {BRAND.supportEmail}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin size={14} className="mt-0.5 shrink-0 text-brand-600" />
              <span className="min-w-0">{formatAddress()}</span>
            </li>
          </ul>
          <div className="mt-4 flex gap-2 sm:mt-5">
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
                className="tap flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition-colors hover:border-brand-500 hover:text-brand-700 lg:h-9 lg:w-9"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {LINK_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="hidden sm:block">
            <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-950">
              {column.title}
            </h3>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-ink-600 transition-colors hover:text-brand-700"
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
        <div className="border-t border-hairline sm:hidden">
          {LINK_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <details name="footer-links" className="group border-b border-hairline">
                <summary className="tap flex h-11 list-none items-center justify-between [&::-webkit-details-marker]:hidden">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-950">
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
                        className="tap flex h-10 items-center text-[12.5px] text-ink-600"
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
      <div className="border-t border-hairline">
        <div className="container-page py-5 sm:py-8">
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 sm:mb-3.5">
            Browse every category
          </h3>
          {/* On phones the chips wrap inside a wide strip that scrolls sideways,
              a few rows deep, rather than stacking a dozen rows down the page. */}
          <div className="-mx-3 overflow-x-auto px-3 no-scrollbar sm:mx-0 sm:overflow-visible sm:px-0">
            <ul className="flex w-max max-w-[72rem] flex-wrap gap-x-1.5 gap-y-1.5 sm:w-auto sm:max-w-none">
              {categories.flatMap((c) => [
                <li key={c.slug}>
                  <Link
                    href={`/c/${c.slug}`}
                    className="tap inline-block rounded-full bg-ink-100 px-2.5 py-1.5 text-[11.5px] font-medium text-ink-700 transition-colors hover:bg-brand-100 hover:text-brand-800 sm:px-3 sm:text-[12px]"
                  >
                    {c.name}
                  </Link>
                </li>,
                ...c.subcategories.map((s) => (
                  <li key={`${c.slug}-${s.slug}`}>
                    <Link
                      href={`/c/${c.slug}/${s.slug}`}
                      className="tap inline-block rounded-full px-2.5 py-1.5 text-[11.5px] text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 sm:px-3 sm:text-[12px]"
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
      <div className="border-t border-hairline bg-canvas">
        <div className="container-page flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-6">
          <p className="text-[11.5px] text-ink-500 sm:text-[12px]">
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
                  className="tap text-[11.5px] text-ink-500 hover:text-brand-700 sm:text-[12px]"
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
