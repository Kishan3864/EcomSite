import Link from "next/link";
import Image from "@/components/ui/image";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/components/brand/logo";
import { BUSINESS, isGstRegistered } from "@/config/business";
import type { Category, ImageAsset } from "@/lib/types";
import type { ProductCardModel } from "@/lib/card";
import { formatINR } from "@/lib/utils";

/**
 * The masthead.
 *
 * Led by a photograph, because the first screen of a shop nobody has heard of
 * has one job — look like a shop — and a wall of type does not do it however
 * well the type is set.
 *
 * The photograph is half the width rather than the whole of it, and that is a
 * decision about the pictures this shop actually has. The catalogue's originals
 * are around 1400px across; stretched full-bleed behind text they are being
 * asked for more detail than they hold and go soft on any good screen. At half
 * the width they are shown at roughly 2x on a retina display, which is where a
 * photograph looks like a photograph. When there are larger originals to use,
 * this is the one number to revisit.
 *
 * Underneath, the three promises this shop can actually be held to, taken from
 * the business config so they cannot drift from the shipping and refund pages.
 * No trust seals, no padlock, no card-network logo wall, no invented customer
 * count — those are the marks of the shops this one has to be distinguished
 * from, and a real address with a real phone number does more work than all of
 * them (see the band below this one).
 */

const primary =
  "inline-flex h-11 items-center justify-center gap-2 bg-ink-950 px-6 text-[13px] font-semibold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:bg-brand-700 sm:h-12";

const secondary =
  "inline-flex h-11 items-center justify-center gap-2 border border-ink-950 px-6 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-950 transition-colors duration-200 hover:bg-ink-950 hover:text-white sm:h-12";

export function HeroLead({
  hasProducts,
  categories = [],
  lead,
}: {
  hasProducts: boolean;
  categories?: Category[];
  /** A real product to lead with, when the shop holds one. */
  lead?: ProductCardModel;
}) {
  const only = categories.length === 1 ? categories[0] : null;

  /**
   * What to photograph, in the order of what is most honest.
   *
   * A product this shop actually holds beats a department, and a department
   * beats nothing — but nothing is a real case on the day the shop opens, and
   * a broken image frame is a worse first screen than no image at all.
   */
  const picture: ImageAsset | null = lead
    ? { url: lead.image, alt: lead.imageAlt || lead.title }
    : only
      ? only.image
      : (categories[0]?.image ?? null);

  const eyebrow = hasProducts
    ? `Stocked and shipped from ${BUSINESS.address.city}`
    : `Opening soon · ${BUSINESS.address.city}`;

  const heading = hasProducts ? (
    <>
      Bought, stocked and
      <br className="hidden sm:block" /> invoiced by us.
    </>
  ) : (
    <>
      We are filling
      <br className="hidden sm:block" /> the shelves.
    </>
  );

  const body = hasProducts
    ? `${BRAND.name} holds its own stock and invoices every order itself. What is listed is in our hands, ready to ship — nothing is drop-shipped and there is no third-party seller between you and us.`
    : `${BRAND.name} is a first-party store: we buy the stock, we hold it, we invoice it. The first products go live shortly.`;

  // Read from the config, never written here as a literal. The GST line is
  // conditional for a reason: `gstin` is empty, so this shop is not registered,
  // and a homepage promising a tax invoice it cannot issue is a claim a
  // customer can catch it out on at the one moment trust matters most.
  const promises = [
    BUSINESS.ops.freeShippingThreshold > 0
      ? `Free delivery over ${formatINR(BUSINESS.ops.freeShippingThreshold)}`
      : "Free delivery on every order",
    `${BUSINESS.ops.returnWindowDays}-day returns`,
    isGstRegistered ? "GST invoice with every order" : "Invoiced by us, not a marketplace",
  ];

  return (
    <section className="border-b border-ink-950">
      <div className="container-page">
        {/* The photograph leads on a phone and sits to the right from 1024px.
            On a narrow screen the picture is what says "shop" before a word is
            read; on a wide one the words and the picture arrive together. */}
        <div className="grid items-stretch gap-0 lg:grid-cols-[1.02fr_1fr]">
          {picture && (
            <div className="relative order-1 aspect-[4/3] w-full overflow-hidden bg-canvas sm:aspect-[16/9] lg:order-2 lg:aspect-auto lg:min-h-[480px]">
              <Image
                src={picture.url}
                alt={picture.alt}
                fill
                // Half the viewport from 1024px, the whole of it below. Getting
                // this wrong is the usual reason a hero looks soft: the browser
                // picks its source from this string, not from the rendered box.
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
                className="object-cover"
              />
            </div>
          )}

          <div
            className={
              picture
                ? "order-2 flex min-w-0 flex-col justify-center py-9 lg:order-1 lg:py-16 lg:pr-12"
                : "flex min-w-0 flex-col justify-center py-12 lg:py-20"
            }
          >
            <span className="eyebrow">{eyebrow}</span>

            <h1 className="mt-3 font-display leading-[1.03] tracking-[-0.035em] text-ink-950 sm:mt-5">
              <span className="text-[clamp(31px,8.4vw,40px)] lg:text-[clamp(40px,3.9vw,60px)]">
                {heading}
              </span>
            </h1>

            {/* A measure, not a breakpoint. About 46 characters is the width a
                line can reach before the eye loses its place returning to the
                left edge, and it holds at every screen size. */}
            <p className="mt-3.5 max-w-[46ch] text-[14px] leading-[1.6] text-ink-600 sm:mt-5 sm:text-[15px]">
              {body}
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <Link href={only ? `/c/${only.slug}` : "/products"} className={primary}>
                {only ? `Shop ${only.name}` : "Shop the catalogue"}
                <ArrowRight size={15} />
              </Link>
              <Link href="/about" className={secondary}>
                How this shop works
              </Link>
            </div>

            {/* Set as a ruled line rather than a row of coloured pills: a claim
                reads as true in proportion to how quietly it is made. */}
            <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-4 sm:mt-9 sm:gap-x-7">
              {promises.map((promise) => (
                <li key={promise} className="flex items-center gap-2 text-[12.5px] text-ink-600">
                  <span aria-hidden className="h-px w-3 shrink-0 bg-ink-400" />
                  {promise}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
