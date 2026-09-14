"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  Clock,
  Phone,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/field";
import { BUSINESS } from "@/config/business";
import { formatINR } from "@/lib/utils";
import { submitUpiReference, upiPaymentStatus } from "@/services/payments-upi";

interface AppLink {
  id: string;
  name: string;
  href: string;
}

/**
 * Pay by UPI: scan, or tap through to an app, then tell us the reference.
 *
 * The page is deliberately honest about what happens next. The money moves the
 * moment the customer approves it in their own app — but the order is not
 * confirmed until the shop has seen it in the bank, and saying so here is what
 * stops a "why has nothing shipped?" message an hour later.
 */
export function UpiClient({
  orderId,
  orderNumber,
  amount,
  qrSvg,
  payUrl,
  appLinks,
  vpa,
  reported,
  unavailable,
}: {
  orderId: string;
  orderNumber: string;
  amount: number;
  qrSvg: string;
  payUrl: string;
  appLinks: AppLink[];
  vpa: string;
  reported: string;
  unavailable?: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState(submitUpiReference, {});
  const [copied, setCopied] = useState<"vpa" | "amount" | null>(null);

  // Submitted, or already submitted before this visit.
  const waiting = state.ok || reported !== "";

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  // While the owner checks the bank, watch for the confirmation. The order is
  // theirs either way — this only saves them refreshing.
  useEffect(() => {
    if (!waiting) return;
    let stop = false;
    const timer = setInterval(async () => {
      const status = await upiPaymentStatus(orderId).catch(() => "unknown" as const);
      if (stop) return;
      if (status === "paid") {
        clearInterval(timer);
        router.replace(`/order/${orderId}?placed=1`);
      }
    }, 5000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [waiting, orderId, router]);

  function copy(what: "vpa" | "amount", value: string) {
    navigator.clipboard?.writeText(value);
    setCopied(what);
  }

  if (unavailable) {
    return (
      <Shell orderNumber={orderNumber} amount={amount}>
        <div className="rounded-xl border border-sale-200 bg-sale-50 p-4 text-[13px] leading-relaxed text-sale-700">
          <p className="flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              Online payment is being set up and cannot take this order yet. Your order{" "}
              <strong>{orderNumber}</strong> is saved — call or WhatsApp us on{" "}
              <strong>{BUSINESS.supportPhone}</strong> and we will take it from there.
            </span>
          </p>
        </div>
      </Shell>
    );
  }

  if (waiting) {
    return (
      <Shell orderNumber={orderNumber} amount={amount}>
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white">
            <Clock size={24} />
          </span>
          <h2 className="mt-3 font-display text-[19px] tracking-[-0.02em] text-brand-900 sm:text-[22px]">
            Checking your payment
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-brand-800/80 sm:text-[13.5px]">
            We have your reference{" "}
            <strong className="font-mono">{state.ok ? "" : reported}</strong> and are matching it
            against our bank. This is usually done within a few hours during{" "}
            {BUSINESS.supportHours.toLowerCase()}. You will get an email the moment it is
            confirmed — and this page will update on its own.
          </p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link href="/account/orders" className={buttonClasses("outline", "md", "w-full")}>
            My orders
          </Link>
          <a
            href={`https://wa.me/${BUSINESS.supportPhoneDigits}?text=${encodeURIComponent(`Hi, I have paid for order ${orderNumber}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("primary", "md", "w-full")}
          >
            <Phone size={15} /> WhatsApp us
          </a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell orderNumber={orderNumber} amount={amount}>
      {/* Step 1 — pay */}
      <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-950 text-[11px] font-bold text-white">
            1
          </span>
          Pay {formatINR(amount)}
        </h2>

        {/* Phones: open the app directly. A QR cannot be scanned by the phone
            that is displaying it. */}
        {appLinks.length > 0 && (
          <div className="mt-3 sm:hidden">
            <p className="mb-2 flex items-center gap-1.5 text-[12.5px] text-ink-600">
              <Smartphone size={14} className="text-brand-600" /> Tap your UPI app
            </p>
            <div className="grid grid-cols-2 gap-2">
              {appLinks.map((app) => (
                <a key={app.id} href={app.href} className={buttonClasses("outline", "md", "w-full")}>
                  {app.name}
                </a>
              ))}
              <a href={payUrl} className={buttonClasses("primary", "md", "col-span-2 w-full")}>
                Any other UPI app
                <ArrowRight size={15} />
              </a>
            </div>
            <p className="mt-2.5 text-center text-[11.5px] text-ink-400">or scan the code below</p>
          </div>
        )}

        <div className="mt-3 flex flex-col items-center gap-3 sm:mt-4">
          <div
            className="rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] [&_svg]:h-[200px] [&_svg]:w-[200px] sm:[&_svg]:h-[220px] sm:[&_svg]:w-[220px]"
            /* Our own generated QR, not user input. */
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="text-center text-[12.5px] text-ink-600">
            Scan with Google Pay, PhonePe, Paytm or any UPI app
          </p>
        </div>

        <dl className="mt-4 divide-y divide-hairline border-t border-hairline text-[13px]">
          <Row
            label="UPI ID"
            value={vpa}
            onCopy={() => copy("vpa", vpa)}
            copied={copied === "vpa"}
            mono
          />
          <Row
            label="Amount"
            value={formatINR(amount)}
            onCopy={() => copy("amount", String(amount))}
            copied={copied === "amount"}
          />
          <Row label="Add this note" value={orderNumber} mono />
        </dl>
      </section>

      {/* Step 2 — tell us */}
      <section className="mt-3 rounded-xl border border-hairline bg-surface p-4 sm:mt-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-950 text-[11px] font-bold text-white">
            2
          </span>
          Tell us the reference
        </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">
          After paying, your app shows a 12-digit number called{" "}
          <strong className="text-ink-900">UTR</strong>, <em>UPI transaction ID</em> or{" "}
          <em>Reference no.</em> Enter it here so we can match your payment.
        </p>

        <Form action={action} className="mt-3">
          <input type="hidden" name="orderId" value={orderId} />
          <Field
            label="UPI reference (UTR)"
            htmlFor="utr"
            error={state.error}
            hint="12 digits, from your payment app's receipt."
          >
            <Input
              id="utr"
              name="utr"
              inputMode="numeric"
              autoComplete="off"
              maxLength={19}
              placeholder="e.g. 402312345678"
              invalid={!!state.error}
              required
              className="font-mono tabular-nums"
            />
          </Field>
          <Button type="submit" size="lg" className="mt-3 w-full">
            I have paid — check it
            <ArrowRight size={17} />
          </Button>
        </Form>

        <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-500">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-brand-600" />
          Your money goes straight to {BUSINESS.legalName}&apos;s bank account. We never see your
          UPI PIN — it is entered only inside your own payment app.
        </p>
      </section>

      <p className="mt-4 text-center text-[12px] text-ink-500">
        Trouble paying? Call or WhatsApp{" "}
        <a href={`tel:${BUSINESS.supportPhone}`} className="font-medium text-brand-700 underline-offset-4 hover:underline">
          {BUSINESS.supportPhone}
        </a>
      </p>
    </Shell>
  );
}

function Shell({
  orderNumber,
  amount,
  children,
}: {
  orderNumber: string;
  amount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-6 sm:py-10">
      <div className="mx-auto max-w-lg">
        <header className="mb-4 text-center sm:mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Order {orderNumber}
          </p>
          <h1 className="mt-1.5 font-display text-[28px] leading-tight tracking-[-0.03em] text-ink-950 sm:text-[38px]">
            {formatINR(amount)}
          </h1>
          <p className="mt-1 text-[13px] text-ink-600">
            Your order is reserved. It ships once the payment is confirmed.
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  onCopy,
  copied,
  mono,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span className={`truncate font-medium text-ink-950 ${mono ? "font-mono" : ""}`}>{value}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            className="tap -m-2 shrink-0 rounded-md p-2 text-ink-400 transition-colors hover:text-brand-700"
          >
            {copied ? <Check size={14} className="text-brand-600" /> : <Copy size={14} />}
          </button>
        )}
      </dd>
    </div>
  );
}
