/**
 * The body of the 404 page, without chrome. Rendered from two places:
 *
 *   src/app/not-found.tsx          no route group matched — brings its own chrome.
 *   src/app/(store)/not-found.tsx  `notFound()` inside the store — the layout
 *                                  already drew the chrome, so it must not.
 */
import Link from "next/link";
import { ArrowRight, Compass, Home, LifeBuoy, Search } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { ProductRail } from "@/components/product/product-rail";
import { toCardModels } from "@/lib/card";
import { getBestsellers, getCategories } from "@/services/catalog";

export async function NotFoundBody() {
  const [categories, bestsellers] = await Promise.all([getCategories(), getBestsellers(10)]);

  return (
    <>
      <div className="container-page py-8 sm:py-16">
        <div className="card relative mx-auto max-w-2xl overflow-hidden px-5 py-10 text-center sm:px-12 sm:py-14">
          <div aria-hidden className="aurora pointer-events-none absolute inset-x-0 top-0 h-40 opacity-80 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
          <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-60" />

          <div className="relative">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-brand-700 shadow-md ring-1 ring-inset ring-brand-100">
              <Compass size={24} aria-hidden />
            </span>

            <p className="t-label mt-6 text-brand-700">Error 404</p>
            <h1 className="t-h1 mx-auto mt-2 max-w-[18ch]">This page has wandered off</h1>
            <p className="t-body mx-auto mt-3 max-w-[46ch]">
              The link may be old, the product may have sold out for good, or we may have simply
              moved something. Here is the way back.
            </p>

            <form action="/search" method="get" role="search" className="mx-auto mt-7 max-w-md">
              <label htmlFor="nf-search" className="sr-only">
                Search the shop
              </label>
              <div className="relative">
                <Search
                  size={16}
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
                />
                <input
                  id="nf-search"
                  name="q"
                  type="search"
                  placeholder="Search products"
                  className="h-12 w-full rounded-md pl-10 pr-28 text-base sm:text-[14px]"
                />
                <button
                  type="submit"
                  className={buttonClasses("primary", "sm", "absolute right-1.5 top-1/2 -translate-y-1/2")}
                >
                  Search
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
              <Link href="/" className={buttonClasses("outline", "md")}>
                <Home size={16} aria-hidden /> Back to home
              </Link>
              <Link href="/faq" className={buttonClasses("ghost", "md")}>
                <LifeBuoy size={16} aria-hidden /> Visit help centre
              </Link>
            </div>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mx-auto mt-8 max-w-3xl text-center sm:mt-10">
            <p className="t-label mb-3">Or jump into a department</p>
            <ul className="rail -mx-3 gap-2 px-3 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/c/${category.slug}`}
                    className="chip tap group h-9 px-3.5 text-[12.5px] font-medium text-ink-700 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {category.name}
                    <ArrowRight
                      size={14}
                      aria-hidden
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
