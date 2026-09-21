"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Check, Copy, Clock } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/field";
import { BUSINESS } from "@/config/business";
import { cn, formatINR } from "@/lib/utils";
import { submitUpiReference, upiPaymentStatus } from "@/services/payments-upi";

interface AppLink {
  id: string;
  name: string;
  href: string;
}

/** The two headings on the page, each numbered by a small ink stamp. */
const STEP_HEAD =
  "flex items-center gap-2.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500";
const STEP_NUMBER =
  "flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-semibold tabular-nums text-white";

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
        <div className="card p-4 text-[13px] leading-[1.55] text-ink-700">
          <p className="flex items-start gap-2.5">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-sale-600" />
            <span>
              Online payment is being set up and cannot take this order yet. Your order{" "}
              <strong className="font-semibold text-ink-950">{orderNumber}</strong> is saved — call
              or WhatsApp us on{" "}
              <strong className="font-semibold tabular-nums text-ink-950">
                {BUSINESS.supportPhone}
              </strong>{" "}
              and we will take it from there.
            </span>
          </p>
        </div>
      </Shell>
    );
  }

  if (waiting) {
    return (
      <Shell orderNumber={orderNumber} amount={amount}>
        <div className="card p-5 text-center sm:p-7">
          <span className="mx-auto flex h-12 w-12 items-center justify-center text-ink-900">
            <Clock size={24} strokeWidth={1.5} />
          </span>
          <h2 className="mt-4 font-display text-[20px] leading-[1.15] tracking-[-0.02em] text-ink-950 sm:text-[24px]">
            Checking your payment
          </h2>
          <p className="mx-auto mt-2.5 max-w-[46ch] text-[13px] leading-[1.55] text-ink-600 sm:text-[14px]">
            We have your reference{" "}
            <strong className="font-mono font-semibold text-ink-950">
              {state.ok ? "" : reported}
            </strong>{" "}
            and are matching it against our bank. This is usually done within a few hours during{" "}
            {BUSINESS.supportHours.toLowerCase()}. You will get an email the moment it is
            confirmed — and this page will update on its own.
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link href="/account/orders" className={buttonClasses("outline", "md", "w-full")}>
            My orders
          </Link>
          <a
            href={`https://wa.me/${BUSINESS.supportPhoneDigits}?text=${encodeURIComponent(`Hi, I have paid for order ${orderNumber}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("primary", "md", "w-full")}
          >
            WhatsApp us
          </a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell orderNumber={orderNumber} amount={amount}>
      {/* Step 1 — pay */}
      <section className="card p-4 sm:p-5">
        <h2 className={STEP_HEAD}>
          <span className={STEP_NUMBER}>1</span>
          Pay <span className="tabular-nums text-ink-950">{formatINR(amount)}</span>
        </h2>

        {/* Phones: open the app directly. A QR cannot be scanned by the phone
            that is displaying it. */}
        {appLinks.length > 0 && (
          <div className="mt-4 sm:hidden">
            <p className="mb-2 text-[13px] leading-[1.5] text-ink-600">Tap your UPI app</p>
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
            <p className="mt-3 text-center text-[13px] text-ink-500">or scan the code below</p>
          </div>
        )}

        <div className="mt-4 flex flex-col items-center gap-3">
          {/* The white ground and the 12px padding around the code ARE the
              quiet zone a scanner needs; the frame is drawn outside them and
              nothing here changes the code's own colours. */}
          <div
            className="bg-white p-3 [&_svg]:h-[200px] [&_svg]:w-[200px] sm:[&_svg]:h-[220px] sm:[&_svg]:w-[220px]"
            /* Our own generated QR, not user input. */
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="text-center text-[13px] leading-[1.5] text-ink-600">
            Scan with Google Pay, PhonePe, Paytm or any UPI app
          </p>
        </div>

        <dl className="mt-4">
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
      <section className="mt-3 card p-4 sm:mt-4 sm:p-5">
        <h2 className={STEP_HEAD}>
          <span className={STEP_NUMBER}>2</span>
          Tell us the reference
        </h2>
        <p className="mt-3 text-[13px] leading-[1.55] text-ink-600">
          After paying, your app shows a 12-digit number called{" "}
          <strong className="font-semibold text-ink-950">UTR</strong>, <em>UPI transaction ID</em>{" "}
          or <em>Reference no.</em> Enter it here so we can match your payment.
        </p>

        <Form action={action} className="mt-4">
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
          <Button type="submit" size="lg" className="mt-4 w-full">
            I have paid — check it
            <ArrowRight size={17} />
          </Button>
        </Form>

        {/* The sentence is the reassurance. A shield glyph beside it would add
            nothing a customer can check, which is the definition of a seal. */}
        <p className="mt-4 pt-3.5 text-[13px] leading-[1.55] text-ink-500">
          Your money goes straight to {BUSINESS.legalName}&apos;s bank account. We never see your
          UPI PIN — it is entered only inside your own payment app.
        </p>
      </section>

      <p className="mt-4 text-center text-[13px] text-ink-500">
        Trouble paying? Call or WhatsApp{" "}
        <a
          href={`tel:${BUSINESS.supportPhoneTel}`}
          className="font-medium tabular-nums text-brand-700 underline-offset-4 hover:underline"
        >
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
        {/* The amount is money, so it is set in the text face with tabular
            figures rather than in Fraunces, whose proportional numerals were
            never going to hold a column of rupees straight. */}
        <header className="mb-5 pb-4 text-center sm:mb-6">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Order <span className="tabular-nums">{orderNumber}</span>
          </p>
          <p className="mt-2 text-[30px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-ink-950 sm:text-[38px]">
            {formatINR(amount)}
          </p>
          <p className="mt-2.5 text-[13px] leading-[1.5] text-ink-600">
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
    <div className="flex h-11 items-center justify-between gap-3">
      <dt className="shrink-0 text-[13px] text-ink-600">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "truncate text-[13px] font-semibold text-ink-950",
            mono ? "font-mono" : "tabular-nums",
          )}
        >
          {value}
        </span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            className="tap -m-2 shrink-0 p-2 text-ink-400 transition-colors duration-200 hover:text-brand-700"
          >
            {copied ? <Check size={14} className="text-brand-700" /> : <Copy size={14} />}
          </button>
        )}
      </dd>
    </div>
  );
}
