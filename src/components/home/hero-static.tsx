import Link from "next/link";
import Image from "@/components/ui/image";
import { ArrowRight, PackageCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { BRAND } from "@/components/brand/logo";
import { BUSINESS } from "@/config/business";
import type { Category } from "@/lib/types";
import type { ProductCardModel } from "@/lib/card";
import { formatINR } from "@/lib/utils";

/**
 * The hero for a store that has no banner artwork yet.
 *
 * Typographic on the left, and on the right the shop's own goods — a real
 * photograph from the catalogue with a real product, its real price and
 * whether it is in stock. The band used to be words on one half and empty
 * dark on the other, which reads as a page that failed to finish loading
 * rather than a shop. Something true and specific in that space is what makes
 * the difference between looking designed and looking unfinished.
 *
 * What it says comes from the catalogue, not from a slogan. A shop with one
 * department leads with that department's own name and description — which is
 * both what a visitor wants to know and what a search engine can index. With
 * two or three it names them; with none it says the shelves are being filled.
 *
 * The promises along the bottom are read from src/config/business.ts, the same
 * source the policy pages use, so the hero cannot promise a return window the
 * refund policy does not honour.
 */

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const primary =
  "tap inline-flex h-12 grow items-center justify-center gap-2 bg-gold-400 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-gold-300 sm:grow-0 sm:px-8 sm:text-[12px]";
const secondary =
  "tap inline-flex h-12 grow items-center justify-center border border-white/30 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:border-white hover:bg-white hover:text-ink-950 sm:grow-0 sm:px-8 sm:text-[12px]";

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
    ? "Opening soon"
    : one
      ? "Now stocking"
      : few
        ? "What we stock"
        : BRAND.tagline;

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

  // The picture: the product being shown off, or failing that the department's
  // own photograph. Never a stock image standing in for goods we do not have.
  const picture = lead?.image ?? (one?.image.url || categories[0]?.image.url) ?? null;
  const pictureAlt = lead ? lead.title : one?.image.alt || categories[0]?.image.alt || "";

  const promises = [
    { icon: PackageCheck, label: "Bought and invoiced by us" },
    { icon: RotateCcw, label: `${BUSINESS.ops.returnWindowDays}-day returns` },
    { icon: Truck, label: `Delivered by ${BUSINESS.ops.courierPartners[0] ?? "our courier"}` },
    { icon: ShieldCheck, label: "UPI, card and cash on delivery" },
  ];

  return (
    <section className="peacock-surface relative overflow-hidden">
      {/* A quiet ground rather than a photograph: two soft washes, so the band
          has depth without needing an image behind the words. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-32 h-[460px] w-[460px] rounded-full bg-gold-400/10 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-brand-500/20 blur-3xl"
      />

      <div className="container-page relative py-10 sm:py-16 lg:py-20">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
          {/* Words */}
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-300">
              <span className="h-px w-7 bg-gold-400" />
              {eyebrow}
            </span>

            <h1 className="mt-3 max-w-xl font-display text-[30px] leading-[1.02] tracking-[-0.035em] text-white sm:mt-5 sm:text-[52px] lg:text-[60px]">
              {heading}
            </h1>

            <p className="mt-3 max-w-md text-[13.5px] leading-[1.65] text-white/65 sm:mt-5 sm:text-[15px] sm:leading-[1.75]">
              {body}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2 sm:mt-8 sm:gap-3">
              {!hasProducts ? (
                <>
                  <Link href="/about" className={primary}>
                    About the store <ArrowRight size={15} />
                  </Link>
                  <Link href="/contact" className={secondary}>
                    Talk to us
                  </Link>
                </>
              ) : one ? (
                <>
                  <Link href={`/c/${one.slug}`} className={primary}>
                    Shop {one.name} <ArrowRight size={15} />
                  </Link>
                  <Link href="/products" className={secondary}>
                    All products
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/products" className={primary}>
                    Browse everything <ArrowRight size={15} />
                  </Link>
                  <Link href="/about" className={secondary}>
                    About the store
                  </Link>
                </>
              )}
            </div>

            {/* Four things that are true, from the same file the policy pages
                read. Two columns on a phone so they take four short lines
                rather than eight. */}
            <ul className="mt-7 grid max-w-lg grid-cols-2 gap-x-5 gap-y-2.5 border-t border-white/12 pt-5 sm:mt-9 sm:gap-x-8 sm:pt-6">
              {promises.map((promise) => (
                <li
                  key={promise.label}
                  className="flex items-start gap-2 text-[11.5px] leading-snug text-white/70 sm:text-[12.5px]"
                >
                  <promise.icon size={14} className="mt-px shrink-0 text-gold-300" />
                  {promise.label}
                </li>
              ))}
            </ul>
          </div>

          {/* The goods. Hidden on phones — below the fold it would only push
              the buttons down, and the shelves are the next band anyway. */}
          {picture && (
            <div className="relative hidden lg:block">
              <div className="relative aspect-[4/5] overflow-hidden border border-white/15">
                <Image
                  src={picture}
                  alt={pictureAlt}
                  fill
                  priority
                  sizes="420px"
                  className="object-cover"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-ink-950/55 via-transparent to-transparent"
                />
              </div>

              {/* A real product, at its real price. Proof there is something on
                  the shelf, which is the one thing a new shop has to show. */}
              {lead && (
                <Link
                  href={`/p/${lead.slug}`}
                  className="tap absolute -bottom-5 -left-5 max-w-[260px] bg-surface p-4 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                    {lead.brand}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[13.5px] font-medium leading-snug text-ink-950">
                    {lead.title}
                  </span>
                  <span className="mt-2 flex items-baseline gap-2">
                    <span className="text-[16px] font-semibold tabular-nums text-ink-950">
                      {formatINR(lead.price)}
                    </span>
                    {lead.mrp > lead.price && (
                      <span className="text-[12px] tabular-nums text-ink-400 line-through">
                        {formatINR(lead.mrp)}
                      </span>
                    )}
                  </span>
                  <span className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-brand-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                    {lead.stock > 0 ? "In stock, ships in 2 days" : "Back soon"}
                  </span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
