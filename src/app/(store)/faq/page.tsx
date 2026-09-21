import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Headset, MessageCircle, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
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

/** Same ids FaqAccordion puts on its sections. */
const groupId = (category: string) =>
  `faq-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export default function FaqPage() {
  const allItems = faqs.flatMap((group) => group.items);

  return (
    <div className="container-page pb-10 sm:pb-16">
      <BreadcrumbJsonLd items={crumbs} />
      <FaqJsonLd items={allItems} />
      <PageHeader
        crumbs={crumbs}
        title="Questions people actually ask"
        description={
          <>
            <span className="tabular-nums">{allItems.length}</span> answers, written by the team
            who handles the support inbox. If yours is not here, we would genuinely like to know.
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <FaqAccordion groups={faqs} />

        <aside className="min-w-0 space-y-4">
          <div className="card p-2">
            <h2 className="t-label px-3 pb-1 pt-2">Read the policies</h2>
            <ul>
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="tap group flex h-11 items-center justify-between gap-4 rounded-md px-3 text-[13px] text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    {link.label}
                    <ChevronRight
                      size={14}
                      aria-hidden
                      className="shrink-0 text-ink-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-700"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Only this block is sticky, so the column never outgrows the viewport */}
          <div className="space-y-4 lg:sticky-under-header">
            <nav aria-label="FAQ topics" className="card hidden p-2 lg:block">
              <p className="t-label px-3 pb-1 pt-2">Topics</p>
              <ul>
                {faqs.map((g) => (
                  <li key={g.category}>
                    <a
                      href={`#${groupId(g.category)}`}
                      className="group flex h-10 items-center justify-between gap-3 rounded-md px-3 text-[13px] text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                    >
                      {g.category}
                      <span className="t-small tabular-nums group-hover:text-brand-700">
                        {g.items.length}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Contact CTA */}
            <div className="midnight relative overflow-hidden rounded-2xl p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gold-300 ring-1 ring-inset ring-white/15">
                <Headset size={20} aria-hidden />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold tracking-[-0.02em] text-white">
                Still stuck?
              </h2>
              <p className="mt-2 text-[13px] leading-[1.6] text-white/70">
                We answer {BUSINESS.supportHours}. A person replies, not a bot. Anything that arrives
                outside those hours is answered the next working day.
              </p>
              <div className="mt-4 space-y-2">
                <Link
                  href="/contact"
                  className={buttonClasses("primary", "md", "w-full bg-white text-ink-950 hover:bg-brand-50 active:bg-brand-100")}
                >
                  <MessageCircle size={16} aria-hidden /> Message us
                </Link>
                <a
                  href={`tel:${BUSINESS.supportPhoneTel}`}
                  className={buttonClasses("ghost", "md", "w-full tabular-nums text-white hover:bg-white/10 hover:text-white active:bg-white/15")}
                >
                  <Phone size={16} aria-hidden /> {BUSINESS.supportPhone}
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
