"use client";

import Image from "@/components/ui/image";
import Link from "next/link";
import { ArrowLeft, FileText, Headset, RotateCcw, Truck } from "lucide-react";
import type { Order } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, Price } from "@/components/ui/primitives";
import { TrackingTimeline } from "@/components/account/tracking-timeline";
import { cn, formatDateTime, formatINR } from "@/lib/utils";
import { courierLine, deliveryFact } from "@/lib/order-display";

/** The heading every block on the account screens wears. */
const PANEL_HEAD =
  "px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:px-5 sm:py-3.5";

export function OrderDetailClient({ order }: { order: Order | null }) {

  if (!order) {
    return (
      <EmptyState
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

  const when = deliveryFact(order, "short");

  /* The three standing facts about the parcel. They are rows in one block
     rather than three small cards, which is what stops the right-hand column
     reading as a stack of widgets. */
  const facts: { title: string; body: React.ReactNode }[] = [
    {
      title: "Delivery address",
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
            // Past the point of booking without an AWB: say what did happen
            // rather than promising a tracking number that is not coming.
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
    <div className="space-y-5 sm:space-y-6">
      <Link
        href="/account/orders"
        className="tap -my-2 inline-flex items-center gap-1.5 py-2 text-[13px] font-medium text-ink-600 transition-colors duration-200 hover:text-brand-700 sm:my-0 sm:py-0"
      >
        <ArrowLeft size={14} /> All orders
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          {/* The number leads, in the text face with tabular figures: Fraunces
              sets its numerals proportionally and an order number is the one
              string on this page somebody reads back over the phone. */}
          <span className="eyebrow tabular-nums">{order.number}</span>
          <h1 className="mt-2 font-display text-[22px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-3 sm:text-[32px]">
            Order details
          </h1>
          <p className="mt-2 text-[13px] leading-[1.55] tabular-nums text-ink-600 sm:text-[14px]">
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
          <section className="bg-surface shadow-sm">
            <h2 className={PANEL_HEAD}>Items in this order</h2>
            <ul>
              {order.lines.map((line) => (
                // Wraps on a phone so the delivered-item actions can take a row
                // of their own instead of squeezing beside the line total.
                <li
                  key={line.id}
                  className="flex flex-wrap gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-5"
                >
                  <Link
                    href={`/p/${line.slug}`}
                    className="relative h-[72px] w-[58px] shrink-0 overflow-hidden bg-ink-100 sm:h-20 sm:w-16"
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
                    {line.brand && <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">{line.brand}</p>}
                    <Link
                      href={`/p/${line.slug}`}
                      className="mt-0.5 line-clamp-2 text-[13.5px] font-medium leading-[1.4] text-ink-900 transition-colors duration-200 hover:text-brand-700"
                    >
                      {line.title}
                    </Link>
                    <p className="mt-1 text-[13px] tabular-nums text-ink-500">
                      {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
                    </p>
                    <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1.5" />
                    {order.status === "delivered" && (
                      <LineActions slug={line.slug} className="mt-3 hidden sm:flex" />
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

          <section className="bg-surface shadow-sm">
            <h2 className={PANEL_HEAD}>Shipment progress</h2>
            <div className="px-4 py-5 sm:px-5 sm:py-6">
              <TrackingTimeline events={order.tracking} />
            </div>
          </section>
        </div>

        {/* Phones stack these; tablets pair them up rather than stretch each
            block across the full width. grid-cols-1 and min-w-0 let a long AWB
            wrap inside its column instead of stretching it. */}
        <aside className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:block lg:space-y-4">
          <section className="bg-surface shadow-sm">
            <h2 className={PANEL_HEAD}>Payment summary</h2>
            {/* A ledger, the same one the homepage sets under a product: label
                left, figure right, a rule between every pair. */}
            <dl className="px-4 sm:px-5">
              <Row label="Items total" value={formatINR(order.totals.mrpTotal)} />
              {order.totals.productDiscount > 0 && (
                <Row
                  label="Discount"
                  value={`− ${formatINR(order.totals.productDiscount)}`}
                  save
                />
              )}
              <Row
                label="Delivery"
                value={order.totals.shipping === 0 ? "Free" : formatINR(order.totals.shipping)}
              />
              <Row label="GST (included)" value={formatINR(order.totals.tax)} muted />
            </dl>
            <div className="flex items-baseline justify-between gap-3 px-4 py-3.5 sm:px-5">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950">
                Total
              </span>
              <span className="text-[16px] font-semibold tabular-nums text-ink-950">
                {formatINR(order.totals.total)}
              </span>
            </div>
          </section>

          {facts.map((fact) => (
            <section key={fact.title} className="bg-surface shadow-sm">
              <h2 className={PANEL_HEAD}>{fact.title}</h2>
              {/* Long AWBs and unbroken address lines wrap instead of widening
                  the column. */}
              <p className="break-words px-4 py-3.5 text-[13px] leading-[1.6] text-ink-600 sm:px-5 sm:py-4">
                {fact.body}
              </p>
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
    <div className="flex items-baseline justify-between gap-3 py-3">
      <dt className={cn("text-[13px]", muted ? "text-ink-500" : "text-ink-600")}>{label}</dt>
      <dd
        className={cn(
          "text-[13px] tabular-nums",
          save
            ? "font-semibold text-sale-600"
            : muted
              ? "text-ink-500"
              : "font-medium text-ink-900",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
