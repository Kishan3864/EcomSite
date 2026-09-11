"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Banknote, Lock, ShieldCheck } from "lucide-react";
import type { Offer, PaymentMethodId } from "@/lib/types";
import { CheckoutAside, CheckoutShell } from "@/components/checkout/shell";
import { OrderSummary } from "@/components/cart/order-summary";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/ui/field";
import { useStore } from "@/store/store";
import { computeTotals, evaluateCoupon } from "@/lib/pricing";
import { formatINR } from "@/lib/utils";

/** What Razorpay's checkout offers once the customer reaches it. */
const GATEWAY_METHODS = ["UPI", "Google Pay", "PhonePe", "Paytm", "Cards", "Net banking", "Wallets"];

/**
 * Two ways to pay: online through Razorpay, or cash on delivery.
 *
 * Razorpay's own checkout already lets the customer choose UPI, a card, net
 * banking or a wallet, so asking them to make that choice here as well would be
 * a second, redundant step — and a place to pick "card" and then want UPI. The
 * choice is made once, on the gateway's page, where the details are collected.
 */
export function PaymentStep({ offers }: { offers: Offer[] }) {
  const { cart, coupon, checkout, config, customer, dispatch, hydrated } = useStore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && cart.length > 0 && !checkout.addressId) router.replace("/checkout/address");
  }, [hydrated, cart.length, checkout.addressId, router]);

  const selectedDelivery =
    config.deliveryOptions.find((d) => d.id === checkout.deliveryId) ?? config.deliveryOptions[0];
  const itemsTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const applied = offers.find((o) => o.code === coupon) ?? null;
  const check = applied
    ? evaluateCoupon(applied, itemsTotal, [...new Set(cart.map((l) => l.categorySlug))])
    : { ok: false, discount: 0 };
  const totals = computeTotals(cart, {
    delivery: selectedDelivery,
    rates: config.rates,
    coupon: applied && check.ok ? { code: applied.code, discount: check.discount, type: applied.type } : null,
  });

  const codAllowed = totals.total <= config.codLimit;

  // A draft saved before this page changed may still say "upi" or "card";
  // anything that is not cash on delivery is paid online.
  const selected: PaymentMethodId | null = checkout.paymentMethod
    ? checkout.paymentMethod === "cod"
      ? "cod"
      : "online"
    : null;

  // How this customer usually pays, offered until they choose for themselves.
  useEffect(() => {
    if (!hydrated || checkout.paymentMethod || !customer?.preferredPayment) return;
    const preferred: PaymentMethodId = customer.preferredPayment === "cod" ? "cod" : "online";
    if (!config.paymentMethods.some((m) => m.id === preferred)) return;
    if (preferred === "cod" && !codAllowed) return;
    dispatch({ type: "checkout/patch", patch: { paymentMethod: preferred, paymentDetail: null } });
  }, [hydrated, checkout.paymentMethod, customer, config.paymentMethods, codAllowed, dispatch]);

  function choose(id: PaymentMethodId) {
    dispatch({ type: "checkout/patch", patch: { paymentMethod: id, paymentDetail: null } });
    setError(null);
  }

  function next() {
    if (!selected) {
      setError("Choose how you would like to pay.");
      return;
    }
    if (selected === "cod" && !codAllowed) {
      setError(`Cash on delivery is available on orders up to ${formatINR(config.codLimit)}.`);
      return;
    }
    dispatch({
      type: "checkout/patch",
      patch: {
        paymentMethod: selected,
        paymentDetail: selected === "cod" ? "Pay on delivery" : "Razorpay",
      },
    });
    router.push("/checkout/review");
  }

  return (
    <CheckoutShell
      step="payment"
      title="How would you like to pay?"
      description="Nothing is charged yet — you will see a full summary before the payment goes through."
      aside={
        <>
          <CheckoutAside offers={offers} />
          <OrderSummary totals={totals} lines={cart} delivery={selectedDelivery} />
        </>
      }
      total={totals.total}
      action={
        <Button
          size="lg"
          className="w-full px-4 sm:w-auto sm:min-w-[240px] sm:px-8"
          onClick={next}
        >
          Review order
          <ArrowRight size={17} />
        </Button>
      }
    >
      <div className="space-y-3 sm:space-y-4">
        <ul className="space-y-2 sm:space-y-3">
          {config.paymentMethods.map((method) => {
            const disabled = method.id === "cod" && !codAllowed;
            const Icon = method.id === "cod" ? Banknote : ShieldCheck;

            return (
              <li key={method.id}>
                <OptionCard
                  selected={selected === method.id}
                  onSelect={() => choose(method.id)}
                  disabled={disabled}
                  title={
                    <span className="flex items-center gap-2">
                      <Icon size={16} className="text-brand-600" />
                      {method.name}
                    </span>
                  }
                  badge={method.badge ? <Badge tone="gold">{method.badge}</Badge> : null}
                  subtitle={
                    disabled
                      ? `Available on orders up to ${formatINR(config.codLimit)}.`
                      : method.description
                  }
                >
                  {method.id === "online" && (
                    <div className="space-y-3">
                      <ul className="flex flex-wrap gap-1.5" aria-label="Accepted on the next step">
                        {GATEWAY_METHODS.map((label) => (
                          <li
                            key={label}
                            className="border border-ink-200 bg-surface px-2 py-1 text-[11px] font-medium text-ink-700"
                          >
                            {label}
                          </li>
                        ))}
                      </ul>
                      <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-600">
                        <Lock size={13} className="mt-0.5 shrink-0 text-brand-600" />
                        You pick UPI, card or net banking on Razorpay&apos;s checkout at the last
                        step. Card numbers, CVV and UPI PINs are entered there — they never reach
                        our servers, and we never store them.
                      </p>
                    </div>
                  )}

                  {method.id === "cod" && (
                    <p className="text-[12.5px] leading-relaxed text-ink-600">
                      Keep {formatINR(totals.total)} ready, or pay the delivery partner by UPI at the
                      door. There is no extra charge for cash on delivery.
                    </p>
                  )}
                </OptionCard>
              </li>
            );
          })}
        </ul>

        {error && (
          <p role="alert" className="text-[13px] font-medium text-sale-600">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* A 40px touch target on phones; the negative margin keeps the row. */}
          <Link
            href="/checkout/delivery"
            className="-my-2.5 py-2.5 text-[13px] font-medium text-ink-600 underline-offset-4 hover:text-ink-900 hover:underline lg:my-0 lg:py-0"
          >
            Back to delivery
          </Link>
          <Button size="lg" className="hidden min-w-[200px] lg:inline-flex" onClick={next}>
            Review order
            <ArrowRight size={17} />
          </Button>
        </div>
      </div>
    </CheckoutShell>
  );
}
