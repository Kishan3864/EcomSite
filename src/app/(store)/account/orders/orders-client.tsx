"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Package, RotateCcw, Star } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";

import { cn, formatDate, formatINR, statusLabel } from "@/lib/utils";

const FILTERS: { id: "all" | OrderStatus; label: string }[] = [
  { id: "all", label: "All orders" },
  { id: "out_for_delivery", label: "In transit" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const STATUS_TONE: Record<string, string> = {
  confirmed: "bg-gold-100 text-gold-800",
  packed: "bg-gold-100 text-gold-800",
  shipped: "bg-brand-100 text-brand-800",
  out_for_delivery: "bg-brand-100 text-brand-800",
  delivered: "bg-brand-100 text-brand-800",
  cancelled: "bg-sale-100 text-sale-700",
  returned: "bg-ink-100 text-ink-600",
};

export function OrdersClient({ orders }: { orders: Order[] }) {

  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "out_for_delivery")
      return orders.filter((o) => !["delivered", "cancelled", "returned"].includes(o.status));
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <h1 className="font-display text-[22px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[34px]">
          My orders
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-600 sm:mt-2 sm:text-[14px]">
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
              "tap h-10 whitespace-nowrap rounded-full border px-3.5 py-2 text-[12px] font-medium transition-colors sm:h-auto sm:text-[12.5px]",
              filter === f.id
                ? "border-brand-900 bg-brand-900 text-white"
                : "border-ink-200 bg-surface text-ink-700 hover:border-ink-400",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={26} />}
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
        <ul className="space-y-3 sm:space-y-4">
          {filtered.map((order, i) => (
            <motion.li
              key={order.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-xl border border-hairline bg-surface"
            >
              {/* On a phone the status holds the top-right corner and the figures
                  wrap beside it. min-w-min keeps the order number whole: at 320px a
                  long status cannot share its line, so the badge drops below. */}
              <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 border-b border-hairline bg-canvas px-4 py-2.5 sm:items-center sm:gap-3 sm:px-5 sm:py-3.5">
                <div className="flex min-w-min flex-1 flex-wrap items-center gap-x-4 gap-y-1 sm:flex-initial sm:gap-x-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-ink-400">Order</p>
                    <p className="font-mono text-[12px] font-semibold text-ink-950 sm:text-[12.5px]">
                      {order.number}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-ink-400">Placed</p>
                    <p className="text-[12px] text-ink-800 sm:text-[12.5px]">
                      {formatDate(order.placedAt, "short")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-ink-400">Total</p>
                    <p className="text-[12px] font-semibold tabular-nums text-ink-950 sm:text-[12.5px]">
                      {formatINR(order.totals.total)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em]",
                    STATUS_TONE[order.status] ?? "bg-ink-100 text-ink-600",
                  )}
                >
                  {statusLabel(order.status)}
                </span>
              </header>

              <ul className="divide-y divide-hairline">
                {order.lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-center gap-3 px-4 py-3 sm:gap-3.5 sm:px-5 sm:py-4"
                  >
                    <Link
                      href={`/p/${line.slug}`}
                      className="relative h-[60px] w-[52px] shrink-0 overflow-hidden rounded-lg bg-ink-100 sm:h-[68px] sm:w-[58px]"
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
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                        {line.brand}
                      </p>
                      <Link
                        href={`/p/${line.slug}`}
                        className="line-clamp-1 text-[13px] font-medium text-ink-950 hover:text-brand-700 sm:text-[13.5px]"
                      >
                        {line.title}
                      </Link>
                      <p className="text-[11.5px] text-ink-500 sm:text-[12px]">
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
              <footer className="flex flex-wrap items-center justify-between gap-2.5 border-t border-hairline px-4 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
                <p className="text-[12px] text-ink-600 sm:text-[12.5px]">
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
                  <Link
                    href={`/track/${order.id}`}
                    className={buttonClasses("primary", "sm", "h-10 flex-1 sm:h-9 sm:flex-initial")}
                  >
                    Track <ArrowRight size={14} />
                  </Link>
                </div>
              </footer>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
