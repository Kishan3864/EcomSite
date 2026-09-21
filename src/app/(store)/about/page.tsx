import type { Metadata } from "next";
import Image from "@/components/ui/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/primitives";
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
 *
 * It used to open with a photograph of a kitchen, a near-black gradient poured
 * over it and the page's title written across the middle. That is the masthead
 * every bought template ships with, and it says nothing: the reader cannot see
 * the photograph, and the words would have been easier to read on paper. So
 * this opens the way the homepage does — ink on a cool white sheet, the
 * business's own sentences, and the photograph beside them in a hairline frame
 * with nothing written on top of it.
 */

export const metadata: Metadata = {
  title: `About ${BUSINESS.brandName}`,
  description: `${BUSINESS.brandName} is an Indian online store run by ${BUSINESS.founderName}, selling ${BUSINESS.categoriesSold
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
    title: "The price you see is the price you pay",
    body: "Every price on this site is in rupees and includes tax. Delivery, if any, is shown in your cart before you pay. We add no convenience fee, no handling charge and no surprise at the last step.",
  },
  {
    title: "We stock what we sell",
    body: "We are a first-party retailer, not a marketplace. We buy the stock, hold it ourselves and invoice you directly. There are no third-party sellers here, so there is never any question about who is responsible for your order.",
  },
  {
    title: "Returns that are actually usable",
    body: `You have ${O.returnWindowDays} days from delivery. No restocking fee. If an item arrives damaged or is not what you ordered, we cover the delivery charge both ways.`,
  },
  {
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

/**
 * The band head the homepage uses, kept here rather than imported: it is four
 * elements and a rule, and copying it is cheaper than exporting a layout
 * primitive that only two pages would ever share.
 */
function Band({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "View all",
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* Matched to the shelf headings on the homepage: a gold eyebrow, the
          name, and a pill through to the rest. The ruled band this used to sit
          in is gone for the same reason it went there — ruled bands stack down
          a page like chapters of a book, and this is a shop. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:flex sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="contents sm:block">
          <span className="eyebrow col-span-2">{eyebrow}</span>
          <h2 className="mt-1.5 font-display text-[22px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-3 sm:text-[32px]">
            {title}
          </h2>
          {description && (
            <p className="col-span-2 mt-1.5 max-w-[46ch] text-[13px] leading-[1.55] text-ink-500 sm:mt-2.5 sm:text-[14px]">
              {description}
            </p>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="tap group col-start-2 row-start-2 inline-flex h-9 shrink-0 items-center gap-1.5 bg-surface px-4 text-[12.5px] font-semibold text-brand-700 shadow-xs transition-colors duration-200 hover:bg-brand-50 sm:h-10 sm:px-5 sm:text-[13px]"
          >
            {linkLabel}
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <div className="container-page py-5 sm:py-7">
        <BreadcrumbJsonLd items={crumbs} />
        <Breadcrumbs items={crumbs} className="mb-4 sm:mb-6" />

        <header className="pb-8 sm:pb-14">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-6">
              <span className="eyebrow">About us · {BUSINESS.address.city}</span>
              <h1 className="mt-3 font-display leading-[1.02] tracking-[-0.035em] text-ink-950 sm:mt-5">
                <span className="text-[clamp(30px,8.5vw,38px)] lg:text-[58px]">
                  Everyday things,
                  <br className="hidden sm:block" /> honestly priced.
                </span>
              </h1>
              <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:mt-5 sm:text-[15px] sm:leading-[1.6]">
                {BRAND.description}
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Link href="/products" className={buttonClasses("primary", "lg")}>
                  Browse the catalogue <ArrowRight size={15} />
                </Link>
                <Link href="/contact" className={buttonClasses("outline", "lg")}>
                  Talk to us
                </Link>
              </div>
            </div>

            {/* The photograph, framed and captioned, with nothing written over
                it. A caption a reader can check beats a slogan they cannot. */}
            <div className="min-w-0 lg:col-span-5 lg:col-start-8">
              {/* A landscape crop on desktop, not a portrait one. At 4/5 the
                  photograph stood nearly 600px tall beside a column of text
                  about 330px tall, and the row's `items-center` put the
                  difference on the page as a void above and below the words. */}
              <div className="overflow-hidden card">
                <div className="relative aspect-[3/4] overflow-hidden bg-ink-100 sm:aspect-[16/10] lg:aspect-[5/4]">
                  <Image
                    src={img(POOL.lifestyle[1], { fit: "wide", w: 900 })}
                    alt={`${BUSINESS.brandName} product range`}
                    fill
                    loading="eager"
                    fetchPriority="high"
                    sizes="(min-width:1024px) 460px, 100vw"
                    className="object-cover"
                  />
                </div>
                <p className="px-4 py-3.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:px-5">
                  Stocked and shipped from {BUSINESS.address.city}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Who is actually behind the shop. Reviewers look for this. */}
        <section className="py-8 sm:py-14">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
            <div className="min-w-0">
              <h2 className="font-display text-[22px] leading-[1.1] tracking-[-0.03em] text-ink-950 sm:text-[32px]">
                Who runs this shop
              </h2>
              <div className="mt-4 max-w-[68ch] space-y-3.5 text-[14px] leading-[1.75] text-ink-600 sm:text-[15px]">
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

            {/* The registration facts, set as a ledger. It is the part of this
                page a payment aggregator reads, so it is drawn to be read
                quickly rather than to look designed. */}
            <aside className="min-w-0">
              <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                Business details
              </h3>
              <dl className="detail-panel mt-3 px-4 sm:px-5">
                <div className="table-row-line flex items-baseline justify-between gap-5 py-3">
                  <dt className="shrink-0 text-[13px] text-ink-500">Trading name</dt>
                  <dd className="min-w-0 text-right text-[13px] font-medium text-ink-900 wrap-break-word">
                    {BUSINESS.legalName}
                  </dd>
                </div>
                <div className="table-row-line flex items-baseline justify-between gap-5 py-3">
                  <dt className="shrink-0 text-[13px] text-ink-500">Operated by</dt>
                  <dd className="min-w-0 text-right text-[13px] font-medium text-ink-900 wrap-break-word">
                    {BUSINESS.proprietorName}
                  </dd>
                </div>
                {isFilled(BUSINESS.gstin) ? (
                  <div className="table-row-line flex items-baseline justify-between gap-5 py-3">
                    <dt className="shrink-0 text-[13px] text-ink-500">GSTIN</dt>
                    <dd className="min-w-0 text-right text-[13px] font-medium tabular-nums text-ink-900 wrap-break-word">
                      {BUSINESS.gstin}
                    </dd>
                  </div>
                ) : null}
                <div className="table-row-line flex items-baseline justify-between gap-5 py-3">
                  <dt className="shrink-0 text-[13px] text-ink-500">Business address</dt>
                  <dd className="min-w-0 text-right text-[13px] font-medium leading-[1.55] text-ink-900 wrap-break-word">
                    {formatAddress()}
                  </dd>
                </div>
              </dl>
              <Link
                href="/contact"
                className="tap group mt-4 inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors hover:text-gold-700"
              >
                Contact details and grievance officer
                <ArrowRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
            </aside>
          </div>
        </section>

        <section className="py-8 sm:py-14">
          <Reveal>
            <Band
              eyebrow="What we commit to"
              title="Four things we will not compromise on"
              description="Each one is written into a policy page you can hold us to, not just stated here."
              className="mb-6 sm:mb-10"
            />
          </Reveal>

          {/* Numbered rather than illustrated: four icons in four boxes is the
              look of a template, and a numeral says the same thing in ink. */}
          <StaggerGroup className="tile-grid grid-cols-1 sm:grid-cols-2">
            {PRINCIPLES.map((principle, i) => (
              <StaggerItem key={principle.title} className="p-4 sm:p-6">
                <p className="text-[11.5px] font-semibold tabular-nums tracking-[0.12em] text-ink-400">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 font-display text-[20px] leading-[1.15] tracking-[-0.02em] text-ink-950 sm:text-[22px]">
                  {principle.title}
                </h3>
                <p className="mt-2.5 max-w-[52ch] text-[14px] leading-[1.65] text-ink-600 sm:text-[15px]">
                  {principle.body}
                </p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section className="py-8 sm:py-14">
          <Reveal>
            <Band
              eyebrow="How it works"
              title="From your cart to your door"
              href="/services"
              linkLabel="Read the full detail"
              className="mb-6 sm:mb-10"
            />
          </Reveal>

          <ol className="relative pl-6 sm:pl-8">
            {HOW_IT_WORKS.map((item, i) => (
              <Reveal
                key={item.step}
                as="li"
                delay={i * 0.06}
                className="relative pb-7 last:pb-0 sm:pb-10"
              >
                {/* A square on the rule, with the page colour ringed around it
                    so the rule appears to pass behind rather than through. */}
                <span
                  aria-hidden
                  className="absolute -left-[29px] top-[7px] h-2 w-2 bg-ink-950 ring-4 ring-canvas sm:-left-[37px]"
                />
                <p className="text-[11.5px] font-semibold uppercase tabular-nums tracking-[0.12em] text-ink-500">
                  Step {i + 1}
                </p>
                <h3 className="mt-1.5 font-display text-[20px] leading-[1.15] tracking-[-0.02em] text-ink-950 sm:text-[22px]">
                  {item.step}
                </h3>
                <p className="mt-2 max-w-[60ch] text-[14px] leading-[1.65] text-ink-600 sm:text-[15px]">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="py-8 sm:py-14">
          <Reveal>
            <Band
              eyebrow="Our catalogue"
              title="Brands we stock"
              description="Product names and logos belong to their respective owners and appear here only to identify the goods we sell."
              href="/products"
              linkLabel="Browse everything"
              className="mb-6 sm:mb-10"
            />
          </Reveal>

          {/* Sixteen names on one hairline grid. The tagline is the first thing
              to go on a phone, where two columns of it would run past a
              screen and a half for a list nobody reads end to end. */}
          <StaggerGroup className="tile-grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((brand) => (
              <StaggerItem key={brand.slug}>
                <Link
                  href={`/products?brands=${brand.slug}`}
                  className="tap flex h-full flex-col gap-1.5 px-3 py-3.5 transition-colors duration-200 sm:p-5 [@media(hover:hover)]:hover:bg-ink-50"
                >
                  <span className="text-[13.5px] font-medium leading-[1.35] text-ink-950 sm:text-[14px]">
                    {brand.name}
                  </span>
                  <span className="hidden text-[12.5px] leading-[1.5] text-ink-500 sm:block">
                    {brand.tagline}
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>
      </div>

      {/* The full stop: the page's one dark plane and its one filled gold
          call to action, placed last so it lands as an ending rather than
          competing with the masthead. */}
      <section className="deep-plane">
        <div className="container-page py-12 sm:py-20">
          <div className="max-w-xl">
            <span className="eyebrow eyebrow-dark">Before you buy</span>
            <h2 className="mt-4 font-display text-[24px] leading-[1.1] tracking-[-0.02em] text-white sm:mt-5 sm:text-[36px]">
              Anything you want to ask before you buy?
            </h2>
            <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.6] text-white/70 sm:text-[15px]">
              Our address, phone number, email and grievance officer are all published. Call or
              write and a person will answer.
            </p>
            <div className="mt-7 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
              <Link
                href="/contact"
                className="tap inline-flex h-12 items-center justify-center gap-2 bg-gold-400 px-6 text-[14px] font-bold text-ink-950 shadow-sm transition-colors duration-200 hover:bg-gold-300 sm:px-8"
              >
                Contact us <ArrowRight size={15} />
              </Link>
              <Link
                href="/faq"
                className="tap inline-flex h-12 items-center justify-center px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-white hover:text-ink-950 sm:px-8 sm:text-[12px]"
              >
                Read the FAQ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
