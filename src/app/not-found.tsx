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
      <div className="container-page flex flex-col items-center justify-center py-20 text-center sm:py-28">
        <div className="relative">
          <LogoMark size={72} className="opacity-90" />
          <span className="absolute -right-2 -top-1 rounded-full bg-sale-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
            404
          </span>
        </div>

        <h1 className="mt-8 font-display text-[34px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:text-[46px]">
          This page has wandered off
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-600">
          The link may be old, the product may have sold out for good, or we may have simply moved
          something. Here is the way back.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <Link href="/" className={buttonClasses("primary", "lg")}>
            <Home size={17} /> Back to home
          </Link>
          <Link href="/products" className={buttonClasses("outline", "lg")}>
            <ShoppingBag size={17} /> Browse everything
          </Link>
          <Link href="/search" className={buttonClasses("ghost", "lg")}>
            <Search size={17} /> Search
          </Link>
        </div>

        <div className="mt-12 w-full max-w-3xl">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Or jump into a department
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/c/${category.slug}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-4 py-2 text-[13px] font-medium text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-700"
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
