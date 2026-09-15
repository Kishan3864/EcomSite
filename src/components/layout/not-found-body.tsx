/**
 * The body of the 404 page, without any chrome around it.
 *
 * It lives on its own because the page is rendered from two places that need
 * different wrappers, and getting that wrong is invisible until you look:
 *
 *   src/app/not-found.tsx          a URL that matches no route group at all.
 *                                  Nothing has laid out the page, so this one
 *                                  brings the header and footer itself.
 *   src/app/(store)/not-found.tsx  a `notFound()` thrown inside the storefront
 *                                  — an unknown product slug, a dead category.
 *                                  The (store) layout has ALREADY drawn the
 *                                  chrome around it, so this one must not.
 *
 * Until the second file existed, a bad product URL fell through to the root
 * 404 while still inside the store layout and the page rendered two
 * announcement bars, two mastheads and two footers stacked down the screen.
 */
import Link from "next/link";
import { ArrowRight, Home, Search, ShoppingBag } from "lucide-react";
import { PaperMark } from "@/components/illustration/paper-mark";
import { buttonClasses } from "@/components/ui/button";
import { ProductRail } from "@/components/product/product-rail";
import { toCardModels } from "@/lib/card";
import { getBestsellers, getCategories } from "@/services/catalog";

export async function NotFoundBody() {
  const [categories, bestsellers] = await Promise.all([getCategories(), getBestsellers(10)]);

  return (
    <>
      <div className="container-page flex flex-col items-center justify-center py-10 text-center sm:py-24">
        {/* The same drawn mark that heads every empty shelf and empty bag on
            the site. A missing page is the same apology, so it is made with
            the same hand rather than with a red sticker. */}
        <PaperMark size={120} className="text-ink-400" />

        <span className="eyebrow mt-7 sm:mt-9">Error 404</span>
        <h1 className="mt-3 max-w-[16ch] font-display text-[26px] leading-[1.06] tracking-[-0.03em] text-ink-950 sm:mt-4 sm:text-[46px]">
          This page has wandered off
        </h1>
        <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.6] text-ink-600 sm:text-[15px]">
          The link may be old, the product may have sold out for good, or we may have simply moved
          something. Here is the way back.
        </p>

        {/* Stacked full width on phones, where the three wrap into a ragged pile. */}
        <div className="mt-7 flex w-full max-w-sm flex-col flex-wrap justify-center gap-2 sm:mt-9 sm:w-auto sm:max-w-none sm:flex-row sm:gap-2.5">
          <Link href="/" className={buttonClasses("primary", "lg")}>
            <Home size={16} /> Back to home
          </Link>
          <Link href="/products" className={buttonClasses("outline", "lg", "h-11 sm:h-12")}>
            <ShoppingBag size={16} /> Browse everything
          </Link>
          <Link href="/search" className={buttonClasses("ghost", "lg", "h-11 sm:h-12")}>
            <Search size={16} /> Search
          </Link>
        </div>

        {categories.length > 0 && (
          <div className="mt-10 w-full max-w-3xl sm:mt-14">
            <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:mb-4">
              Or jump into a department
            </p>
            {/* A swipeable row on phones; the centred cluster from sm. */}
            <ul className="rail -mx-3 gap-2 px-3 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/c/${category.slug}`}
                    className="tap group inline-flex h-10 items-center gap-2 border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-700 transition-colors duration-200 hover:border-ink-950 hover:text-brand-700 sm:px-4"
                  >
                    {category.name}
                    <ArrowRight
                      size={13}
                      className="text-ink-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-700"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ProductRail
        eyebrow="While you are here"
        title="Our bestsellers"
        description="The products that keep selling out and coming back."
        href="/products?sort=popularity"
        products={toCardModels(bestsellers)}
      />
    </>
  );
}
