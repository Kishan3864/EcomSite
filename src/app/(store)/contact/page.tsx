import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Mail, MessageCircle, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/primitives";
import { ContactForm } from "./contact-form";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { BRAND } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { BUSINESS, addressLines, isFilled } from "@/config/business";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Contact ${BUSINESS.brandName} — phone, email and our business address. Support runs ${BUSINESS.supportHours}.`,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: `Contact us · ${BUSINESS.brandName}`,
    description: `Reach ${BUSINESS.brandName} by phone or email, ${BUSINESS.supportHours}.`,
    url: "/contact",
  },
};

const crumbs = [
  { name: "Home", href: "/" },
  { name: "Contact", href: "/contact" },
];

const CHANNELS = [
  ...(BUSINESS.whatsappEnabled
    ? [
        {
          icon: MessageCircle,
          title: "WhatsApp",
          body: "Fastest for order questions. Send your order number and we will pull it up.",
          action: BUSINESS.supportPhone,
          href: `https://wa.me/${BUSINESS.supportPhoneDigits}`,
        },
      ]
    : []),
  {
    icon: Phone,
    title: "Phone",
    body: `${BUSINESS.supportHours}. A person picks up, not a menu.`,
    action: BUSINESS.supportPhone,
    href: `tel:${BUSINESS.supportPhoneTel}`,
  },
  {
    icon: Mail,
    title: "Email",
    body: "Best for anything with attachments — photos of a damaged parcel, invoices, tax queries.",
    action: BUSINESS.supportEmail,
    href: `mailto:${BUSINESS.supportEmail}`,
  },
];

/** The small-caps rule every block in the sidebar is headed with. */
const ASIDE_LABEL = "text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500";

export default function ContactPage() {
  return (
    <div className="container-page py-5 sm:py-7">
      <BreadcrumbJsonLd items={crumbs} />
      <Breadcrumbs items={crumbs} className="mb-4 sm:mb-6" />

      <header className="mb-6 pb-6 sm:mb-8 sm:pb-8">
        <span className="eyebrow">Support</span>
        <h1 className="mt-3 font-display text-[26px] leading-[1.06] tracking-[-0.03em] text-ink-950 sm:mt-4 sm:text-[42px]">
          Talk to a person
        </h1>
        <p className="mt-4 max-w-[62ch] text-[14px] leading-[1.6] text-ink-600 sm:text-[15px]">
          Support runs {BUSINESS.supportHours}. Write, call or message us and a person will
          answer — no scripts, no chatbot maze. Our full postal address and grievance officer are
          listed below.
        </p>
      </header>

      {/* The ways through to us, on one hairline grid. The track narrows to the
          number of channels actually switched on, so a shop without WhatsApp
          does not show an empty cell where a third one would have been. */}
      <div
        className={cn(
          "tile-grid grid-cols-1",
          CHANNELS.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3",
        )}
      >
        {CHANNELS.map((channel) => (
          <a
            key={channel.title}
            href={channel.href}
            target={channel.href.startsWith("http") ? "_blank" : undefined}
            rel={channel.href.startsWith("http") ? "noreferrer noopener" : undefined}
            className="tap group flex items-start gap-3.5 p-4 transition-colors duration-200 sm:flex-col sm:items-stretch sm:gap-0 sm:p-5 [@media(hover:hover)]:hover:bg-ink-50"
          >
            <channel.icon
              size={22}
              strokeWidth={1.5}
              className="shrink-0 text-ink-900 transition-colors duration-200 group-hover:text-brand-700"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="font-display text-[20px] leading-tight tracking-[-0.02em] text-ink-950 sm:mt-4">
                {channel.title}
              </h2>
              <p className="mt-1.5 flex-1 text-[13px] leading-[1.6] text-ink-600 sm:mt-2">
                {channel.body}
              </p>
              <p className="mt-2 break-words text-[13px] font-semibold tabular-nums text-brand-700 sm:mt-3">
                {channel.action}
                <ArrowUpRight
                  size={13}
                  className="ml-1 inline-block align-[-1px] transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </p>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-8 grid gap-8 sm:mt-10 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
        <ContactForm />

        <aside className="min-w-0 space-y-6">
          <section className="pt-4">
            <h2 className={ASIDE_LABEL}>When we are around</h2>
            <p className="mt-2 text-[13px] leading-[1.6] text-ink-600">
              {BUSINESS.supportHours}. Messages that arrive outside those hours are answered the
              next working day.
            </p>
          </section>

          <section className="pt-4">
            <h2 className={ASIDE_LABEL}>Business address</h2>
            <address className="mt-2 text-[13px] not-italic leading-[1.6] text-ink-600">
              <strong className="font-semibold text-ink-900">{BRAND.legalName}</strong>
              <br />
              Operated by {BUSINESS.proprietorName}
              {addressLines().map((line) => (
                <span key={line}>
                  <br />
                  <span className="tabular-nums">{line}</span>
                </span>
              ))}
              {isFilled(BUSINESS.gstin) ? (
                <>
                  <br />
                  <span className="tabular-nums">GSTIN {BUSINESS.gstin}</span>
                </>
              ) : null}
            </address>
          </section>

          {/* Required by the Consumer Protection (E-Commerce) Rules, 2020. */}
          <section className="pt-4">
            <h2 className={ASIDE_LABEL}>Grievance officer</h2>
            <p className="mt-2 break-words text-[13px] leading-[1.6] text-ink-600">
              <strong className="font-semibold text-ink-900">
                {BUSINESS.grievanceOfficer.name}
              </strong>
              <br />
              {BUSINESS.grievanceOfficer.designation}
              <br />
              <a
                href={`mailto:${BUSINESS.grievanceEmail}`}
                className="font-medium text-brand-700 hover:underline"
              >
                {BUSINESS.grievanceEmail}
              </a>
              <br />
              <a
                href={`tel:${BUSINESS.supportPhoneTel}`}
                className="font-medium tabular-nums text-brand-700 hover:underline"
              >
                {BUSINESS.supportPhone}
              </a>
            </p>
            <p className="mt-2.5 text-[13px] leading-[1.6] text-ink-500">
              Complaints are acknowledged within 48 hours and resolved within one month. If we
              cannot resolve yours, escalate to the National Consumer Helpline on{" "}
              <span className="tabular-nums">1915</span>.
            </p>
          </section>

          <section className="pt-4">
            <h2 className={ASIDE_LABEL}>Faster than a message</h2>
            <p className="mt-2 text-[13px] leading-[1.6] text-ink-600">
              Most questions are about where a parcel is. You can see that yourself in about five
              seconds.
            </p>
            {/* An even pair of buttons on phones; natural width from sm. */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Link href="/track" className={buttonClasses("outline", "sm", "w-full sm:w-auto")}>
                Track an order
              </Link>
              <Link href="/faq" className={buttonClasses("ghost", "sm", "w-full sm:w-auto")}>
                Read the FAQ
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
