import Link from "next/link";
import {
  Headset,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { BRAND, Logo } from "@/components/brand/logo";
import { InstagramIcon, XIcon, YoutubeIcon } from "@/components/brand/social-icons";
import { getCategories } from "@/services/catalog";
import { trustBadges } from "@/data/marketing";
import { NewsletterForm } from "./newsletter-form";

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
      { label: "About Mayura", href: "/about" },
      { label: "Contact us", href: "/contact" },
      { label: "Help and FAQ", href: "/faq" },
      { label: "Shipping policy", href: "/legal/shipping" },
      { label: "Return policy", href: "/legal/returns" },
    ],
  },
];

export async function Footer() {
  const categories = await getCategories();
  return (
    <footer className="mt-20 border-t border-hairline bg-surface">
      {/* Trust strip */}
      <div className="border-b border-hairline">
        <div className="container-page grid grid-cols-2 gap-x-6 gap-y-7 py-9 lg:grid-cols-4">
          {trustBadges.map((badge) => {
            const Icon = TRUST_ICONS[badge.icon as keyof typeof TRUST_ICONS];
            return (
              <div key={badge.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink-950">{badge.title}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{badge.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Newsletter */}
      <div className="peacock-surface">
        <div className="container-page grid gap-8 py-14 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">
              The Mayura Dispatch
            </p>
            <h2 className="mt-3 font-display text-3xl leading-[1.1] tracking-[-0.02em] text-white sm:text-[38px]">
              One email a week. New drops, real discounts, no noise.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/60">
              We write about what we have stocked and why, plus early access to limited runs from
              our maker studios. Unsubscribe in one click.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      {/* Links */}
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:gap-12">
        <div>
          <Logo href={null} />
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-ink-600">
            {BRAND.description}
          </p>
          <ul className="mt-5 space-y-2 text-[13px] text-ink-600">
            <li className="flex items-center gap-2.5">
              <Phone size={14} className="text-brand-600" />
              <a href={`tel:${BRAND.supportPhone}`} className="hover:text-brand-700">
                {BRAND.supportPhone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail size={14} className="text-brand-600" />
              <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-brand-700">
                {BRAND.supportEmail}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin size={14} className="mt-0.5 shrink-0 text-brand-600" />
              <span>4th Floor, Ekam House, 27 Residency Road, Bengaluru 560025</span>
            </li>
          </ul>
          <div className="mt-5 flex gap-2">
            {[
              { href: BRAND.social.instagram, icon: InstagramIcon, label: "Instagram" },
              { href: BRAND.social.twitter, icon: XIcon, label: "X" },
              { href: BRAND.social.youtube, icon: YoutubeIcon, label: "YouTube" },
            ].map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition-colors hover:border-brand-500 hover:text-brand-700"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {LINK_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
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
      </div>

      {/* Category sitemap */}
      <div className="border-t border-hairline">
        <div className="container-page py-8">
          <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Browse every category
          </h3>
          <ul className="flex flex-wrap gap-x-1.5 gap-y-1.5">
            {categories.flatMap((c) => [
              <li key={c.slug}>
                <Link
                  href={`/c/${c.slug}`}
                  className="inline-block rounded-full bg-ink-100 px-3 py-1.5 text-[12px] font-medium text-ink-700 transition-colors hover:bg-brand-100 hover:text-brand-800"
                >
                  {c.name}
                </Link>
              </li>,
              ...c.subcategories.map((s) => (
                <li key={`${c.slug}-${s.slug}`}>
                  <Link
                    href={`/c/${c.slug}/${s.slug}`}
                    className="inline-block rounded-full px-3 py-1.5 text-[12px] text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                  >
                    {s.name}
                  </Link>
                </li>
              )),
            ])}
          </ul>
        </div>
      </div>

      {/* Legal */}
      <div className="border-t border-hairline bg-canvas">
        <div className="container-page flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-ink-500">
            &copy; {new Date().getFullYear()} {BRAND.legalName}. All rights reserved. GSTIN
            29AABCM1234K1ZP.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              { label: "Privacy", href: "/legal/privacy" },
              { label: "Terms", href: "/legal/terms" },
              { label: "Shipping", href: "/legal/shipping" },
              { label: "Returns", href: "/legal/returns" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[12px] text-ink-500 hover:text-brand-700">
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
