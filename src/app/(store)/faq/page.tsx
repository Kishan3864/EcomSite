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
      <Breadcrumbs items={crumbs} className="mb-4 sm:mb-6" />

      <header className="mb-5 max-w-2xl sm:mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
          Help centre
        </p>
        <h1 className="mt-2 font-display text-[22px] leading-[1.1] tracking-[-0.03em] text-ink-950 sm:mt-2.5 sm:text-[42px] sm:leading-[1.06]">
          Questions people actually ask
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-600 sm:mt-4 sm:text-[15px]">
          {allItems.length} answers, written by the team who handles the support inbox. If yours is
          not here, we would genuinely like to know.
        </p>
      </header>

      <div className="grid gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <FaqAccordion groups={faqs} />

        <aside className="min-w-0 space-y-2.5 sm:space-y-4 lg:sticky lg:top-[132px] lg:h-fit">
          <div className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
            {/* Icon beside the heading on phones, above it from sm. */}
            <div className="flex items-center gap-3 sm:block">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:h-11 sm:w-11">
                <Headset size={19} />
              </span>
              <h2 className="font-display text-[16px] tracking-[-0.015em] text-ink-950 sm:mt-4 sm:text-lg">
                Still stuck?
              </h2>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-600 sm:mt-2 sm:text-[13px]">
              We answer {BUSINESS.supportHours}. A person replies, not a bot. Anything that arrives
              outside those hours is answered the next working day.
            </p>
            <div className="mt-3 space-y-2 sm:mt-4">
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

          <div className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:text-[12px]">
              Read the policies
            </h2>
            {/* Two columns of 40px rows on phones instead of six short lines
                that are hard to hit with a thumb. */}
            <ul className="mt-1.5 grid grid-cols-2 gap-x-3 sm:mt-3 sm:block sm:space-y-2">
              {[
                { label: "Shipping and delivery", href: "/legal/shipping" },
                { label: "Refund and cancellation", href: "/legal/refunds" },
                { label: "Payments and security", href: "/legal/payments" },
                { label: "Privacy policy", href: "/legal/privacy" },
                { label: "Terms of use", href: "/legal/terms" },
                { label: "Disclaimer", href: "/legal/disclaimer" },
              ].map((link) => (
                <li key={link.href} className="min-w-0">
                  <Link
                    href={link.href}
                    className="tap flex min-h-10 items-center text-[12.5px] text-ink-600 transition-colors hover:text-brand-700 sm:inline sm:min-h-0 sm:text-[13px]"
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
