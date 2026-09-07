"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import type { Address, Offer } from "@/lib/types";
import { CheckoutAside, CheckoutShell } from "@/components/checkout/shell";
import { OrderSummary } from "@/components/cart/order-summary";
import { AddressForm } from "@/components/checkout/address-form";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/ui/field";
import { useStore } from "@/store/store";
import { computeTotals, evaluateCoupon } from "@/lib/pricing";
import { deliveryOptions } from "@/data/marketing";

export function AddressStep({ offers }: { offers: Offer[] }) {
  const { cart, coupon, checkout, addresses, dispatch, hydrated } = useStore();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A customer who deep-links into this step still needs contact details first.
  useEffect(() => {
    if (hydrated && cart.length > 0 && !checkout.contact) router.replace("/checkout/contact");
  }, [hydrated, cart.length, checkout.contact, router]);

  const itemsTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const applied = offers.find((o) => o.code === coupon) ?? null;
  const check = applied
    ? evaluateCoupon(applied, itemsTotal, [...new Set(cart.map((l) => l.categorySlug))])
    : { ok: false, discount: 0 };
  const totals = computeTotals(cart, {
    delivery: deliveryOptions.find((d) => d.id === checkout.deliveryId) ?? deliveryOptions[0],
    coupon: applied && check.ok ? { code: applied.code, discount: check.discount, type: applied.type } : null,
  });

  function next() {
    if (!checkout.addressId) {
      setError("Choose a delivery address, or add a new one.");
      return;
    }
    router.push("/checkout/delivery");
  }

  return (
    <CheckoutShell
      step="address"
      title="Where should we deliver?"
      description="Pick a saved address or add a new one. You can change this before you pay."
      aside={
        <>
          <CheckoutAside offers={offers} />
          <OrderSummary totals={totals} lines={cart} delivery={null} showDeliveryEstimate={false} />
        </>
      }
    >
      <div className="space-y-4">
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li key={address.id}>
              {editing?.id === address.id ? (
                <div className="rounded-xl border border-brand-700 bg-surface p-5">
                  <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-900">
                    Edit address
                  </h3>
                  <AddressForm
                    initial={address}
                    submitLabel="Update address"
                    onCancel={() => setEditing(null)}
                    onSave={(updated) => {
                      dispatch({ type: "address/update", address: updated });
                      setEditing(null);
                    }}
                  />
                </div>
              ) : (
                <OptionCard
                  selected={checkout.addressId === address.id}
                  onSelect={() => {
                    dispatch({ type: "checkout/patch", patch: { addressId: address.id } });
                    setError(null);
                  }}
                  title={
                    <span className="flex items-center gap-2">
                      {address.fullName}
                      <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-600">
                        {address.label}
                      </span>
                      {address.isDefault && <Badge tone="success">Default</Badge>}
                    </span>
                  }
                  subtitle={
                    <>
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}
                      {address.landmark ? `, ${address.landmark}` : ""}
                      <br />
                      {address.city}, {address.state} {address.pincode}
                      <br />
                      <span className="text-ink-500">Phone: {address.phone}</span>
                    </>
                  }
                >
                  <div className="flex flex-wrap gap-2">
                    <Button size="xs" variant="outline" onClick={() => setEditing(address)}>
                      <Pencil size={12} /> Edit
                    </Button>
                    {addresses.length > 1 && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => dispatch({ type: "address/remove", id: address.id })}
                      >
                        <Trash2 size={12} /> Remove
                      </Button>
                    )}
                  </div>
                </OptionCard>
              )}
            </li>
          ))}
        </ul>

        <AnimatePresence initial={false}>
          {adding ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-brand-700 bg-surface p-5">
                <h3 className="mb-4 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-900">
                  <MapPin size={15} className="text-brand-600" />
                  New delivery address
                </h3>
                <AddressForm
                  onCancel={() => setAdding(false)}
                  onSave={(address) => {
                    dispatch({ type: "address/add", address });
                    setAdding(false);
                    setError(null);
                  }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="add"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-surface/60 py-4 text-[13.5px] font-semibold text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50"
            >
              <Plus size={16} />
              Add a new address
            </motion.button>
          )}
        </AnimatePresence>

        {error && <p className="text-[13px] font-medium text-sale-600">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            href="/checkout/contact"
            className="text-[13px] font-medium text-ink-600 underline-offset-4 hover:text-ink-900 hover:underline"
          >
            Back to contact
          </Link>
          <Button size="lg" className="min-w-[200px]" onClick={next}>
            Continue to delivery
            <ArrowRight size={17} />
          </Button>
        </div>
      </div>
    </CheckoutShell>
  );
}
