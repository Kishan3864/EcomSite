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

/** The two headings on the page, each numbered by a cobalt disc. */
const STEP_HEAD = "t-h3 flex items-center gap-3";
const STEP_NUMBER =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[12px] font-semibold tabular-nums text-white shadow-[0_0_0_4px_var(--color-brand-100)]";

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
        <div className="card p-4 text-[13px] leading-[1.55] text-ink-700 sm:p-5">
          <p className="flex items-start gap-3">
            <span className="icon-tile icon-tile-sm bg-sale-50 text-sale-600" aria-hidden>
              <AlertCircle size={16} />
            </span>
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
        <div className="card p-6 text-center sm:p-8">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <Clock size={24} aria-hidden />
          </span>
          <h2 className="t-h2 mt-5">Checking your payment</h2>
          <p className="t-body mx-auto mt-2 max-w-[46ch]">
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
            <p className="t-label mb-2.5">Tap your UPI app</p>
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
            <p className="t-small mt-4 flex items-center gap-3 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
              or scan the code below
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-col items-center gap-3">
          {/* The white ground and the 12px padding around the code ARE the
              quiet zone a scanner needs; the frame is drawn outside them and
              nothing here changes the code's own colours. */}
          <div
            className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-line [&_svg]:h-[200px] [&_svg]:w-[200px] sm:[&_svg]:h-[220px] sm:[&_svg]:w-[220px]"
            /* Our own generated QR, not user input. */
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="t-small text-center">Scan with Google Pay, PhonePe, Paytm or any UPI app</p>
        </div>

        <dl className="card-muted card-divided mt-5 px-4">
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
        <p className="t-body mt-3 text-[13px]">
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
          <Button type="submit" variant="accent" size="lg" className="mt-4 w-full">
            I have paid — check it
            <ArrowRight size={17} />
          </Button>
        </Form>

        {/* The sentence is the reassurance. A shield glyph beside it would add
            nothing a customer can check, which is the definition of a seal. */}
        <p className="t-small mt-5 border-t border-line pt-4">
          Your money goes straight to {BUSINESS.legalName}&apos;s bank account. We never see your
          UPI PIN — it is entered only inside your own payment app.
        </p>
      </section>

      <p className="t-small mt-5 text-center">
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
        {/* Money in tabular figures, so a column of rupees holds straight. */}
        <header className="aurora relative mb-4 overflow-hidden rounded-2xl px-5 py-6 text-center sm:mb-5 sm:py-8">
          <p className="t-label">
            Order <span className="tabular-nums">{orderNumber}</span>
          </p>
          <p className="t-price mt-2.5 text-[30px] leading-none sm:text-[38px]">{formatINR(amount)}</p>
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
    <div className="flex min-h-11 items-center justify-between gap-3 py-1">
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
            className="tap -my-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-700"
          >
            {copied ? <Check size={16} className="text-brand-700" /> : <Copy size={16} />}
          </button>
        )}
      </dd>
    </div>
  );
}
