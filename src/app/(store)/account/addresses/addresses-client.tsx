"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import type { Address } from "@/lib/types";
import { AddressForm } from "@/components/checkout/address-form";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { removeAddress, saveAddress } from "@/services/commerce";
import { useStore } from "@/store/store";
import { useToast } from "@/components/ui/toast";

/**
 * Addresses belong to the account, so every change is written to the database
 * first. The client store is updated alongside it purely so checkout, which is
 * already open in the same session, sees the change without a round trip.
 */
export function AddressesClient({ addresses }: { addresses: Address[] }) {
  const { dispatch } = useStore();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function persist(address: Address, message: string, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await saveAddress(address);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      dispatch({
        type: address.id === result.data.id && addresses.some((a) => a.id === address.id)
          ? "address/update"
          : "address/add",
        address: { ...address, id: result.data.id },
      });
      after?.();
      toast({ title: message, description: address.line1 });
      router.refresh();
    });
  }

  function drop(address: Address) {
    setError(null);
    startTransition(async () => {
      const result = await removeAddress(address.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      dispatch({ type: "address/remove", id: address.id });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <h1 className="font-display text-[22px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[34px]">
          Saved addresses
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-600 sm:mt-2 sm:text-[14px]">
          Add the places you order to most. You can pick any of them at checkout.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-[12.5px] font-medium text-sale-600 sm:text-[13px]">
            {error}
          </p>
        )}
      </header>

      <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
        {addresses.map((address) => (
          <li key={address.id} className="min-w-0">
            {editing?.id === address.id ? (
              <div className="rounded-xl border border-brand-700 bg-surface p-4 sm:p-5">
                <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:mb-4 sm:text-[12px]">
                  Edit address
                </h2>
                <AddressForm
                  initial={address}
                  submitLabel="Save changes"
                  onCancel={() => setEditing(null)}
                  onSave={(updated) => persist(updated, "Address updated", () => setEditing(null))}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col rounded-xl border border-hairline bg-surface p-3.5 sm:p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-600">
                    {address.label}
                  </span>
                  {address.isDefault && <Badge tone="success">Default</Badge>}
                </div>
                <p className="break-words text-[13px] font-semibold text-ink-950 sm:text-[13.5px]">
                  {address.fullName}
                </p>
                <p className="mt-1 break-words text-[12.5px] leading-relaxed text-ink-600">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  {address.landmark ? `, ${address.landmark}` : ""}
                  <br />
                  {address.city}, {address.state} {address.pincode}
                  <br />
                  {address.phone}
                </p>
                {/* Taller on a phone so each action is a comfortable tap. */}
                <div className="mt-auto flex flex-wrap gap-2 pt-2.5 sm:pt-3">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setEditing(address)}
                    className="h-10 sm:h-8"
                  >
                    <Pencil size={12} /> Edit
                  </Button>
                  {!address.isDefault && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => persist({ ...address, isDefault: true }, "Default address updated")}
                      className="h-10 sm:h-8"
                    >
                      <Star size={12} /> Make default
                    </Button>
                  )}
                  {addresses.length > 1 && (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="h-10 text-sale-600 sm:h-8"
                      onClick={() => drop(address)}
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
            <div className="rounded-xl border border-brand-700 bg-surface p-4 sm:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:mb-4 sm:text-[12px]">
                <MapPin size={14} className="text-brand-600" /> New address
              </h2>
              <AddressForm
                onCancel={() => setAdding(false)}
                onSave={(address) => persist(address, "Address saved", () => setAdding(false))}
              />
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="tap flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-surface/60 py-3.5 text-[13px] font-semibold text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50 sm:py-4 sm:text-[13.5px]"
          >
            <Plus size={16} /> Add a new address
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
