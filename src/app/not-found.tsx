import Link from "next/link";
import { ArrowRight, Home, Search, ShoppingBag } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { StoreChrome } from "@/components/layout/store-chrome";
import { buttonClasses } from "@/components/ui/button";
import { ProductRail } from "@/components/product/product-rail";
import { toCardModels } from "@/lib/card";
import { getBestsellers, getCategories } from "@/services/catalog";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const [categories, bestsellers] = await Promise.all([getCategories(), getBestsellers(10)]);

  // The root 404 renders outside the (store) group, so it brings the chrome itself.
  return (
    <StoreChrome>
      <div className="container-page flex flex-col items-center justify-center py-10 text-center sm:py-28">
        <div className="relative">
          {/* The class sizes the mark on phones; from sm it matches the 72px attribute. */}
          <LogoMark size={72} className="size-14 opacity-90 sm:size-[72px]" />
          <span className="absolute -right-2 -top-1 rounded-full bg-sale-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
            404
          </span>
        </div>

        <h1 className="mt-5 font-display text-[22px] leading-[1.1] tracking-[-0.03em] text-ink-950 sm:mt-8 sm:text-[46px] sm:leading-[1.05]">
          This page has wandered off
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-600 sm:mt-4 sm:text-[15px]">
          The link may be old, the product may have sold out for good, or we may have simply moved
          something. Here is the way back.
        </p>

        {/* Stacked full width on phones, where the three wrap into a ragged pile. */}
        <div className="mt-6 flex w-full max-w-sm flex-col flex-wrap justify-center gap-2 sm:mt-8 sm:w-auto sm:max-w-none sm:flex-row sm:gap-2.5">
          <Link href="/" className={buttonClasses("primary", "lg")}>
            <Home size={17} /> Back to home
          </Link>
          <Link href="/products" className={buttonClasses("outline", "lg", "h-11 sm:h-12")}>
            <ShoppingBag size={17} /> Browse everything
          </Link>
          <Link href="/search" className={buttonClasses("ghost", "lg", "h-11 sm:h-12")}>
            <Search size={17} /> Search
          </Link>
        </div>

        <div className="mt-8 w-full max-w-3xl sm:mt-12">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 sm:mb-4">
            Or jump into a department
          </p>
          {/* A swipeable chip row on phones; the centred cluster from sm. */}
          <ul className="rail -mx-3 gap-2 px-3 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/c/${category.slug}`}
                  className="tap group inline-flex h-10 items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-3.5 py-2 text-[12.5px] font-medium text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-700 sm:h-auto sm:px-4 sm:text-[13px]"
                >
                  {category.name}
                  <ArrowRight
                    size={13}
                    className="text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ProductRail
        eyebrow="While you are here"
        title="Our bestsellers"
        description="The products that keep selling out and coming back."
        href="/products?sort=popularity"
        products={toCardModels(bestsellers)}
      />
    </StoreChrome>
  );
}
