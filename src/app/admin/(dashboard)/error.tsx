"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";

/**
 * The net under every admin PAGE — the inner half of the pair.
 *
 * `admin/error.tsx`, one level up, catches what `(dashboard)/layout.tsx`
 * throws, because a layout's error goes to the parent segment and never to its
 * own. This file catches everything the pages under that layout throw, and it
 * renders INSIDE the shell: the sidebar and header are still there, so whatever
 * broke, the rest of the panel is still usable and the way out is one click.
 *
 * Both halves matter more now than they did, though not because a render waits
 * on PayU — it does not. `PaymentSection` only reads this database, and every
 * call to PayU is behind a button, in a server action. What the order page does
 * do is render unbounded gateway JSON and a screenful of money derived from it:
 * paise divided into rupees, ceilings, fees, a payout. A bad row, a null nobody
 * expected or an arithmetic slip in any of that throws during the render, and
 * without a boundary here it unmounted the whole panel and handed the owner
 * Next's bare "Internal Server Error" — the failure `(store)/error.tsx` was
 * written to describe. With one, the sidebar and the rest of the panel stay
 * usable and the way out is one click.
 *
 * What went wrong is shown only as a digest. The message and the stack stay in
 * the server log: an admin screen is behind a login, but a gateway error string
 * can carry a merchant key or a transaction id and there is no reason to paint
 * it on a page.
 */
export default function AdminDashboardError({
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
    <Card>
      <div className="flex flex-col items-start gap-4 py-6 sm:py-10">
        <span className="flex h-9 w-9 items-center justify-center bg-sale-100 text-sale-700">
          <AlertTriangle size={18} />
        </span>
        <div>
          <h1 className="font-display text-[22px] leading-[1.15] tracking-[-0.02em] text-ink-950">
            This screen would not load
          </h1>
          <p className="mt-2 max-w-[56ch] text-[13.5px] leading-relaxed text-ink-600">
            Something on the page failed while it was being built. Nothing you were looking at has
            been changed by this, and no money has moved. If you were part-way through a refund,
            open the order again and check the Refunds card before trying it a second time — a
            refund that reached PayU is recorded there.
          </p>
        </div>

        {error.digest && (
          <p className="text-[12.5px] text-ink-500">
            Reference{" "}
            <span className="break-all font-mono font-semibold text-ink-900">{error.digest}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reset} className={buttonClasses("primary", "sm")}>
            Try again
          </button>
          <Link href="/admin/orders" className={buttonClasses("outline", "sm")}>
            Back to orders
          </Link>
          <Link href="/admin" className={buttonClasses("ghost", "sm")}>
            Dashboard
          </Link>
        </div>
      </div>
    </Card>
  );
}
