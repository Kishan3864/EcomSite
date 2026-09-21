"use client";

import Image from "@/components/ui/image";
import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  Heart,
  LifeBuoy,
  MapPin,
  Package,
  RotateCcw,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/primitives";
import { StatusPill, orderTone } from "@/components/account/status-pill";
import { useStore } from "@/store/store";
import type { Address, Order, ReturnRequest } from "@/lib/types";
import { cartCount } from "@/lib/pricing";
import { formatDate, formatINR, statusLabel } from "@/lib/utils";

/**
 * The account dashboard. Orders, returns and addresses come from the account;
 * the wishlist and bag belong to this browser, so those counts come from the store.
 */
export function AccountOverview({
  name,
  orders,
  returns,
  addresses,
}: {
  name: string;
  orders: Order[];
  returns: ReturnRequest[];
  addresses: Address[];
}) {
  const { wishlist, cart, unavailable, hydrated } = useStore();

  const active = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const latest = active[0] ?? orders[0];

  const stats = [
    { label: "Orders placed", value: orders.length, href: "/account/orders", icon: Package },
    { label: "In transit", value: active.length, href: "/account/orders", icon: Truck },
    { label: "Wishlist", value: hydrated ? wishlist.length : 0, href: "/wishlist", icon: Heart },
    {
      label: "In your bag",
      value: hydrated ? cartCount(cart.filter((l) => !unavailable.includes(l.productId))) : 0,
      href: "/cart",
      icon: ShoppingBag,
    },
  ];

  const actions = [
    { label: "Track an order", href: "/track", icon: Truck },
    { label: "Returns and refunds", href: "/account/returns", icon: RotateCcw },
    { label: "Saved addresses", href: "/account/addresses", icon: MapPin },
    { label: "Payment preferences", href: "/account/settings#payment", icon: CreditCard },
    { label: "Help and support", href: "/contact", icon: LifeBuoy },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        className="pb-0 pt-1 sm:pb-0 sm:pt-0"
        crumbs={[
          { name: "Home", href: "/" },
          { name: "My account", href: "/account" },
        ]}
        title={`Hello, ${name.split(" ")[0]}`}
        description="Everything about your orders, returns and saved details lives here."
      />

      {/* Stat cards */}
      <ul className="reveal grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link
              href={stat.href}
              className="card card-interactive group flex h-full flex-col gap-4 p-4 sm:p-5"
            >
              <span className="flex items-center justify-between">
                <span className="icon-tile icon-tile-sm">
                  <stat.icon size={16} aria-hidden />
                </span>
                <ArrowRight
                  size={14}
                  aria-hidden
                  className="text-ink-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-700"
                />
              </span>
              <span>
                <span className="t-price block text-[24px] leading-none sm:text-[28px]">{stat.value}</span>
                <span className="t-label mt-2 block">{stat.label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Quick actions */}
      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="t-label mb-2.5">
          Quick actions
        </h2>
        <ul className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {actions.map((action) => (
            <li key={action.href} className="shrink-0">
              <Link
                href={action.href}
                className="group inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-surface pl-1.5 pr-4 text-[12.5px] font-medium text-ink-800 transition-colors duration-200 hover:border-brand-300 hover:text-brand-800"
              >
                <span className="icon-tile h-7 w-7 rounded-full">
                  <action.icon size={14} aria-hidden />
                </span>
                {action.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {latest && (
        <section className="card overflow-hidden" aria-labelledby="latest-order">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <h2 id="latest-order" className="t-h3">
              Latest order
            </h2>
            <Link
              href="/account/orders"
              className="group inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              All orders
              <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-[13px] font-semibold text-ink-950">{latest.number}</p>
                <StatusPill tone={orderTone(latest.status)}>{statusLabel(latest.status)}</StatusPill>
              </div>
              <p className="t-small mt-1">Placed {formatDate(latest.placedAt, "short")}</p>
            </div>
            <Link href={`/track/${latest.id}`} className={buttonClasses("primary", "sm", "h-10 w-full sm:h-9 sm:w-auto")}>
              <Truck size={14} /> Track order
            </Link>
          </div>

          <ul className="divide-y divide-line border-t border-line">
            {latest.lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
                <Link
                  href={`/p/${line.slug}`}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-b from-ink-50 to-ink-100"
                >
                  <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/p/${line.slug}`}
                    className="line-clamp-1 text-[13.5px] font-medium text-ink-900 transition-colors duration-200 hover:text-brand-700"
                  >
                    {line.title}
                  </Link>
                  <p className="t-small mt-0.5 tabular-nums">
                    {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
                  </p>
                </div>
                <p className="t-price shrink-0 text-[13.5px]">{formatINR(line.price * line.quantity)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* grid-cols-1 so an unbroken address line wraps rather than widening the page. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <section className="card flex flex-col p-4 sm:p-5" aria-labelledby="default-address">
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-sm">
              <MapPin size={16} aria-hidden />
            </span>
            <h2 id="default-address" className="t-h3">
              Default address
            </h2>
          </div>
          <div className="mt-3 flex-1">
            {addresses[0] ? (
              <p className="t-body break-words text-[13px]">
                <strong className="font-semibold text-ink-900">{addresses[0].fullName}</strong>
                <br />
                {addresses[0].line1}
                {addresses[0].line2 ? `, ${addresses[0].line2}` : ""}
                <br />
                <span className="tabular-nums">
                  {addresses[0].city}, {addresses[0].state} {addresses[0].pincode}
                </span>
              </p>
            ) : (
              <p className="t-small">No address saved yet.</p>
            )}
          </div>
          <Link
            href="/account/addresses"
            className="group mt-4 inline-flex items-center gap-1.5 self-start text-[12.5px] font-semibold text-brand-700 hover:underline"
          >
            Manage addresses
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </section>

        <section className="card flex flex-col p-4 sm:p-5" aria-labelledby="recent-returns">
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-sm">
              <RotateCcw size={16} aria-hidden />
            </span>
            <h2 id="recent-returns" className="t-h3">
              Recent returns
            </h2>
          </div>
          <div className="mt-3 flex-1">
            {returns.length > 0 ? (
              <ul className="space-y-2.5">
                {returns.slice(0, 2).map((r) => (
                  <li key={r.id} className="text-[13px] leading-[1.5]">
                    <span className="line-clamp-1 font-medium text-ink-900">{r.productTitle}</span>
                    <span className="t-small block tabular-nums">
                      {statusLabel(r.status)} · {formatINR(r.refundAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-small">No returns in progress.</p>
            )}
          </div>
          <Link
            href="/account/returns"
            className="group mt-4 inline-flex items-center gap-1.5 self-start text-[12.5px] font-semibold text-brand-700 hover:underline"
          >
            View all returns
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </section>
      </div>
    </div>
  );
}
