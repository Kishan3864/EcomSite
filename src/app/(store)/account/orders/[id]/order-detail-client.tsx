"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Headset,
  MapPin,
  Package,
  RotateCcw,
  Truck,
  Wallet,
} from "lucide-react";
import type { Order } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, Price } from "@/components/ui/primitives";
import { TrackingTimeline } from "@/components/account/tracking-timeline";
import { cn, formatDate, formatDateTime, formatINR } from "@/lib/utils";

export function OrderDetailClient({ order }: { order: Order | null }) {

  if (!order) {
    return (
      <EmptyState
        icon={<Package size={26} />}
        title="Order not found"
        body="We could not find that order on your account. It may have been placed as a guest with a different email."
        className="px-4 py-8 sm:px-6 sm:py-16"
        action={
          <Link href="/account/orders" className={buttonClasses("primary", "md")}>
            Back to my orders
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <Link
        href="/account/orders"
        className="tap -my-2 inline-flex items-center gap-1.5 py-2 text-[12.5px] font-medium text-ink-600 transition-colors hover:text-brand-700 sm:my-0 sm:py-0 sm:text-[13px]"
      >
        <ArrowLeft size={14} /> All orders
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-display text-[22px] leading-tight tracking-[-0.025em] text-ink-950 sm:text-[32px]">
            Order {order.number}
          </h1>
          <p className="mt-1 text-[13px] text-ink-600 sm:mt-1.5 sm:text-[13.5px]">
            Placed on {formatDateTime(order.placedAt)} · {order.lines.length} item
            {order.lines.length > 1 ? "s" : ""} · {formatINR(order.totals.total)}
          </p>
        </div>
        {/* Two equal halves across the width on a phone. */}
        <div className="flex w-full gap-2 sm:w-auto">
          <Link
            href={`/order/${order.id}/invoice`}
            className={buttonClasses("outline", "sm", "h-10 flex-1 sm:h-9 sm:flex-initial")}
          >
            <FileText size={14} /> Invoice
          </Link>
          <Link
            href={`/track/${order.id}`}
            className={buttonClasses("primary", "sm", "h-10 flex-1 sm:h-9 sm:flex-initial")}
          >
            <Truck size={14} /> Track
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
            <h2 className="border-b border-hairline px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:px-5 sm:py-4 sm:text-[12px]">
              Items in this order
            </h2>
            <ul className="divide-y divide-hairline">
              {order.lines.map((line) => (
                // Wraps on a phone so the delivered-item actions can take a row
                // of their own instead of squeezing beside the line total.
                <li
                  key={line.id}
                  className="flex flex-wrap gap-3 px-4 py-3.5 sm:flex-nowrap sm:gap-4 sm:px-5 sm:py-4"
                >
                  <Link
                    href={`/p/${line.slug}`}
                    className="relative h-[72px] w-[58px] shrink-0 overflow-hidden rounded-lg bg-ink-100 sm:h-20 sm:w-16"
                  >
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 64px, 58px"
                      className="object-cover"
                    />
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
                    <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1.5" />
                    {order.status === "delivered" && (
                      <LineActions slug={line.slug} className="mt-2.5 hidden sm:flex" />
                    )}
                  </div>
                  <p className="shrink-0 text-[13.5px] font-semibold tabular-nums text-ink-950 sm:text-[14px]">
                    {formatINR(line.price * line.quantity)}
                  </p>
                  {order.status === "delivered" && (
                    <LineActions slug={line.slug} className="w-full pl-[70px] sm:hidden" />
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
            <h2 className="mb-4 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:mb-5 sm:text-[12px]">
              Shipment progress
            </h2>
            <TrackingTimeline events={order.tracking} />
          </section>
        </div>

        {/* Phones stack these; tablets pair them up rather than stretch each
            card across the full width. grid-cols-1 and min-w-0 let a long AWB
            wrap inside its card instead of stretching the column. */}
        <aside className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:block lg:space-y-4">
          <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
            <h2 className="border-b border-hairline px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Payment summary
            </h2>
            <dl className="space-y-2 px-4 py-3 text-[12.5px] sm:py-3.5 sm:text-[13px]">
              <Row label="Items total" value={formatINR(order.totals.mrpTotal)} />
              {order.totals.productDiscount > 0 && (
                <Row
                  label="Discount"
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
              />
              <Row label="GST (included)" value={formatINR(order.totals.tax)} muted />
            </dl>
            <div className="flex items-baseline justify-between gap-3 border-t border-hairline px-4 py-3">
              <span className="text-[13px] font-semibold text-ink-950 sm:text-[13.5px]">Total</span>
              <span className="text-[15px] font-semibold tabular-nums text-ink-950 sm:text-[16px]">
                {formatINR(order.totals.total)}
              </span>
            </div>
          </section>

          {[
            {
              icon: MapPin,
              title: "Delivery address",
              body: (
                <>
                  <strong className="font-semibold text-ink-900">{order.address.fullName}</strong>
                  <br />
                  {order.address.line1}
                  {order.address.line2 ? `, ${order.address.line2}` : ""}
                  <br />
                  {order.address.city}, {order.address.state} {order.address.pincode}
                  <br />
                  {order.address.phone}
                </>
              ),
            },
            {
              icon: Wallet,
              title: "Payment",
              body: (
                <>
                  <strong className="font-semibold text-ink-900">
                    {order.paymentMethod.name}
                  </strong>
                  <br />
                  {order.paymentMethod.description}
                </>
              ),
            },
            {
              icon: Truck,
              title: "Shipping",
              body: (
                <>
                  <strong className="font-semibold text-ink-900">{order.courier}</strong>
                  <br />
                  AWB {order.awb}
                  <br />
                  {order.delivery.name} · by {formatDate(order.estimatedDelivery, "short")}
                </>
              ),
            },
          ].map((card) => (
            <section key={card.title} className="rounded-xl border border-hairline bg-surface p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                <card.icon size={13} className="text-brand-600" /> {card.title}
              </h2>
              {/* Long AWBs and unbroken address lines wrap instead of widening the card. */}
              <p className="break-words text-[12.5px] leading-relaxed text-ink-600">{card.body}</p>
            </section>
          ))}

          <Link href="/contact" className={buttonClasses("outline", "md", "w-full sm:col-span-2")}>
            <Headset size={15} /> Get help with this order
          </Link>
        </aside>
      </div>
    </div>
  );
}

/** Return and review, for an item that has been delivered. */
function LineActions({ slug, className }: { slug: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Link href="/account/returns" className={buttonClasses("outline", "xs", "h-10 sm:h-8")}>
        <RotateCcw size={12} /> Return or exchange
      </Link>
      <Link href={`/p/${slug}#reviews`} className={buttonClasses("ghost", "xs", "h-10 sm:h-8")}>
        Write a review
      </Link>
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
    <div className="flex items-baseline justify-between gap-3">
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
