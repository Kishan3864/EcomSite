"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "@/components/ui/image";
import Link from "next/link";
import { ArrowRight, Check, Copy, FileText } from "lucide-react";
import type { Order } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, Price } from "@/components/ui/primitives";
import { Ink, drawnPath } from "@/components/illustration/ink";
import { DrawIn, Reveal } from "@/components/ui/motion";

import { LiveRefresh } from "@/components/ui/live-refresh";
import { cn, formatDate, formatINR } from "@/lib/utils";
import { deliveryFact } from "@/lib/order-display";
import { customerMayCancel } from "@/lib/order-rules";
import { CancelForm } from "./cancel-form";

/**
 * The stamp on a finished order.
 *
 * It used to be a white tick inside a filled ocean disc with a ring pulsing
 * out of it — the mark every checkout on the internet ends with, and the one
 * shape this shop never draws: nothing here is round, nothing is filled and
 * nothing pulses. So the tick is ruled across a square instead, with the
 * offset register frame the homepage puts behind its drawn marks, and it
 * draws itself once. It is the last thing a customer sees of the purchase,
 * and it should look like it was made by the same hand as the rest.
 */
function SuccessMark() {
  return (
    <div className="relative mx-auto h-16 w-16 sm:h-20 sm:w-20">
      <span
        aria-hidden
        className="absolute inset-[10%] translate-x-[8px] translate-y-[8px]"
      />
      <span aria-hidden className="absolute inset-0 bg-surface" />
      <Ink viewBox="0 0 64 64" strokeWidth={1.5} className="relative h-full w-full text-brand-700">
        <DrawIn duration={700} delay={180}>
          <path d="M18 33L28 43L46 21" {...drawnPath} />
        </DrawIn>
      </Ink>
    </div>
  );
}

/* A notice above the order: a single heavy rule down its left edge and no box.
   The same shape the form summary uses, so an unpaid order and a failed field
   speak in one voice. */
const NOTICE =
  "flex flex-wrap items-center justify-between gap-3 rule-l px-4 py-4 sm:gap-4 sm:px-5 sm:py-5";
const NOTICE_LABEL = "text-[11px] font-semibold uppercase tracking-[0.12em]";

export function OrderClient({ order }: { order: Order | null }) {

  // The processing screen appends ?placed=1, so the celebratory copy is driven
  // by an explicit flag rather than by guessing from a timestamp.
  const search = useSearchParams();
  const justPlaced = search.get("placed") === "1";
  const paymentFailed = search.get("payment") === "failed";
  const [copied, setCopied] = useState(false);


  // Arriving here via router.replace() from the processing screen keeps the
  // previous scroll offset, which would hide the confirmation mark.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  if (!order) {
    return (
      <div className="container-page py-8 sm:py-14">
        <EmptyState
          title="We could not find that order"
          body="The link may be old, or the order was placed on another device. Your order history lives in your account."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/account/orders" className={buttonClasses("primary", "md")}>
                View my orders
              </Link>
              <Link href="/products" className={buttonClasses("outline", "md")}>
                Continue shopping
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  // Waiting on a payment: the page keeps itself current, so a confirmation
  // that lands while they are looking at it simply appears. A settled order
  // has nothing left to change, and is left alone.
  const settling =
    order.paymentStatus === "pending" ||
    order.paymentStatus === "verifying" ||
    order.paymentStatus === "failed";

  const delivery = deliveryFact(order);

  return (
    <div className="container-page py-6 sm:py-12">
      {settling && order.status !== "cancelled" && <LiveRefresh seconds={8} />}
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <SuccessMark />
          <h1 className="mt-5 font-display text-[26px] leading-[1.08] tracking-[-0.03em] text-ink-950 sm:mt-7 sm:text-[40px]">
            {justPlaced ? "Order confirmed" : "Order details"}
          </h1>
          <p className="mx-auto mt-3 max-w-[46ch] text-[14px] leading-[1.6] text-ink-600 sm:text-[15px]">
            {justPlaced ? (
              <>
                Thank you, {order.address.fullName.split(" ")[0]}. We have emailed your invoice and
                the courier will text you before delivery.
              </>
            ) : (
              <>Placed on {formatDate(order.placedAt)}.</>
            )}
          </p>

          <div className="mt-5 inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-surface shadow-sm px-3 py-2.5 sm:mt-6 sm:px-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              Order number
            </span>
            <span className="min-w-0 font-mono text-[14px] font-semibold text-ink-950 wrap-anywhere sm:text-[15px]">
              {order.number}
            </span>
            {/* 40px to the thumb on phones; the negative margin keeps the pill compact. */}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(order.number);
                setCopied(true);
              }}
              aria-label="Copy order number"
              className="tap -m-2 p-3.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-700 sm:m-0 sm:p-1.5"
            >
              {copied ? <Check size={14} className="text-brand-700" /> : <Copy size={14} />}
            </button>
          </div>
        </header>

        <Reveal delay={0.08} className="mt-7 space-y-3 sm:mt-10 sm:space-y-4">
          {/* Where the customer's money actually is.
              Derived from the refund ledger, never from paymentStatus — that
              column has said "refunded" on orders where nothing moved, and this
              is the line a waiting customer reads first. */}
          {order.refund && (
            <div
              className={cn(
                NOTICE,
                order.refund.stage === "complete"
                  ? "[--rule-color:var(--color-brand-600)] bg-brand-50"
                  : "[--rule-color:var(--color-ink-950)] bg-surface",
              )}
            >
              <div className="min-w-0">
                <p className={cn(NOTICE_LABEL, "text-ink-500")}>Refund</p>
                <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-[1.55] text-ink-800">
                  {order.refund.label}.
                  {order.refund.stage === "raised" || order.refund.stage === "partial" ? (
                    <>
                      {" "}
                      We raised {formatINR(order.refund.owed)} — once your bank releases it the
                      money is back with you. Banks take {order.refund.window}.
                    </>
                  ) : null}
                  {order.refund.stage === "due" ? (
                    <> {formatINR(order.refund.owed)} is owed back to you.</>
                  ) : null}
                  {order.refund.stage === "complete" ? (
                    <> {formatINR(order.refund.returned)} has gone back.</>
                  ) : null}
                </p>
              </div>
            </div>
          )}

          {/* An unpaid order: the one thing this page must offer is a way back
              to paying. Above the delivery promise, because a promise means
              nothing until the order is paid for. */}
          {order.paymentMethod.id !== "cod" &&
            order.paymentMethod.id !== "upi" &&
            (order.paymentStatus === "pending" || order.paymentStatus === "failed") &&
            order.status !== "cancelled" && (
              <div className={cn(NOTICE, "[--rule-color:var(--color-sale-600)] bg-sale-50")}>
                <div className="min-w-0">
                  <p className={cn(NOTICE_LABEL, "text-sale-700")}>
                    {paymentFailed ? "Payment not completed" : "Waiting for payment"}
                  </p>
                  <p className="mt-1.5 max-w-[46ch] text-[13.5px] leading-[1.55] text-ink-800">
                    Nothing has been charged. Your items are still reserved — try again to confirm
                    this order.
                  </p>
                </div>
                <Link
                  href={`/checkout/payu/${order.id}`}
                  className={buttonClasses("primary", "md", "w-full shrink-0 sm:w-auto")}
                >
                  Try payment again
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}

          {order.paymentMethod.id === "upi" && order.paymentStatus === "pending" && (
            <div className={cn(NOTICE, "[--rule-color:var(--color-ink-950)] bg-surface")}>
              <div className="min-w-0">
                <p className={cn(NOTICE_LABEL, "text-ink-500")}>Waiting for payment</p>
                <p className="mt-1.5 max-w-[46ch] text-[13.5px] leading-[1.55] text-ink-800">
                  Your items are reserved. Pay{" "}
                  <span className="font-semibold tabular-nums text-ink-950">
                    {formatINR(order.totals.total)}
                  </span>{" "}
                  to confirm this order.
                </p>
              </div>
              <Link
                href={`/checkout/upi/${order.id}`}
                className={buttonClasses("primary", "md", "w-full shrink-0 sm:w-auto")}
              >
                Pay now
                <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {order.paymentMethod.id === "upi" && order.paymentStatus === "verifying" && (
            <div className="rule-l [--rule-color:var(--color-ink-950)] bg-surface px-4 py-4 sm:px-5 sm:py-5">
              <p className={cn(NOTICE_LABEL, "text-ink-500")}>We are checking your payment</p>
              <p className="mt-1.5 max-w-[60ch] text-[13.5px] leading-[1.6] text-ink-600">
                Your reference is with us and we are matching it against our bank. You will get an
                email the moment it is confirmed — usually within a few hours.
              </p>
            </div>
          )}

          {/* Delivery promise */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface shadow-sm p-4 sm:gap-4 sm:p-5">
            <div className="min-w-0">
              {/* A promise until the parcel arrives, a record after — this page
                  is also where the confirmation email's link lands, often long
                  after delivery. */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                {delivery.label === "Expected by" ? "Estimated delivery" : delivery.label}
              </p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink-950 sm:text-[20px]">
                {delivery.value}
              </p>
            </div>
            {/* Wraps under the date on phones, so it takes the full width there. */}
            <Link
              href={`/track/${order.id}`}
              className={buttonClasses("primary", "md", "w-full shrink-0 sm:w-auto")}
            >
              Track this order
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Items */}
          <section className="bg-surface shadow-sm">
            <h2 className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:px-5">
              <span className="tabular-nums">{order.lines.length}</span> item
              {order.lines.length > 1 ? "s" : ""}
            </h2>
            <ul>
              {order.lines.map((line) => (
                <li key={line.id} className="flex gap-3 px-4 py-4 sm:gap-4 sm:px-5">
                  <Link
                    href={`/p/${line.slug}`}
                    className="relative h-20 w-16 shrink-0 overflow-hidden bg-ink-100"
                  >
                    <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    {line.brand && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">{line.brand}</p>}
                    <Link
                      href={`/p/${line.slug}`}
                      className="mt-0.5 line-clamp-2 block text-[13px] font-medium leading-[1.4] text-ink-950 hover:text-brand-700 sm:text-[13.5px]"
                    >
                      {line.title}
                    </Link>
                    <p className="mt-1 text-[13px] tabular-nums text-ink-500">
                      {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
                    </p>
                    <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1.5" />
                  </div>
                  <p className="shrink-0 text-[13.5px] font-semibold tabular-nums text-ink-950 sm:text-[14px]">
                    {formatINR(line.price * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Where it is going, how it was paid for, who is carrying it. One
              hairline grid rather than three floating cards. */}
          <div className="tile-grid grid-cols-1 sm:grid-cols-3">
            <section className="min-w-0 p-4">
              <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                Delivering to
              </h2>
              <p className="mt-2 text-[13px] leading-[1.6] text-ink-600 wrap-break-word">
                <strong className="font-semibold text-ink-900">{order.address.fullName}</strong>
                <br />
                {order.address.line1}
                {order.address.line2 ? `, ${order.address.line2}` : ""}
                <br />
                {order.address.city}, {order.address.state}{" "}
                <span className="tabular-nums">{order.address.pincode}</span>
                <br />
                <span className="tabular-nums">{order.address.phone}</span>
              </p>
            </section>

            <section className="min-w-0 p-4">
              <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                Payment
              </h2>
              <p className="mt-2 text-[13px] leading-[1.6] text-ink-600">
                <strong className="font-semibold text-ink-900">{order.paymentMethod.name}</strong>
                <br />
                {order.paymentMethod.description}
                <br />
                <span className="text-brand-700">
                  {order.paymentMethod.id === "cod" ? "Payable on delivery" : "Paid in full"}
                </span>
              </p>
            </section>

            <section className="min-w-0 p-4">
              <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                Shipment
              </h2>
              {/* AWBs are one long unbroken code; let them wrap rather than overflow. */}
              <p className="mt-2 text-[13px] leading-[1.6] text-ink-600 wrap-anywhere">
                {order.awb ? (
                  <>
                    <strong className="font-semibold text-ink-900">{order.courier}</strong>
                    <br />
                    AWB <span className="tabular-nums">{order.awb}</span>
                  </>
                ) : (
                  "Courier and tracking number appear here once your parcel is booked."
                )}
                <br />
                {order.delivery.name}
              </p>
            </section>
          </div>

          {/* Totals */}
          <section className="bg-surface shadow-sm">
            <h2 className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:px-5">
              Payment summary
            </h2>
            <dl className="space-y-2.5 px-4 py-3.5 text-[13px] sm:px-5 sm:py-4 sm:text-[13.5px]">
              <Row label="Items total" value={formatINR(order.totals.mrpTotal)} />
              {order.totals.productDiscount > 0 && (
                <Row
                  label="Product discount"
                  value={`− ${formatINR(order.totals.productDiscount)}`}
                  save
                />
              )}
              <Row
                label="Delivery"
                value={order.totals.shipping === 0 ? "Free" : formatINR(order.totals.shipping)}
                save={order.totals.shipping === 0}
              />
              <Row label="GST (included)" value={formatINR(order.totals.tax)} muted />
            </dl>
            <div className="flex items-baseline justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950">
                Total paid
              </span>
              <span className="text-[19px] font-semibold tabular-nums text-ink-950 sm:text-[22px]">
                {formatINR(order.totals.total)}
              </span>
            </div>
          </section>

          {/* Phones: the main action across the top, the two secondary ones halved
              beneath it, instead of three buttons wrapping onto three rows. */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
            <Link
              href="/products"
              className={buttonClasses("primary", "lg", "col-span-2 flex-1")}
            >
              Continue shopping
            </Link>
            <Link
              href={`/track/${order.id}`}
              className={buttonClasses("outline", "lg", "h-11 flex-1 px-3 sm:h-12 sm:px-8")}
            >
              Track order
            </Link>
            <Link
              href={`/order/${order.id}/invoice`}
              className={buttonClasses("outline", "lg", "h-11 shrink-0 px-3 sm:h-12 sm:px-8")}
            >
              <FileText size={16} /> Invoice
            </Link>
          </div>

          {/* Cancelling is only offered while it is still true. After packing
              the parcel exists and is often already with a courier, so the
              honest route is a return — said in words rather than by hiding
              the control, because a customer who cannot see why will call. */}
          <div className="text-center">
            {customerMayCancel(order.status.toUpperCase()) ? (
              <CancelForm orderId={order.id} paid={order.paymentStatus === "paid"} />
            ) : order.status !== "cancelled" && order.status !== "returned" ? (
              <p className="text-[13px] leading-[1.6] text-ink-500">
                This order is already packed, so it cannot be cancelled here. Once it arrives you
                can return it from your account and we will refund you.
              </p>
            ) : null}
          </div>

          <p className="text-center text-[13px] leading-[1.6] text-ink-500">
            Need help with this order?{" "}
            <Link href="/contact" className="font-medium text-brand-700 hover:underline">
              Contact support
            </Link>{" "}
            or read our{" "}
            <Link href="/legal/refunds" className="font-medium text-brand-700 hover:underline">
              return policy
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  save,
  muted,
}: {
  label: string;
  value: string;
  save?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={muted ? "text-ink-500" : "text-ink-600"}>{label}</dt>
      <dd
        className={
          save
            ? "font-semibold tabular-nums text-sale-600"
            : muted
              ? "tabular-nums text-ink-500"
              : "tabular-nums text-ink-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export type { Order };
