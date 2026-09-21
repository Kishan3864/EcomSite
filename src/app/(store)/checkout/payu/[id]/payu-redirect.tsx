"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

/**
 * Posts the signed form to PayU.
 *
 * Submitted from an effect rather than rendered and forgotten, so the customer
 * sees where they are going before they get there. The button underneath is
 * not decoration: if the automatic submit is blocked — a slow phone, a
 * script-blocking extension, a back-navigation that restores this page — it is
 * the whole flow, and it works with no JavaScript at all.
 */
export function PayuRedirect({
  orderId,
  orderNumber,
  amount,
  endpoint,
  fields,
  error,
}: {
  orderId: string;
  orderNumber: string;
  amount: number;
  endpoint: string;
  fields: Record<string, string>;
  error: string | null;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (error || sent || !form.current) return;
    // A beat, so the page paints and the customer reads where they are being
    // taken. Without it the screen flashes and a failure looks like a crash.
    const t = setTimeout(() => {
      setSent(true);
      form.current?.submit();
    }, 600);
    return () => clearTimeout(t);
  }, [error, sent]);

  if (error) {
    return (
      <Frame>
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sale-50 text-sale-600 ring-1 ring-inset ring-sale-200">
          <AlertTriangle size={24} aria-hidden />
        </span>
        <h1 className="t-h2 mt-5">Payment could not be started</h1>
        <p className="t-body mx-auto mt-2 max-w-[46ch]">
          {error}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:justify-center">
          <Link href={`/order/${orderId}`} className={buttonClasses("primary")}>
            View this order
          </Link>
          <Link href="/account/orders" className={buttonClasses("outline")}>
            My orders
          </Link>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <Logo className="mx-auto h-7 w-auto" />
      <span className="icon-tile mx-auto mt-6 flex" aria-hidden>
        <ShieldCheck size={20} />
      </span>
      <h1 className="t-h2 mt-4">Taking you to secure payment</h1>
      <p className="t-body mt-2">
        Order <span className="tabular-nums">{orderNumber}</span> ·{" "}
        <strong className="t-price">{formatINR(amount)}</strong>
      </p>

      {/* An indeterminate bar while the signed form is posted. */}
      <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full w-1/3 rounded-full bg-linear-to-r from-brand-600 to-brand-400 motion-safe:animate-[loading_1.1s_ease-in-out_infinite]" />
      </div>

      <form ref={form} action={endpoint} method="POST" className="mt-5">
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <button type="submit" className={buttonClasses("accent", "lg", "w-full")}>
          Continue to payment
          <ArrowRight size={18} aria-hidden />
        </button>
      </form>

      <p className="t-small mt-4">
        Card and UPI details are entered on PayU, never on this site
      </p>

      <style>{`@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col items-center justify-center px-3 py-8 sm:px-4 sm:py-16">
      <div className="card w-full max-w-md p-6 text-center sm:p-8">
        {children}
      </div>
    </div>
  );
}
