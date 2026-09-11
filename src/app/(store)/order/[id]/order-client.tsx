"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import {
  ArrowRight,
  Copy,
  FileText,
  Check,
  MapPin,
  Package,
  Truck,
  Wallet,
} from "lucide-react";
import type { Order } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, Price } from "@/components/ui/primitives";

import { formatDate, formatINR } from "@/lib/utils";

/** Celebratory tick — drawn, not animated with a library, so it stays cheap. */
function SuccessMark() {
  const reduce = usePrefersReducedMotion();
  return (
    <div className="relative mx-auto flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
      <motion.span
        initial={reduce ? { opacity: 0 } : { scale: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="absolute inset-0 rounded-full bg-brand-600"
      />
      {!reduce && (
        <motion.span
          initial={{ scale: 0.6, opacity: 0.5 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
          className="absolute inset-0 rounded-full border-2 border-brand-500"
        />
      )}
      <motion.svg
        viewBox="0 0 40 40"
        className="relative h-7 w-7 sm:h-9 sm:w-9"
        fill="none"
        aria-hidden
      >
        <motion.path
          d="M9 20.5 17 28 31 13"
          stroke="white"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.svg>
    </div>
  );
}

export function OrderClient({ order }: { order: Order | null }) {

  // The processing screen appends ?placed=1, so the celebratory copy is driven
  // by an explicit flag rather than by guessing from a timestamp.
  const justPlaced = useSearchParams().get("placed") === "1";
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
          icon={<Package size={26} />}
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

  return (
    <div className="container-page py-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <SuccessMark />
          <h1 className="mt-4 font-display text-[26px] leading-[1.08] tracking-[-0.03em] text-ink-950 sm:mt-6 sm:text-[40px]">
            {justPlaced ? "Order confirmed" : "Order details"}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-600 sm:mt-3 sm:text-[15px]">
            {justPlaced ? (
              <>
                Thank you, {order.address.fullName.split(" ")[0]}. We have emailed your invoice and
                the courier will text you before delivery.
              </>
            ) : (
              <>Placed on {formatDate(order.placedAt)}.</>
            )}
          </p>

          <div className="mt-4 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2.5 sm:mt-5 sm:px-4 sm:py-3">
            <span className="text-[11.5px] uppercase tracking-[0.1em] text-ink-400 sm:text-[12px]">
              Order number
            </span>
            <span className="min-w-0 font-mono text-[14px] font-bold tracking-[0.04em] text-ink-950 wrap-anywhere sm:text-[15px]">
              {order.number}
            </span>
            {/* 40px to the thumb on phones; the negative margin keeps the pill compact. */}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(order.number);
                setCopied(true);
              }}
              aria-label="Copy order number"
              className="tap -m-2 rounded-md p-3.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-700 sm:m-0 sm:p-1.5"
            >
              {copied ? <Check size={14} className="text-brand-600" /> : <Copy size={14} />}
            </button>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 space-y-3 sm:mt-8 sm:space-y-4"
        >
          {/* Delivery promise */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 sm:gap-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white sm:h-11 sm:w-11">
                <Truck size={19} />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                  Estimated delivery
                </p>
                <p className="text-[16px] font-semibold text-brand-900 sm:text-[17px]">
                  {formatDate(order.estimatedDelivery, "day")}
                </p>
              </div>
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
          <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
            <h2 className="border-b border-hairline px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:px-5 sm:py-4">
              {order.lines.length} item{order.lines.length > 1 ? "s" : ""}
            </h2>
            <ul className="divide-y divide-hairline">
              {order.lines.map((line) => (
                <li key={line.id} className="flex gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                  <Link
                    href={`/p/${line.slug}`}
                    className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-ink-100"
                  >
                    <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      {line.brand}
                    </p>
                    <Link
                      href={`/p/${line.slug}`}
                      className="line-clamp-2 text-[13px] font-medium text-ink-950 hover:text-brand-700 sm:text-[13.5px]"
                    >
                      {line.title}
                    </Link>
                    <p className="mt-0.5 text-[11.5px] text-ink-500 sm:text-[12px]">
                      {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
                    </p>
                    <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1 sm:mt-1.5" />
                  </div>
                  <p className="shrink-0 text-[13.5px] font-semibold tabular-nums text-ink-950 sm:text-[14px]">
                    {formatINR(line.price * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Details grid */}
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            <section className="min-w-0 rounded-xl border border-hairline bg-surface p-3.5 sm:p-4">
              <h2 className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500 sm:mb-2">
                <MapPin size={13} className="text-brand-600" /> Delivering to
              </h2>
              <p className="text-[12.5px] leading-relaxed text-ink-600 wrap-break-word">
                <strong className="font-semibold text-ink-900">{order.address.fullName}</strong>
                <br />
                {order.address.line1}
                {order.address.line2 ? `, ${order.address.line2}` : ""}
                <br />
                {order.address.city}, {order.address.state} {order.address.pincode}
                <br />
                {order.address.phone}
              </p>
            </section>

            <section className="min-w-0 rounded-xl border border-hairline bg-surface p-3.5 sm:p-4">
              <h2 className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500 sm:mb-2">
                <Wallet size={13} className="text-brand-600" /> Payment
              </h2>
              <p className="text-[12.5px] leading-relaxed text-ink-600">
                <strong className="font-semibold text-ink-900">{order.paymentMethod.name}</strong>
                <br />
                {order.paymentMethod.description}
                <br />
                <span className="text-brand-700">
                  {order.paymentMethod.id === "cod" ? "Payable on delivery" : "Paid in full"}
                </span>
              </p>
            </section>

            <section className="min-w-0 rounded-xl border border-hairline bg-surface p-3.5 sm:p-4">
              <h2 className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500 sm:mb-2">
                <Package size={13} className="text-brand-600" /> Shipment
              </h2>
              {/* AWBs are one long unbroken code; let them wrap rather than overflow. */}
              <p className="text-[12.5px] leading-relaxed text-ink-600 wrap-anywhere">
                <strong className="font-semibold text-ink-900">{order.courier}</strong>
                <br />
                AWB {order.awb}
                <br />
                {order.delivery.name}
              </p>
            </section>
          </div>

          {/* Totals */}
          <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
            <h2 className="border-b border-hairline px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:px-5 sm:py-4">
              Payment summary
            </h2>
            <dl className="space-y-2 px-4 py-3 text-[13px] sm:space-y-2.5 sm:px-5 sm:py-4 sm:text-[13.5px]">
              <Row label="Items total" value={formatINR(order.totals.mrpTotal)} />
              {order.totals.productDiscount > 0 && (
                <Row
                  label="Product discount"
                  value={`− ${formatINR(order.totals.productDiscount)}`}
                  save
                />
              )}
              {order.totals.couponDiscount > 0 && (
                <Row
                  label={`Coupon ${order.totals.couponCode ?? ""}`}
                  value={`− ${formatINR(order.totals.couponDiscount)}`}
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
            <div className="flex items-baseline justify-between gap-4 border-t border-hairline px-4 py-3 sm:px-5 sm:py-4">
              <span className="text-[14px] font-semibold text-ink-950 sm:text-[15px]">Total paid</span>
              <span className="text-[18px] font-semibold tabular-nums text-ink-950 sm:text-xl">
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

          <p className="text-center text-[12.5px] leading-relaxed text-ink-400 sm:text-[12px]">
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
        </motion.div>
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
      <dt className={muted ? "text-ink-400" : "text-ink-600"}>{label}</dt>
      <dd
        className={
          save
            ? "font-semibold tabular-nums text-brand-700"
            : muted
              ? "tabular-nums text-ink-400"
              : "tabular-nums text-ink-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export type { Order };
