"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LifeBuoy, RotateCw, ShoppingBag, TriangleAlert } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

/**
 * The storefront's error boundary — and, specifically, the net under the
 * checkout's LAYOUT.
 *
 * This file exists because of a real incident. `checkout/layout.tsx` threw
 * while rendering, and an error thrown in a layout is caught by the PARENT
 * segment's boundary, never by its own. There was no boundary in `(store)`, so
 * the throw travelled all the way past the storefront and the shopper was
 * shown Next's bare "Internal Server Error" — plain text on a black page, in
 * the middle of paying.
 *
 * So the rule this file encodes: every segment that renders a layout doing any
 * work needs a boundary ABOVE it, not beside it.
 *
 * It says nothing about what failed. The digest is the only detail shown; the
 * message and stack stay in the server log, because a stack trace in the
 * browser hands an attacker the file layout and often the failing query.
 */
export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error.digest ?? "client error");
  }, [error]);

  return (
    <div className="container-page flex min-h-[60dvh] items-center justify-center py-8 sm:py-16">
      <div className="card relative w-full max-w-2xl overflow-hidden px-5 py-10 text-center sm:px-12 sm:py-14">
        <div aria-hidden className="aurora pointer-events-none absolute inset-x-0 top-0 h-40 opacity-80 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-60" />

        <div className="relative">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-brand-700 shadow-md ring-1 ring-inset ring-brand-100">
            <TriangleAlert size={24} aria-hidden />
          </span>
          <p className="t-label mt-6 text-brand-700">Something broke</p>
          <h1 className="t-h1 mx-auto mt-2 max-w-[22ch]">That did not work, and it is our fault</h1>

          {/* Plain words: the page most likely to land here is the checkout. */}
          <p className="t-body mx-auto mt-3 max-w-[48ch]">
            The page failed to load. Nothing you did caused it. No payment was taken
            and no order was placed by this — your bag is still exactly as you left
            it. Try again, and if it keeps happening, tell us and we will finish the
            order for you.
          </p>

          {error.digest && (
            <p className="t-small mx-auto mt-5 inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full bg-ink-50 px-3 py-1.5 ring-1 ring-inset ring-line">
              Reference{" "}
              <span className="break-all font-mono font-semibold text-ink-900">{error.digest}</span>
            </p>
          )}

          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <button type="button" onClick={reset} className={buttonClasses("primary")}>
              <RotateCw size={16} aria-hidden /> Try again
            </button>
            <Link href="/cart" className={buttonClasses("outline")}>
              <ShoppingBag size={16} aria-hidden /> Back to your bag
            </Link>
            <Link href="/contact" className={buttonClasses("ghost")}>
              <LifeBuoy size={16} aria-hidden /> Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
