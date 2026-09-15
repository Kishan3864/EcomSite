"use client";

import { useEffect, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { CheckoutAside, CheckoutShell } from "@/components/checkout/shell";
import { useCheckoutPaymentMethods } from "@/components/checkout/payment-methods";
import { OrderSummary } from "@/components/cart/order-summary";
import { Button, buttonClasses } from "@/components/ui/button";
import { Price } from "@/components/ui/primitives";
import { useStore } from "@/store/store";
import { computeTotals, estimatedDelivery } from "@/lib/pricing";
import { formatDate, formatINR } from "@/lib/utils";

const REGISTER_HREF = "/register?next=/checkout/review";
const SIGN_IN_HREF = "/login?next=/checkout/review";

export function ReviewStep() {
  const { cart, checkout, addresses, config, customer, dispatch, hydrated, sessionChecked } =
    useStore();
  const paymentMethods = useCheckoutPaymentMethods();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (hydrated && cart.length > 0 && !checkout.paymentMethod)
      router.replace("/checkout/payment");
  }, [hydrated, cart.length, checkout.paymentMethod, router]);

  const address = addresses.find((a) => a.id === checkout.addressId);
  const delivery =
    config.deliveryOptions.find((d) => d.id === checkout.deliveryId) ?? config.deliveryOptions[0];
  const payment = paymentMethods.find((p) => p.id === checkout.paymentMethod);
  const totals = computeTotals(cart, {
    delivery,
    rates: config.rates,
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
          giftWrap: false,
          buyerGstin: null,
          paymentMethod: payment.id,
          paymentDetail: checkout.paymentDetail,
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
          {address.city}, {address.state}{" "}
          <span className="tabular-nums">{address.pincode}</span>
          <br />
          Phone: <span className="tabular-nums">{address.phone}</span>
        </>
      ) : (
        "No address selected"
      ),
    },
    {
      title: "Delivery",
      // No link: there is one delivery, so there is nothing to go and change.
      body: (
        <>
          <strong className="font-semibold text-ink-900">{delivery.name}</strong> ·{" "}
          <span className="tabular-nums">
            {totals.shipping === 0 ? "Free" : formatINR(totals.shipping)}
          </span>
          <br />
          Arriving {formatDate(eta.from, "day")} – {formatDate(eta.to, "day")}
        </>
      ),
    },
    {
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
          <CheckoutAside />
          <OrderSummary
            totals={totals}
            lines={cart}
            delivery={delivery}
            cta={payLabel}
            ctaHref={needsAccount ? REGISTER_HREF : undefined}
            onCta={pay}
            footnote="256-bit encrypted. Nothing is charged until you confirm on the payment page."
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
            Pay {formatINR(totals.total)}
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {needsAccount && (
          /* Ink, not a tinted panel. It is the most important thing on the page
             and it earns that by being the only element drawn in full black. */
          <section className="bg-surface p-4 sm:p-5">
            <h2 className="font-display text-[20px] leading-[1.15] tracking-[-0.02em] text-ink-950 sm:text-[24px]">
              You need an account to place this order
            </h2>
            <p className="mt-2.5 max-w-[46ch] text-[13px] leading-[1.55] text-ink-600 sm:text-[14px]">
              Your order history, tracking and returns all live in your account, so we ask for one
              before the payment goes through. Creating it takes a minute.
            </p>
            <p className="mt-2 max-w-[46ch] text-[13px] leading-[1.55] text-ink-600 sm:text-[14px]">
              Nothing here is lost. Your bag, address, delivery and payment choices stay exactly as
              they are and we bring you back to this page.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link href={REGISTER_HREF} className={buttonClasses("primary", "md")}>
                Create an account
              </Link>
              <Link
                href={SIGN_IN_HREF}
                className="-my-2.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-colors duration-200 hover:text-brand-700 lg:my-0 lg:py-0"
              >
                I already have one
              </Link>
            </div>
          </section>
        )}

        {/* One shared hairline grid: three panes of the same document rather
            than three cards floating side by side. */}
        <div className="tile-grid grid-cols-1 sm:grid-cols-3">
          {summaryRows.map((row) => (
            <section key={row.title} className="min-w-0 p-3.5 sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="min-w-0 truncate text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  {row.title}
                </h2>
                {/* A 40px target on phones; the negative margin keeps the row
                    height. Delivery has no link — there is one, so there is
                    nothing to go and change. */}
                {row.href && (
                  <Link
                    href={row.href}
                    aria-label={`Change ${row.title.toLowerCase()}`}
                    className="tap -m-2.5 shrink-0 p-3.5 text-ink-400 transition-colors duration-200 hover:text-brand-700 sm:m-0 sm:p-1"
                  >
                    <Pencil size={12} />
                  </Link>
                )}
              </div>
              <p className="text-[13px] leading-[1.55] text-ink-600 wrap-break-word">{row.body}</p>
            </section>
          ))}
        </div>

        <section className="bg-surface">
          <h2 className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:px-5">
            {cart.length} item{cart.length > 1 ? "s" : ""} in this order
          </h2>
          <ul>
            {cart.map((line) => (
              <li key={line.id} className="flex gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                <Link
                  href={`/p/${line.slug}`}
                  className="relative h-20 w-16 shrink-0 overflow-hidden bg-ink-100"
                >
                  <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                    {line.brand}
                  </p>
                  <Link
                    href={`/p/${line.slug}`}
                    className="mt-1 line-clamp-2 text-[13.5px] font-medium leading-[1.35] text-ink-900 transition-colors duration-200 hover:text-brand-700"
                  >
                    {line.title}
                  </Link>
                  <p className="mt-1 text-[13px] text-ink-500">
                    {line.variantLabel ? `${line.variantLabel} · ` : ""}Quantity{" "}
                    <span className="tabular-nums">{line.quantity}</span>
                  </p>
                  <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1.5" />
                </div>
                <p className="shrink-0 text-[14px] font-semibold tabular-nums text-ink-950">
                  {formatINR(line.price * line.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* The one Pay button on a desktop is in the order summary beside this;
            on a phone it is the pinned bar. This keeps only the terms — a second
            button here made two places to press for one payment. */}
        <p className="pt-4 text-[13px] leading-[1.55] text-ink-500">
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

        {/* A 40px touch target on phones; the negative margin keeps the line. */}
        <Link
          href="/checkout/payment"
          className="-my-2.5 inline-block py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500 transition-colors duration-200 hover:text-ink-950 lg:my-0 lg:py-0"
        >
          Back to payment
        </Link>
      </div>
    </CheckoutShell>
  );
}
