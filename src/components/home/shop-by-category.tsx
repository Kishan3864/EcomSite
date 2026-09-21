import Link from "next/link";
import Image from "@/components/ui/image";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/primitives";
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

  /**
   * How tall each tile stands, which has to follow how many there are.
   *
   * Every tile used to be `aspect-[5/4]` whatever the count. In a four-column
   * row that is a neat postcard; in the two-column row a shop with one
   * department gets, it is a 700px-wide photograph more than 500px tall, and
   * two of them fill an entire screen with two words on them. It read as a
   * shop with nothing in it — the opposite of what a department band is for.
   *
   * So the fewer the tiles, the wider the crop: a pair sits as two letterbox
   * panels, a trio a little squarer, four or more keep the postcard.
   */
  const shape =
    destinations.length <= 2
      ? "aspect-[16/9] sm:aspect-[2/1]"
      : destinations.length === 3
        ? "aspect-[4/3] sm:aspect-[3/2]"
        : "aspect-[5/4]";

  return (
    <section className="container-page py-10 sm:py-16">
      <SectionHeader
        title="Shop by category"
        description={single ? `Everything in ${single.name}, by collection.` : "Pick a department to start."}
        href="/products"
        className="mb-5 sm:mb-8"
      />

      {/* Two across on a phone — the density a shopping app uses — and never
          more than four, past which a photograph is too small to read. */}
      <ul className={cn("grid grid-cols-2 gap-3 sm:gap-5", columns)}>
        {destinations.map((destination) => (
          <li key={destination.href}>
            <Link
              href={destination.href}
              className="card card-interactive group block overflow-hidden"
            >
              <div className={cn("relative m-1.5 overflow-hidden rounded-lg bg-ink-50 sm:m-2", shape)}>
                <Image
                  src={destination.image.url}
                  alt={destination.image.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <span className="flex items-center justify-between gap-2 px-3 pb-3 pt-1.5 sm:px-3.5 sm:pb-3.5">
                <span className="min-w-0 truncate text-[13px] font-semibold text-ink-900 transition-colors group-hover:text-brand-700 sm:text-[14px]">
                  {destination.name}
                </span>
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  <ArrowRight size={14} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
