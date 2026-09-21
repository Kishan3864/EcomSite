"use client";

import { useMemo, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Package, RotateCcw, Star, Truck } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/motion";
import { StatusPill, orderTone } from "@/components/account/status-pill";

import { LiveRefresh } from "@/components/ui/live-refresh";
import { cn, formatDate, formatINR, statusLabel } from "@/lib/utils";
import { deliverySentence } from "@/lib/order-display";

const FILTERS: { id: "all" | OrderStatus; label: string }[] = [
  { id: "all", label: "All orders" },
  { id: "out_for_delivery", label: "In transit" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

export function OrdersClient({
  orders,
  toRate = {},
}: {
  orders: Order[];
  /** order id → products still to rate, only for orders that have any. */
  toRate?: Record<string, number>;
}) {

  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "out_for_delivery")
      return orders.filter((o) => !["delivered", "cancelled", "returned"].includes(o.status));
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  // An order still waiting on money changes on its own, so keep the list current.
  const settling = orders.some(
    (o) =>
      o.status !== "cancelled" &&
      (o.paymentStatus === "pending" ||
        o.paymentStatus === "verifying" ||
        o.paymentStatus === "failed"),
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {settling && <LiveRefresh seconds={10} />}
      <PageHeader
        className="pb-0 pt-1 sm:pb-0 sm:pt-0"
        crumbs={[
          { name: "Home", href: "/" },
          { name: "My account", href: "/account" },
          { name: "My orders", href: "/account/orders" },
        ]}
        title="My orders"
        description="Every order on your account, newest first."
      />

      {/* Edge to edge on phones, so a chip scrolls off screen rather than clipping. */}
      <div role="group" aria-label="Filter orders" className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cn(
              "h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[12.5px] font-medium ring-1 ring-inset transition-colors duration-200",
              filter === f.id
                ? "bg-ink-950 text-white ring-ink-950"
                : "bg-surface text-ink-700 ring-line-strong hover:bg-ink-50 hover:text-ink-950",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={24} />}
          title="No orders here yet"
          body="When you place an order it will appear here with live tracking and your invoice."
          action={
            <Link href="/products" className={buttonClasses("primary", "md")}>
              Start shopping
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3 sm:space-y-4">
          {filtered.map((order, i) => (
            <Reveal
              as="li"
              key={order.id}
              // Capped so a long history does not roll down the page as a wave.
              delay={Math.min(i, 5) * 0.06}
              className="card overflow-hidden"
            >
              {/* Head: number, status, date and total */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-ink-50/60 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                  <p className="font-mono text-[13px] font-semibold text-ink-950">{order.number}</p>
                  <StatusPill tone={orderTone(order.status)}>{statusLabel(order.status)}</StatusPill>
                </div>
                <dl className="flex items-center gap-4 text-[12.5px]">
                  <div className="flex items-center gap-1.5 text-ink-500">
                    <dt className="sr-only">Placed</dt>
                    <CalendarDays size={14} aria-hidden />
                    <dd className="tabular-nums">{formatDate(order.placedAt, "short")}</dd>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <dt className="text-ink-500">Total</dt>
                    <dd className="t-price text-[14px]">{formatINR(order.totals.total)}</dd>
                  </div>
                </dl>
              </div>

              {/* Lines */}
              <ul className="divide-y divide-line px-4 sm:px-5">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex items-center gap-3 py-3 sm:gap-4">
                    <Link
                      href={`/p/${line.slug}`}
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-b from-ink-50 to-ink-100 sm:h-16 sm:w-16"
                    >
                      <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      {line.brand && (
                        <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                          {line.brand}
                        </p>
                      )}
                      <Link
                        href={`/p/${line.slug}`}
                        className="line-clamp-1 text-[13.5px] font-medium text-ink-900 transition-colors duration-200 hover:text-brand-700"
                      >
                        {line.title}
                      </Link>
                      <p className="t-small mt-0.5 tabular-nums">
                        {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity} ·{" "}
                        {formatINR(line.price * line.quantity)}
                      </p>
                    </div>
                    {order.status === "delivered" && (
                      <Link href="/account/returns" className={buttonClasses("ghost", "xs", "hidden shrink-0 sm:inline-flex")}>
                        <RotateCcw size={14} /> Return
                      </Link>
                    )}
                  </li>
                ))}
              </ul>

              {/* Foot: delivery line, rating nudge and actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
                  <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-600">
                    <Truck size={14} aria-hidden className="shrink-0 text-ink-500" />
                    {deliverySentence(order)}
                  </p>
                  {toRate[order.id] > 0 && (
                    <Link
                      href={`/account/orders/${order.id}#rate`}
                      className="inline-flex items-center gap-1.5 py-1 text-[13px] font-semibold text-brand-700 underline-offset-2 hover:underline"
                    >
                      <Star size={14} className="fill-gold-400 text-gold-500" />
                      Rate your purchase
                      {toRate[order.id] > 1 && (
                        <span className="font-medium text-ink-500">· {toRate[order.id]} items</span>
                      )}
                    </Link>
                  )}
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className={buttonClasses("outline", "sm", "h-10 flex-1 sm:h-9 sm:flex-initial")}
                  >
                    View details
                  </Link>
                  {/* An unpaid UPI order's one remaining step is paying. */}
                  {order.paymentMethod.id === "upi" && order.paymentStatus === "pending" ? (
                    <Link
                      href={`/checkout/upi/${order.id}`}
                      className={buttonClasses("primary", "sm", "h-10 flex-1 sm:h-9 sm:flex-initial")}
                    >
                      Pay now <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <Link
                      href={`/track/${order.id}`}
                      className={buttonClasses("primary", "sm", "h-10 flex-1 sm:h-9 sm:flex-initial")}
                    >
                      Track <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}
