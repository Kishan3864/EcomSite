import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  PackageSearch,
  Phone,
  Scale,
} from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { ContactForm } from "./contact-form";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { BRAND } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { BUSINESS, addressLines, isFilled } from "@/config/business";
import { getCustomerSession } from "@/lib/auth/customer";
import { issueFormToken } from "@/lib/contact-guard";

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

/** One number, so one card: WhatsApp and calling are two actions on it. */
const CHANNELS = [
  {
    icon: BUSINESS.whatsappEnabled ? MessageCircle : Phone,
    title: BUSINESS.whatsappEnabled ? "WhatsApp or call" : "Call us",
    body: BUSINESS.whatsappEnabled
      ? `Fastest for order questions — send your order number and we will pull it up. ${BUSINESS.supportHours}.`
      : `${BUSINESS.supportHours}. A person picks up, not a menu.`,
    action: BUSINESS.supportPhone,
    links: [
      ...(BUSINESS.whatsappEnabled
        ? [{ label: "Message on WhatsApp", href: `https://wa.me/${BUSINESS.supportPhoneDigits}` }]
        : []),
      { label: "Call this number", href: `tel:${BUSINESS.supportPhoneTel}` },
    ],
  },
  {
    icon: Mail,
    title: "Email",
    body: "Best for anything with attachments — photos of a damaged parcel, invoices, tax queries.",
    action: BUSINESS.supportEmail,
    links: [{ label: "Send an email", href: `mailto:${BUSINESS.supportEmail}` }],
  },
];

export default async function ContactPage() {
  // The session decides the prefill. The device cookie is issued by the edge
  // proxy on the way to this page, because a server component may not set one.
  const session = await getCustomerSession();
  const formToken = issueFormToken();

  return (
    <div className="container-page pb-10 sm:pb-16">
      <BreadcrumbJsonLd items={crumbs} />
      <PageHeader
        crumbs={crumbs}
        title="Talk to a person"
        description={
          <>
            Support runs {BUSINESS.supportHours}. Write, call or message us and a person will
            answer — no scripts, no chatbot maze. Our full postal address and grievance officer are
            listed below.
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-8">
        {/* Channels and details */}
        <aside className="reveal min-w-0 space-y-3">
          {CHANNELS.map((channel) => (
            // A card, not a link: it offers two actions, and links cannot nest.
            <section key={channel.title} className="card flex items-start gap-4 p-4 sm:p-5">
              <span className="icon-tile">
                <channel.icon size={20} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="t-h3">{channel.title}</h2>
                <p className="t-small mt-1">{channel.body}</p>
                <p className="mt-2.5 break-words text-[14px] font-semibold tabular-nums text-ink-950">
                  {channel.action}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {channel.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noreferrer noopener" : undefined}
                      className={buttonClasses("outline", "xs", "group")}
                    >
                      {link.label}
                      <ArrowUpRight
                        size={14}
                        aria-hidden
                        className="transition-transform duration-200 group-hover:translate-x-0.5"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </section>
          ))}

          <section className="card flex items-start gap-4 p-4 sm:p-5">
            <span className="icon-tile">
              <Clock size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="t-label">When we are around</h2>
              <p className="t-body mt-1.5 text-[13px]">
                {BUSINESS.supportHours}. Messages that arrive outside those hours are answered the
                next working day.
              </p>
            </div>
          </section>

          <section className="card flex items-start gap-4 p-4 sm:p-5">
            <span className="icon-tile">
              <MapPin size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="t-label">Business address</h2>
              <address className="t-body mt-1.5 text-[13px] not-italic">
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
            </div>
          </section>

          {/* Required by the Consumer Protection (E-Commerce) Rules, 2020. */}
          <section className="card flex items-start gap-4 p-4 sm:p-5">
            <span className="icon-tile">
              <Scale size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="t-label">Grievance officer</h2>
              <p className="t-body mt-1.5 break-words text-[13px]">
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
              <p className="t-small mt-2.5">
                Complaints are acknowledged within 48 hours and resolved within one month. If we
                cannot resolve yours, escalate to the National Consumer Helpline on{" "}
                <span className="tabular-nums">1915</span>.
              </p>
            </div>
          </section>

          <section className="card-muted p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="icon-tile icon-tile-sm">
                <PackageSearch size={16} aria-hidden />
              </span>
              <h2 className="t-h3">Faster than a message</h2>
            </div>
            <p className="t-small mt-2">
              Most questions are about where a parcel is. You can see that yourself in about five
              seconds.
            </p>
            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Link href="/track" className={buttonClasses("primary", "sm", "w-full sm:w-auto")}>
                Track an order
              </Link>
              <Link href="/faq" className={buttonClasses("outline", "sm", "w-full sm:w-auto")}>
                Read the FAQ
              </Link>
            </div>
          </section>
        </aside>

        {/* The form */}
        <div className="min-w-0">
          <ContactForm
            account={session ? { name: session.name, email: session.email } : null}
            formToken={formToken}
          />
        </div>
      </div>
    </div>
  );
}
