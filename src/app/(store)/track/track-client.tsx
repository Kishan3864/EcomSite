"use client";

import { useActionState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ChevronRight, Search } from "lucide-react";
import type { Order } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { Field, Input } from "@/components/ui/field";
import { Reveal } from "@/components/ui/motion";
import { TrackingTimeline } from "@/components/account/tracking-timeline";
import { trackOrderAction } from "@/services/commerce";
import { cn, formatDate, formatINR, statusLabel } from "@/lib/utils";
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
      <Form action={action} className="rounded-xl border border-hairline bg-surface p-4 sm:p-6">
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
        <section className="mt-8 sm:mt-10">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Your recent orders
          </h2>
          {/* A ruled index rather than a stack of little cards: four rows of
              the same shipment ledger the rest of the page is drawn in. */}
          <ul className="mt-2.5 border-b border-hairline">
            {orders.slice(0, 4).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/track/${order.id}`}
                  className="tap group flex items-center gap-3 border-t border-hairline py-3 sm:gap-4"
                >
                  <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-hairline bg-ink-100">
                    <Image
                      src={order.lines[0].image}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[12.5px] font-semibold text-ink-950 transition-colors group-hover:text-brand-700">
                      {order.number}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-ink-500">
                      {order.lines[0].title}
                      {order.lines.length > 1 && ` +${order.lines.length - 1} more`}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[11px] font-semibold uppercase leading-[1.3] tracking-[0.1em] text-ink-500">
                    {statusLabel(order.status)}
                  </span>
                  <ChevronRight
                    size={13}
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
  cancelled: { title: "Cancelled", body: "This order was cancelled and refunded." },
  returned: { title: "Returned", body: "The return was completed and refunded." },
};

export function TrackDetail({ order }: { order: Order | null }) {
  if (!order) {
    return (
      <EmptyState
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

  // The three facts a person opens this page for. They are set as a ledger —
  // label above value, divided by rules — because on the dark plane a row of
  // translucent white boxes was the only thing on the site still drawn as
  // frosted glass.
  const ledger = [
    {
      label: order.status === "delivered" ? "Delivered on" : "Expected by",
      value: formatDate(order.estimatedDelivery, "day"),
    },
    {
      label: "Courier",
      value: order.awb ? `${order.courier} · ${order.awb}` : "Being packed — booking soon",
    },
    {
      label: "Delivering to",
      value: `${order.address.city} ${order.address.pincode}`,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Reveal className="border border-hairline bg-surface">
        <div className="deep-plane px-4 py-6 sm:px-8 sm:py-9">
          <span className="eyebrow eyebrow-dark tabular-nums">{order.number}</span>
          <h1 className="mt-3 font-display text-[24px] leading-[1.08] tracking-[-0.025em] text-white sm:mt-4 sm:text-[36px]">
            {copy.title}
          </h1>
          <p className="mt-2.5 max-w-[46ch] text-[14px] leading-[1.6] text-white/70 sm:text-[15px]">
            {copy.body}
          </p>

          <dl className="mt-6 grid border-t border-white/15 sm:mt-8 sm:grid-cols-3">
            {ledger.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  "min-w-0 border-b border-white/15 py-3 sm:py-4",
                  i > 0 && "sm:border-l sm:pl-5",
                  i < ledger.length - 1 && "sm:pr-5",
                )}
              >
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
                  {row.label}
                </dt>
                {/* The courier line carries the AWB, one long unbroken code. */}
                <dd className="mt-1.5 text-[13.5px] font-medium tabular-nums text-white wrap-anywhere sm:text-[14px]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid gap-8 p-4 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
          <section className="min-w-0">
            <h2 className="mb-5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              Shipment progress
            </h2>
            <TrackingTimeline events={order.tracking} />
          </section>

          <aside className="min-w-0">
            <section className="border-t border-hairline pt-4">
              <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                In this shipment
              </h2>
              <ul className="mt-3 space-y-3">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex gap-3">
                    <Link
                      href={`/p/${line.slug}`}
                      className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border border-hairline bg-ink-100"
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
                      <p className="mt-1 text-[13px] tabular-nums text-ink-500">
                        Qty {line.quantity} · {formatINR(line.price * line.quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6 border-t border-hairline pt-4">
              <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                Delivery address
              </h2>
              <p className="mt-2.5 text-[13px] leading-[1.6] text-ink-600 wrap-break-word">
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

            <div className="mt-6 flex flex-col gap-2.5">
              {/* Narrower padding on phones: the help label is about as wide as
                  the column at 320px and these buttons never wrap. */}
              <Link
                href={`/account/orders/${order.id}`}
                className={buttonClasses("outline", "md", "w-full px-4 sm:px-6")}
              >
                Order details
              </Link>
              <Link
                href="/contact"
                className={buttonClasses("ghost", "md", "w-full px-4 sm:px-6")}
              >
                Need help with this order?
              </Link>
            </div>
          </aside>
        </div>
      </Reveal>
    </div>
  );
}
