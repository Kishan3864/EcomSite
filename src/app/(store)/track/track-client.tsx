"use client";

import { useActionState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  Ban,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  Headset,
  House,
  MapPin,
  Navigation,
  PackageCheck,
  PackageSearch,
  ReceiptText,
  RotateCcw,
  Search,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Order } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { Field, Input } from "@/components/ui/field";
import { Reveal } from "@/components/ui/motion";
import { TrackingTimeline } from "@/components/account/tracking-timeline";
import { OrderReviewPanel } from "@/components/account/order-review-panel";
import { StatusPill, orderTone } from "@/components/account/status-pill";
import type { ReviewPanel } from "@/services/order-reviews";
import { trackOrderAction } from "@/services/commerce";
import { courierLine, deliveryFact } from "@/lib/order-display";
import { formatINR, statusLabel } from "@/lib/utils";
import { Form } from "@/components/ui/form";

/* ------------------------------ Lookup ----------------------------- */

function TrackButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-5 w-full" loading={pending}>
      <Search size={16} /> {pending ? "Looking it up…" : "Track my order"}
    </Button>
  );
}

/**
 * `orders` are the signed-in customer's recent orders, loaded on the server.
 * Everyone else looks an order up by number plus the email or phone it was
 * placed with — knowing the number alone is not enough.
 */
export function TrackLookup({ orders }: { orders: Order[] }) {
  const [state, action] = useActionState(trackOrderAction, {});

  return (
    <div className="mx-auto max-w-xl">
      <Form action={action} className="card relative p-5 shadow-lg sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="icon-tile">
            <PackageSearch size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="t-h3">Find your parcel</h2>
            <p className="t-small">Order number and the email or mobile you used.</p>
          </div>
        </div>
        <Field
          label="Order number"
          htmlFor="order-number"
          error={state.field === "number" ? state.error : undefined}
          hint="Example: WKC-2026-005001. It is on your confirmation email."
        >
          <Input
            id="order-number"
            name="number"
            required
            defaultValue={state.values?.number ?? ""}
            invalid={state.field === "number"}
            placeholder="WKC-2026-005001"
            className="tabular-nums"
          />
        </Field>
        <Field
          label="Email or mobile on the order"
          htmlFor="order-contact"
          error={state.field === "contact" ? state.error : undefined}
          hint="So only you can see where your parcel is."
          className="mt-4"
        >
          <Input
            id="order-contact"
            name="contact"
            required
            defaultValue={state.values?.contact ?? ""}
            invalid={state.field === "contact"}
            placeholder="you@example.in"
          />
        </Field>
        <TrackButton />
      </Form>

      {orders.length > 0 && (
        <section className="mt-8 sm:mt-10" aria-labelledby="recent-orders">
          <h2 id="recent-orders" className="t-label">
            Your recent orders
          </h2>
          <ul className="mt-3 space-y-2.5">
            {orders.slice(0, 4).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/track/${order.id}`}
                  className="card card-interactive group flex items-center gap-3 p-3 sm:gap-4"
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gradient-to-b from-ink-50 to-ink-100">
                    <Image src={order.lines[0].image} alt="" fill sizes="48px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[12.5px] font-semibold text-ink-950 transition-colors group-hover:text-brand-700">
                      {order.number}
                    </span>
                    <span className="t-small mt-0.5 block truncate">
                      {order.lines[0].title}
                      {order.lines.length > 1 && ` +${order.lines.length - 1} more`}
                    </span>
                  </span>
                  <StatusPill tone={orderTone(order.status)} className="hidden min-[400px]:inline-flex">
                    {statusLabel(order.status)}
                  </StatusPill>
                  <ChevronRight
                    size={16}
                    aria-hidden
                    className="shrink-0 text-ink-400 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ----------------------------- Detail ------------------------------ */

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  confirmed: { title: "Order confirmed", body: "We have your order and are getting it packed." },
  packed: { title: "Packed and ready", body: "Your parcel is sealed and waiting for pickup." },
  shipped: { title: "On its way", body: "The parcel has left our warehouse." },
  out_for_delivery: {
    title: "Out for delivery",
    body: "Arriving today. The delivery partner will call before they reach you.",
  },
  delivered: { title: "Delivered", body: "This order was handed over successfully." },
  // No refund is promised here: whether money went back is a fact about the
  // refund ledger, not about the order being cancelled. See moneyLine().
  cancelled: { title: "Cancelled", body: "This order was cancelled." },
  returned: { title: "Returned", body: "The return has been completed." },
};

const STATUS_ICON: Record<string, LucideIcon> = {
  confirmed: ClipboardCheck,
  packed: PackageCheck,
  shipped: Truck,
  out_for_delivery: Navigation,
  delivered: House,
  cancelled: Ban,
  returned: RotateCcw,
};

/**
 * What may be said about the money on a cancelled or returned order.
 * Rule One: "refunded" only when the ledger shows the money moved.
 */
function moneyLine(order: Order): string {
  if (order.status !== "cancelled" && order.status !== "returned") return "";
  if (!order.refund) return "";
  if (order.refund.stage === "complete") return " Your refund has been sent.";
  return ` ${order.refund.label}.`;
}

export function TrackDetail({ order, review }: { order: Order | null; review?: ReviewPanel | null }) {
  if (!order) {
    return (
      <EmptyState
        icon={<PackageSearch size={24} />}
        title="No order with that number"
        body="Either that order does not exist, or this browser has not been shown it yet. Look it up with your order number and the email or phone you ordered with."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/track" className={buttonClasses("primary", "md")}>
              Try another number
            </Link>
            <Link href="/contact" className={buttonClasses("outline", "md")}>
              Contact support
            </Link>
          </div>
        }
      />
    );
  }

  const copy = STATUS_COPY[order.status] ?? STATUS_COPY.confirmed;
  const StatusIcon = STATUS_ICON[order.status] ?? ClipboardCheck;

  // The three facts a person opens this page for.
  const ledger: { label: string; value: string; icon: LucideIcon }[] = [
    { ...deliveryFact(order), icon: CalendarClock },
    { label: "Courier", value: courierLine(order), icon: Truck },
    {
      label: "Delivering to",
      value: `${order.address.city} ${order.address.pincode}`,
      icon: MapPin,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
      <Reveal className="midnight relative overflow-hidden rounded-2xl sm:rounded-3xl">
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-40 invert" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gold-300 ring-1 ring-inset ring-white/15">
                <StatusIcon size={24} aria-hidden />
              </span>
              <div className="min-w-0">
                <span className="eyebrow eyebrow-dark tabular-nums">{order.number}</span>
                <h1 className="t-h1 mt-2 text-white">{copy.title}</h1>
                <p className="mt-2 max-w-[46ch] text-[14px] leading-[1.6] text-white/75">
                  {copy.body}
                  {moneyLine(order)}
                </p>
              </div>
            </div>
          </div>

          <dl className="mt-6 grid gap-2.5 sm:mt-8 sm:grid-cols-3 sm:gap-3">
            {ledger.map((row) => (
              <div
                key={row.label}
                className="flex min-w-0 items-start gap-3 rounded-xl bg-white/[0.06] p-3.5 ring-1 ring-inset ring-white/10"
              >
                <row.icon size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-200" />
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">{row.label}</dt>
                  {/* The courier line carries the AWB, one long unbroken code. */}
                  <dd className="mt-1 text-[13.5px] font-medium tabular-nums text-white wrap-anywhere">{row.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      {/* Right under "Delivered": the one thing left to do with the order. */}
      {review && <OrderReviewPanel panel={review} />}

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card min-w-0 overflow-hidden" aria-labelledby="shipment-progress">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:px-6">
            <span className="icon-tile icon-tile-sm">
              <PackageSearch size={16} aria-hidden />
            </span>
            <h2 id="shipment-progress" className="t-h3">
              Shipment progress
            </h2>
          </div>
          <div className="px-4 py-5 sm:px-6 sm:py-6">
            <TrackingTimeline events={order.tracking} />
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          <section className="card overflow-hidden" aria-labelledby="in-shipment">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
              <span className="icon-tile icon-tile-sm">
                <ReceiptText size={16} aria-hidden />
              </span>
              <h2 id="in-shipment" className="t-h3">
                In this shipment
              </h2>
            </div>
            <ul className="divide-y divide-line px-4">
              {order.lines.map((line) => (
                <li key={line.id} className="flex gap-3 py-3">
                  <Link
                    href={`/p/${line.slug}`}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gradient-to-b from-ink-50 to-ink-100"
                  >
                    <Image src={line.image} alt="" fill sizes="48px" className="object-cover" />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/p/${line.slug}`}
                      className="line-clamp-2 text-[13px] font-medium leading-[1.4] text-ink-900 hover:text-brand-700"
                    >
                      {line.title}
                    </Link>
                    <p className="t-small mt-0.5 tabular-nums">
                      Qty {line.quantity} · {formatINR(line.price * line.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card overflow-hidden" aria-labelledby="track-address">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
              <span className="icon-tile icon-tile-sm">
                <MapPin size={16} aria-hidden />
              </span>
              <h2 id="track-address" className="t-h3">
                Delivery address
              </h2>
            </div>
            <p className="t-body px-4 py-3.5 text-[13px] wrap-break-word">
              <strong className="font-semibold text-ink-900">{order.address.fullName}</strong>
              <br />
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}
              <br />
              {order.address.city}, {order.address.state}{" "}
              <span className="tabular-nums">{order.address.pincode}</span>
              <br />
              <span className="tabular-nums">{order.address.phone}</span>
            </p>
          </section>

          <div className="flex flex-col gap-2">
            <Link href={`/account/orders/${order.id}`} className={buttonClasses("outline", "md", "w-full px-4")}>
              <ReceiptText size={16} /> Order details
            </Link>
            <Link href="/contact" className={buttonClasses("ghost", "md", "w-full px-4")}>
              <Headset size={16} /> Need help with this order?
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
