import type { Metadata } from "next";
import Link from "next/link";
import {
  Ban,
  CalendarClock,
  CircleCheck,
  CreditCard,
  FileText,
  Headset,
  MailCheck,
  MapPinned,
  Package,
  ShoppingBag,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/primitives";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { servicesSections } from "@/data/policies";
import { BUSINESS } from "@/config/business";
import { formatDate } from "@/lib/utils";

/**
 * A plain statement of what this business actually does. Payment aggregators
 * and Google look for it during merchant review — keep it factual and in step
 * with `@/config/business`.
 */

export const metadata: Metadata = {
  title: "What we do",
  description: `${BUSINESS.brandName} is an online retail store selling ${BUSINESS.categoriesSold
    .join(", ")
    .toLowerCase()} across India. Here is exactly how we operate.`,
  alternates: { canonical: "/services" },
  openGraph: {
    title: `What we do · ${BUSINESS.brandName}`,
    description: `How ${BUSINESS.brandName} operates: what we sell, how orders are fulfilled, and where we deliver.`,
    url: "/services",
  },
};

const crumbs = [
  { name: "Home", href: "/" },
  { name: "What we do", href: "/services" },
];

const SECTION_ICONS: Record<string, LucideIcon> = {
  "what-we-do": Store,
  "what-we-sell": ShoppingBag,
  "what-we-do-not-sell": Ban,
  support: Headset,
  coverage: MapPinned,
};

const STEP_ICONS: LucideIcon[] = [CreditCard, MailCheck, Package, Truck, CircleCheck];

const LINK = "font-medium text-brand-700 hover:underline";

export default function ServicesPage() {
  const steps = servicesSections.find((s) => s.table);
  const cards = servicesSections.filter((s) => !s.table);
  const lastStep = (steps?.table?.rows.length ?? 0) - 1;

  return (
    <div className="container-page pb-10 pt-5 sm:pb-16 sm:pt-7">
      <BreadcrumbJsonLd items={crumbs} />
      <Breadcrumbs items={crumbs} className="mb-4" />

      <header className="aurora relative mb-6 overflow-hidden rounded-3xl px-5 py-8 sm:mb-8 sm:px-10 sm:py-12">
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative">
          <p className="eyebrow">About the business</p>
          <h1 className="t-h1 mt-3">What we do</h1>
          <p className="t-body mt-3 max-w-[64ch] text-ink-700">
            {BUSINESS.brandName} is an online retail store. We buy stock, hold it ourselves and ship
            it to customers across India under our own invoice. This page states plainly how that
            works.
          </p>
          <p className="mt-5 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface/80 px-3 text-[12.5px] text-ink-700 ring-1 ring-inset ring-line">
            <CalendarClock size={14} aria-hidden className="text-brand-700" />
            Last updated{" "}
            <time dateTime={BUSINESS.policiesEffectiveFrom} className="font-semibold tabular-nums text-ink-900">
              {formatDate(BUSINESS.policiesEffectiveFrom)}
            </time>
          </p>
        </div>
      </header>

      <div className="reveal grid gap-3 sm:gap-4 md:grid-cols-2">
        {cards.map((section) => {
          const Icon = SECTION_ICONS[section.id] ?? FileText;
          return (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-h`}
              className="card scroll-mt-(--sticky-top) p-5 sm:p-6"
            >
              <span className="icon-tile">
                <Icon size={20} aria-hidden />
              </span>
              <h2 id={`${section.id}-h`} className="t-h3 mt-4 text-[16px]">
                {section.heading}
              </h2>
              {section.paragraphs?.map((p) => (
                <p key={p} className="t-body mt-2">
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {section.bullets.map((b) => (
                    <li
                      key={b}
                      className="inline-flex h-8 items-center rounded-full bg-brand-50 px-3 text-[12.5px] font-medium text-brand-800"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {steps?.table && (
        <section
          id={steps.id}
          aria-labelledby={`${steps.id}-h`}
          className="section-tight scroll-mt-(--sticky-top)"
        >
          <h2 id={`${steps.id}-h`} className="t-h2 mb-4 sm:mb-5">
            {steps.heading}
          </h2>
          {/* The table's rows as a stepper; the column heads stay for screen readers */}
          <p className="sr-only">{steps.table.head.join(" — ")}</p>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {steps.table.rows.map(([step, detail], i) => {
              const Icon = STEP_ICONS[i] ?? CircleCheck;
              return (
                <li key={step} className="card relative p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="icon-tile icon-tile-sm">
                      <Icon size={16} aria-hidden />
                    </span>
                    {i < lastStep && (
                      <span aria-hidden className="ml-3 hidden h-px flex-1 bg-linear-to-r from-brand-200 to-transparent lg:block" />
                    )}
                  </div>
                  <p className="t-h3 mt-3.5 tabular-nums">{step}</p>
                  <p className="t-small mt-1">{detail}</p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="card-muted mt-2 break-words p-4 text-[13.5px] leading-[1.7] text-ink-600 sm:p-5">
        The commercial terms behind all of this are in our{" "}
        <Link href="/legal/terms" className={LINK}>
          terms of use
        </Link>
        ,{" "}
        <Link href="/legal/shipping" className={LINK}>
          shipping policy
        </Link>{" "}
        and{" "}
        <Link href="/legal/refunds" className={LINK}>
          refund policy
        </Link>
        . For anything else,{" "}
        <Link href="/contact" className={LINK}>
          talk to us
        </Link>
        .
      </div>
    </div>
  );
}
