import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/components/brand/logo";
import type { Category } from "@/lib/types";

/**
 * The hero for a store that has no banners yet.
 *
 * The carousel hero needs banner artwork an owner has not uploaded on day one,
 * and a carousel of one blank slide is worse than no carousel. This band is
 * typographic: it needs no image, reads as deliberate rather than unfinished,
 * and ships no JavaScript. It is replaced by the real hero the moment a HERO
 * banner exists in the admin panel.
 *
 * What it says comes from the catalogue, not from a slogan. A shop with one
 * department leads with that department's own name and description — which is
 * both what a visitor wants to know and what a search engine can index —
 * rather than a line of copy that has nothing to do with what is on sale. With
 * two or three departments it names them; with none it says the shelves are
 * being filled.
 */

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const primary =
  "tap inline-flex h-11 grow items-center justify-center gap-2 bg-gold-400 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-gold-300 sm:h-12 sm:grow-0 sm:px-8 sm:text-[12px]";
const secondary =
  "tap inline-flex h-11 grow items-center justify-center border border-white/30 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:border-white hover:bg-white hover:text-ink-950 sm:h-12 sm:grow-0 sm:px-8 sm:text-[12px]";

export function HeroStatic({
  hasProducts,
  categories = [],
}: {
  hasProducts: boolean;
  categories?: Category[];
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

  return (
    <section className="peacock-surface relative overflow-hidden">
      {/* A quiet ground rather than a photograph: two soft washes, so the band
          has depth without needing an image. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-gold-400/10 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 h-[380px] w-[380px] rounded-full bg-brand-500/20 blur-3xl"
      />

      <div className="container-page relative flex min-h-[380px] flex-col justify-center py-12 sm:min-h-[460px] sm:py-24 lg:min-h-[520px]">
        <span className="inline-flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-300">
          <span className="h-px w-7 bg-gold-400" />
          {eyebrow}
        </span>

        <h1 className="mt-3 max-w-2xl font-display text-[28px] leading-[1.02] tracking-[-0.035em] text-white sm:mt-5 sm:text-[52px] lg:text-[64px]">
          {heading}
        </h1>

        <p className="mt-3 max-w-md text-[13.5px] leading-[1.6] text-white/65 sm:mt-5 sm:text-[15px] sm:leading-[1.75]">
          {body}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-9 sm:gap-3">
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
      </div>
    </section>
  );
}
