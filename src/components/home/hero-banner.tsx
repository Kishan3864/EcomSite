import Link from "next/link";
import Image from "@/components/ui/image";
import { ArrowRight, BadgeIndianRupee, ShieldCheck, Truck } from "lucide-react";
import { BRAND } from "@/components/brand/logo";
import { BUSINESS, isGstRegistered } from "@/config/business";
import type { Banner, Category, ImageAsset } from "@/lib/types";
import type { ProductCardModel } from "@/lib/card";
import { discountPercent, formatINR } from "@/lib/utils";

/**
 * The masthead.
 *
 * A promo panel, which is what a shop leads with — not a page title. The old
 * masthead was a headline beside a photograph: correct typographically, and it
 * told a stranger nothing they could act on. This one carries the three things
 * that make somebody click into a catalogue they have never seen: a picture of
 * real stock, what it costs, and how much has come off.
 *
 * It is a panel with corners rather than a full-bleed band, so the first thing
 * on the page reads as an object laid on the shop rather than as the page
 * itself continuing under the header. That is also what keeps it from merging
 * into the evergreen masthead directly above it.
 *
 * Everything on it is real:
 *
 *   the picture   a product this shop actually holds, or — before there is
 *                 one — a department photograph. Never stock art.
 *   the price     read off that product. Absent when there is no product, in
 *                 which case the panel is copy only and says so.
 *   the reduction printed only when `mrp` is genuinely above `price`.
 *
 * An admin-set HERO banner overrides the copy, because somebody who has gone
 * to the trouble of writing one means it. It never overrides the product card
 * beside it: that is stock, not marketing.
 */

const primaryCta =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold-400 px-6 text-[14px] font-bold text-ink-950 shadow-sm transition-colors duration-200 hover:bg-gold-300";

const secondaryCta =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 text-[14px] font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20";

export function HeroBanner({
  hasProducts,
  categories = [],
  lead,
  banner,
}: {
  hasProducts: boolean;
  categories?: Category[];
  /** A real product to lead with, when the shop holds one. */
  lead?: ProductCardModel;
  /** An admin-written HERO banner, when one is live. */
  banner?: Banner;
}) {
  const only = categories.length === 1 ? categories[0] : null;

  /**
   * What to photograph, in the order of what is most honest: a product this
   * shop holds beats a department, and a department beats nothing — but
   * nothing is a real case on the day the shop opens, and a broken image frame
   * is a worse first screen than no image at all.
   */
  const picture: ImageAsset | null = lead
    ? { url: lead.image, alt: lead.imageAlt || lead.title }
    : only
      ? only.image
      : (categories[0]?.image ?? null);

  const off = lead ? discountPercent(lead.mrp, lead.price) : 0;

  const eyebrow =
    banner?.eyebrow ||
    (hasProducts
      ? `Stocked and shipped from ${BUSINESS.address.city}`
      : `Opening soon · ${BUSINESS.address.city}`);

  const heading =
    banner?.title || (hasProducts ? "Home appliances, held in our own stock." : "We are filling the shelves.");

  const body =
    banner?.subtitle ||
    (hasProducts
      ? `${BRAND.name} buys the stock, holds it and invoices every order itself. Nothing here is drop-shipped and there is no third-party seller between you and us.`
      : `${BRAND.name} is a first-party store: we buy the stock, we hold it, we invoice it. The first products go live shortly.`);

  const shopHref = banner?.href || (only ? `/c/${only.slug}` : "/products");
  const shopLabel = banner?.cta || (only ? `Shop ${only.name}` : "Shop the catalogue");

  // Read from the config, never written here. The GST line is conditional
  // because `gstin` is empty for this shop, and a homepage promising a tax
  // invoice it cannot issue is a claim a customer can catch it out on at the
  // one moment trust matters most.
  const promises: { icon: typeof Truck; label: string }[] = [
    {
      icon: Truck,
      label:
        BUSINESS.ops.freeShippingThreshold > 0
          ? `Free delivery over ${formatINR(BUSINESS.ops.freeShippingThreshold)}`
          : "Free delivery on every order",
    },
    { icon: BadgeIndianRupee, label: `${BUSINESS.ops.returnWindowDays}-day returns` },
    {
      icon: ShieldCheck,
      label: isGstRegistered ? "GST invoice with every order" : "Invoiced by us, not a marketplace",
    },
  ];

  return (
    <section className="container-page pt-3 sm:pt-5">
      <div className="deep-plane relative overflow-hidden rounded-3xl">
        <div className="grid items-center gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          {/* ── The words ─────────────────────────────────────────────── */}
          <div className="order-2 px-5 pb-8 pt-7 sm:px-9 sm:pb-11 sm:pt-10 lg:order-1 lg:py-16 lg:pl-12 lg:pr-8">
            <span className="eyebrow eyebrow-dark">{eyebrow}</span>

            <h1 className="mt-4 font-display leading-[1.04] tracking-[-0.035em] text-white">
              <span className="text-[clamp(30px,7.6vw,38px)] lg:text-[clamp(38px,3.5vw,54px)]">
                {heading}
              </span>
            </h1>

            {/* A measure, not a breakpoint. About 46 characters is the width a
                line can reach before the eye loses its place returning to the
                left edge, and it holds at every screen size. */}
            <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.65] text-brand-100 sm:text-[15px]">
              {body}
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <Link href={shopHref} className={primaryCta}>
                {shopLabel}
                <ArrowRight size={16} />
              </Link>
              <Link href="/about" className={secondaryCta}>
                How this shop works
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-5">
              {promises.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-[12.5px] text-brand-100">
                  <Icon size={15} className="shrink-0 text-gold-300" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* ── The stock ─────────────────────────────────────────────── */}
          {picture && (
            <div className="relative order-1 lg:order-2 lg:py-10 lg:pr-12">
              {/* On a phone the picture is edge to edge and squarer; from
                  1024px it becomes a card sitting on the panel, which is what
                  makes it read as a product rather than as a backdrop. */}
              {/* Square on desktop, not 4/5. The taller crop made the panel
                  about 850px high beside a column of words about 560px high,
                  and `items-center` spent the difference as empty evergreen
                  above and below the text. */}
              <div className="relative aspect-[16/11] w-full overflow-hidden bg-brand-800 sm:aspect-[16/9] lg:aspect-square lg:rounded-2xl lg:shadow-xl">
                <Image
                  src={picture.url}
                  alt={picture.alt}
                  fill
                  // Roughly half the viewport from 1024px, the whole of it
                  // below. Getting this wrong is the usual reason a hero looks
                  // soft: the browser picks its source from this string, not
                  // from the rendered box.
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  priority
                  className="object-cover"
                />

                {off > 0 && (
                  <span className="absolute left-3 top-3 rounded-lg bg-sale-600 px-2.5 py-1.5 text-[12px] font-bold leading-none text-white shadow-md sm:left-4 sm:top-4">
                    {off}% OFF
                  </span>
                )}
              </div>

              {/* The price tag. Only drawn when there is a real product under
                  it — a panel that shows a department photograph has no price
                  to quote and must not invent one. */}
              {lead && (
                <Link
                  href={`/p/${lead.slug}`}
                  className="group absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface/95 px-3.5 py-3 shadow-lg backdrop-blur-sm transition-colors hover:bg-surface sm:inset-x-5 sm:bottom-5 lg:inset-x-5 lg:bottom-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-ink-900 sm:text-[13.5px]">
                      {lead.title}
                    </span>
                    <span className="mt-1 flex items-baseline gap-2">
                      <span className="text-[17px] font-bold leading-none tabular-nums text-ink-950">
                        {formatINR(lead.price)}
                      </span>
                      {lead.mrp > lead.price && (
                        <span className="text-[12px] leading-none tabular-nums text-ink-400 line-through">
                          {formatINR(lead.mrp)}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-400 text-ink-950 transition-transform duration-200 group-hover:translate-x-0.5">
                    <ArrowRight size={16} />
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
