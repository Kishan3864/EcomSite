"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gift, Lock, MapPin, Pencil, Truck, UserRound, Wallet } from "lucide-react";
import type { Offer } from "@/lib/types";
import { CheckoutAside, CheckoutShell } from "@/components/checkout/shell";
import { OrderSummary } from "@/components/cart/order-summary";
import { Button, buttonClasses } from "@/components/ui/button";
import { Price } from "@/components/ui/primitives";
import { useStore } from "@/store/store";
import { computeTotals, estimatedDelivery, evaluateCoupon } from "@/lib/pricing";
import { formatDate, formatINR } from "@/lib/utils";

const REGISTER_HREF = "/register?next=/checkout/review";
const SIGN_IN_HREF = "/login?next=/checkout/review";

export function ReviewStep({ offers }: { offers: Offer[] }) {
  const { cart, coupon, checkout, addresses, config, customer, dispatch, hydrated, sessionChecked } =
    useStore();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (hydrated && cart.length > 0 && !checkout.paymentMethod)
      router.replace("/checkout/payment");
  }, [hydrated, cart.length, checkout.paymentMethod, router]);

  const address = addresses.find((a) => a.id === checkout.addressId);
  const delivery =
    config.deliveryOptions.find((d) => d.id === checkout.deliveryId) ?? config.deliveryOptions[0];
  const payment = config.paymentMethods.find((p) => p.id === checkout.paymentMethod);

  const itemsTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const applied = offers.find((o) => o.code === coupon) ?? null;
  const check = applied
    ? evaluateCoupon(applied, itemsTotal, [...new Set(cart.map((l) => l.categorySlug))])
    : { ok: false, discount: 0 };
  const totals = computeTotals(cart, {
    delivery,
    rates: config.rates,
    coupon: applied && check.ok ? { code: applied.code, discount: check.discount, type: applied.type } : null,
  });

  const eta = estimatedDelivery(cart, delivery);

  const needsAccount = sessionChecked && !customer;

  // Everything below is a proposal. The order is priced, stock-checked and
  // written by the server on the next screen; nothing here is trusted.
  function pay() {
    // Until `/api/me` has answered we do not know who this is, and guessing
    // would send a customer who is signed in off to the register page.
    if (!address || !payment || !sessionChecked) return;
    if (!customer) {
      router.push(REGISTER_HREF);
      return;
    }
    const contact =
      checkout.contact ??
      (customer.phone
        ? { name: customer.name, email: customer.email, phone: customer.phone }
        : null);
    if (!contact) {
      router.push("/checkout/contact");
      return;
    }

    setPlacing(true);
    dispatch({
      type: "checkout/stage",
      pending: {
        amount: totals.total,
        input: {
          lines: cart,
          contact,
          address,
          deliveryId: checkout.deliveryId,
          deliveryDate: checkout.deliveryDate,
          giftWrap: checkout.giftWrap,
          buyerGstin: checkout.buyerGstin,
          paymentMethod: payment.id,
          paymentDetail: checkout.paymentDetail,
          couponCode: applied && check.ok ? applied.code : null,
        },
      },
    });
    router.push("/checkout/processing");
  }

  const payLabel = placing
    ? "Placing order…"
    : !sessionChecked
      ? "Checking your account…"
      : needsAccount
        ? "Create an account to pay"
        : `Pay ${formatINR(totals.total)}`;

  const summaryRows = [
    {
      icon: MapPin,
      title: "Delivery address",
      href: "/checkout/address",
      body: address ? (
        <>
          <strong className="font-semibold text-ink-900">{address.fullName}</strong> ·{" "}
          {address.label}
          <br />
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ""}
          <br />
          {address.city}, {address.state} {address.pincode}
          <br />
          Phone: {address.phone}
        </>
      ) : (
        "No address selected"
      ),
    },
    {
      icon: Truck,
      title: "Delivery method",
      href: "/checkout/delivery",
      body: (
        <>
          <strong className="font-semibold text-ink-900">{delivery.name}</strong> ·{" "}
          {totals.shipping === 0 ? "Free" : formatINR(totals.shipping)}
          <br />
          Arriving {formatDate(eta.from, "day")} – {formatDate(eta.to, "day")}
          {checkout.giftWrap && (
            <>
              <br />
              <span className="inline-flex items-center gap-1.5 text-brand-700">
                <Gift size={12} /> Gift wrapped
              </span>
            </>
          )}
        </>
      ),
    },
    {
      icon: Wallet,
      title: "Payment method",
      href: "/checkout/payment",
      body: (
        <>
          <strong className="font-semibold text-ink-900">{payment?.name}</strong>
          <br />
          {checkout.paymentDetail ?? payment?.description}
        </>
      ),
    },
  ];

  return (
    <CheckoutShell
      step="review"
      title="Check everything before you pay"
      description="Last look. Nothing is charged until you press the button at the bottom."
      aside={
        <>
          <CheckoutAside offers={offers} />
          <OrderSummary
            totals={totals}
            lines={cart}
            delivery={delivery}
            cta={payLabel}
            ctaHref={needsAccount ? REGISTER_HREF : undefined}
            onCta={pay}
            footnote="256-bit encrypted. Demo checkout — no money moves."
          />
        </>
      }
      action={
        needsAccount ? (
          <Link
            href={REGISTER_HREF}
            className={buttonClasses(
              "primary",
              "lg",
              "w-full px-4 sm:w-auto sm:min-w-[240px] sm:px-8",
            )}
          >
            <UserRound size={16} />
            Create an account to pay
          </Link>
        ) : (
          <Button
            size="lg"
            className="w-full px-4 sm:w-auto sm:min-w-[240px] sm:px-8"
            loading={placing || !sessionChecked}
            onClick={pay}
            disabled={!address || !payment}
          >
            <Lock size={16} />
            Pay {formatINR(totals.total)}
          </Button>
        )
      }
    >
      <div className="space-y-3 sm:space-y-4">
        {needsAccount && (
          <section className="rounded-xl border border-brand-200 bg-brand-50 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-950 sm:text-[14px]">
              <UserRound size={16} className="shrink-0 text-brand-700" />
              You need an account to place this order
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-700 sm:text-[13px]">
              Your order history, tracking and returns all live in your account, so we ask for one
              before the payment goes through. Creating it takes a minute.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600 sm:text-[13px]">
              Nothing here is lost. Your bag, address, delivery and payment choices stay exactly as
              they are and we bring you back to this page.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link href={REGISTER_HREF} className={buttonClasses("primary", "md")}>
                Create an account
              </Link>
              <Link
                href={SIGN_IN_HREF}
                className="-my-2.5 py-2.5 text-[13px] font-semibold text-brand-700 underline-offset-4 hover:underline lg:my-0 lg:py-0"
              >
                I already have one
              </Link>
            </div>
          </section>
        )}

        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          {summaryRows.map((row) => (
            <section
              key={row.title}
              className="min-w-0 rounded-xl border border-hairline bg-surface p-3.5 sm:p-4"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-2">
                <h2 className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                  <row.icon size={13} className="text-brand-600" />
                  {row.title}
                </h2>
                {/* A 40px target on phones; the negative margin keeps the row height. */}
                <Link
                  href={row.href}
                  aria-label={`Change ${row.title.toLowerCase()}`}
                  className="tap -m-2.5 rounded-md p-3.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-700 sm:m-0 sm:p-1"
                >
                  <Pencil size={12} />
                </Link>
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink-600 wrap-break-word">{row.body}</p>
            </section>
          ))}
        </div>

        <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
          <h2 className="border-b border-hairline px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:px-5 sm:py-4">
            {cart.length} item{cart.length > 1 ? "s" : ""} in this order
          </h2>
          <ul className="divide-y divide-hairline">
            {cart.map((line) => (
              <li key={line.id} className="flex gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                <Link
                  href={`/p/${line.slug}`}
                  className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-ink-100"
                >
                  <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                    {line.brand}
                  </p>
                  <Link
                    href={`/p/${line.slug}`}
                    className="line-clamp-2 text-[13px] font-medium text-ink-950 hover:text-brand-700 sm:text-[13.5px]"
                  >
                    {line.title}
                  </Link>
                  <p className="mt-0.5 text-[11.5px] text-ink-500 sm:text-[12px]">
                    {line.variantLabel ? `${line.variantLabel} · ` : ""}Quantity {line.quantity}
                  </p>
                  <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1 sm:mt-1.5" />
                </div>
                <p className="shrink-0 text-[13.5px] font-semibold tabular-nums text-ink-950 sm:text-[14px]">
                  {formatINR(line.price * line.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Below lg the pay button lives in the pinned bar, so this keeps only the terms. */}
        <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-[12.5px] leading-relaxed text-ink-500">
            By placing this order you agree to our{" "}
            <Link href="/legal/terms" className="font-medium text-brand-700 hover:underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/refunds" className="font-medium text-brand-700 hover:underline">
              return policy
            </Link>
            .
          </p>
          {needsAccount ? (
            <Link
              href={REGISTER_HREF}
              className={buttonClasses("primary", "lg", "hidden shrink-0 lg:inline-flex")}
            >
              <UserRound size={16} />
              Create an account to pay
            </Link>
          ) : (
            <Button
              size="lg"
              className="hidden shrink-0 lg:inline-flex"
              loading={placing || !sessionChecked}
              onClick={pay}
              disabled={!address || !payment}
            >
              <Lock size={16} />
              Pay {formatINR(totals.total)}
            </Button>
          )}
        </div>

        {/* A 40px touch target on phones; the negative margin keeps the line. */}
        <Link
          href="/checkout/payment"
          className="-my-2.5 inline-block py-2.5 text-[13px] font-medium text-ink-600 underline-offset-4 hover:text-ink-900 hover:underline lg:my-0 lg:py-0"
        >
          Back to payment
        </Link>
      </div>
    </CheckoutShell>
  );
}
