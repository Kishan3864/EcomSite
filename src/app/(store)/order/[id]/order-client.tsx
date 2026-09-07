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
  Download,
  Check,
  MapPin,
  Package,
  Truck,
  Wallet,
} from "lucide-react";
import type { Order } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, Price } from "@/components/ui/primitives";
import { useStore } from "@/store/store";
import { formatDate, formatINR } from "@/lib/utils";

/** Celebratory tick — drawn, not animated with a library, so it stays cheap. */
function SuccessMark() {
  const reduce = usePrefersReducedMotion();
  return (
    <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
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
        className="relative h-9 w-9"
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

export function OrderClient({ id }: { id: string }) {
  const { orders, hydrated } = useStore();
  // The processing screen appends ?placed=1, so the celebratory copy is driven
  // by an explicit flag rather than by guessing from a timestamp.
  const justPlaced = useSearchParams().get("placed") === "1";
  const [copied, setCopied] = useState(false);
  const order = orders.find((o) => o.id === id || o.number === id);

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

  if (!hydrated) {
    return (
      <div className="container-page py-14">
        <div className="skeleton mx-auto h-64 max-w-2xl rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-page py-14">
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
    <div className="container-page py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <SuccessMark />
          <h1 className="mt-6 font-display text-[30px] leading-[1.08] tracking-[-0.03em] text-ink-950 sm:text-[40px]">
            {justPlaced ? "Order confirmed" : "Order details"}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
            {justPlaced ? (
              <>
                Thank you, {order.address.fullName.split(" ")[0]}. We have emailed your invoice and
                the courier will text you before delivery.
              </>
            ) : (
              <>Placed on {formatDate(order.placedAt)}.</>
            )}
          </p>

          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-hairline bg-surface px-4 py-3">
            <span className="text-[12px] uppercase tracking-[0.1em] text-ink-400">
              Order number
            </span>
            <span className="font-mono text-[15px] font-bold tracking-[0.04em] text-ink-950">
              {order.number}
            </span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(order.number);
                setCopied(true);
              }}
              aria-label="Copy order number"
              className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-700"
            >
              {copied ? <Check size={14} className="text-brand-600" /> : <Copy size={14} />}
            </button>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 space-y-4"
        >
          {/* Delivery promise */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Truck size={19} />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                  Estimated delivery
                </p>
                <p className="text-[17px] font-semibold text-brand-900">
                  {formatDate(order.estimatedDelivery, "day")}
                </p>
              </div>
            </div>
            <Link
              href={`/track/${order.id}`}
              className={buttonClasses("primary", "md", "shrink-0")}
            >
              Track this order
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Items */}
          <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
            <h2 className="border-b border-hairline px-5 py-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
              {order.lines.length} item{order.lines.length > 1 ? "s" : ""}
            </h2>
            <ul className="divide-y divide-hairline">
              {order.lines.map((line) => (
                <li key={line.id} className="flex gap-4 px-5 py-4">
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
                      className="line-clamp-2 text-[13.5px] font-medium text-ink-950 hover:text-brand-700"
                    >
                      {line.title}
                    </Link>
                    <p className="mt-0.5 text-[12px] text-ink-500">
                      {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
                    </p>
                    <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1.5" />
                  </div>
                  <p className="shrink-0 text-[14px] font-semibold tabular-nums text-ink-950">
                    {formatINR(line.price * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Details grid */}
          <div className="grid gap-3 sm:grid-cols-3">
            <section className="rounded-xl border border-hairline bg-surface p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                <MapPin size={13} className="text-brand-600" /> Delivering to
              </h2>
              <p className="text-[12.5px] leading-relaxed text-ink-600">
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

            <section className="rounded-xl border border-hairline bg-surface p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">
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

            <section className="rounded-xl border border-hairline bg-surface p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                <Package size={13} className="text-brand-600" /> Shipment
              </h2>
              <p className="text-[12.5px] leading-relaxed text-ink-600">
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
            <h2 className="border-b border-hairline px-5 py-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
              Payment summary
            </h2>
            <dl className="space-y-2.5 px-5 py-4 text-[13.5px]">
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
            <div className="flex items-baseline justify-between gap-4 border-t border-hairline px-5 py-4">
              <span className="text-[15px] font-semibold text-ink-950">Total paid</span>
              <span className="text-xl font-semibold tabular-nums text-ink-950">
                {formatINR(order.totals.total)}
              </span>
            </div>
          </section>

          <div className="flex flex-wrap gap-2.5">
            <Link href="/products" className={buttonClasses("primary", "lg", "flex-1")}>
              Continue shopping
            </Link>
            <Link href={`/track/${order.id}`} className={buttonClasses("outline", "lg", "flex-1")}>
              Track order
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.print()}
              className="shrink-0"
            >
              <Download size={16} /> Invoice
            </Button>
          </div>

          <p className="text-center text-[12px] leading-relaxed text-ink-400">
            Need help with this order?{" "}
            <Link href="/contact" className="font-medium text-brand-700 hover:underline">
              Contact support
            </Link>{" "}
            or read our{" "}
            <Link href="/legal/returns" className="font-medium text-brand-700 hover:underline">
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
