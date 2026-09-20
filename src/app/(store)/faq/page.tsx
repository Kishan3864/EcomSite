import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MessageCircle, Phone } from "lucide-react";
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

const POLICY_LINKS = [
  { label: "Shipping and delivery", href: "/legal/shipping" },
  { label: "Refund and cancellation", href: "/legal/refunds" },
  { label: "Payments and security", href: "/legal/payments" },
  { label: "Privacy policy", href: "/legal/privacy" },
  { label: "Terms of use", href: "/legal/terms" },
  { label: "Disclaimer", href: "/legal/disclaimer" },
];

export default function FaqPage() {
  const allItems = faqs.flatMap((group) => group.items);

  return (
    <div className="container-page py-5 sm:py-7">
      <BreadcrumbJsonLd items={crumbs} />
      <FaqJsonLd items={allItems} />
      <Breadcrumbs items={crumbs} className="mb-4 sm:mb-6" />

      <header className="mb-7 pb-6 sm:mb-10 sm:pb-8">
        <span className="eyebrow">Help centre</span>
        <h1 className="mt-3 max-w-[22ch] font-display text-[26px] leading-[1.06] tracking-[-0.03em] text-ink-950 sm:mt-4 sm:text-[42px]">
          Questions people actually ask
        </h1>
        <p className="mt-4 max-w-[62ch] text-[14px] leading-[1.6] text-ink-600 sm:text-[15px]">
          <span className="tabular-nums">{allItems.length}</span> answers, written by the team who
          handles the support inbox. If yours is not here, we would genuinely like to know.
        </p>
      </header>

      <div className="grid gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <FaqAccordion groups={faqs} />

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-[132px] lg:h-fit">
          <div className="bg-surface shadow-sm p-4 sm:p-5">
            <h2 className="font-display text-[20px] leading-tight tracking-[-0.02em] text-ink-950">
              Still stuck?
            </h2>
            <p className="mt-2.5 text-[13px] leading-[1.6] text-ink-600">
              We answer {BUSINESS.supportHours}. A person replies, not a bot. Anything that arrives
              outside those hours is answered the next working day.
            </p>
            <div className="mt-4 space-y-2">
              <Link href="/contact" className={buttonClasses("primary", "md", "w-full")}>
                <MessageCircle size={15} /> Message us
              </Link>
              <a
                href={`tel:${BUSINESS.supportPhoneTel}`}
                className={buttonClasses("outline", "md", "w-full tabular-nums")}
              >
                <Phone size={15} /> {BUSINESS.supportPhone}
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              Read the policies
            </h2>
            {/* A ruled index. Six policy pages listed as an index is how a
                reader expects to be handed the small print, and every row is a
                44px target for a thumb. */}
            <ul className="mt-2">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="tap group flex h-11 items-center justify-between gap-4 text-[13px] text-ink-700 transition-colors hover:text-brand-700"
                  >
                    {link.label}
                    <ChevronRight
                      size={14}
                      className="shrink-0 text-ink-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-700"
                    />
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
