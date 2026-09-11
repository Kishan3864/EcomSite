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
import type { Address, Order, ReturnRequest } from "@/lib/types";
import { cartCount } from "@/lib/pricing";
import { formatDate, formatINR, statusLabel } from "@/lib/utils";

/**
 * Orders, returns and addresses come from the account; the wishlist and bag
 * belong to this browser, so those two counts still come from the store.
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
  const { wishlist, cart, hydrated } = useStore();

  const active = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const latest = active[0] ?? orders[0];

  const stats = [
    { label: "Orders placed", value: orders.length, href: "/account/orders", icon: Package },
    { label: "In transit", value: active.length, href: "/account/orders", icon: Truck },
    { label: "Wishlist", value: hydrated ? wishlist.length : 0, href: "/wishlist", icon: Heart },
    { label: "In your bag", value: hydrated ? cartCount(cart) : 0, href: "/cart", icon: Package },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <header>
        <h1 className="font-display text-[22px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[34px]">
          Hello, {name.split(" ")[0]}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-600 sm:mt-2 sm:text-[14px]">
          Everything about your orders, returns and saved details lives here.
        </p>
      </header>

      {/* Phones lay each tile out sideways, icon beside the figure, so the four
          fit in two short rows; from sm up they stand as four columns. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="tap group flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md sm:block sm:p-4"
          >
            <stat.icon size={17} className="shrink-0 text-brand-600" />
            <div className="min-w-0 sm:mt-3">
              <p className="font-display text-[20px] leading-none tabular-nums text-ink-950 sm:text-[26px]">
                {stat.value}
              </p>
              <p className="mt-1 text-[11.5px] text-ink-500 sm:mt-1.5 sm:text-[12px]">
                {stat.label}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {latest && (
        <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
          <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-5 sm:py-4">
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:text-[12px]">
              Latest order
            </h2>
            <Link
              href="/account/orders"
              className="-my-2 inline-flex items-center gap-1 py-2 text-[12px] font-semibold text-brand-700 hover:underline sm:my-0 sm:py-0 sm:text-[12.5px]"
            >
              All orders <ArrowRight size={13} />
            </Link>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-brand-50 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5">
            <div className="min-w-0">
              <p className="font-mono text-[12.5px] font-semibold text-ink-950 sm:text-[13px]">
                {latest.number}
              </p>
              <p className="text-[11.5px] text-ink-600 sm:text-[12px]">
                Placed {formatDate(latest.placedAt, "short")} ·{" "}
                <span className="font-semibold text-brand-800">
                  {statusLabel(latest.status)}
                </span>
              </p>
            </div>
            <Link
              href={`/track/${latest.id}`}
              className={buttonClasses("primary", "sm", "h-10 sm:h-9")}
            >
              Track order
            </Link>
          </div>

          <ul className="divide-y divide-hairline">
            {latest.lines.map((line) => (
              <li
                key={line.id}
                className="flex items-center gap-3 px-4 py-3 sm:gap-3.5 sm:px-5 sm:py-3.5"
              >
                <Link
                  href={`/p/${line.slug}`}
                  className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-100"
                >
                  <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/p/${line.slug}`}
                    className="line-clamp-1 text-[13px] font-medium text-ink-950 hover:text-brand-700 sm:text-[13.5px]"
                  >
                    {line.title}
                  </Link>
                  <p className="text-[11.5px] text-ink-500 sm:text-[12px]">
                    {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-950 sm:text-[13.5px]">
                  {formatINR(line.price * line.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* grid-cols-1 so an unbroken address line wraps rather than widening the page. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
          <h2 className="mb-2.5 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:mb-3 sm:text-[12px]">
            <MapPin size={14} className="text-brand-600" />
            Default address
          </h2>
          {addresses[0] ? (
            <p className="break-words text-[12.5px] leading-relaxed text-ink-600 sm:text-[13px]">
              <strong className="font-semibold text-ink-900">{addresses[0].fullName}</strong>
              <br />
              {addresses[0].line1}
              {addresses[0].line2 ? `, ${addresses[0].line2}` : ""}
              <br />
              {addresses[0].city}, {addresses[0].state} {addresses[0].pincode}
            </p>
          ) : (
            <p className="text-[12.5px] text-ink-500 sm:text-[13px]">No address saved yet.</p>
          )}
          <Link
            href="/account/addresses"
            className="mt-1 inline-block py-2 text-[12px] font-semibold text-brand-700 underline-offset-4 hover:underline sm:mt-3 sm:py-0 sm:text-[12.5px]"
          >
            Manage addresses
          </Link>
        </section>

        <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
          <h2 className="mb-2.5 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:mb-3 sm:text-[12px]">
            <RotateCcw size={14} className="text-brand-600" />
            Recent returns
          </h2>
          {returns.length > 0 ? (
            <ul className="space-y-2">
              {returns.slice(0, 2).map((r) => (
                <li key={r.id} className="text-[12.5px] text-ink-600 sm:text-[13px]">
                  <span className="font-medium text-ink-900">{r.productTitle}</span>
                  <span className="block text-[11.5px] text-ink-500 sm:text-[12px]">
                    {statusLabel(r.status)} · {formatINR(r.refundAmount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-500 sm:text-[13px]">No returns in progress.</p>
          )}
          <Link
            href="/account/returns"
            className="mt-1 inline-block py-2 text-[12px] font-semibold text-brand-700 underline-offset-4 hover:underline sm:mt-3 sm:py-0 sm:text-[12.5px]"
          >
            View all returns
          </Link>
        </section>
      </div>
    </div>
  );
}
