import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Headset, IndianRupee, PackageCheck, ShieldCheck } from "lucide-react";
import { Breadcrumbs, SectionHeader } from "@/components/ui/primitives";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { buttonClasses } from "@/components/ui/button";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { brands } from "@/data/taxonomy";
import { POOL, img } from "@/data/images";
import { BRAND } from "@/components/brand/logo";
import { BUSINESS, formatAddress, isFilled } from "@/config/business";

/**
 * About page.
 *
 * Every claim here must be true of the business as configured. No invented
 * headcount, no invented history, no invented scale — a payment aggregator or
 * Google reviewer reads this page alongside the KYC application, and an
 * unverifiable boast is a rejection waiting to happen. Say less, truthfully.
 */

export const metadata: Metadata = {
  title: `About ${BUSINESS.brandName}`,
  description: `${BUSINESS.brandName} is an Indian online store run by ${BUSINESS.legalName}, selling ${BUSINESS.categoriesSold
    .join(", ")
    .toLowerCase()} with honest pricing and a straightforward return policy.`,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About ${BUSINESS.brandName}`,
    description: `An Indian online store for everyday things, honestly priced.`,
    url: "/about",
    images: [{ url: img(POOL.lifestyle[1], { fit: "wide", w: 1200 }), alt: BUSINESS.brandName }],
  },
};

const crumbs = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
];

const O = BUSINESS.ops;

/** Commitments the business can actually keep, phrased as commitments. */
const PRINCIPLES = [
  {
    icon: IndianRupee,
    title: "The price you see is the price you pay",
    body: "Every price on this site is in rupees and includes tax. Delivery, if any, is shown in your cart before you pay. We add no convenience fee, no handling charge and no surprise at the last step.",
  },
  {
    icon: PackageCheck,
    title: "We stock what we sell",
    body: "We are a first-party retailer, not a marketplace. We buy the stock, hold it ourselves and invoice you directly. There are no third-party sellers here, so there is never any question about who is responsible for your order.",
  },
  {
    icon: ShieldCheck,
    title: "Returns that are actually usable",
    body: `You have ${O.returnWindowDays} days from delivery on most categories and ${O.returnWindowExtendedDays} on fashion. No restocking fee. If an item arrives damaged or is not what you ordered, we cover the delivery charge both ways.`,
  },
  {
    icon: Headset,
    title: "A person answers",
    body: `Support runs ${BUSINESS.supportHours}. Our full postal address, phone number and grievance officer are published on the contact page — not hidden behind a form.`,
  },
];

/** How an order moves. Timelines come from config, so they cannot drift. */
const HOW_IT_WORKS = [
  {
    step: "You order",
    body: "Add to cart, pay online in rupees. The total, including any delivery charge, is shown before payment. You get an order number by email and SMS straight away.",
  },
  {
    step: "We pack",
    body: `Your order is picked, checked and handed to a courier partner within ${O.dispatchDays} business days. You get a tracking link the moment it leaves us.`,
  },
  {
    step: "It arrives",
    body: `Delivery normally takes ${O.deliveryDaysMin} to ${O.deliveryDaysMax} business days after dispatch. Remote pincodes take a little longer, and we say so before you pay.`,
  },
  {
    step: "You decide",
    body: `Keep it, or start a return from your account within the window for that category. Refunds go back to the method you paid with.`,
  },
];

export default function AboutPage() {
  return (
    <>
      <div className="container-page py-5 sm:py-7">
        <BreadcrumbJsonLd items={crumbs} />
        <Breadcrumbs items={crumbs} className="mb-6" />

        <header className="overflow-hidden rounded-2xl sm:rounded-3xl">
          <div className="relative">
            <div className="relative aspect-[16/10] sm:aspect-[21/9]">
              <Image
                src={img(POOL.lifestyle[1], { fit: "ultrawide", w: 1800 })}
                alt={`${BUSINESS.brandName} product range`}
                fill
                loading="eager"
                fetchPriority="high"
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/70 to-brand-950/25" />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">
                About us
              </p>
              <h1 className="mt-3 max-w-3xl font-display text-[30px] leading-[1.05] tracking-[-0.03em] text-white sm:text-[48px]">
                Everyday things, honestly priced.
              </h1>
              <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-white/70">
                {BRAND.description}
              </p>
            </div>
          </div>
        </header>

        {/* Who is actually behind the shop. Reviewers look for this. */}
        <section className="mt-10 border-y border-hairline py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
            <div>
              <h2 className="font-display text-[24px] leading-tight tracking-[-0.02em] text-ink-950 sm:text-[28px]">
                Who runs this shop
              </h2>
              <div className="mt-4 space-y-3.5 text-[14.5px] leading-[1.75] text-ink-600">
                <p>
                  {BUSINESS.brandName} is owned and operated by {BUSINESS.legalName}
                  {BUSINESS.entityType === "Proprietorship"
                    ? `, a sole proprietorship registered in India${
                        isFilled(BUSINESS.udyamNumber)
                          ? ` under Udyam registration ${BUSINESS.udyamNumber}`
                          : ""
                      }`
                    : ""}
                  . We sell {BUSINESS.categoriesSold.join(", ").toLowerCase()} to customers across
                  India.
                </p>
                <p>
                  We are a small, new business, and we would rather say that plainly than pretend to
                  a scale we do not have. What we can promise is the part that is entirely within
                  our control: accurate listings, prices with nothing hidden behind them, orders
                  packed properly, and a return policy we honour without argument.
                </p>
                <p>
                  Everything we sell is bought by us and invoiced by us. If something goes wrong
                  with your order, there is no third-party seller to chase — it is our problem to
                  fix.
                </p>
              </div>
            </div>

            <aside className="rounded-2xl border border-hairline bg-surface p-6">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                Business details
              </h3>
              <dl className="mt-4 space-y-3.5 text-[13px]">
                <div>
                  <dt className="text-ink-500">Legal entity</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">{BUSINESS.legalName}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Type</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">{BUSINESS.entityType}</dd>
                </div>
                {isFilled(BUSINESS.gstin) ? (
                  <div>
                    <dt className="text-ink-500">GSTIN</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-ink-900">
                      {BUSINESS.gstin}
                    </dd>
                  </div>
                ) : null}
                {isFilled(BUSINESS.udyamNumber) ? (
                  <div>
                    <dt className="text-ink-500">Udyam registration</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-ink-900">
                      {BUSINESS.udyamNumber}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-ink-500">Registered address</dt>
                  <dd className="mt-0.5 font-medium leading-relaxed text-ink-900">
                    {formatAddress()}
                  </dd>
                </div>
              </dl>
              <Link
                href="/contact"
                className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:underline"
              >
                Contact details and grievance officer <ArrowRight size={14} />
              </Link>
            </aside>
          </div>
        </section>

        <section className="py-12">
          <Reveal>
            <SectionHeader
              eyebrow="What we commit to"
              title="Four things we will not compromise on"
              description="Each one is written into a policy page you can hold us to, not just stated here."
              className="mb-8"
            />
          </Reveal>

          <StaggerGroup className="grid gap-6 sm:grid-cols-2">
            {PRINCIPLES.map((principle) => (
              <StaggerItem key={principle.title}>
                <div className="h-full rounded-2xl border border-hairline bg-surface p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <principle.icon size={19} />
                  </span>
                  <h3 className="mt-4 font-display text-xl tracking-[-0.015em] text-ink-950">
                    {principle.title}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-ink-600">
                    {principle.body}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section className="py-12">
          <Reveal>
            <SectionHeader
              eyebrow="How it works"
              title="From your cart to your door"
              href="/services"
              linkLabel="Read the full detail"
              className="mb-8"
            />
          </Reveal>

          <ol className="relative border-l border-hairline pl-8">
            {HOW_IT_WORKS.map((item, i) => (
              <Reveal key={item.step} as="li" delay={i * 0.06} className="relative pb-10 last:pb-0">
                <span className="absolute -left-[38px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 ring-4 ring-canvas">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <p className="font-display text-[13px] font-semibold tabular-nums text-brand-600">
                  Step {i + 1}
                </p>
                <h3 className="mt-1 font-display text-xl tracking-[-0.015em] text-ink-950">
                  {item.step}
                </h3>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="py-12">
          <Reveal>
            <SectionHeader
              eyebrow="Our catalogue"
              title="Brands we stock"
              description="Product names and logos belong to their respective owners and appear here only to identify the goods we sell."
              href="/products"
              linkLabel="Browse everything"
              className="mb-8"
            />
          </Reveal>

          <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {brands.map((brand) => (
              <StaggerItem key={brand.slug}>
                <Link
                  href={`/products?brands=${brand.slug}`}
                  className="flex h-full flex-col rounded-xl border border-hairline bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
                >
                  <span className="font-display text-[15px] tracking-[-0.01em] text-ink-950">
                    {brand.name}
                  </span>
                  <span className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
                    {brand.tagline}
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section className="mb-4 rounded-2xl border border-hairline bg-brand-50 p-8 sm:p-12">
          <h2 className="max-w-2xl font-display text-[26px] leading-tight tracking-[-0.025em] text-brand-950 sm:text-[32px]">
            Anything you want to ask before you buy?
          </h2>
          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-brand-800">
            Our address, phone number, email and grievance officer are all published. Call or write
            and a person will answer.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className={buttonClasses("primary")}>
              Contact us <ArrowRight size={15} />
            </Link>
            <Link href="/faq" className={buttonClasses("outline")}>
              Read the FAQ
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
