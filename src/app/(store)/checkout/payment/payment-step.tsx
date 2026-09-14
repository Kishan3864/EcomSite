"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Banknote, Lock, ShieldCheck, Smartphone } from "lucide-react";
import type { PaymentMethodId } from "@/lib/types";
import { CheckoutAside, CheckoutShell } from "@/components/checkout/shell";
import { OrderSummary } from "@/components/cart/order-summary";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/ui/field";
import { useStore } from "@/store/store";
import { computeTotals } from "@/lib/pricing";
import { formatINR } from "@/lib/utils";

/** What PayU's checkout offers once the customer reaches it. */
const GATEWAY_METHODS = ["UPI", "Google Pay", "PhonePe", "Paytm", "Cards", "Net banking", "Wallets"];

/** Every UPI app can pay the QR; these are the ones people look for by name. */
const UPI_APP_NAMES = ["Google Pay", "PhonePe", "Paytm", "BHIM", "Amazon Pay", "Any UPI app"];

/**
 * How the customer would like to pay.
 *
 * Only the routes that can actually take money are listed — see
 * storefront-config.ts — so this page never offers a choice that dead-ends.
 *
 * The gateway is one option, not four: PayU's own checkout already asks for
 * UPI, card, net banking or wallet, and asking here as well would be a second
 * redundant step and a chance to pick "card" and then want UPI. UPI paid
 * straight to the shop is separate because it is genuinely a different deal —
 * no gateway, and a wait for confirmation — and the card says so.
 */
export function PaymentStep() {
  const { cart, checkout, config, customer, dispatch, hydrated } = useStore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && cart.length > 0 && !checkout.addressId) router.replace("/checkout/address");
  }, [hydrated, cart.length, checkout.addressId, router]);

  const selectedDelivery =
    config.deliveryOptions.find((d) => d.id === checkout.deliveryId) ?? config.deliveryOptions[0];
  const totals = computeTotals(cart, {
    delivery: selectedDelivery,
    rates: config.rates,
  });

  // Cash on delivery is the shop's rule and the product's. A bag holding one
  // prepaid-only line cannot be sent COD however the rest of it is priced, and
  // the reason has to be the one shown — "over the limit" for an expensive bag
  // is a different sentence from "this item is prepaid only".
  const prepaidOnly = cart.find((line) => !line.codAvailable);
  const overCodLimit = totals.total > config.codLimit;
  const codAllowed = !prepaidOnly && !overCodLimit;
  const codReason = prepaidOnly
    ? `${prepaidOnly.title} is prepaid only, so this order cannot be sent cash on delivery.`
    : `Cash on delivery is available on orders up to ${formatINR(config.codLimit)}.`;

  const available = config.paymentMethods.map((m) => m.id);

  // A draft saved in this browser before the shop's payment options changed may
  // name one that is no longer offered — "card" from when the gateway listed
  // each method separately. Anything that was a gateway choice still is one;
  // anything else falls back to no choice rather than a wrong one.
  const stored = checkout.paymentMethod;
  const selected: PaymentMethodId | null =
    stored && available.includes(stored)
      ? stored
      : stored && stored !== "cod" && available.includes("online")
        ? "online"
        : null;

  // How this customer usually pays, offered until they choose for themselves.
  useEffect(() => {
    if (!hydrated || checkout.paymentMethod || !customer?.preferredPayment) return;
    const preferred = customer.preferredPayment as PaymentMethodId;
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
      setError(codReason);
      return;
    }
    dispatch({
      type: "checkout/patch",
      patch: {
        paymentMethod: selected,
        paymentDetail:
          selected === "cod" ? "Pay on delivery" : selected === "upi" ? "UPI" : "PayU",
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
          <CheckoutAside />
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
            const Icon =
              method.id === "cod" ? Banknote : method.id === "upi" ? Smartphone : ShieldCheck;

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
                  subtitle={disabled ? codReason : method.description}
                >
                  {method.id === "upi" && (
                    <div className="space-y-3">
                      <ul className="flex flex-wrap gap-1.5" aria-label="Works with">
                        {UPI_APP_NAMES.map((label) => (
                          <li
                            key={label}
                            className="border border-ink-200 bg-surface px-2 py-1 text-[11px] font-medium text-ink-700"
                          >
                            {label}
                          </li>
                        ))}
                      </ul>
                      <ol className="space-y-1.5 text-[12.5px] leading-relaxed text-ink-600">
                        <li className="flex gap-2">
                          <span className="font-semibold text-ink-900">1.</span>
                          Scan our QR, or tap through to your UPI app on a phone.
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-ink-900">2.</span>
                          Pay {formatINR(totals.total)} and copy the 12-digit reference your app
                          shows.
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-ink-900">3.</span>
                          Enter it on the next screen. We check it against our bank and confirm —
                          usually within a few hours, and you get an email the moment we do.
                        </li>
                      </ol>
                      <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-600">
                        <Lock size={13} className="mt-0.5 shrink-0 text-brand-600" />
                        Your UPI PIN is entered only inside your own payment app — it never reaches
                        our servers.
                      </p>
                    </div>
                  )}

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
                        You pick UPI, card or net banking on PayU&apos;s checkout at the last
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
