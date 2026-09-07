import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Factory, HandCoins, Leaf, Users } from "lucide-react";
import { Breadcrumbs, SectionHeader } from "@/components/ui/primitives";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { buttonClasses } from "@/components/ui/button";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { brands } from "@/data/taxonomy";
import { POOL, img } from "@/data/images";
import { BRAND } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "About Mayura",
  description:
    "Mayura is an Indian storefront for things made well — sixteen studios, honest pricing, and the maker named on every product page.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Mayura",
    description: "An Indian storefront for things made well.",
    url: "/about",
    images: [{ url: img(POOL.lifestyle[1], { fit: "wide", w: 1200 }), alt: "Mayura" }],
  },
};

const crumbs = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
];

const PRINCIPLES = [
  {
    icon: Factory,
    title: "We name the maker",
    body: "Every product page says which studio made it and in which city. If a supplier will not let us name them, we do not stock them. It is a simple filter and it removes a lot of bad options.",
  },
  {
    icon: HandCoins,
    title: "The price is the price",
    body: "We do not inflate an MRP so a discount looks bigger. Our margin is between 28% and 40% depending on category, and we will tell you which on request. Sales are real, and rare.",
  },
  {
    icon: Users,
    title: "Support that answers",
    body: "Fourteen people in Bengaluru handle every conversation. No offshore script, no chatbot loop before you reach a human. Median first reply is under nine minutes.",
  },
  {
    icon: Leaf,
    title: "Packaging you can compost",
    body: "Corrugated board, paper tape and starch-based void fill. No bubble wrap, no plastic tape, no polybags for anything that does not genuinely need one.",
  },
];

const NUMBERS = [
  { value: "16", label: "maker studios" },
  { value: "120", label: "products, curated" },
  { value: "19k", label: "serviceable pincodes" },
  { value: "9 min", label: "median support reply" },
];

const TIMELINE = [
  {
    year: "2024",
    title: "A spreadsheet and a question",
    body: "Two of us kept buying the same badly made things online. We started a list of Indian studios whose work we actually trusted. The list turned out to be the business.",
  },
  {
    year: "2025",
    title: "First eleven brands",
    body: "We signed direct agreements with eleven studios, all of whom agreed to be named on the page. We shipped our first order from a rented mezzanine in Hosur Road.",
  },
  {
    year: "2026",
    title: "Our own fleet",
    body: "Delivery in fourteen metros moved to our own riders so we could stop apologising for other people's mistakes. Free returns followed the same month.",
  },
  {
    year: "Next",
    title: "Made for Mayura",
    body: "We are working with four studios on products designed for this catalogue specifically — starting with cookware sized for Indian kitchens rather than European ones.",
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
                alt="Inside a Mayura partner studio"
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
                A storefront for things made well, priced honestly.
              </h1>
              <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-white/70">
                {BRAND.description}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-10 grid gap-6 border-y border-hairline py-10 sm:grid-cols-4">
          {NUMBERS.map((n) => (
            <div key={n.label}>
              <p className="font-display text-[38px] leading-none tracking-[-0.03em] text-ink-950">
                {n.value}
              </p>
              <p className="mt-2 text-[12.5px] uppercase tracking-[0.1em] text-ink-500">
                {n.label}
              </p>
            </div>
          ))}
        </section>

        <section className="py-12">
          <Reveal>
            <SectionHeader
              eyebrow="Why we exist"
              title="Four things we refuse to compromise on"
              description="These are not values on a wall. Each one costs us money, which is how you know we mean them."
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
            <SectionHeader eyebrow="How we got here" title="Three years, four decisions" className="mb-8" />
          </Reveal>

          <ol className="relative border-l border-hairline pl-8">
            {TIMELINE.map((item, i) => (
              <Reveal key={item.year} as="li" delay={i * 0.06} className="relative pb-10 last:pb-0">
                <span className="absolute -left-[38px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 ring-4 ring-canvas">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <p className="font-display text-[13px] font-semibold tabular-nums text-brand-600">
                  {item.year}
                </p>
                <h3 className="mt-1 font-display text-xl tracking-[-0.015em] text-ink-950">
                  {item.title}
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
              eyebrow="Our partners"
              title="The studios we work with"
              description="Direct agreements, named on every page, paid within fourteen days of dispatch."
              href="/products"
              linkLabel="Shop their work"
              className="mb-8"
            />
          </Reveal>

          <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {brands.map((brand) => (
              <StaggerItem key={brand.slug}>
                <Link
                  href={`/products?brands=${brand.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-hairline bg-surface p-5 transition-all duration-200 hover:-translate-y-1 hover:border-ink-200 hover:shadow-md"
                >
                  <p className="font-display text-[17px] tracking-[-0.015em] text-ink-950 group-hover:text-brand-700">
                    {brand.name}
                  </p>
                  <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-600">
                    {brand.tagline}
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-ink-400">
                    {brand.origin}
                    <ArrowRight
                      size={12}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </p>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>
      </div>

      <section className="container-page pb-16">
        <div className="peacock-surface flex flex-col items-start gap-6 rounded-2xl p-8 sm:flex-row sm:items-center sm:justify-between sm:rounded-3xl sm:p-12">
          <div>
            <h2 className="max-w-lg font-display text-[26px] leading-tight tracking-[-0.025em] text-white sm:text-[34px]">
              Make something we should stock?
            </h2>
            <p className="mt-2.5 max-w-lg text-[14px] leading-relaxed text-white/60">
              We read every submission ourselves. If you run a studio in India and your work is
              good, we would like to see it.
            </p>
          </div>
          <Link href="/contact" className={buttonClasses("accent", "lg", "shrink-0")}>
            Get in touch
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}
