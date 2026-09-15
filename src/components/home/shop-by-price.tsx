import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { balancedColumnClass } from "@/lib/grid";
import { cn, formatINR } from "@/lib/utils";

/**
 * Shop by budget.
 *
 * The second question a shopper asks after "what do you sell" is "what can I
 * get for what I want to spend", and on most small storefronts the only answer
 * is a price slider buried in a filter drawer. This puts it on the homepage as
 * four doors.
 *
 * Every band is computed from prices the shop actually charges, which is the
 * whole point of building it this way rather than hard-coding "Under ₹999 /
 * Under ₹1999 / Under ₹4999" like a template would:
 *
 *  - a band is only drawn if products actually fall in it, so the shop never
 *    advertises a price point it cannot fill. A catalogue of five appliances
 *    between ₹1,199 and ₹4,299 gets bands that match, not an "Under ₹499" tile
 *    that lands on an empty listing;
 *  - the counts are real, so "12 products" is 12 products;
 *  - the whole band disappears below three usable bands. Two doors into a
 *    five-product catalogue is not a way to shop, it is furniture.
 *
 * The thresholds themselves are quantiles of the real price list rather than
 * round numbers, then rounded outward to something a person would say. That
 * keeps the bands roughly even in size at any catalogue, which is what stops
 * one door holding everything and the other three holding one item each.
 */

/** Below this many bands the section is furniture rather than a way to shop. */
const MIN_BANDS = 3;

/** Round a threshold up to something a shopper would actually say. */
function friendlyCeiling(value: number): number {
  if (value <= 500) return Math.ceil(value / 100) * 100;
  if (value <= 2000) return Math.ceil(value / 250) * 250;
  if (value <= 10000) return Math.ceil(value / 500) * 500;
  return Math.ceil(value / 1000) * 1000;
}

interface Band {
  label: string;
  href: string;
  count: number;
}

/**
 * @param ladder every active product's price. Sorted defensively rather than
 *   trusted: the quantile cuts below are meaningless on an unsorted list, and
 *   a caller passing one would produce plausible-looking nonsense instead of
 *   an error.
 */
export function buildPriceBands(ladder: number[]): Band[] {
  const prices = [...ladder].sort((a, b) => a - b);
  if (prices.length === 0) return [];

  // Three interior cuts at the quartiles, rounded out to speakable numbers.
  // Duplicates collapse — a catalogue clustered around one price legitimately
  // produces fewer bands, and that is the signal to drop the section.
  const cuts = [0.25, 0.5, 0.75]
    .map((q) => friendlyCeiling(prices[Math.min(prices.length - 1, Math.floor(q * prices.length))]))
    .filter((v, i, all) => all.indexOf(v) === i)
    .sort((a, b) => a - b);

  const bands: Band[] = [];
  for (const cut of cuts) {
    const count = prices.filter((p) => p <= cut).length;
    // A band holding everything is the "all products" link twice over.
    if (count === 0 || count === prices.length) continue;
    bands.push({
      label: `Under ${formatINR(cut)}`,
      href: `/products?maxPrice=${cut}&sort=price_asc`,
      count,
    });
  }

  // The last door is always the whole catalogue, so there is a way past the
  // curation and the row never ends on an arbitrary ceiling.
  bands.push({
    label: "Everything we stock",
    href: "/products?sort=price_asc",
    count: prices.length,
  });

  return bands;
}

export function ShopByPrice({ prices }: { prices: number[] }) {
  const bands = buildPriceBands(prices);
  if (bands.length < MIN_BANDS) return null;

  return (
    <section className="container-page py-8 sm:py-12">
      <div className="mb-4 sm:mb-6">
        <h2 className="font-display text-[20px] leading-[1.15] text-ink-950 sm:text-[26px]">
          Shop by budget
        </h2>
        <p className="mt-1.5 text-[13px] text-ink-500 sm:text-[14px]">
          Real price bands, counted from what is on the shelf today.
        </p>
      </div>

      {/* Two across on a phone, then a row sized to how many doors there
          actually are. A fixed four-track row holding three bands leaves a
          quarter of the section empty, which is the same "shop with a hole in
          it" effect the department band above was just fixed for. */}
      <ul className={cn("grid grid-cols-2 gap-2.5 sm:gap-3.5", balancedColumnClass(bands.length, 4))}>
        {bands.map((band, i) => (
          <li key={band.href}>
            <Link
              href={band.href}
              className="group flex h-full flex-col justify-between gap-5 bg-surface p-4 shadow-xs transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md sm:p-5"
            >
              <span>
                <span className="block text-[14px] font-bold tracking-[-0.01em] text-ink-950 sm:text-[15.5px]">
                  {band.label}
                </span>
                <span className="mt-1 block text-[12px] tabular-nums text-ink-500 sm:text-[12.5px]">
                  {band.count} {band.count === 1 ? "product" : "products"}
                </span>
              </span>
              <span
                aria-hidden
                className={
                  // The last door is the whole catalogue, so it is the one that
                  // carries the gold: it is the way through, not a filter.
                  i === bands.length - 1
                    ? "inline-flex h-8 w-8 items-center justify-center bg-gold-400 text-ink-950 transition-transform duration-200 group-hover:translate-x-0.5"
                    : "inline-flex h-8 w-8 items-center justify-center bg-brand-50 text-brand-700 transition-transform duration-200 group-hover:translate-x-0.5"
                }
              >
                <ArrowRight size={15} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
