"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
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
        <span className="mx-auto flex h-12 w-12 items-center justify-center text-sale-600 sm:h-14 sm:w-14">
          <AlertTriangle size={26} />
        </span>
        <h1 className="mt-4 font-display text-[20px] leading-[1.15] tracking-[-0.02em] text-ink-950 sm:mt-5 sm:text-[26px]">
          Payment could not be started
        </h1>
        <p className="mx-auto mt-2.5 max-w-[46ch] text-[13px] leading-[1.55] text-ink-600 sm:text-[14px]">
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
      <h1 className="mt-6 font-display text-[20px] leading-[1.15] tracking-[-0.02em] text-ink-950 sm:text-[24px]">
        Taking you to secure payment
      </h1>
      <p className="mt-2.5 text-[13px] leading-[1.5] text-ink-600 sm:text-[14px]">
        Order <span className="tabular-nums">{orderNumber}</span> ·{" "}
        <strong className="font-semibold tabular-nums text-ink-950">{formatINR(amount)}</strong>
      </p>

      {/* A hairline that is being drawn, rather than a coloured progress pill. */}
      <div className="mt-5 h-0.5 w-full overflow-hidden bg-hairline">
        <div className="h-full w-1/3 animate-[loading_1.1s_ease-in-out_infinite] bg-ink-950" />
      </div>

      <form ref={form} action={endpoint} method="POST" className="mt-5">
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <button type="submit" className={buttonClasses("primary", "lg", "w-full")}>
          Continue to payment
        </button>
      </form>

      <p className="mt-4 text-[13px] leading-[1.5] text-ink-500">
        Card and UPI details are entered on PayU, never on this site
      </p>

      <style>{`@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col items-center justify-center px-3 py-8 sm:px-4 sm:py-16">
      <div className="w-full max-w-md bg-surface shadow-sm p-5 text-center sm:p-7">
        {children}
      </div>
    </div>
  );
}
