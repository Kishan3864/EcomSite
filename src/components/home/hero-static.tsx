import Link from "next/link";
import Image from "@/components/ui/image";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/components/brand/logo";
import { BUSINESS } from "@/config/business";
import { PaperMark } from "@/components/illustration/paper-mark";
import { RouteIllustration } from "@/components/illustration/route-illustration";
import { Price } from "@/components/ui/primitives";
import type { Category } from "@/lib/types";
import type { ProductCardModel } from "@/lib/card";

/**
 * The masthead.
 *
 * It used to be white words over a near-black plane with a photograph behind
 * them. That is the house style of every drop-shipping template on the
 * internet, and it has the same problem every one of them has: the visitor
 * cannot read the words, cannot see the product, and learns nothing about the
 * shop in the two seconds they were willing to give it.
 *
 * So this is paper. Ink on a cool white sheet, the shop's own sentence in the
 * display face, and beside it one real product from the catalogue, in a
 * hairline frame, at its real price, with what will actually happen to it
 * printed underneath. Nothing here is a mood; every line is a fact somebody
 * could hold the shop to.
 *
 * What it says comes from the catalogue, not from a slogan. A shop with one
 * department leads with that department's own name and description — which is
 * both what a visitor wants to know and what a search engine can index. With
 * two or three it names them; with none it says the shelves are being filled
 * and puts the drawn mark in the frame rather than pretending to have stock.
 */

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/* The pair of actions, sized to the thumb on a phone and to the line on a
   desktop. Ink for the one we want pressed; an outline for the other. There
   is no third weight — a masthead with three equal buttons has none. */
const primary =
  "tap inline-flex h-12 items-center justify-center gap-2 bg-ink-950 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-brand-800 sm:px-8 sm:text-[12px]";
const secondary =
  "tap inline-flex h-12 items-center justify-center px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-ink-950 hover:text-white sm:px-8 sm:text-[12px]";

export function HeroStatic({
  hasProducts,
  categories = [],
  lead,
}: {
  hasProducts: boolean;
  categories?: Category[];
  /** A real product to show beside the words, when there is one. */
  lead?: ProductCardModel;
}) {
  const one = hasProducts && categories.length === 1 ? categories[0] : null;
  const few = hasProducts && categories.length >= 2 && categories.length <= 3 ? categories : null;

  const eyebrow = !hasProducts
    ? `Opening soon · ${BUSINESS.address.city}`
    : one
      ? `${one.name} · Stocked in ${BUSINESS.address.city}`
      : `Stocked and shipped from ${BUSINESS.address.city}`;

  const heading = !hasProducts ? (
    <>
      We are filling
      <br className="hidden sm:block" /> the shelves.
    </>
  ) : one ? (
    one.name
  ) : few ? (
    joinNames(few.map((c) => c.name))
  ) : (
    <>
      Bought, stocked and
      <br className="hidden sm:block" /> invoiced by us.
    </>
  );

  const body = !hasProducts
    ? `${BRAND.name} is a first-party store: we buy the stock, we hold it, we invoice it. The first products go live shortly.`
    : one?.description ||
      `${BRAND.name} holds its own stock and invoices every order itself. What is listed is in our hands, ready to ship — nothing is drop-shipped from a marketplace.`;

  return (
    <section>
      <div className="container-page pb-10 pt-6 sm:pb-20 sm:pt-10">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-8">
          {/* Words */}
          <div className="min-w-0 lg:col-span-6">
            <span className="eyebrow">{eyebrow}</span>

            <h1 className="mt-3 font-display leading-[1.02] tracking-[-0.035em] text-ink-950 sm:mt-5 lg:text-[64px]">
              <span className="text-[clamp(32px,9.2vw,40px)] lg:text-[64px]">{heading}</span>
            </h1>

            {/* A measure, not a breakpoint. 46 characters is about the width a
                line can be before the eye loses its place returning to the
                left edge, and it holds at every screen size. */}
            <p className="mt-3.5 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:mt-5 sm:text-[15px] sm:leading-[1.6]">
              {body}
            </p>

            {/* Full width and stacked on a phone, side by side from 640px. */}
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {!hasProducts ? (
                <>
                  <Link href="/about" className={primary}>
                    About the store <ArrowRight size={15} />
                  </Link>
                  <Link href="/contact" className={secondary}>
                    Talk to us
                  </Link>
                </>
              ) : (
                <>
                  <Link href={one ? `/c/${one.slug}` : "/products"} className={primary}>
                    {one ? `Shop ${one.name}` : "Shop the catalogue"} <ArrowRight size={15} />
                  </Link>
                  <Link href="/legal/shipping" className={secondary}>
                    How delivery works
                  </Link>
                </>
              )}
            </div>

            {/* Desktop only. On a phone it would sit between the buttons and
                the product, which is the one place nothing decorative belongs. */}
            <RouteIllustration className="mt-10 hidden h-[220px] w-full max-w-[420px] text-brand-700 lg:block" />
          </div>

          {/* The goods. One product, framed, with the truth underneath it. */}
          <div className="min-w-0 lg:col-span-5 lg:col-start-8">
            <div className="bg-surface">
              {lead ? (
                <Link
                  href={`/p/${lead.slug}`}
                  className="tap group relative block aspect-[3/4] overflow-hidden bg-ink-100 lg:aspect-[4/5]"
                >
                  <Image
                    src={lead.image}
                    alt={lead.imageAlt || lead.title}
                    fill
                    priority
                    sizes="(min-width:1024px) 460px, 100vw"
                    className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                  />
                </Link>
              ) : (
                /* Nothing on the shelves yet, so the frame holds the shop's
                   own drawn mark rather than a stock photograph of somebody
                   else's kitchen. */
                <div className="flex aspect-[3/4] items-center justify-center bg-ink-50 lg:aspect-[4/5]">
                  <PaperMark size={320} className="max-w-[70%] text-ink-700" />
                </div>
              )}

              <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                {lead ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <Link
                        href={`/p/${lead.slug}`}
                        className="line-clamp-2 text-[13.5px] font-medium leading-[1.35] text-ink-900 hover:text-brand-700"
                      >
                        {lead.title}
                      </Link>
                      <Price price={lead.price} mrp={lead.mrp} size="md" className="shrink-0" />
                    </div>
                    <p className="mt-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      {lead.stock > 0
                        ? `In stock · Dispatched in ${BUSINESS.ops.dispatchDays} working days`
                        : "Back in stock soon"}
                    </p>
                  </>
                ) : (
                  <p className="line-clamp-2 text-[13px] leading-[1.5] text-ink-600">
                    {BRAND.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
