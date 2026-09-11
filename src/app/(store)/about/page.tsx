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
import { BUSINESS, formatAddress, isFilled, operatorDescription } from "@/config/business";

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
  description: `${BUSINESS.brandName} is an Indian online store run by ${BUSINESS.proprietorName}, selling ${BUSINESS.categoriesSold
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
        <Breadcrumbs items={crumbs} className="mb-4 sm:mb-6" />

        <header className="overflow-hidden rounded-2xl sm:rounded-3xl">
          <div className="relative">
            {/* The copy sits on the image, so the frame has to be tall enough to
                hold it: 21:9 clipped the eyebrow below about 800px wide. */}
            <div className="relative aspect-[4/3] sm:aspect-[2/1] lg:aspect-[21/9]">
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
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8 lg:p-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">
                About us
              </p>
              <h1 className="mt-2 max-w-3xl font-display text-[24px] leading-[1.05] tracking-[-0.03em] text-white sm:mt-3 sm:text-[36px] lg:text-[48px]">
                Everyday things, honestly priced.
              </h1>
              <p className="mt-2 max-w-xl text-[13px] leading-normal text-white/70 sm:mt-4 sm:text-[14.5px] sm:leading-relaxed">
                {BRAND.description}
              </p>
            </div>
          </div>
        </header>

        {/* Who is actually behind the shop. Reviewers look for this. */}
        <section className="mt-6 border-y border-hairline py-6 sm:mt-10 sm:py-10">
          <div className="grid gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
            <div className="min-w-0">
              <h2 className="font-display text-[18px] leading-tight tracking-[-0.02em] text-ink-950 sm:text-[28px]">
                Who runs this shop
              </h2>
              <div className="mt-3 space-y-3 text-[14px] leading-[1.75] text-ink-600 sm:mt-4 sm:space-y-3.5 sm:text-[14.5px]">
                <p>
                  {BUSINESS.brandName} is owned and operated by {operatorDescription()}. We sell{" "}
                  {BUSINESS.categoriesSold.join(", ").toLowerCase()} to customers across India.
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

            <aside className="min-w-0 rounded-2xl border border-hairline bg-surface p-4 sm:p-6">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                Business details
              </h3>
              {/* Two columns until the card becomes a narrow sidebar at lg, so
                  the short facts do not each take a full-width row. */}
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 break-words text-[12.5px] sm:mt-4 sm:text-[13px] lg:block lg:space-y-3.5">
                <div className="min-w-0">
                  <dt className="text-ink-500">Trading name</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">{BUSINESS.legalName}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-500">Operated by</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">{BUSINESS.proprietorName}</dd>
                </div>
                {isFilled(BUSINESS.gstin) ? (
                  <div className="min-w-0">
                    <dt className="text-ink-500">GSTIN</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-ink-900">
                      {BUSINESS.gstin}
                    </dd>
                  </div>
                ) : null}
                <div className="col-span-2 min-w-0">
                  <dt className="text-ink-500">Business address</dt>
                  <dd className="mt-0.5 font-medium leading-relaxed text-ink-900">
                    {formatAddress()}
                  </dd>
                </div>
              </dl>
              <Link
                href="/contact"
                className="tap mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:underline sm:mt-5"
              >
                Contact details and grievance officer <ArrowRight size={14} />
              </Link>
            </aside>
          </div>
        </section>

        <section className="py-7 sm:py-12">
          <Reveal>
            <SectionHeader
              eyebrow="What we commit to"
              title="Four things we will not compromise on"
              description="Each one is written into a policy page you can hold us to, not just stated here."
              className="mb-4 sm:mb-8"
            />
          </Reveal>

          <StaggerGroup className="grid gap-2.5 sm:grid-cols-2 sm:gap-6">
            {PRINCIPLES.map((principle) => (
              <StaggerItem key={principle.title}>
                {/* Icon beside the text on phones, above it from sm. */}
                <div className="flex h-full items-start gap-3.5 rounded-2xl border border-hairline bg-surface p-4 sm:block sm:p-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:h-11 sm:w-11">
                    <principle.icon size={19} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-[17px] tracking-[-0.015em] text-ink-950 sm:mt-4 sm:text-xl">
                      {principle.title}
                    </h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600 sm:mt-2.5 sm:text-[14px]">
                      {principle.body}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section className="py-7 sm:py-12">
          <Reveal>
            <SectionHeader
              eyebrow="How it works"
              title="From your cart to your door"
              href="/services"
              linkLabel="Read the full detail"
              className="mb-4 sm:mb-8"
            />
          </Reveal>

          <ol className="relative border-l border-hairline pl-6 sm:pl-8">
            {HOW_IT_WORKS.map((item, i) => (
              <Reveal
                key={item.step}
                as="li"
                delay={i * 0.06}
                className="relative pb-6 last:pb-0 sm:pb-10"
              >
                <span className="absolute -left-[30px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 ring-4 ring-canvas sm:-left-[38px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <p className="font-display text-[12.5px] font-semibold tabular-nums text-brand-600 sm:text-[13px]">
                  Step {i + 1}
                </p>
                <h3 className="mt-0.5 font-display text-[17px] tracking-[-0.015em] text-ink-950 sm:mt-1 sm:text-xl">
                  {item.step}
                </h3>
                <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-600 sm:mt-2 sm:text-[14px]">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="py-7 sm:py-12">
          <Reveal>
            <SectionHeader
              eyebrow="Our catalogue"
              title="Brands we stock"
              description="Product names and logos belong to their respective owners and appear here only to identify the goods we sell."
              href="/products"
              linkLabel="Browse everything"
              className="mb-4 sm:mb-8"
            />
          </Reveal>

          {/* Sixteen brands stacked one per row ran well over a screen on a
              phone; there they swipe edge to edge, and become a grid from sm. */}
          <StaggerGroup className="rail -mx-3 gap-2 px-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {brands.map((brand) => (
              <StaggerItem key={brand.slug} className="w-[152px] sm:w-auto">
                <Link
                  href={`/products?brands=${brand.slug}`}
                  className="tap flex h-full flex-col rounded-xl border border-hairline bg-surface p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md sm:p-5"
                >
                  <span className="font-display text-[14px] tracking-[-0.01em] text-ink-950 sm:text-[15px]">
                    {brand.name}
                  </span>
                  <span className="mt-1 text-[12px] leading-snug text-ink-500 sm:mt-1.5 sm:text-[12.5px] sm:leading-relaxed">
                    {brand.tagline}
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section className="mb-4 rounded-2xl border border-hairline bg-brand-50 p-5 sm:p-12">
          <h2 className="max-w-2xl font-display text-[20px] leading-tight tracking-[-0.025em] text-brand-950 sm:text-[32px]">
            Anything you want to ask before you buy?
          </h2>
          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-brand-800 sm:mt-3 sm:text-[14.5px]">
            Our address, phone number, email and grievance officer are all published. Call or write
            and a person will answer.
          </p>
          {/* Stacked full width on phones: side by side the pair overflows 320px. */}
          <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-3">
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
