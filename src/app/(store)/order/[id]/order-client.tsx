"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "@/components/ui/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CircleCheck,
  Clock,
  Copy,
  CreditCard,
  FileText,
  MapPin,
  PackageSearch,
  ReceiptText,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Order } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, Price } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/motion";

import { LiveRefresh } from "@/components/ui/live-refresh";
import { cn, formatDate, formatINR } from "@/lib/utils";
import { deliveryFact } from "@/lib/order-display";
import { customerMayCancel } from "@/lib/order-rules";
import { CancelForm } from "./cancel-form";
import { useStore } from "@/store/store";

/** The confirmation mark: a glowing cobalt tile with a check. */
function SuccessMark() {
  return (
    <div className="relative mx-auto h-16 w-16 sm:h-20 sm:w-20">
      <span aria-hidden className="absolute -inset-3 rounded-[28px] bg-brand-200/40 blur-xl motion-safe:animate-pulse" />
      <span className="relative flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-lg ring-4 ring-brand-100 motion-safe:animate-fade-up">
        <CircleCheck size={24} aria-hidden className="sm:scale-125" />
      </span>
    </div>
  );
}

/** A notice above the order: a tinted card with an icon tile. */
const NOTICE =
  "flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 ring-1 ring-inset sm:gap-4 sm:p-5";
const NOTICE_LABEL = "text-[11px] font-semibold uppercase tracking-[0.12em]";

function NoticeIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn("icon-tile icon-tile-sm", className)}>
      <Icon size={16} aria-hidden />
    </span>
  );
}

/** Card heading: an icon tile and a title. */
function CardHead({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:px-5">
      <span className="icon-tile icon-tile-sm">
        <Icon size={16} aria-hidden />
      </span>
      <h2 className="t-h3">{children}</h2>
    </div>
  );
}

export function OrderClient({ order }: { order: Order | null }) {

  // The processing screen appends ?placed=1, so the celebratory copy is driven
  // by an explicit flag rather than by guessing from a timestamp.
  const search = useSearchParams();
  const { gstRegistered } = useStore().config;
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
          icon={<PackageSearch size={24} />}
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
    <div className="container-page pb-12 pt-6 sm:pb-16 sm:pt-10">
      {settling && order.status !== "cancelled" && <LiveRefresh seconds={8} />}
      <div className="mx-auto max-w-3xl">
        <header className="relative text-center">
          <div aria-hidden className="grid-lines pointer-events-none absolute inset-x-0 -top-6 h-48" />
          <div className="relative">
            <SuccessMark />
            <h1 className="t-h1 mt-5 sm:mt-6">{justPlaced ? "Order confirmed" : "Order details"}</h1>
            <p className="t-body mx-auto mt-2 max-w-[46ch]">
              {justPlaced ? (
                <>
                  Thank you, {order.address.fullName.split(" ")[0]}. We have emailed your invoice and
                  the courier will text you before delivery.
                </>
              ) : (
                <>Placed on {formatDate(order.placedAt)}.</>
              )}
            </p>

            <div className="mt-5 inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-line bg-surface py-1.5 pl-4 pr-1.5 shadow-sm sm:mt-6">
              <span className="t-label">Order number</span>
              <span className="min-w-0 font-mono text-[14px] font-semibold text-ink-950 wrap-anywhere">
                {order.number}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(order.number);
                  setCopied(true);
                }}
                aria-label="Copy order number"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                {copied ? <Check size={16} className="text-brand-700" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </header>

        <Reveal delay={0.08} className="mt-7 space-y-3 sm:mt-10 sm:space-y-4">
          {/* Where the customer's money actually is. Derived from the refund
              ledger, never from paymentStatus. */}
          {order.refund && (
            <div
              className={cn(
                NOTICE,
                order.refund.stage === "complete" ? "bg-brand-50 ring-brand-200" : "bg-surface ring-line",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <NoticeIcon icon={Wallet} className={order.refund.stage === "complete" ? "bg-surface" : undefined} />
                <div className="min-w-0">
                  <p className={cn(NOTICE_LABEL, "text-ink-500")}>Refund</p>
                  <p className="mt-1 max-w-[52ch] text-[13.5px] leading-[1.55] text-ink-800">
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
            </div>
          )}

          {/* An unpaid order: the one thing this page must offer is a way back
              to paying. Above the delivery promise. */}
          {order.paymentMethod.id !== "cod" &&
            order.paymentMethod.id !== "upi" &&
            (order.paymentStatus === "pending" || order.paymentStatus === "failed") &&
            order.status !== "cancelled" && (
              <div className={cn(NOTICE, "bg-sale-50 ring-sale-200")}>
                <div className="flex min-w-0 items-start gap-3">
                  <NoticeIcon icon={AlertTriangle} className="bg-surface text-sale-600" />
                  <div className="min-w-0">
                    <p className={cn(NOTICE_LABEL, "text-sale-700")}>
                      {paymentFailed ? "Payment not completed" : "Waiting for payment"}
                    </p>
                    <p className="mt-1 max-w-[46ch] text-[13.5px] leading-[1.55] text-ink-800">
                      Nothing has been charged. Your items are still reserved — try again to confirm
                      this order.
                    </p>
                  </div>
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
            <div className={cn(NOTICE, "bg-gold-50 ring-gold-200")}>
              <div className="flex min-w-0 items-start gap-3">
                <NoticeIcon icon={Clock} className="bg-surface text-gold-700" />
                <div className="min-w-0">
                  <p className={cn(NOTICE_LABEL, "text-gold-800")}>Waiting for payment</p>
                  <p className="mt-1 max-w-[46ch] text-[13.5px] leading-[1.55] text-ink-800">
                    Your items are reserved. Pay{" "}
                    <span className="t-price">{formatINR(order.totals.total)}</span> to confirm this
                    order.
                  </p>
                </div>
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
            <div className={cn(NOTICE, "justify-start bg-surface ring-line")}>
              <div className="flex min-w-0 items-start gap-3">
                <NoticeIcon icon={Clock} />
                <div className="min-w-0">
                  <p className={cn(NOTICE_LABEL, "text-ink-500")}>We are checking your payment</p>
                  <p className="mt-1 max-w-[60ch] text-[13.5px] leading-[1.6] text-ink-600">
                    Your reference is with us and we are matching it against our bank. You will get an
                    email the moment it is confirmed — usually within a few hours.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery promise: a promise until the parcel arrives, a record after. */}
          <div className="card edge-glow flex flex-wrap items-center justify-between gap-3 p-4 sm:gap-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="icon-tile">
                <CalendarClock size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="t-label">
                  {delivery.label === "Expected by" ? "Estimated delivery" : delivery.label}
                </p>
                <p className="t-price mt-1 text-[18px] sm:text-[20px]">{delivery.value}</p>
              </div>
            </div>
            <Link
              href={`/track/${order.id}`}
              className={buttonClasses("primary", "md", "w-full shrink-0 sm:w-auto")}
            >
              Track this order
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Items */}
          <section className="card overflow-hidden">
            <CardHead icon={ReceiptText}>
              <span className="tabular-nums">{order.lines.length}</span> item
              {order.lines.length > 1 ? "s" : ""}
            </CardHead>
            <ul className="divide-y divide-line">
              {order.lines.map((line) => (
                <li key={line.id} className="flex gap-3 px-4 py-4 sm:gap-4 sm:px-5">
                  <Link
                    href={`/p/${line.slug}`}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gradient-to-b from-ink-50 to-ink-100 sm:h-20 sm:w-20"
                  >
                    <Image src={line.image} alt="" fill sizes="80px" className="object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    {line.brand && (
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">{line.brand}</p>
                    )}
                    <Link
                      href={`/p/${line.slug}`}
                      className="line-clamp-2 block text-[13.5px] font-medium leading-[1.4] text-ink-950 hover:text-brand-700"
                    >
                      {line.title}
                    </Link>
                    <p className="t-small mt-0.5 tabular-nums">
                      {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
                    </p>
                    <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1" />
                  </div>
                  <p className="t-price shrink-0 text-[14px]">{formatINR(line.price * line.quantity)}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Where it is going, how it was paid for, who is carrying it. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <section className="card min-w-0 p-4">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile icon-tile-sm">
                  <MapPin size={16} aria-hidden />
                </span>
                <h2 className="t-h3">Delivering to</h2>
              </div>
              <p className="t-body mt-3 text-[13px] wrap-break-word">
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

            <section className="card min-w-0 p-4">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile icon-tile-sm">
                  <CreditCard size={16} aria-hidden />
                </span>
                <h2 className="t-h3">Payment</h2>
              </div>
              <p className="t-body mt-3 text-[13px]">
                <strong className="font-semibold text-ink-900">{order.paymentMethod.name}</strong>
                <br />
                {order.paymentMethod.description}
                <br />
                <span className="text-brand-700">
                  {order.paymentMethod.id === "cod" ? "Payable on delivery" : "Paid in full"}
                </span>
              </p>
            </section>

            <section className="card min-w-0 p-4">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile icon-tile-sm">
                  <Truck size={16} aria-hidden />
                </span>
                <h2 className="t-h3">Shipment</h2>
              </div>
              {/* AWBs are one long unbroken code; let them wrap rather than overflow. */}
              <p className="t-body mt-3 text-[13px] wrap-anywhere">
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
          <section className="card overflow-hidden">
            <CardHead icon={PackageSearch}>Payment summary</CardHead>
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
              {gstRegistered && order.totals.tax > 0 && (
                <Row label="GST (included)" value={formatINR(order.totals.tax)} muted />
              )}
            </dl>
            <div className="flex items-baseline justify-between gap-4 border-t border-line bg-ink-50/60 px-4 py-3.5 sm:px-5 sm:py-4">
              <span className="text-[13px] font-semibold text-ink-900">Total paid</span>
              <span className="t-price text-[19px] sm:text-[22px]">{formatINR(order.totals.total)}</span>
            </div>
          </section>

          {/* Phones: the main action across the top, the two secondary ones halved beneath it. */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
            <Link href="/products" className={buttonClasses("primary", "lg", "col-span-2 flex-1")}>
              Continue shopping
            </Link>
            <Link
              href={`/track/${order.id}`}
              className={buttonClasses("outline", "lg", "h-11 flex-1 px-3 sm:h-12 sm:px-8")}
            >
              <Truck size={16} /> Track order
            </Link>
            <Link
              href={`/order/${order.id}/invoice`}
              className={buttonClasses("outline", "lg", "h-11 shrink-0 px-3 sm:h-12 sm:px-8")}
            >
              <FileText size={16} /> Invoice
            </Link>
          </div>

          {/* Cancelling is only offered while it is still true; after packing,
              say why in words rather than hiding the control. */}
          <div className="text-center">
            {customerMayCancel(order.status.toUpperCase()) ? (
              <CancelForm orderId={order.id} paid={order.paymentStatus === "paid"} />
            ) : order.status !== "cancelled" && order.status !== "returned" ? (
              <p className="t-small mx-auto max-w-[60ch] text-[13px]">
                This order is already packed, so it cannot be cancelled here. Once it arrives you
                can return it from your account and we will refund you.
              </p>
            ) : null}
          </div>

          <p className="t-small text-center text-[13px]">
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
