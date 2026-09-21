"use client";

import { useEffect, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, MapPin, Package, Pencil, Truck, UserRound } from "lucide-react";
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
      Icon: MapPin,
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
      Icon: Truck,
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
      Icon: CreditCard,
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
            // The encryption half of this sentence has gone. CheckoutTrustRow
            // now states it under the heading on every step, so saying it again
            // a few hundred pixels lower was the same promise twice on one
            // screen — which reads as a shop insisting rather than a shop
            // informing. What is left is the part only this step can say.
            footnote="Nothing is charged until you confirm on the payment page."
          />
        </>
      }
      action={
        needsAccount ? (
          <Link
            href={REGISTER_HREF}
            className={buttonClasses(
              "accent",
              "lg",
              "w-full px-4 sm:w-auto sm:min-w-[240px] sm:px-8",
            )}
          >
            Create an account to pay
          </Link>
        ) : (
          <Button
            variant="accent"
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
      <div className="space-y-5 sm:space-y-6">
        {needsAccount && (
          /* The most important thing on the page, so the one panel with a
             gradient edge. */
          <section className="card edge-glow p-4 sm:p-6">
            <span className="icon-tile" aria-hidden>
              <UserRound size={20} />
            </span>
            <h2 className="t-h2 mt-4">You need an account to place this order</h2>
            <p className="t-body mt-2 max-w-[52ch]">
              Your order history, tracking and returns all live in your account, so we ask for one
              before the payment goes through. Creating it takes a minute.
            </p>
            <p className="t-body mt-2 max-w-[52ch]">
              Nothing here is lost. Your bag, address, delivery and payment choices stay exactly as
              they are and we bring you back to this page.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link href={REGISTER_HREF} className={buttonClasses("primary", "md")}>
                Create an account
              </Link>
              <Link href={SIGN_IN_HREF} className={buttonClasses("outline", "md")}>
                I already have one
              </Link>
            </div>
          </section>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {summaryRows.map(({ Icon, ...row }) => (
            <section key={row.title} className="card min-w-0 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="icon-tile icon-tile-sm" aria-hidden>
                    <Icon size={16} />
                  </span>
                  <h2 className="t-label min-w-0 truncate">{row.title}</h2>
                </span>
                {/* Delivery has no link — there is one, so nothing to change. */}
                {row.href && (
                  <Link
                    href={row.href}
                    aria-label={`Change ${row.title.toLowerCase()}`}
                    className="tap -m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Pencil size={14} />
                  </Link>
                )}
              </div>
              <p className="text-[13px] leading-[1.55] text-ink-600 wrap-break-word">{row.body}</p>
            </section>
          ))}
        </div>

        <section className="card overflow-hidden">
          <h2 className="t-h3 flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <span className="icon-tile icon-tile-sm" aria-hidden>
              <Package size={16} />
            </span>
            {cart.length} item{cart.length > 1 ? "s" : ""} in this order
          </h2>
          <ul className="card-divided border-t border-line">
            {cart.map((line) => (
              <li key={line.id} className="flex gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4">
                <Link
                  href={`/p/${line.slug}`}
                  className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-ink-100 ring-1 ring-inset ring-line"
                >
                  <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  {line.brand && <p className="t-label truncate text-[10px]">{line.brand}</p>}
                  <Link
                    href={`/p/${line.slug}`}
                    className="mt-0.5 line-clamp-2 text-[13.5px] font-medium leading-[1.35] text-ink-900 transition-colors duration-200 hover:text-brand-700"
                  >
                    {line.title}
                  </Link>
                  <p className="t-small mt-1">
                    {line.variantLabel ? `${line.variantLabel} · ` : ""}Quantity{" "}
                    <span className="tabular-nums">{line.quantity}</span>
                  </p>
                  <Price price={line.price} mrp={line.mrp} size="sm" className="mt-1.5" />
                </div>
                <p className="t-price shrink-0 text-[14.5px]">{formatINR(line.price * line.quantity)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* The one Pay button on a desktop is in the order summary beside this;
            on a phone it is the pinned bar. This keeps only the terms — a second
            button here made two places to press for one payment. */}
        <p className="t-small pt-1">
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

        <Link href="/checkout/payment" className={buttonClasses("ghost", "sm", "-ml-3 h-10 text-ink-600")}>
          <ArrowLeft size={16} aria-hidden />
          Back to payment
        </Link>
      </div>
    </CheckoutShell>
  );
}
