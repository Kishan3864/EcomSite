"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import type { Address } from "@/lib/types";
import { AddressForm } from "@/components/checkout/address-form";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/store";
import { useToast } from "@/components/ui/toast";

export function AddressesClient() {
  const { addresses, dispatch, hydrated } = useStore();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const toast = useToast();

  if (!hydrated) return <div className="skeleton h-64 rounded-xl" />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-[28px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[34px]">
          Saved addresses
        </h1>
        <p className="mt-2 text-[14px] text-ink-600">
          Add the places you order to most. You can pick any of them at checkout.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {addresses.map((address) => (
          <li key={address.id}>
            {editing?.id === address.id ? (
              <div className="rounded-xl border border-brand-700 bg-surface p-5">
                <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
                  Edit address
                </h2>
                <AddressForm
                  initial={address}
                  submitLabel="Save changes"
                  onCancel={() => setEditing(null)}
                  onSave={(updated) => {
                    dispatch({ type: "address/update", address: updated });
                    setEditing(null);
                    toast({ title: "Address updated", description: updated.line1 });
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col rounded-xl border border-hairline bg-surface p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-600">
                    {address.label}
                  </span>
                  {address.isDefault && <Badge tone="success">Default</Badge>}
                </div>
                <p className="text-[13.5px] font-semibold text-ink-950">{address.fullName}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-600">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  {address.landmark ? `, ${address.landmark}` : ""}
                  <br />
                  {address.city}, {address.state} {address.pincode}
                  <br />
                  {address.phone}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <Button size="xs" variant="outline" onClick={() => setEditing(address)}>
                    <Pencil size={12} /> Edit
                  </Button>
                  {!address.isDefault && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        dispatch({
                          type: "address/update",
                          address: { ...address, isDefault: true },
                        });
                        toast({ title: "Default address updated", description: address.line1 });
                      }}
                    >
                      <Star size={12} /> Make default
                    </Button>
                  )}
                  {addresses.length > 1 && (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-sale-600"
                      onClick={() => dispatch({ type: "address/remove", id: address.id })}
                    >
                      <Trash2 size={12} /> Remove
                    </Button>
                  )}
                </div>
              </div>
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
              <h2 className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
                <MapPin size={14} className="text-brand-600" /> New address
              </h2>
              <AddressForm
                onCancel={() => setAdding(false)}
                onSave={(address) => {
                  dispatch({ type: "address/add", address });
                  setAdding(false);
                  toast({ title: "Address saved", description: address.line1 });
                }}
              />
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-surface/60 py-4 text-[13.5px] font-semibold text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50"
          >
            <Plus size={16} /> Add a new address
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
