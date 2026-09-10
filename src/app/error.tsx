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
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="eyebrow">Something broke</span>
      <h1 className="mt-5 max-w-lg font-display text-[30px] leading-[1.08] tracking-[-0.03em] text-ink-950 sm:text-[40px]">
        That did not work, and it is our fault
      </h1>
      <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-600">
        The page failed to load. Nothing you did caused it, and no order or
        payment was affected. Try again, and if it keeps happening, tell us.
      </p>

      {error.digest && (
        <p className="mt-5 text-[12px] text-ink-400">
          Reference <span className="font-medium text-ink-600">{error.digest}</span>
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
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
