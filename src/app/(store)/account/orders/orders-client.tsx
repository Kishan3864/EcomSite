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
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-[28px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[34px]">
          My orders
        </h1>
        <p className="mt-2 text-[14px] text-ink-600">
          Every order on your account, newest first.
        </p>
      </header>

      <div className="rail gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors",
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
          action={
            <Link href="/products" className={buttonClasses("primary", "md")}>
              Start shopping
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {filtered.map((order, i) => (
            <motion.li
              key={order.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-xl border border-hairline bg-surface"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-ink-400">Order</p>
                    <p className="font-mono text-[12.5px] font-semibold text-ink-950">
                      {order.number}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-ink-400">Placed</p>
                    <p className="text-[12.5px] text-ink-800">
                      {formatDate(order.placedAt, "short")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-ink-400">Total</p>
                    <p className="text-[12.5px] font-semibold tabular-nums text-ink-950">
                      {formatINR(order.totals.total)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em]",
                    STATUS_TONE[order.status] ?? "bg-ink-100 text-ink-600",
                  )}
                >
                  {statusLabel(order.status)}
                </span>
              </header>

              <ul className="divide-y divide-hairline">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex items-center gap-3.5 px-5 py-4">
                    <Link
                      href={`/p/${line.slug}`}
                      className="relative h-[68px] w-[58px] shrink-0 overflow-hidden rounded-lg bg-ink-100"
                    >
                      <Image src={line.image} alt="" fill sizes="58px" className="object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                        {line.brand}
                      </p>
                      <Link
                        href={`/p/${line.slug}`}
                        className="line-clamp-1 text-[13.5px] font-medium text-ink-950 hover:text-brand-700"
                      >
                        {line.title}
                      </Link>
                      <p className="text-[12px] text-ink-500">
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

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-5 py-3.5">
                <p className="text-[12.5px] text-ink-600">
                  {order.status === "delivered"
                    ? `Delivered on ${formatDate(order.estimatedDelivery, "short")}`
                    : `Arriving by ${formatDate(order.estimatedDelivery, "day")}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className={buttonClasses("outline", "sm")}
                  >
                    View details
                  </Link>
                  <Link href={`/track/${order.id}`} className={buttonClasses("primary", "sm")}>
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
