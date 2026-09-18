"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClasses } from "@/components/ui/button";

/**
 * The admin panel's outermost boundary — and, specifically, the net under
 * `(dashboard)/layout.tsx`.
 *
 * That layout does real work before anything renders: `requireAdmin()` plus
 * six count queries. An error thrown in a layout is caught by the PARENT
 * segment's boundary, never by its own, and `(dashboard)` is a route group —
 * so the parent segment is this one. Without this file a dropped database
 * connection during those counts fell all the way through to
 * `src/app/error.tsx`, which is dressed as the storefront: it offers the owner
 * "Back to the shop" and "Contact support" in the middle of his own admin.
 *
 * Same rule as `(store)/error.tsx`: every segment that renders a layout doing
 * any work needs a boundary ABOVE it, not beside it.
 *
 * It renders without the admin shell, because the shell is what failed. Only
 * the digest is shown — the message and stack stay in the server log.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error.digest ?? "admin client error");
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 py-16 text-center">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">Admin</span>
      <h1 className="mt-4 max-w-[22ch] font-display text-[24px] leading-[1.1] tracking-[-0.025em] text-ink-950 sm:text-[32px]">
        The admin panel would not load
      </h1>
      <p className="mt-4 max-w-[52ch] text-[13.5px] leading-relaxed text-ink-600">
        This is the panel failing, not the shop. The storefront is unaffected and no order, payment or catalogue change
        was touched by whatever went wrong here. Try again — if it keeps happening, the reason is in the server log
        against the reference below.
      </p>

      {error.digest && (
        <p className="mt-5 text-[13px] text-ink-500">
          Reference <span className="break-all font-mono font-semibold text-ink-900">{error.digest}</span>
        </p>
      )}

      <div className="mt-8 flex w-full max-w-xs flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:gap-3">
        <button type="button" onClick={reset} className={buttonClasses("primary")}>
          Try again
        </button>
        <Link href="/admin" className={buttonClasses("outline")}>
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
