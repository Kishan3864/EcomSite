import type { Metadata } from "next";
import Image from "@/components/ui/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  CircleCheck,
  FileBadge,
  Headset,
  MapPin,
  Package,
  RotateCcw,
  ShoppingCart,
  Truck,
  User,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Breadcrumbs, SectionHeader } from "@/components/ui/primitives";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { buttonClasses } from "@/components/ui/button";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { brands } from "@/data/taxonomy";
import { POOL, img } from "@/data/images";
import { BRAND } from "@/components/brand/logo";
import { BUSINESS, formatAddress, isFilled, operatorDescription } from "@/config/business";

/**
 * About page. Every claim must be true of the business as configured — no
 * invented headcount, history or scale. Reviewers read this beside the KYC.
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
const PRINCIPLES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BadgeIndianRupee,
    title: "The price you see is the price you pay",
    body: "Every price on this site is in rupees and includes tax. Delivery, if any, is shown in your cart before you pay. We add no convenience fee, no handling charge and no surprise at the last step.",
  },
  {
    icon: Warehouse,
    title: "We stock what we sell",
    body: "We are a first-party retailer, not a marketplace. We buy the stock, hold it ourselves and invoice you directly. There are no third-party sellers here, so there is never any question about who is responsible for your order.",
  },
  {
    icon: RotateCcw,
    title: "Returns that are actually usable",
    body: `You have ${O.returnWindowDays} days from delivery. No restocking fee. If an item arrives damaged or is not what you ordered, we cover the delivery charge both ways.`,
  },
  {
    icon: Headset,
    title: "A person answers",
    body: `Support runs ${BUSINESS.supportHours}. Our full postal address, phone number and grievance officer are published on the contact page — not hidden behind a form.`,
  },
];

/** How an order moves. Timelines come from config, so they cannot drift. */
const HOW_IT_WORKS: { icon: LucideIcon; step: string; body: string }[] = [
  {
    icon: ShoppingCart,
    step: "You order",
    body: "Add to cart, pay online in rupees. The total, including any delivery charge, is shown before payment. You get an order number by email and SMS straight away.",
  },
  {
    icon: Package,
    step: "We pack",
    body: `Your order is picked, checked and handed to a courier partner within ${O.dispatchDays} business days. You get a tracking link the moment it leaves us.`,
  },
  {
    icon: Truck,
    step: "It arrives",
    body: `Delivery normally takes ${O.deliveryDaysMin} to ${O.deliveryDaysMax} business days after dispatch. Remote pincodes take a little longer, and we say so before you pay.`,
  },
  {
    icon: CircleCheck,
    step: "You decide",
    body: `Keep it, or start a return from your account within the window for that category. Refunds go back to the method you paid with.`,
  },
];

export default function AboutPage() {
  const details: { icon: LucideIcon; label: string; value: string; nums?: boolean }[] = [
    { icon: Building2, label: "Trading name", value: BUSINESS.legalName },
    { icon: User, label: "Operated by", value: BUSINESS.proprietorName },
    ...(isFilled(BUSINESS.gstin)
      ? [{ icon: FileBadge, label: "GSTIN", value: BUSINESS.gstin, nums: true }]
      : []),
    { icon: MapPin, label: "Business address", value: formatAddress() },
  ];

  return (
    <div className="container-page pb-10 pt-5 sm:pb-16 sm:pt-7">
      <BreadcrumbJsonLd items={crumbs} />
      <Breadcrumbs items={crumbs} className="mb-4" />

      {/* Hero */}
      <header className="aurora relative overflow-hidden rounded-3xl">
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative grid items-center gap-8 p-5 sm:p-10 lg:grid-cols-12 lg:gap-10 lg:p-12">
          <div className="min-w-0 lg:col-span-6">
            <p className="eyebrow">About us · {BUSINESS.address.city}</p>
            <h1 className="t-display mt-4 max-w-[16ch]">
              Everyday things, <br className="hidden sm:block" />
              honestly priced.
            </h1>
            <p className="t-body mt-4 max-w-[46ch] text-ink-700">{BRAND.description}</p>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/products" className={buttonClasses("primary", "lg")}>
                Browse the catalogue <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/contact" className={buttonClasses("outline", "lg", "bg-surface hover:bg-ink-50")}>
                Talk to us
              </Link>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-6">
            <figure className="card overflow-hidden p-1.5 shadow-lg">
              <div className="relative aspect-4/3 overflow-hidden rounded-[14px] bg-ink-100 sm:aspect-16/10">
                <Image
                  src={img(POOL.lifestyle[1], { fit: "wide", w: 900 })}
                  alt={`${BUSINESS.brandName} product range`}
                  fill
                  loading="eager"
                  fetchPriority="high"
                  sizes="(min-width:1024px) 560px, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="flex items-center gap-2 px-3 py-3">
                <MapPin size={14} aria-hidden className="text-brand-700" />
                <span className="t-label">Stocked and shipped from {BUSINESS.address.city}</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </header>

      {/* Who is actually behind the shop. Reviewers look for this. */}
      <section className="section">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-6">
          <div className="card min-w-0 p-5 sm:p-8">
            <span className="icon-tile">
              <Building2 size={20} aria-hidden />
            </span>
            <h2 className="t-h2 mt-4">Who runs this shop</h2>
            <div className="t-body mt-3 max-w-[68ch] space-y-3.5 text-[14.5px] leading-[1.75]">
              <p>
                {BUSINESS.brandName} is owned and operated by {operatorDescription()}. We sell{" "}
                {BUSINESS.categoriesSold.join(", ").toLowerCase()} to customers across India.
              </p>
              <p>
                We are a small, new business, and we would rather say that plainly than pretend to a
                scale we do not have. What we can promise is the part that is entirely within our
                control: accurate listings, prices with nothing hidden behind them, orders packed
                properly, and a return policy we honour without argument.
              </p>
              <p>
                Everything we sell is bought by us and invoiced by us. If something goes wrong with
                your order, there is no third-party seller to chase — it is our problem to fix.
              </p>
            </div>
          </div>

          {/* The registration facts, set to be read quickly. */}
          <aside className="card min-w-0 p-5 sm:p-6">
            <h3 className="t-label">Business details</h3>
            <dl className="mt-3 divide-y divide-line">
              {details.map((d) => (
                <div key={d.label} className="flex items-start gap-3 py-3">
                  <span className="icon-tile icon-tile-sm">
                    <d.icon size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <dt className="t-small">{d.label}</dt>
                    <dd
                      className={`mt-0.5 text-[13.5px] font-medium leading-[1.5] text-ink-900 wrap-break-word ${d.nums ? "tabular-nums" : ""}`}
                    >
                      {d.value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
            <Link
              href="/contact"
              className="tap group mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Contact details and grievance officer
              <ArrowRight
                size={14}
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </aside>
        </div>
      </section>

      <section className="section pt-0">
        <Reveal>
          <SectionHeader
            eyebrow="What we commit to"
            title="Four things we will not compromise on"
            description="Each one is written into a policy page you can hold us to, not just stated here."
          />
        </Reveal>
        <StaggerGroup className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {PRINCIPLES.map((principle) => (
            <StaggerItem key={principle.title} className="card card-interactive h-full p-5 sm:p-6">
              <span className="icon-tile">
                <principle.icon size={20} aria-hidden />
              </span>
              <h3 className="t-h3 mt-4 text-[16px]">{principle.title}</h3>
              <p className="t-body mt-2 max-w-[52ch]">{principle.body}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      <section className="section pt-0">
        <Reveal>
          <SectionHeader
            eyebrow="How it works"
            title="From your cart to your door"
            href="/services"
            linkLabel="Read the full detail"
          />
        </Reveal>
        <ol className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item, i) => (
            <Reveal key={item.step} as="li" delay={i * 0.06} className="card relative h-full p-5">
              <div className="flex items-center justify-between">
                <span className="icon-tile">
                  <item.icon size={20} aria-hidden />
                </span>
                <span className="t-label tabular-nums">Step {i + 1}</span>
              </div>
              <h3 className="t-h3 mt-4 text-[16px]">{item.step}</h3>
              <p className="t-body mt-2">{item.body}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="section pt-0">
        <Reveal>
          <SectionHeader
            eyebrow="Our catalogue"
            title="Brands we stock"
            description="Product names and logos belong to their respective owners and appear here only to identify the goods we sell."
            href="/products"
            linkLabel="Browse everything"
          />
        </Reveal>
        <StaggerGroup className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {brands.map((brand) => (
            <StaggerItem key={brand.slug}>
              <Link
                href={`/products?brands=${brand.slug}`}
                className="card card-interactive tap flex h-full flex-col gap-1 px-3.5 py-3.5 sm:p-5"
              >
                <span className="t-h3 text-[13.5px] sm:text-[14px]">{brand.name}</span>
                <span className="t-small hidden sm:block">{brand.tagline}</span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* Closing CTA */}
      <section className="midnight relative overflow-hidden rounded-3xl px-5 py-10 sm:px-12 sm:py-14">
        <div className="relative max-w-xl">
          <span className="eyebrow eyebrow-dark">Before you buy</span>
          <h2 className="mt-3 text-[22px] font-semibold leading-[1.15] tracking-[-0.026em] text-white sm:text-[28px]">
            Anything you want to ask before you buy?
          </h2>
          <p className="mt-3 max-w-[46ch] text-[14px] leading-[1.6] text-white/70">
            Our address, phone number, email and grievance officer are all published. Call or write
            and a person will answer.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link href="/contact" className={buttonClasses("accent", "lg")}>
              Contact us <ArrowRight size={16} aria-hidden />
            </Link>
            <Link
              href="/faq"
              className={buttonClasses("ghost", "lg", "text-white hover:bg-white/10 hover:text-white active:bg-white/15")}
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
