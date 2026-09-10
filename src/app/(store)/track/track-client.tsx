"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { motion } from "motion/react";
import { MapPin, Package, PackageSearch, Phone, Search, Truck } from "lucide-react";
import type { Order } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { Field, Input } from "@/components/ui/field";
import { TrackingTimeline } from "@/components/account/tracking-timeline";
import { trackOrderAction } from "@/services/commerce";
import { formatDate, formatINR, statusLabel } from "@/lib/utils";

/* ------------------------------ Lookup ----------------------------- */

function TrackButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-4 w-full" loading={pending}>
      <Search size={17} /> {pending ? "Looking it up…" : "Track my order"}
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
      <form action={action} className="rounded-2xl border border-hairline bg-surface p-6">
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
      </form>

      {orders.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Your recent orders
          </h2>
          <ul className="space-y-2">
            {orders.slice(0, 4).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/track/${order.id}`}
                  className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3.5 transition-colors hover:border-brand-400"
                >
                  <span className="relative h-12 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                    <Image
                      src={order.lines[0].image}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[12.5px] font-semibold text-ink-950">
                      {order.number}
                    </span>
                    <span className="block truncate text-[12px] text-ink-500">
                      {order.lines[0].title}
                      {order.lines.length > 1 && ` +${order.lines.length - 1} more`}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-brand-800">
                    {statusLabel(order.status)}
                  </span>
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
  cancelled: { title: "Cancelled", body: "This order was cancelled and refunded." },
  returned: { title: "Returned", body: "The return was completed and refunded." },
};

export function TrackDetail({ order }: { order: Order | null }) {
  if (!order) {
    return (
      <EmptyState
        icon={<PackageSearch size={26} />}
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

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-2xl border border-hairline bg-surface"
      >
        <div className="peacock-surface p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-300">
            {order.number}
          </p>
          <h1 className="mt-2 font-display text-[28px] leading-tight tracking-[-0.025em] text-white sm:text-[34px]">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-white/65">{copy.body}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Truck,
                label: order.status === "delivered" ? "Delivered on" : "Expected by",
                value: formatDate(order.estimatedDelivery, "day"),
              },
              { icon: Package, label: "Courier", value: `${order.courier} · ${order.awb}` },
              {
                icon: MapPin,
                label: "Delivering to",
                value: `${order.address.city} ${order.address.pincode}`,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white/10 p-3.5 backdrop-blur">
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/50">
                  <item.icon size={12} /> {item.label}
                </p>
                <p className="mt-1 text-[13.5px] font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section>
            <h2 className="mb-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
              Shipment progress
            </h2>
            <TrackingTimeline events={order.tracking} />
          </section>

          <aside className="space-y-4">
            <section className="rounded-xl border border-hairline p-4">
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                In this shipment
              </h2>
              <ul className="space-y-3">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex gap-3">
                    <Link
                      href={`/p/${line.slug}`}
                      className="relative h-14 w-12 shrink-0 overflow-hidden rounded-md bg-ink-100"
                    >
                      <Image src={line.image} alt="" fill sizes="48px" className="object-cover" />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={`/p/${line.slug}`}
                        className="line-clamp-2 text-[12.5px] font-medium text-ink-900 hover:text-brand-700"
                      >
                        {line.title}
                      </Link>
                      <p className="mt-0.5 text-[11.5px] text-ink-500">
                        Qty {line.quantity} · {formatINR(line.price * line.quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-hairline p-4">
              <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                Delivery address
              </h2>
              <p className="text-[12.5px] leading-relaxed text-ink-600">
                <strong className="font-semibold text-ink-900">{order.address.fullName}</strong>
                <br />
                {order.address.line1}
                {order.address.line2 ? `, ${order.address.line2}` : ""}
                <br />
                {order.address.city}, {order.address.state} {order.address.pincode}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-500">
                <Phone size={12} /> {order.address.phone}
              </p>
            </section>

            <div className="flex flex-col gap-2">
              <Link
                href={`/account/orders/${order.id}`}
                className={buttonClasses("outline", "md", "w-full")}
              >
                Order details
              </Link>
              <Link href="/contact" className={buttonClasses("ghost", "md", "w-full")}>
                Need help with this order?
              </Link>
            </div>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}
