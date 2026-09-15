"use client";

import Link from "next/link";
import { useEffect } from "react";
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
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center py-10 text-center sm:py-20">
      <span className="eyebrow">Checkout</span>
      <h1 className="mt-4 max-w-[22ch] font-display text-[24px] leading-[1.08] tracking-[-0.03em] text-ink-950 sm:mt-5 sm:text-[38px]">
        This step would not load
      </h1>
      <p className="mt-4 max-w-[48ch] text-[14px] leading-[1.6] text-ink-600 sm:text-[15px]">
        Nothing has been charged and no order was placed. Everything you have
        entered so far is still here — try the step again.
      </p>

      {error.digest && (
        <p className="mt-5 text-[13px] text-ink-500 sm:mt-6">
          Reference{" "}
          <span className="break-all font-mono font-semibold text-ink-900">{error.digest}</span>
        </p>
      )}

      <div className="mt-7 flex w-full max-w-sm flex-col flex-wrap justify-center gap-2 sm:mt-9 sm:w-auto sm:max-w-none sm:flex-row sm:gap-3">
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
  );
}
