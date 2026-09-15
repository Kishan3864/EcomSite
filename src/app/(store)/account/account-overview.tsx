"use client";

import Image from "@/components/ui/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { useStore } from "@/store/store";
import type { Address, Order, ReturnRequest } from "@/lib/types";
import { cartCount } from "@/lib/pricing";
import { formatDate, formatINR, statusLabel } from "@/lib/utils";

/**
 * Orders, returns and addresses come from the account; the wishlist and bag
 * belong to this browser, so those two counts still come from the store.
 *
 * Every block on the seven account screens is the same object: a hairline
 * rectangle on the white sheet, a small-caps heading on a rule across the top,
 * and ruled rows inside it. Nothing lifts, nothing carries a shadow, and the
 * figures are set in the text face — Fraunces' numerals are proportional, so a
 * column of counts wandered left and right by a pixel or two a row.
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
    { label: "Orders placed", value: orders.length, href: "/account/orders" },
    { label: "In transit", value: active.length, href: "/account/orders" },
    { label: "Wishlist", value: hydrated ? wishlist.length : 0, href: "/wishlist" },
    { label: "In your bag", value: hydrated ? cartCount(cart) : 0, href: "/cart" },
  ];

  return (
    <div className="space-y-5 sm:space-y-7">
      <header>
        <span className="eyebrow">Your account</span>
        <h1 className="mt-2 font-display text-[22px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-3 sm:text-[32px]">
          Hello, {name.split(" ")[0]}
        </h1>
        <p className="mt-2 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:text-[15px]">
          Everything about your orders, returns and saved details lives here.
        </p>
      </header>

      <div className="tile-grid grid-cols-2 sm:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="tap group px-3.5 py-4 transition-colors duration-200 [@media(hover:hover)]:hover:bg-ink-50 sm:px-4 sm:py-5"
          >
            <p className="text-[22px] font-semibold leading-none tabular-nums text-ink-950 sm:text-[26px]">
              {stat.value}
            </p>
            <p className="mt-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              {stat.label}
            </p>
          </Link>
        ))}
      </div>

      {latest && (
        <section className="bg-surface">
          <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              Latest order
            </h2>
            <Link
              href="/account/orders"
              className="tap group -my-2 inline-flex items-center gap-1.5 py-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-colors duration-200 hover:text-gold-700 sm:my-0 sm:py-0"
            >
              All orders
              <ArrowRight
                size={13}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5">
            <div className="min-w-0">
              <p className="font-mono text-[13px] font-semibold text-ink-950">{latest.number}</p>
              <p className="mt-0.5 text-[13px] text-ink-500">
                Placed {formatDate(latest.placedAt, "short")} ·{" "}
                <span className="font-medium text-ink-900">{statusLabel(latest.status)}</span>
              </p>
            </div>
            <Link
              href={`/track/${latest.id}`}
              className={buttonClasses("primary", "sm", "h-10 sm:h-9")}
            >
              Track order
            </Link>
          </div>

          <ul>
            {latest.lines.map((line) => (
              <li
                key={line.id}
                className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5"
              >
                <Link
                  href={`/p/${line.slug}`}
                  className="relative h-16 w-14 shrink-0 overflow-hidden bg-ink-100"
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
                  <p className="mt-0.5 text-[13px] tabular-nums text-ink-500">
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

      {/* grid-cols-1 so an unbroken address line wraps rather than widening the page. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <section className="flex flex-col bg-surface">
          <h2 className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:px-5 sm:py-3.5">
            Default address
          </h2>
          <div className="flex flex-1 flex-col px-4 py-3.5 sm:px-5 sm:py-4">
            {addresses[0] ? (
              <p className="break-words text-[13px] leading-[1.6] text-ink-600">
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
              <p className="text-[13px] text-ink-500">No address saved yet.</p>
            )}
            <Link
              href="/account/addresses"
              className="tap mt-auto inline-flex h-10 items-center pt-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-colors duration-200 hover:text-gold-700 sm:h-auto sm:pt-4"
            >
              Manage addresses
            </Link>
          </div>
        </section>

        <section className="flex flex-col bg-surface">
          <h2 className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:px-5 sm:py-3.5">
            Recent returns
          </h2>
          <div className="flex flex-1 flex-col px-4 py-3.5 sm:px-5 sm:py-4">
            {returns.length > 0 ? (
              <ul className="space-y-2.5">
                {returns.slice(0, 2).map((r) => (
                  <li key={r.id} className="text-[13px] leading-[1.5]">
                    <span className="font-medium text-ink-900">{r.productTitle}</span>
                    <span className="mt-0.5 block tabular-nums text-ink-500">
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
              className="tap mt-auto inline-flex h-10 items-center pt-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-colors duration-200 hover:text-gold-700 sm:h-auto sm:pt-4"
            >
              View all returns
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
