"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  MapPin,
  Package,
  RotateCcw,
  Truck,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { useStore } from "@/store/store";
import { customer, returnRequests } from "@/data/marketing";
import { cartCount } from "@/lib/pricing";
import { formatDate, formatINR, statusLabel } from "@/lib/utils";

export function AccountOverview() {
  const { orders, wishlist, cart, addresses, hydrated } = useStore();

  const active = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const latest = active[0] ?? orders[0];

  const stats = [
    { label: "Orders placed", value: hydrated ? orders.length : 0, href: "/account/orders", icon: Package },
    { label: "In transit", value: hydrated ? active.length : 0, href: "/account/orders", icon: Truck },
    { label: "Wishlist", value: hydrated ? wishlist.length : 0, href: "/wishlist", icon: Heart },
    { label: "In your bag", value: hydrated ? cartCount(cart) : 0, href: "/cart", icon: Package },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[28px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[34px]">
          Hello, {customer.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-[14px] text-ink-600">
          Everything about your orders, returns and saved details lives here.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-xl border border-hairline bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md"
          >
            <stat.icon size={17} className="text-brand-600" />
            <p className="mt-3 font-display text-[26px] leading-none tabular-nums text-ink-950">
              {stat.value}
            </p>
            <p className="mt-1.5 text-[12px] text-ink-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      {latest && (
        <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
          <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
              Latest order
            </h2>
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:underline"
            >
              All orders <ArrowRight size={13} />
            </Link>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline bg-brand-50 px-5 py-3.5">
            <div>
              <p className="font-mono text-[13px] font-semibold text-ink-950">{latest.number}</p>
              <p className="text-[12px] text-ink-600">
                Placed {formatDate(latest.placedAt, "short")} ·{" "}
                <span className="font-semibold text-brand-800">
                  {statusLabel(latest.status)}
                </span>
              </p>
            </div>
            <Link href={`/track/${latest.id}`} className={buttonClasses("primary", "sm")}>
              Track order
            </Link>
          </div>

          <ul className="divide-y divide-hairline">
            {latest.lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3.5 px-5 py-3.5">
                <Link
                  href={`/p/${line.slug}`}
                  className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-100"
                >
                  <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/p/${line.slug}`}
                    className="line-clamp-1 text-[13.5px] font-medium text-ink-950 hover:text-brand-700"
                  >
                    {line.title}
                  </Link>
                  <p className="text-[12px] text-ink-500">
                    {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-[13.5px] font-semibold tabular-nums text-ink-950">
                  {formatINR(line.price * line.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-hairline bg-surface p-5">
          <h2 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
            <MapPin size={14} className="text-brand-600" />
            Default address
          </h2>
          {hydrated && addresses[0] ? (
            <p className="text-[13px] leading-relaxed text-ink-600">
              <strong className="font-semibold text-ink-900">{addresses[0].fullName}</strong>
              <br />
              {addresses[0].line1}
              {addresses[0].line2 ? `, ${addresses[0].line2}` : ""}
              <br />
              {addresses[0].city}, {addresses[0].state} {addresses[0].pincode}
            </p>
          ) : (
            <p className="text-[13px] text-ink-500">No address saved yet.</p>
          )}
          <Link
            href="/account/addresses"
            className="mt-3 inline-block text-[12.5px] font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Manage addresses
          </Link>
        </section>

        <section className="rounded-xl border border-hairline bg-surface p-5">
          <h2 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
            <RotateCcw size={14} className="text-brand-600" />
            Recent returns
          </h2>
          {returnRequests.length > 0 ? (
            <ul className="space-y-2">
              {returnRequests.slice(0, 2).map((r) => (
                <li key={r.id} className="text-[13px] text-ink-600">
                  <span className="font-medium text-ink-900">{r.productTitle}</span>
                  <span className="block text-[12px] text-ink-500">
                    {statusLabel(r.status)} · {formatINR(r.refundAmount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-500">No returns in progress.</p>
          )}
          <Link
            href="/account/returns"
            className="mt-3 inline-block text-[12.5px] font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            View all returns
          </Link>
        </section>
      </div>
    </div>
  );
}
