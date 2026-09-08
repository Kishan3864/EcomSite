"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Gift, Truck, Zap } from "lucide-react";
import type { DeliverySpeed, Offer } from "@/lib/types";
import { CheckoutAside, CheckoutShell } from "@/components/checkout/shell";
import { OrderSummary } from "@/components/cart/order-summary";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/ui/field";
import { GstInvoiceOption } from "@/components/checkout/gst-invoice-option";
import { useStore } from "@/store/store";
import { computeTotals, estimatedDelivery, evaluateCoupon } from "@/lib/pricing";

import { addDays, cn, formatDate, formatINR } from "@/lib/utils";

const ICONS: Record<DeliverySpeed, typeof Truck> = {
  standard: Truck,
  express: Zap,
  scheduled: CalendarDays,
};

export function DeliveryStep({ offers }: { offers: Offer[] }) {
  const { cart, coupon, checkout, addresses, config, dispatch, hydrated } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && cart.length > 0 && !checkout.addressId) router.replace("/checkout/address");
  }, [hydrated, cart.length, checkout.addressId, router]);

  const address = addresses.find((a) => a.id === checkout.addressId);
  const selected =
    config.deliveryOptions.find((d) => d.id === checkout.deliveryId) ?? config.deliveryOptions[0];

  const itemsTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const applied = offers.find((o) => o.code === coupon) ?? null;
  const check = applied
    ? evaluateCoupon(applied, itemsTotal, [...new Set(cart.map((l) => l.categorySlug))])
    : { ok: false, discount: 0 };
  const totals = computeTotals(cart, {
    delivery: selected,
    rates: config.rates,
    coupon: applied && check.ok ? { code: applied.code, discount: check.discount, type: applied.type } : null,
  });

  const scheduleDates = Array.from({ length: 6 }, (_, i) => addDays(new Date(), i + 4));

  return (
    <CheckoutShell
      step="delivery"
      title="How fast do you need it?"
      description={
        address
          ? `Delivering to ${address.city} ${address.pincode}. Rates below are for this pincode.`
          : "Choose a delivery speed."
      }
      aside={
        <>
          <CheckoutAside offers={offers} />
          <OrderSummary totals={totals} lines={cart} delivery={selected} />
        </>
      }
    >
      <div className="space-y-4">
        <ul className="space-y-3">
          {config.deliveryOptions.map((option) => {
            const Icon = ICONS[option.id];
            const eta = estimatedDelivery(cart, option);
            const free = option.id === "standard" && itemsTotal >= config.rates.freeThreshold;

            return (
              <li key={option.id}>
                <OptionCard
                  selected={checkout.deliveryId === option.id}
                  onSelect={() =>
                    dispatch({ type: "checkout/patch", patch: { deliveryId: option.id } })
                  }
                  title={
                    <span className="flex items-center gap-2">
                      <Icon size={15} className="text-brand-600" />
                      {option.name}
                    </span>
                  }
                  badge={
                    option.id === "express" ? (
                      <Badge tone="gold">Fastest</Badge>
                    ) : free ? (
                      <Badge tone="success">Free</Badge>
                    ) : null
                  }
                  subtitle={
                    <>
                      {option.description}
                      <br />
                      <span className="font-medium text-ink-800">
                        Arrives {formatDate(eta.from, "day")} – {formatDate(eta.to, "day")}
                      </span>
                    </>
                  }
                  meta={
                    <span className="text-[15px] font-semibold tabular-nums text-ink-950">
                      {free || option.price === 0 ? "Free" : formatINR(option.price)}
                    </span>
                  }
                >
                  {option.id === "scheduled" && (
                    <div>
                      <p className="mb-2.5 text-[12.5px] font-medium text-ink-800">
                        Pick a delivery date
                      </p>
                      <div className="rail gap-2">
                        {scheduleDates.map((date) => {
                          const iso = date.toISOString();
                          const picked = checkout.deliveryDate === iso;
                          return (
                            <button
                              key={iso}
                              onClick={() =>
                                dispatch({ type: "checkout/patch", patch: { deliveryDate: iso } })
                              }
                              className={cn(
                                "flex w-[74px] flex-col items-center rounded-lg border px-2 py-2.5 transition-colors",
                                picked
                                  ? "border-brand-900 bg-brand-900 text-white"
                                  : "border-ink-200 bg-canvas text-ink-700 hover:border-ink-400",
                              )}
                            >
                              <span className="text-[10.5px] uppercase tracking-[0.08em] opacity-70">
                                {date.toLocaleDateString("en-IN", { weekday: "short" })}
                              </span>
                              <span className="text-[17px] font-semibold tabular-nums">
                                {date.getDate()}
                              </span>
                              <span className="text-[10.5px] opacity-70">
                                {date.toLocaleDateString("en-IN", { month: "short" })}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </OptionCard>
              </li>
            );
          })}
        </ul>

        <div className="rounded-xl border border-hairline bg-surface p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={checkout.giftWrap}
              onChange={(e) =>
                dispatch({ type: "checkout/patch", patch: { giftWrap: e.target.checked } })
              }
              className="mt-0.5 h-4 w-4 accent-[var(--color-brand-700)]"
            />
            <span>
              <span className="flex items-center gap-2 text-[14px] font-semibold text-ink-950">
                <Gift size={15} className="text-gold-600" />
                Add gift wrapping
              </span>
              <span className="mt-1 block text-[12.5px] text-ink-600">
                Recycled kraft paper, a cotton ribbon and a handwritten note. No prices on the
                invoice inside. Free this season.
              </span>
            </span>
          </label>
        </div>

        <GstInvoiceOption
          value={checkout.buyerGstin}
          onChange={(buyerGstin) => dispatch({ type: "checkout/patch", patch: { buyerGstin } })}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            href="/checkout/address"
            className="text-[13px] font-medium text-ink-600 underline-offset-4 hover:text-ink-900 hover:underline"
          >
            Back to address
          </Link>
          <Button
            size="lg"
            className="min-w-[200px]"
            onClick={() => router.push("/checkout/payment")}
          >
            Continue to payment
            <ArrowRight size={17} />
          </Button>
        </div>
      </div>
    </CheckoutShell>
  );
}
