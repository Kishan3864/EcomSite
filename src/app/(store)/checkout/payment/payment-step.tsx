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
  const { cart, coupon, checkout, config, dispatch, hydrated } = useStore();
  const router = useRouter();
  const [detail, setDetail] = useState(checkout.paymentDetail ?? "");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
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

  function choose(id: PaymentMethodId) {
    dispatch({ type: "checkout/patch", patch: { paymentMethod: id, paymentDetail: null } });
    setDetail("");
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
    if (method === "card") {
      const digits = card.number.replace(/\s/g, "");
      if (digits.length < 12 || !/^\d+$/.test(digits)) {
        setError("Enter a valid card number.");
        return;
      }
      if (!/^\d{2}\s?\/\s?\d{2}$/.test(card.expiry)) {
        setError("Enter the expiry as MM/YY.");
        return;
      }
      if (!/^\d{3,4}$/.test(card.cvv)) {
        setError("Enter the 3-digit CVV.");
        return;
      }
      resolved = `${card.name || "Card"} ending ${digits.slice(-4)}`;
    }
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
                              setDetail(app.name);
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
                      <Field label="Or enter a UPI ID" htmlFor="upi-id">
                        <Input
                          id="upi-id"
                          value={detail.includes("@") ? detail : ""}
                          onChange={(e) => {
                            setDetail(e.target.value);
                            setError(null);
                          }}
                          placeholder="yourname@okhdfcbank"
                        />
                      </Field>
                    </div>
                  )}

                  {method.id === "card" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Card number" htmlFor="card-number" className="sm:col-span-2">
                        <Input
                          id="card-number"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          value={card.number}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                            setCard((c) => ({
                              ...c,
                              number: digits.replace(/(.{4})/g, "$1 ").trim(),
                            }));
                            setError(null);
                          }}
                          placeholder="4111 1111 1111 1111"
                        />
                      </Field>
                      <Field label="Name on card" htmlFor="card-name" className="sm:col-span-2">
                        <Input
                          id="card-name"
                          autoComplete="cc-name"
                          value={card.name}
                          onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                          placeholder="ANANYA IYER"
                        />
                      </Field>
                      <Field label="Expiry (MM/YY)" htmlFor="card-expiry">
                        <Input
                          id="card-expiry"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          value={card.expiry}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setCard((c) => ({
                              ...c,
                              expiry:
                                digits.length > 2
                                  ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                                  : digits,
                            }));
                            setError(null);
                          }}
                          placeholder="09/29"
                        />
                      </Field>
                      <Field label="CVV" htmlFor="card-cvv">
                        <Input
                          id="card-cvv"
                          type="password"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          value={card.cvv}
                          onChange={(e) => {
                            setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }));
                            setError(null);
                          }}
                          placeholder="123"
                        />
                      </Field>
                      <p className="flex items-center gap-1.5 text-[11.5px] text-ink-400 sm:col-span-2">
                        <ShieldCheck size={12} className="text-brand-600" />
                        This is a demo checkout. Card details are never sent anywhere and nothing
                        is stored.
                      </p>
                    </div>
                  )}

                  {method.id === "netbanking" && (
                    <Field label="Choose your bank" htmlFor="bank">
                      <Select
                        id="bank"
                        value={detail}
                        onChange={(e) => {
                          setDetail(e.target.value);
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
                            setDetail(w);
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
