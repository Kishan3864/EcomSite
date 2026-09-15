"use client";

import Link from "next/link";
import { useEffect } from "react";
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
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center py-10 text-center sm:py-20">
      <span className="eyebrow">Something broke</span>
      <h1 className="mt-4 max-w-[22ch] font-display text-[24px] leading-[1.08] tracking-[-0.03em] text-ink-950 sm:mt-5 sm:text-[40px]">
        That did not work, and it is our fault
      </h1>

      {/* Said plainly, because the page most likely to land here is the
          checkout, and the first thing anybody wants to know when a payment
          screen breaks is whether their money has gone. */}
      <p className="mt-4 max-w-[48ch] text-[14px] leading-[1.6] text-ink-600 sm:text-[15px]">
        The page failed to load. Nothing you did caused it. No payment was taken
        and no order was placed by this — your bag is still exactly as you left
        it. Try again, and if it keeps happening, tell us and we will finish the
        order for you.
      </p>

      {error.digest && (
        <p className="mt-5 text-[13px] text-ink-500 sm:mt-6">
          Reference{" "}
          <span className="break-all font-mono font-semibold text-ink-900">{error.digest}</span>
        </p>
      )}

      <div className="mt-7 flex w-full max-w-sm flex-col flex-wrap justify-center gap-2 sm:mt-9 sm:w-auto sm:max-w-none sm:flex-row sm:gap-3">
        <button type="button" onClick={reset} className={buttonClasses("primary")}>
          Try again
        </button>
        <Link href="/cart" className={buttonClasses("outline")}>
          Back to your bag
        </Link>
        <Link href="/contact" className={buttonClasses("ghost")}>
          Contact support
        </Link>
      </div>
    </div>
  );
}
