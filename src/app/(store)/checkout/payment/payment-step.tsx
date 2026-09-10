"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  CreditCard,
  Landmark,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import type { Offer, PaymentMethodId } from "@/lib/types";
import { CheckoutAside, CheckoutShell } from "@/components/checkout/shell";
import { OrderSummary } from "@/components/cart/order-summary";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Field, Input, OptionCard, Select } from "@/components/ui/field";
import { useStore } from "@/store/store";
import { computeTotals, evaluateCoupon } from "@/lib/pricing";
import { banks, upiApps, wallets } from "@/data/marketing";
import { cn, formatINR } from "@/lib/utils";

const ICONS: Record<PaymentMethodId, typeof Wallet> = {
  upi: Smartphone,
  card: CreditCard,
  netbanking: Landmark,
  wallet: Wallet,
  cod: Banknote,
};

export function PaymentStep({ offers }: { offers: Offer[] }) {
  const { cart, coupon, checkout, config, customer, dispatch, hydrated } = useStore();
  const router = useRouter();
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // What they have picked or typed here, or whatever the draft already carries.
  const detail = typed ?? checkout.paymentDetail ?? "";

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

  // How this customer usually pays, offered until they choose for themselves.
  useEffect(() => {
    if (!hydrated || checkout.paymentMethod || !customer?.preferredPayment) return;
    const preferred = config.paymentMethods.find((m) => m.id === customer.preferredPayment);
    if (!preferred || (preferred.id === "cod" && !codAllowed)) return;
    const saved = preferred.id === "upi" ? (customer.upiId ?? "") : "";
    dispatch({
      type: "checkout/patch",
      patch: { paymentMethod: preferred.id, paymentDetail: saved || null },
    });
  }, [hydrated, checkout.paymentMethod, customer, config.paymentMethods, codAllowed, dispatch]);

  function choose(id: PaymentMethodId) {
    dispatch({ type: "checkout/patch", patch: { paymentMethod: id, paymentDetail: null } });
    setTyped("");
    setError(null);
  }

  function next() {
    const method = checkout.paymentMethod;
    if (!method) {
      setError("Choose how you would like to pay.");
      return;
    }

    let resolved = detail;
    if (method === "upi" && !detail) {
      setError("Pick an app or enter your UPI ID.");
      return;
    }
    // Nothing to validate for a card here: the details are collected by the
    // gateway, on its own page. Collecting them on ours would put this site
    // in PCI-DSS scope for no benefit.
    if (method === "card") resolved = "Card";
    if (method === "netbanking" && !detail) {
      setError("Choose your bank.");
      return;
    }
    if (method === "wallet" && !detail) {
      setError("Choose a wallet.");
      return;
    }
    if (method === "cod") resolved = "Pay on delivery";

    dispatch({ type: "checkout/patch", patch: { paymentMethod: method, paymentDetail: resolved } });
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
    >
      <div className="space-y-4">
        <ul className="space-y-3">
          {config.paymentMethods.map((method) => {
            const Icon = ICONS[method.id];
            const disabled = method.id === "cod" && !codAllowed;

            return (
              <li key={method.id}>
                <OptionCard
                  selected={checkout.paymentMethod === method.id}
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
                    <>
                      {disabled
                        ? "Not available on orders above ₹25,000."
                        : method.description}
                      {method.offerText && !disabled && (
                        <span className="mt-1 block font-medium text-brand-700">
                          {method.offerText}
                        </span>
                      )}
                    </>
                  }
                >
                  {method.id === "upi" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {upiApps.map((app) => (
                          <button
                            key={app.id}
                            onClick={() => {
                              setTyped(app.name);
                              setError(null);
                            }}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-lg border px-3 py-3 transition-colors",
                              detail === app.name
                                ? "border-brand-700 bg-brand-50"
                                : "border-ink-200 hover:border-ink-400",
                            )}
                          >
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold text-white"
                              style={{ backgroundColor: app.tone }}
                            >
                              {app.name[0]}
                            </span>
                            <span className="text-[12px] font-medium text-ink-800">{app.name}</span>
                          </button>
                        ))}
                      </div>
                      <Field
                        label="Or enter a UPI ID"
                        htmlFor="upi-id"
                        hint={
                          customer?.upiId && detail === customer.upiId
                            ? "Saved on your account."
                            : undefined
                        }
                      >
                        <Input
                          id="upi-id"
                          value={detail.includes("@") ? detail : ""}
                          onChange={(e) => {
                            setTyped(e.target.value);
                            setError(null);
                          }}
                          placeholder="yourname@okhdfcbank"
                        />
                      </Field>
                    </div>
                  )}

                  {method.id === "card" && (
                    <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-600">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-600" />
                      Your card number, expiry and CVV are entered on Razorpay&apos;s secure page
                      at the next step. They never reach our servers, and we never store them.
                    </p>
                  )}

                  {method.id === "netbanking" && (
                    <Field label="Choose your bank" htmlFor="bank">
                      <Select
                        id="bank"
                        value={detail}
                        onChange={(e) => {
                          setTyped(e.target.value);
                          setError(null);
                        }}
                      >
                        <option value="">Select a bank</option>
                        {banks.map((bank) => (
                          <option key={bank} value={bank}>
                            {bank}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}

                  {method.id === "wallet" && (
                    <div className="grid grid-cols-2 gap-2">
                      {wallets.map((w) => (
                        <button
                          key={w}
                          onClick={() => {
                            setTyped(w);
                            setError(null);
                          }}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors",
                            detail === w
                              ? "border-brand-700 bg-brand-50 text-brand-800"
                              : "border-ink-200 text-ink-700 hover:border-ink-400",
                          )}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  )}

                  {method.id === "cod" && (
                    <p className="text-[12.5px] leading-relaxed text-ink-600">
                      Keep {formatINR(totals.total)} ready, or pay the delivery partner by UPI at
                      the door. A ₹0 handling fee applies on this order.
                    </p>
                  )}
                </OptionCard>
              </li>
            );
          })}
        </ul>

        {error && <p className="text-[13px] font-medium text-sale-600">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            href="/checkout/delivery"
            className="text-[13px] font-medium text-ink-600 underline-offset-4 hover:text-ink-900 hover:underline"
          >
            Back to delivery
          </Link>
          <Button size="lg" className="min-w-[200px]" onClick={next}>
            Review order
            <ArrowRight size={17} />
          </Button>
        </div>
      </div>
    </CheckoutShell>
  );
}
