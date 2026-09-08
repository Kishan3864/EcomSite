"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Headset,
  MapPin,
  Package,
  RotateCcw,
  Truck,
  Wallet,
} from "lucide-react";
import type { Order } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, Price } from "@/components/ui/primitives";
import { TrackingTimeline } from "@/components/account/tracking-timeline";
import { formatDate, formatDateTime, formatINR } from "@/lib/utils";

export function OrderDetailClient({ order }: { order: Order | null }) {

  if (!order) {
    return (
      <EmptyState
        icon={<Package size={26} />}
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

  return (
    <div className="space-y-5">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-600 transition-colors hover:text-brand-700"
      >
        <ArrowLeft size={14} /> All orders
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] leading-tight tracking-[-0.025em] text-ink-950 sm:text-[32px]">
            Order {order.number}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-ink-600">
            Placed on {formatDateTime(order.placedAt)} · {order.lines.length} item
            {order.lines.length > 1 ? "s" : ""} · {formatINR(order.totals.total)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download size={14} /> Invoice
          </Button>
          <Link href={`/track/${order.id}`} className={buttonClasses("primary", "sm")}>
            <Truck size={14} /> Track
          </Link>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
            <h2 className="border-b border-hairline px-5 py-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
              Items in this order
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
                    {order.status === "delivered" && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <Link href="/account/returns" className={buttonClasses("outline", "xs")}>
                          <RotateCcw size={12} /> Return or exchange
                        </Link>
                        <Link
                          href={`/p/${line.slug}#reviews`}
                          className={buttonClasses("ghost", "xs")}
                        >
                          Write a review
                        </Link>
                      </div>
                    )}
                  </div>
                  <p className="shrink-0 text-[14px] font-semibold tabular-nums text-ink-950">
                    {formatINR(line.price * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-hairline bg-surface p-5">
            <h2 className="mb-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
              Shipment progress
            </h2>
            <TrackingTimeline events={order.tracking} />
          </section>
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
            <h2 className="border-b border-hairline px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Payment summary
            </h2>
            <dl className="space-y-2 px-4 py-3.5 text-[13px]">
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
              <span className="text-[13.5px] font-semibold text-ink-950">Total</span>
              <span className="text-[16px] font-semibold tabular-nums text-ink-950">
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
              <p className="text-[12.5px] leading-relaxed text-ink-600">{card.body}</p>
            </section>
          ))}

          <Link href="/contact" className={buttonClasses("outline", "md", "w-full")}>
            <Headset size={15} /> Get help with this order
          </Link>
        </aside>
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
