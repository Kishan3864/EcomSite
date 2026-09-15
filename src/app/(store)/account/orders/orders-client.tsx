"use client";

import { useMemo, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { ArrowRight, RotateCcw, Star } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/motion";

import { LiveRefresh } from "@/components/ui/live-refresh";
import { cn, formatDate, formatINR, statusLabel } from "@/lib/utils";

const FILTERS: { id: "all" | OrderStatus; label: string }[] = [
  { id: "all", label: "All orders" },
  { id: "out_for_delivery", label: "In transit" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

/**
 * An order that is over — cancelled, or sent back — steps out of the ink and
 * is set in grey. Everything still in play is stated at full strength. The
 * tinted lozenges this replaces spent three colours saying what one word says,
 * and one of them was the rose the shop keeps for a price coming down.
 */
const SPENT: OrderStatus[] = ["cancelled", "returned"];

export function OrdersClient({ orders }: { orders: Order[] }) {

  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "out_for_delivery")
      return orders.filter((o) => !["delivered", "cancelled", "returned"].includes(o.status));
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  // An order still waiting on money changes without anyone here doing
  // anything, so the list keeps itself current while one is outstanding.
  const settling = orders.some(
    (o) =>
      o.status !== "cancelled" &&
      (o.paymentStatus === "pending" ||
        o.paymentStatus === "verifying" ||
        o.paymentStatus === "failed"),
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      {settling && <LiveRefresh seconds={10} />}
      <header>
        <span className="eyebrow">Your account</span>
        <h1 className="mt-2 font-display text-[22px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-3 sm:text-[32px]">
          My orders
        </h1>
        <p className="mt-2 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:text-[15px]">
          Every order on your account, newest first.
        </p>
      </header>

      {/* Edge to edge on phones, so a chip scrolls off the screen rather than
          being clipped at the gutter. */}
      <div className="rail -mx-3 gap-2 px-3 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "tap h-10 whitespace-nowrap px-4 text-[11.5px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200 sm:h-9 sm:text-[12px]",
              filter === f.id
                ? "bg-brand-700 text-white"
                : "bg-surface text-ink-600 hover:text-ink-950",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No orders here yet"
          body="When you place an order it will appear here with live tracking and your invoice."
          className="px-4 py-8 sm:px-6 sm:py-16"
          action={
            <Link href="/products" className={buttonClasses("primary", "md")}>
              Start shopping
            </Link>
          }
        />
      ) : (
        <ul className="bg-surface shadow-sm">
          {filtered.map((order, i) => (
            <Reveal
              as="li"
              key={order.id}
              // Capped at the sixth row: a delay that keeps climbing turns a
              // long history into a wave rolling down the page.
              delay={Math.min(i, 5) * 0.06}
              className="px-4 py-4 sm:px-5 sm:py-5"
            >
              {/* min-w-min keeps the order number whole: at 320px a long status
                  cannot share its line, so it drops below instead. */}
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-min flex-1 flex-wrap gap-x-5 gap-y-2 sm:gap-x-7">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      Order
                    </p>
                    <p className="mt-1 font-mono text-[13px] font-semibold text-ink-950">
                      {order.number}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      Placed
                    </p>
                    <p className="mt-1 text-[13px] tabular-nums text-ink-900">
                      {formatDate(order.placedAt, "short")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      Total
                    </p>
                    <p className="mt-1 text-[13px] font-semibold tabular-nums text-ink-950">
                      {formatINR(order.totals.total)}
                    </p>
                  </div>
                </div>
                <p
                  className={cn(
                    "shrink-0 whitespace-nowrap pt-0.5 text-[11.5px] font-semibold uppercase tracking-[0.12em]",
                    SPENT.includes(order.status) ? "text-ink-500" : "text-ink-950",
                  )}
                >
                  {statusLabel(order.status)}
                </p>
              </div>

              <ul className="mt-4 space-y-3.5">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex items-center gap-3 sm:gap-4">
                    <Link
                      href={`/p/${line.slug}`}
                      className="relative h-[60px] w-[52px] shrink-0 overflow-hidden bg-ink-100 sm:h-[68px] sm:w-[58px]"
                    >
                      <Image
                        src={line.image}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 58px, 52px"
                        className="object-cover"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                        {line.brand}
                      </p>
                      <Link
                        href={`/p/${line.slug}`}
                        className="mt-0.5 line-clamp-1 text-[13.5px] font-medium text-ink-900 transition-colors duration-200 hover:text-brand-700"
                      >
                        {line.title}
                      </Link>
                      <p className="mt-0.5 text-[13px] tabular-nums text-ink-500">
                        {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity} ·{" "}
                        {formatINR(line.price * line.quantity)}
                      </p>
                    </div>
                    {order.status === "delivered" && (
                      <div className="hidden shrink-0 gap-2 sm:flex">
                        <Link
                          href={`/p/${line.slug}#reviews`}
                          className={buttonClasses("ghost", "xs")}
                        >
                          <Star size={12} /> Rate
                        </Link>
                        <Link href="/account/returns" className={buttonClasses("ghost", "xs")}>
                          <RotateCcw size={12} /> Return
                        </Link>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {/* Phones give the two actions a full-width row of their own. */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3.5">
                <p className="text-[13px] text-ink-600">
                  {order.status === "delivered"
                    ? `Delivered on ${formatDate(order.estimatedDelivery, "short")}`
                    : `Arriving by ${formatDate(order.estimatedDelivery, "day")}`}
                </p>
                <div className="flex w-full gap-2 sm:w-auto sm:flex-wrap">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className={buttonClasses("outline", "sm", "h-10 flex-1 sm:h-9 sm:flex-initial")}
                  >
                    View details
                  </Link>
                  {/* An unpaid UPI order has one thing left to do, and this is
                      where a customer comes back to do it. Tracking an order
                      that has not been paid for would only show them nothing. */}
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
