import type { Metadata } from "next";
import Link from "next/link";
import { Headset, MessageCircle, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/primitives";
import { buttonClasses } from "@/components/ui/button";
import { FaqAccordion } from "./faq-accordion";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/seo/json-ld";
import { faqs } from "@/data/policies";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = {
  title: "Help and FAQ",
  description: `Answers to the questions customers actually ask about orders, delivery, payments, returns and products on ${BUSINESS.brandName}.`,
  alternates: { canonical: "/faq" },
  openGraph: {
    title: `Help and FAQ · ${BUSINESS.brandName}`,
    description: "Answers about orders, delivery, payments and returns.",
    url: "/faq",
  },
};

const crumbs = [
  { name: "Home", href: "/" },
  { name: "Help and FAQ", href: "/faq" },
];

export default function FaqPage() {
  const allItems = faqs.flatMap((group) => group.items);

  return (
    <div className="container-page py-5 sm:py-7">
      <BreadcrumbJsonLd items={crumbs} />
      <FaqJsonLd items={allItems} />
      <Breadcrumbs items={crumbs} className="mb-6" />

      <header className="mb-10 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
          Help centre
        </p>
        <h1 className="mt-2.5 font-display text-[32px] leading-[1.06] tracking-[-0.03em] text-ink-950 sm:text-[42px]">
          Questions people actually ask
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
          {allItems.length} answers, written by the team who handles the support inbox. If yours is
          not here, we would genuinely like to know.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <FaqAccordion groups={faqs} />

        <aside className="space-y-4 lg:sticky lg:top-[132px] lg:h-fit">
          <div className="rounded-xl border border-hairline bg-surface p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Headset size={19} />
            </span>
            <h2 className="mt-4 font-display text-lg tracking-[-0.015em] text-ink-950">
              Still stuck?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
              We answer {BUSINESS.supportHours}. A person replies, not a bot. Anything that arrives
              outside those hours is answered the next working day.
            </p>
            <div className="mt-4 space-y-2">
              <Link href="/contact" className={buttonClasses("primary", "md", "w-full")}>
                <MessageCircle size={15} /> Message us
              </Link>
              <a
                href={`tel:${BUSINESS.supportPhoneDigits}`}
                className={buttonClasses("outline", "md", "w-full")}
              >
                <Phone size={15} /> {BUSINESS.supportPhone}
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-hairline bg-surface p-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
              Read the policies
            </h2>
            <ul className="mt-3 space-y-2">
              {[
                { label: "Shipping and delivery", href: "/legal/shipping" },
                { label: "Refund and cancellation", href: "/legal/refunds" },
                { label: "Payments and security", href: "/legal/payments" },
                { label: "Privacy policy", href: "/legal/privacy" },
                { label: "Terms of use", href: "/legal/terms" },
                { label: "Disclaimer", href: "/legal/disclaimer" },
              ].map((link) => (
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
          </div>
        </aside>
      </div>
    </div>
  );
}
