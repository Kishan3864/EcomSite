"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

/**
 * The checkout's own boundary, for anything thrown by a checkout PAGE.
 *
 * Its sibling one level up, `(store)/error.tsx`, catches what the checkout
 * LAYOUT throws — a layout's error never reaches its own segment's boundary.
 * Between the two, no failure anywhere under /checkout can reach a shopper as
 * a bare "Internal Server Error" again.
 *
 * This one keeps the shopper inside the funnel: the step is recoverable, the
 * bag is untouched, and the way back is to the bag rather than to the shop.
 */
export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error.digest ?? "checkout client error");
  }, [error]);

  return (
    <div className="container-page flex min-h-[60dvh] items-center justify-center py-10 sm:py-20">
      <div className="card relative w-full max-w-xl overflow-hidden px-5 py-10 text-center sm:px-10 sm:py-14">
      <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-70" />
      <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sale-50 text-sale-600 ring-1 ring-inset ring-sale-200">
        <TriangleAlert size={24} aria-hidden />
      </span>
      <span className="eyebrow relative mt-5 justify-center">Checkout</span>
      <h1 className="t-h1 relative mx-auto mt-2.5 max-w-[22ch]">This step would not load</h1>
      <p className="t-body relative mx-auto mt-3 max-w-[48ch]">
        Nothing has been charged and no order was placed. Everything you have
        entered so far is still here — try the step again.
      </p>

      {error.digest && (
        <p className="t-small relative mt-5">
          Reference{" "}
          <span className="break-all font-mono font-semibold text-ink-900">{error.digest}</span>
        </p>
      )}

      <div className="relative mx-auto mt-7 flex w-full max-w-sm flex-col flex-wrap justify-center gap-2 sm:mt-8 sm:w-auto sm:max-w-none sm:flex-row sm:gap-3">
        <button type="button" onClick={reset} className={buttonClasses("primary")}>
          Try this step again
        </button>
        <Link href="/cart" className={buttonClasses("outline")}>
          Back to your bag
        </Link>
        <Link href="/contact" className={buttonClasses("ghost")}>
          Get help with this order
        </Link>
      </div>
      </div>
    </div>
  );
}
