"use client";

import Image from "@/components/ui/image";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  FileText,
  Headset,
  MapPin,
  PackageSearch,
  ReceiptText,
  RotateCcw,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Order } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader, Price } from "@/components/ui/primitives";
import { TrackingTimeline } from "@/components/account/tracking-timeline";
import { OrderReviewPanel } from "@/components/account/order-review-panel";
import { StatusPill, orderTone } from "@/components/account/status-pill";
import type { ReviewPanel } from "@/services/order-reviews";
import { cn, formatDateTime, formatINR, statusLabel } from "@/lib/utils";
import { courierLine, deliveryFact } from "@/lib/order-display";
import { useStore } from "@/store/store";

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

export function OrderDetailClient({ order, review }: { order: Order | null; review?: ReviewPanel | null }) {
  const { gstRegistered } = useStore().config;

  if (!order) {
    return (
      <EmptyState
        icon={<PackageSearch size={24} />}
        title="Order not found"
        body="We could not find that order on your account. It may have been placed as a guest with a different email."
        action={
          <Link href="/account/orders" className={buttonClasses("primary", "md")}>
            Back to my orders
          </Link>
        }
      />
    );
  }

  const when = deliveryFact(order, "short");

  const facts: { title: string; icon: LucideIcon; body: React.ReactNode }[] = [
    {
      title: "Delivery address",
      icon: MapPin,
      body: (
        <>
          <strong className="font-semibold text-ink-900">{order.address.fullName}</strong>
          <br />
          {order.address.line1}
          {order.address.line2 ? `, ${order.address.line2}` : ""}
          <br />
          <span className="tabular-nums">
            {order.address.city}, {order.address.state} {order.address.pincode}
          </span>
          <br />
          <span className="tabular-nums">{order.address.phone}</span>
        </>
      ),
    },
    {
      title: "Payment",
      icon: CreditCard,
      body: (
        <>
          <strong className="font-semibold text-ink-900">{order.paymentMethod.name}</strong>
          <br />
          {order.paymentMethod.description}
        </>
      ),
    },
    {
      title: "Shipping",
      icon: Truck,
      body: (
        <>
          {order.awb ? (
            <>
              <strong className="font-semibold text-ink-900">{order.courier}</strong>
              <br />
              <span className="tabular-nums">AWB {order.awb}</span>
            </>
          ) : ["confirmed", "packed", "pending"].includes(order.status) ? (
            "Tracking number appears here once the parcel is booked."
          ) : (
            // Past booking without an AWB: say what did happen.
            courierLine(order)
          )}
          <br />
          {order.delivery.name} · {when.label === "Expected by" ? "by" : when.label.toLowerCase()}{" "}
          {when.value}
        </>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <Link
        href="/account/orders"
        className="-my-1 inline-flex items-center gap-1.5 rounded-full py-1 pr-2 text-[12.5px] font-medium text-ink-600 transition-colors duration-200 hover:text-brand-700"
      >
        <ArrowLeft size={14} /> All orders
      </Link>

      <PageHeader
        className="pb-0 pt-0 sm:pb-0 sm:pt-0"
        title="Order details"
        description={
          <span className="tabular-nums">
            Placed on {formatDateTime(order.placedAt)} · {order.lines.length} item
            {order.lines.length > 1 ? "s" : ""} · {formatINR(order.totals.total)}
          </span>
        }
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12.5px] font-semibold text-ink-900">{order.number}</span>
            <StatusPill tone={orderTone(order.status)}>{statusLabel(order.status)}</StatusPill>
          </span>
        }
        action={
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
        }
      />

      {review && <OrderReviewPanel panel={review} />}

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <section className="card overflow-hidden">
            <CardHead icon={PackageSearch}>Shipment progress</CardHead>
            <div className="px-4 py-5 sm:px-6 sm:py-6">
              <TrackingTimeline events={order.tracking} />
            </div>
          </section>

          <section className="card overflow-hidden">
            <CardHead icon={ReceiptText}>Items in this order</CardHead>
            <ul className="divide-y divide-line">
              {order.lines.map((line) => (
                // Wraps on a phone so the delivered-item action gets its own row.
                <li key={line.id} className="flex flex-wrap gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-5">
                  <Link
                    href={`/p/${line.slug}`}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gradient-to-b from-ink-50 to-ink-100 sm:h-20 sm:w-20"
                  >
                    <Image src={line.image} alt="" fill sizes="80px" className="object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    {line.brand && (
                      <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                        {line.brand}
                      </p>
                    )}
                    <Link
                      href={`/p/${line.slug}`}
                      className="line-clamp-2 text-[13.5px] font-medium leading-[1.4] text-ink-900 transition-colors duration-200 hover:text-brand-700"
                    >
                      {line.title}
                    </Link>
                    <p className="t-small mt-0.5 tabular-nums">
                      {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
                    </p>
                    <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1" />
                    {order.status === "delivered" && <LineActions className="mt-2.5 hidden sm:flex" />}
                  </div>
                  <p className="t-price shrink-0 text-[14px]">{formatINR(line.price * line.quantity)}</p>
                  {order.status === "delivered" && <LineActions className="w-full pl-[76px] sm:hidden" />}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Phones stack; tablets pair up; wide screens use a side column. */}
        <aside className="grid min-w-0 grid-cols-1 content-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <section className="card overflow-hidden sm:col-span-2 xl:col-span-1">
            <CardHead icon={ReceiptText}>Payment summary</CardHead>
            <dl className="divide-y divide-line px-4 sm:px-5">
              <Row label="Items total" value={formatINR(order.totals.mrpTotal)} />
              {order.totals.productDiscount > 0 && (
                <Row label="Discount" value={`− ${formatINR(order.totals.productDiscount)}`} save />
              )}
              <Row label="Delivery" value={order.totals.shipping === 0 ? "Free" : formatINR(order.totals.shipping)} />
              {gstRegistered && order.totals.tax > 0 && (
                <Row label="GST (included)" value={formatINR(order.totals.tax)} muted />
              )}
            </dl>
            <div className="flex items-baseline justify-between gap-3 border-t border-line bg-ink-50/60 px-4 py-3.5 sm:px-5">
              <span className="text-[13px] font-semibold text-ink-900">Total</span>
              <span className="t-price text-[18px]">{formatINR(order.totals.total)}</span>
            </div>
          </section>

          {facts.map((fact) => (
            <section key={fact.title} className="card overflow-hidden">
              <CardHead icon={fact.icon}>{fact.title}</CardHead>
              {/* Long AWBs and unbroken address lines wrap inside the column. */}
              <p className="t-body break-words px-4 py-3.5 text-[13px] sm:px-5">{fact.body}</p>
            </section>
          ))}

          <Link href="/contact" className={buttonClasses("outline", "md", "w-full sm:col-span-2 xl:col-span-1")}>
            <Headset size={16} /> Get help with this order
          </Link>
        </aside>
      </div>
    </div>
  );
}

/** Return, for a delivered item. Reviewing lives in the panel at the top. */
function LineActions({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Link href="/account/returns" className={buttonClasses("outline", "xs", "h-10 sm:h-8")}>
        <RotateCcw size={14} /> Return or exchange
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
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className={cn("text-[13px]", muted ? "text-ink-500" : "text-ink-600")}>{label}</dt>
      <dd
        className={cn(
          "text-[13px] tabular-nums",
          save ? "font-semibold text-sale-600" : muted ? "text-ink-500" : "font-medium text-ink-900",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
