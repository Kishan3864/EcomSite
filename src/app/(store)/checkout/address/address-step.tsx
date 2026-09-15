"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import type { Address } from "@/lib/types";
import { CheckoutAside, CheckoutShell } from "@/components/checkout/shell";
import { OrderSummary } from "@/components/cart/order-summary";
import { AddressForm } from "@/components/checkout/address-form";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/ui/field";
import { useStore } from "@/store/store";
import { removeAddress } from "@/services/commerce";
import { computeTotals } from "@/lib/pricing";


export function AddressStep() {
  const { cart, checkout, addresses, customer, config, dispatch, hydrated } = useStore();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Removing one has to reach the account too, or the next session check
  // quietly puts it back.
  const [, startTransition] = useTransition();

  // A customer who deep-links into this step still needs contact details first.
  useEffect(() => {
    if (hydrated && cart.length > 0 && !checkout.contact) router.replace("/checkout/contact");
  }, [hydrated, cart.length, checkout.contact, router]);
  const totals = computeTotals(cart, {
    delivery: config.deliveryOptions.find((d) => d.id === checkout.deliveryId) ?? config.deliveryOptions[0],
    rates: config.rates,
  });

  function next() {
    if (!checkout.addressId) {
      setError("Choose a delivery address, or add a new one.");
      return;
    }
    router.push("/checkout/payment");
  }

  return (
    <CheckoutShell
      step="address"
      title="Where should we deliver?"
      description="Pick a saved address or add a new one. You can change this before you pay."
      aside={
        <>
          <CheckoutAside />
          <OrderSummary totals={totals} lines={cart} delivery={null} showDeliveryEstimate={false} />
        </>
      }
      total={totals.total}
      action={
        <Button
          size="lg"
          className="w-full px-4 sm:w-auto sm:min-w-[240px] sm:px-8"
          onClick={next}
        >
          Continue to delivery
          <ArrowRight size={17} />
        </Button>
      }
    >
      <div className="space-y-3 sm:space-y-4">
        <ul className="space-y-2 sm:space-y-3">
          {addresses.map((address) => (
            <li key={address.id}>
              {editing?.id === address.id ? (
                <div className="bg-surface p-4 sm:p-5">
                  <h3 className="mb-4 pb-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    Edit address
                  </h3>
                  <AddressForm
                    initial={address}
                    submitLabel="Update address"
                    onCancel={() => setEditing(null)}
                    onSave={(updated) => {
                      dispatch({ type: "address/update", address: updated });
                      dispatch({ type: "address/sync", address: updated });
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
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 lg:flex-nowrap">
                      {address.fullName}
                      {/* An outlined stamp rather than a grey pill: the chip is a
                          label on a repeating row and has no business carrying a
                          fill of its own. */}
                      <span className="px-1.5 py-0.5 text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-ink-500">
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
                      {address.city}, {address.state}{" "}
                      <span className="tabular-nums">{address.pincode}</span>
                      <br />
                      <span className="text-ink-500">
                        Phone: <span className="tabular-nums">{address.phone}</span>
                      </span>
                    </>
                  }
                >
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      className="h-10 sm:h-8"
                      onClick={() => setEditing(address)}
                    >
                      <Pencil size={12} /> Edit
                    </Button>
                    {addresses.length > 1 && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="h-10 sm:h-8"
                        onClick={() => {
                          setError(null);
                          if (!customer) {
                            dispatch({ type: "address/remove", id: address.id });
                            return;
                          }
                          // Only once the account agrees: dropping it here first
                          // would move the delivery choice to another address and
                          // then hand the customer back one that still exists.
                          startTransition(async () => {
                            const result = await removeAddress(address.id);
                            if (!result.ok) {
                              setError(result.error);
                              return;
                            }
                            dispatch({ type: "address/remove", id: address.id });
                          });
                        }}
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
              <div className="bg-surface p-4 sm:p-5">
                <h3 className="mb-4 pb-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  New delivery address
                </h3>
                <AddressForm
                  onCancel={() => setAdding(false)}
                  onSave={(address) => {
                    dispatch({ type: "address/add", address });
                    dispatch({ type: "address/sync", address });
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
              className="tap flex w-full items-center justify-center gap-2 bg-surface py-4 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-ink-50"
            >
              <Plus size={15} />
              Add a new address
            </motion.button>
          )}
        </AnimatePresence>

        {error && (
          <p role="alert" className="text-[13px] font-medium text-sale-600">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* A 40px touch target on phones; the negative margin keeps the row. */}
          <Link
            href="/checkout/contact"
            className="-my-2.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500 transition-colors duration-200 hover:text-ink-950 lg:my-0 lg:py-0"
          >
            Back to contact
          </Link>
          <Button size="lg" className="hidden min-w-[200px] lg:inline-flex" onClick={next}>
            Continue to delivery
            <ArrowRight size={17} />
          </Button>
        </div>
      </div>
    </CheckoutShell>
  );
}
