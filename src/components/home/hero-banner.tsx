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
 * A rounded deep-ocean panel — the brand's own dark surface — with two soft
 * glows behind the words, a bold white headline, one gold action and one glass
 * one, and the lead product floating beside it as a white card with its price.
 * Phone first: words, then the product card, stacked; from 1024px they sit
 * side by side.
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
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gold-400 px-7 text-[14px] font-bold text-ink-950 shadow-[0_8px_24px_-10px_rgb(221_184_94/0.7)] transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-gold-300";

const secondaryCta =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white/10 px-7 text-[14px] font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm transition-colors duration-200 hover:bg-white/15";

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
      <div className="deep-plane relative isolate overflow-hidden rounded-3xl text-white shadow-[0_24px_60px_-28px_rgb(18_34_43/0.55)]">
        {/* Two soft glows — ocean behind the words, gold behind the product —
            so the panel has depth without a photograph behind the text. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl sm:h-96 sm:w-96"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 -z-10 h-80 w-80 rounded-full bg-gold-400/15 blur-3xl sm:h-[28rem] sm:w-[28rem]"
        />

        <div
          className={
            picture
              ? "grid items-center gap-8 px-5 py-8 sm:px-10 sm:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-14 lg:py-16"
              : "px-5 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-20"
          }
        >
          {/* ── The words ─────────────────────────────────────────────── */}
          <div className="min-w-0">
            <span className="eyebrow eyebrow-dark">{eyebrow}</span>

            <h1 className="mt-4 font-display leading-[1.02] tracking-[-0.035em] text-white">
              <span className="text-[clamp(32px,8.4vw,42px)] lg:text-[clamp(42px,3.9vw,60px)]">
                {heading}
              </span>
            </h1>

            {/* A measure, not a breakpoint. About 46 characters is the width a
                line can reach before the eye loses its place returning to the
                left edge, and it holds at every screen size. */}
            <p className="mt-4 max-w-[46ch] text-[14.5px] leading-[1.65] text-white/75 sm:text-[16px]">
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

            <ul className="mt-8 flex flex-wrap items-center gap-2">
              {promises.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] text-white/85 ring-1 ring-inset ring-white/15"
                >
                  <Icon size={14} className="shrink-0 text-gold-300" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* ── The stock ─────────────────────────────────────────────── */}
          {picture && (
            <div className="relative mx-auto w-full max-w-[520px] lg:mr-0">
              <div className="rounded-3xl bg-surface p-2 shadow-pop ring-1 ring-white/10 sm:p-2.5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-50 sm:aspect-[16/10] lg:aspect-square">
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
                    <span className="absolute left-3 top-3 rounded-full bg-sale-600 px-3 py-1.5 text-[12px] font-bold leading-none text-white shadow-md sm:left-4 sm:top-4">
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
                    className="group mt-2 flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-ink-50 sm:px-3.5 sm:py-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-ink-900 sm:text-[14px]">
                        {lead.title}
                      </span>
                      <span className="mt-1 flex items-baseline gap-2">
                        <span className="text-[18px] font-bold leading-none tabular-nums text-ink-950">
                          {formatINR(lead.price)}
                        </span>
                        {lead.mrp > lead.price && (
                          <span className="text-[12.5px] leading-none tabular-nums text-ink-400 line-through">
                            {formatINR(lead.mrp)}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-400 text-ink-950 transition-transform duration-200 group-hover:translate-x-0.5">
                      <ArrowRight size={16} />
                    </span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
