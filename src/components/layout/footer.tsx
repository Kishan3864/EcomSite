import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  Clock,
  Headset,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { BRAND, LogoLight } from "@/components/brand/logo";
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

interface FooterLink {
  label: string;
  href: string;
}

const SHOP_LINKS: FooterLink[] = [
  { label: "All products", href: "/products" },
  { label: "New arrivals", href: "/products?sort=newest" },
  { label: "Bestsellers", href: "/products?sort=popularity" },
  { label: "Under ₹999", href: "/products?maxPrice=999" },
];

const STATIC_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Help",
    links: [
      { label: "Help and FAQ", href: "/faq" },
      { label: "Track an order", href: "/track" },
      { label: "My orders", href: "/account/orders" },
      { label: "Returns and refunds", href: "/account/returns" },
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
      { label: "Wishlist", href: "/wishlist" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: `About ${BUSINESS.brandName}`, href: "/about" },
      { label: "What we do", href: "/services" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    // Every policy reachable from every page, signed out — payment reviewers check.
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

const LEGAL_LINKS: FooterLink[] = [
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
  { label: "Refunds", href: "/legal/refunds" },
  { label: "Shipping", href: "/legal/shipping" },
];

function ColumnList({ links, mobile = false }: { links: FooterLink[]; mobile?: boolean }) {
  return (
    <ul className={mobile ? "pb-3" : "space-y-2.5"}>
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className={
              mobile
                ? "tap flex h-10 items-center text-[13px] text-white/70 transition-colors hover:text-white"
                : "text-[13px] text-white/65 transition-colors duration-200 hover:text-white"
            }
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function Footer() {
  const categories = await getCategories();

  const columns = [
    {
      title: "Shop",
      links: [
        ...categories.slice(0, 6).map((c) => ({ label: c.name, href: `/c/${c.slug}` })),
        ...SHOP_LINKS,
      ],
    },
    ...STATIC_COLUMNS,
  ];

  const socials = [
    { href: BRAND.social.instagram, icon: InstagramIcon, label: "Instagram" },
    { href: BRAND.social.youtube, icon: YoutubeIcon, label: "YouTube" },
  ].filter(({ href }) => isFilled(href)); // only profiles that exist

  return (
    // No top margin below lg: <main> already ends in pb-16 there.
    <footer className="lg:mt-16">
      {/* Trust strip — the one place the return window shows on every page. */}
      <div className="container-page pb-6 sm:pb-10">
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {trustBadges.map((badge) => {
            const Icon = TRUST_ICONS[badge.icon as keyof typeof TRUST_ICONS];
            return (
              <li key={badge.title} className="card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start sm:p-4">
                <span className="icon-tile icon-tile-sm">
                  <Icon size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="t-h3 text-[13px] tabular-nums sm:text-[13.5px]">{badge.title}</p>
                  <p className="t-small mt-0.5">{badge.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="midnight relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgb(255_255_255/0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.35)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]" />

        <div className="container-page relative">
          {/* Newsletter band */}
          <div className="grid gap-5 border-b border-white/10 py-9 sm:py-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
            <div>
              <span className="eyebrow eyebrow-dark">The WeekendCart Dispatch</span>
              <h2 className="mt-3 text-[20px] font-semibold leading-[1.15] tracking-[-0.026em] text-white sm:text-[24px]">
                New drops and genuine offers. No noise, no spam.
              </h2>
              <p className="mt-2.5 max-w-[46ch] text-[13.5px] leading-[1.6] text-white/65">
                We write about what we have stocked and why, plus first word when something is back
                in stock. Unsubscribe in one click.
              </p>
            </div>
            <NewsletterForm welcomeEmail={mailConfigured()} />
          </div>

          {/* Brand + contact, then the link columns */}
          <div className="grid gap-8 py-9 sm:py-12 lg:grid-cols-[1.25fr_2.75fr] lg:gap-14">
            <div>
              <LogoLight />
              <p className="mt-4 max-w-[42ch] text-[13px] leading-[1.6] text-white/60">
                {BRAND.description}
              </p>
              <ul className="mt-5 space-y-3 text-[13px] text-white/75">
                <li className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.07] text-brand-200 ring-1 ring-inset ring-white/10">
                    <Phone size={14} aria-hidden />
                  </span>
                  <a
                    href={`tel:${BRAND.supportPhoneTel}`}
                    className="tap tabular-nums transition-colors hover:text-white"
                  >
                    {BRAND.supportPhone}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.07] text-brand-200 ring-1 ring-inset ring-white/10">
                    <Mail size={14} aria-hidden />
                  </span>
                  <a
                    href={`mailto:${BRAND.supportEmail}`}
                    className="tap min-w-0 break-all transition-colors hover:text-white"
                  >
                    {BRAND.supportEmail}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.07] text-brand-200 ring-1 ring-inset ring-white/10">
                    <Clock size={14} aria-hidden />
                  </span>
                  <span className="min-w-0 pt-1.5 leading-[1.5]">{BUSINESS.supportHours}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.07] text-brand-200 ring-1 ring-inset ring-white/10">
                    <MapPin size={14} aria-hidden />
                  </span>
                  <span className="min-w-0 pt-1.5 leading-[1.5]">{formatAddress()}</span>
                </li>
              </ul>

              {socials.length > 0 && (
                <div className="mt-6 flex gap-2">
                  {socials.map(({ href, icon: Icon, label }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="tap flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.07] text-white/80 ring-1 ring-inset ring-white/10 transition-colors duration-200 hover:bg-white/15 hover:text-white"
                    >
                      <Icon size={16} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop / tablet columns */}
            <div className="hidden gap-8 sm:grid sm:grid-cols-4">
              {columns.map((column) => (
                <nav key={column.title} aria-label={column.title}>
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                    {column.title}
                  </h3>
                  <ColumnList links={column.links} />
                </nav>
              ))}
            </div>

            {/* Phones: the same columns as an accordion (only one set ever shows) */}
            <div className="divide-y divide-white/10 border-y border-white/10 sm:hidden">
              {columns.map((column) => (
                <nav key={column.title} aria-label={column.title}>
                  <details name="footer-links" className="group">
                    <summary className="tap flex h-12 cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                        {column.title}
                      </h3>
                      <ChevronDown
                        size={16}
                        aria-hidden
                        className="text-white/60 transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <ColumnList links={column.links} mobile />
                  </details>
                </nav>
              ))}
            </div>
          </div>

          {/* Category sitemap, only when departments exist */}
          {categories.length > 0 && (
            <div className="border-t border-white/10 py-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Browse every category
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {categories.flatMap((c) => [
                  <li key={c.slug}>
                    <Link
                      href={`/c/${c.slug}`}
                      className="tap inline-flex h-8 items-center rounded-full bg-white/[0.08] px-3 text-[12.5px] font-medium text-white/85 transition-colors hover:bg-white/15 hover:text-white"
                    >
                      {c.name}
                    </Link>
                  </li>,
                  ...c.subcategories.map((s) => (
                    <li key={`${c.slug}-${s.slug}`}>
                      <Link
                        href={`/c/${c.slug}/${s.slug}`}
                        className="tap inline-flex h-8 items-center rounded-full px-3 text-[12.5px] text-white/60 ring-1 ring-inset ring-white/10 transition-colors hover:text-white hover:ring-white/25"
                      >
                        {s.name}
                      </Link>
                    </li>
                  )),
                ])}
              </ul>
            </div>
          )}

          {/* Legal line. BottomNav adds its own spacer after the footer. */}
          <div className="flex flex-col gap-3 border-t border-white/10 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] leading-[1.5] tabular-nums text-white/55">
              &copy; {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.
              {isGstRegistered ? ` GSTIN ${BUSINESS.gstin}.` : ""}
            </p>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="tap text-[12.5px] text-white/55 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/contact"
                  className="tap inline-flex items-center gap-1 text-[12.5px] font-medium text-gold-300 transition-colors hover:text-gold-200"
                >
                  Contact <ArrowUpRight size={14} aria-hidden />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
