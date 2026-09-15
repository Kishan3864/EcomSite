import Link from "next/link";
import Image from "@/components/ui/image";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/types";
import { balancedColumnClass } from "@/lib/grid";
import { cn } from "@/lib/utils";

/**
 * Shop by category — the homepage's route into the catalogue.
 *
 * Replaces "What we stock", which was a 240px line drawing of an oven inside a
 * printer's register frame, beside a ruled list of two collection names. It was
 * the most decorative thing on the page and the least useful: a shopper looking
 * for a kettle got an ornament and two words, and nothing that showed them what
 * the shelf actually holds.
 *
 * This shows the shelf. Every destination is a photograph the shop already owns
 * — the same images the category and collection pages use — so there is nothing
 * new to produce and a collection added in the admin panel appears here with
 * its picture attached.
 *
 * What it points at depends on how big the shop is, because "category" means
 * different things at different sizes:
 *
 *   one department    its collections, which are the real choices a shopper
 *                     has. Sending them to the one department they are already
 *                     looking at is not a choice.
 *   several           the departments themselves.
 *
 * Either way the header carries a link to the whole catalogue, so there is
 * always a way past the curation.
 */

interface Destination {
  href: string;
  name: string;
  image: { url: string; alt: string };
}

export function ShopByCategory({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  const single = categories.length === 1 ? categories[0] : null;

  const destinations: Destination[] =
    single && single.subcategories.length > 0
      ? single.subcategories.map((sub) => ({
          href: `/c/${single.slug}/${sub.slug}`,
          name: sub.name,
          image: { url: sub.image.url, alt: sub.image.alt || sub.name },
        }))
      : categories.map((category) => ({
          href: `/c/${category.slug}`,
          name: category.name,
          image: { url: category.image.url, alt: category.image.alt || category.name },
        }));

  if (destinations.length === 0) return null;

  // Four across at most, and never a row with one lonely card in it.
  const columns = balancedColumnClass(destinations.length, 4);

  return (
    <section className="container-page py-10 sm:py-16">
      <div className="mb-5 flex items-end justify-between gap-6 sm:mb-8">
        <div className="min-w-0">
          <h2 className="font-display text-[22px] leading-[1.1] text-ink-950 sm:text-[28px]">
            Shop by category
          </h2>
          <p className="mt-1.5 text-[13px] text-ink-500 sm:text-[14px]">
            {single ? `Everything in ${single.name}, by collection.` : "Pick a department to start."}
          </p>
        </div>
        <Link
          href="/products"
          className="group hidden shrink-0 items-center gap-1.5 text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-800 sm:inline-flex"
        >
          View all
          <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Two across on a phone — the density a shopping app uses — and never
          more than four, past which a photograph is too small to read. */}
      <ul className={cn("grid grid-cols-2 gap-2.5 sm:gap-4", columns)}>
        {destinations.map((destination) => (
          <li key={destination.href}>
            <Link
              href={destination.href}
              className="group block overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs transition-[box-shadow,transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
            >
              <div className="relative aspect-[5/4] overflow-hidden bg-ink-50">
                <Image
                  src={destination.image.url}
                  alt={destination.image.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <span className="flex items-center justify-between gap-2 px-3 py-3 sm:px-3.5">
                <span className="min-w-0 truncate text-[13px] font-semibold text-ink-900 transition-colors group-hover:text-brand-700 sm:text-[14px]">
                  {destination.name}
                </span>
                <ArrowRight
                  size={14}
                  aria-hidden
                  className="shrink-0 text-ink-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand-700"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
