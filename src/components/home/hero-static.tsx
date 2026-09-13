import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/components/brand/logo";

/**
 * The hero for a store that has no banners yet.
 *
 * The carousel hero needs banner artwork an owner has not uploaded on day one,
 * and a carousel of one blank slide is worse than no carousel. This band is
 * typographic: it needs nothing from the database, reads as deliberate rather
 * than unfinished, and ships no JavaScript. It is replaced by the real hero
 * the moment a HERO banner exists in the admin panel.
 *
 * Two shapes, because an empty shop and a small shop want different words:
 * with stock on the shelves it invites you in, without it says so plainly
 * instead of sending you to a page with nothing on it.
 */
export function HeroStatic({ hasProducts }: { hasProducts: boolean }) {
  return (
    <section className="peacock-surface relative overflow-hidden">
      {/* A quiet ground rather than a photograph: two soft washes and a
          hairline grid, so the band has depth without needing an image. */}
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
          {hasProducts ? BRAND.tagline : "Opening soon"}
        </span>

        <h1 className="mt-3 max-w-2xl font-display text-[28px] leading-[1.02] tracking-[-0.035em] text-white sm:mt-5 sm:text-[52px] lg:text-[64px]">
          {hasProducts ? (
            <>
              A small shelf,
              <br className="hidden sm:block" /> chosen properly.
            </>
          ) : (
            <>
              We are filling
              <br className="hidden sm:block" /> the shelves.
            </>
          )}
        </h1>

        <p className="mt-3 max-w-md text-[13.5px] leading-[1.6] text-white/65 sm:mt-5 sm:text-[15px] sm:leading-[1.75]">
          {hasProducts
            ? `${BRAND.name} stocks and invoices everything it sells. What is listed is in our hands, ready to ship — nothing is drop-shipped from a marketplace.`
            : `${BRAND.name} is a first-party store: we buy the stock, we hold it, we invoice it. The first products go live shortly.`}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-9 sm:gap-3">
          {hasProducts ? (
            <>
              <Link
                href="/products"
                className="tap inline-flex h-11 grow items-center justify-center gap-2 bg-gold-400 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-gold-300 sm:h-12 sm:grow-0 sm:px-8 sm:text-[12px]"
              >
                Browse everything <ArrowRight size={15} />
              </Link>
              <Link
                href="/about"
                className="tap inline-flex h-11 grow items-center justify-center border border-white/30 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:border-white hover:bg-white hover:text-ink-950 sm:h-12 sm:grow-0 sm:px-8 sm:text-[12px]"
              >
                About the store
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/about"
                className="tap inline-flex h-11 grow items-center justify-center gap-2 bg-gold-400 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-gold-300 sm:h-12 sm:grow-0 sm:px-8 sm:text-[12px]"
              >
                About the store <ArrowRight size={15} />
              </Link>
              <Link
                href="/contact"
                className="tap inline-flex h-11 grow items-center justify-center border border-white/30 px-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:border-white hover:bg-white hover:text-ink-950 sm:h-12 sm:grow-0 sm:px-8 sm:text-[12px]"
              >
                Talk to us
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
