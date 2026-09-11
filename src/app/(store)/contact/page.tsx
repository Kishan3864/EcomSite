import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Package, Phone, UserRound } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/primitives";
import { ContactForm } from "./contact-form";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { BRAND } from "@/components/brand/logo";
import { BUSINESS, addressLines, isFilled } from "@/config/business";

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
    href: `tel:${BUSINESS.supportPhoneDigits}`,
  },
  {
    icon: Mail,
    title: "Email",
    body: "Best for anything with attachments — photos of a damaged parcel, invoices, tax queries.",
    action: BUSINESS.supportEmail,
    href: `mailto:${BUSINESS.supportEmail}`,
  },
];

export default function ContactPage() {
  return (
    <div className="container-page py-5 sm:py-7">
      <BreadcrumbJsonLd items={crumbs} />
      <Breadcrumbs items={crumbs} className="mb-6" />

      <header className="mb-10 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
          Support
        </p>
        <h1 className="mt-2.5 font-display text-[32px] leading-[1.06] tracking-[-0.03em] text-ink-950 sm:text-[42px]">
          Talk to a person
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
          Support runs {BUSINESS.supportHours}. Write, call or message us and a person will
          answer — no scripts, no chatbot maze. Our full postal address and grievance officer are
          listed below.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {CHANNELS.map((channel) => (
          <a
            key={channel.title}
            href={channel.href}
            target={channel.href.startsWith("http") ? "_blank" : undefined}
            rel={channel.href.startsWith("http") ? "noreferrer noopener" : undefined}
            className="group flex flex-col rounded-xl border border-hairline bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <channel.icon size={19} />
            </span>
            <h2 className="mt-4 font-display text-lg tracking-[-0.015em] text-ink-950">
              {channel.title}
            </h2>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-600">{channel.body}</p>
            <p className="mt-3 text-[13px] font-semibold text-brand-700 group-hover:underline">
              {channel.action}
            </p>
          </a>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
        <ContactForm />

        <aside className="space-y-4">
          <div className="rounded-xl border border-hairline bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
              <Clock size={14} className="text-brand-600" /> When we are around
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
              {BUSINESS.supportHours}. Messages that arrive outside those hours are answered the
              next working day.
            </p>
          </div>

          <div className="rounded-xl border border-hairline bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
              <MapPin size={14} className="text-brand-600" /> Business address
            </h2>
            <address className="mt-3 text-[13px] not-italic leading-relaxed text-ink-600">
              {BRAND.legalName}
              <br />
              <span className="text-ink-500">Operated by {BUSINESS.proprietorName}</span>
              {addressLines().map((line) => (
                <span key={line}>
                  <br />
                  {line}
                </span>
              ))}
              {isFilled(BUSINESS.gstin) ? (
                <>
                  <br />
                  <span className="text-ink-400">GSTIN {BUSINESS.gstin}</span>
                </>
              ) : null}
            </address>
          </div>

          {/* Required by the Consumer Protection (E-Commerce) Rules, 2020. */}
          <div className="rounded-xl border border-hairline bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
              <UserRound size={14} className="text-brand-600" /> Grievance officer
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
              {BUSINESS.grievanceOfficer.name}
              <br />
              <span className="text-ink-500">{BUSINESS.grievanceOfficer.designation}</span>
              <br />
              <a
                href={`mailto:${BUSINESS.grievanceEmail}`}
                className="font-medium text-brand-700 hover:underline"
              >
                {BUSINESS.grievanceEmail}
              </a>
              <br />
              <a
                href={`tel:${BUSINESS.supportPhoneDigits}`}
                className="font-medium text-brand-700 hover:underline"
              >
                {BUSINESS.supportPhone}
              </a>
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
              Complaints are acknowledged within 48 hours and resolved within one month. If we
              cannot resolve yours, escalate to the National Consumer Helpline on 1915.
            </p>
          </div>

          <div className="rounded-xl border border-hairline bg-brand-50 p-5">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-brand-900">
              <Package size={14} /> Faster than a message
            </h2>
            <p className="mt-2.5 text-[13px] leading-relaxed text-brand-800">
              Most questions are about where a parcel is. You can see that yourself in about five
              seconds.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/track"
                className="rounded-lg bg-brand-900 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Track an order
              </Link>
              <Link
                href="/faq"
                className="rounded-lg border border-brand-300 px-3.5 py-2 text-[12.5px] font-semibold text-brand-800 transition-colors hover:bg-brand-100"
              >
                Read the FAQ
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
