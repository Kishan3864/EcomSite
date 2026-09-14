"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClasses } from "@/components/ui/button";

/**
 * Route error boundary.
 *
 * Next.js hands the client a `digest` in production and keeps the message and
 * stack on the server — this component deliberately shows only that digest. A
 * stack trace in the browser tells an attacker the file layout, the ORM and
 * often the query that failed, so the useful detail stays in the server log and
 * the customer gets a reference they can quote to support.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side logging already captured this; this is for browser-only
    // failures, which never reach the server log otherwise.
    console.error(error.digest ?? "client error");
  }, [error]);

  return (
    // dvh, not vh: on phones vh includes the space under the browser toolbar.
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center py-10 text-center sm:py-20">
      <span className="eyebrow">Something broke</span>
      <h1 className="mt-4 max-w-[20ch] font-display text-[24px] leading-[1.08] tracking-[-0.03em] text-ink-950 sm:mt-5 sm:text-[40px]">
        That did not work, and it is our fault
      </h1>
      <p className="mt-4 max-w-[46ch] text-[14px] leading-[1.6] text-ink-600 sm:text-[15px]">
        The page failed to load. Nothing you did caused it, and no order or
        payment was affected. Try again, and if it keeps happening, tell us.
      </p>

      {/* The reference is a code, so it is set like every other code on the
          site: the UI face with tabular figures. */}
      {error.digest && (
        <p className="mt-5 text-[13px] text-ink-500 sm:mt-6">
          Reference{" "}
          <span className="break-all font-mono font-semibold text-ink-900">{error.digest}</span>
        </p>
      )}

      {/* Stacked full width on phones, where the three wrap into a ragged pile. */}
      <div className="mt-7 flex w-full max-w-sm flex-col flex-wrap justify-center gap-2 sm:mt-9 sm:w-auto sm:max-w-none sm:flex-row sm:gap-3">
        <button type="button" onClick={reset} className={buttonClasses("primary")}>
          Try again
        </button>
        <Link href="/" className={buttonClasses("outline")}>
          Back to the shop
        </Link>
        <Link href="/contact" className={buttonClasses("ghost")}>
          Contact support
        </Link>
      </div>
    </div>
  );
}
