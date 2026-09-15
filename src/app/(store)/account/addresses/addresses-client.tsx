"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import type { Address } from "@/lib/types";
import { AddressForm } from "@/components/checkout/address-form";
import { Button } from "@/components/ui/button";
import { removeAddress, saveAddress } from "@/services/commerce";
import { useStore } from "@/store/store";
import { useToast } from "@/components/ui/toast";

/**
 * Addresses belong to the account, so every change is written to the database
 * first. The client store is updated alongside it purely so checkout, which is
 * already open in the same session, sees the change without a round trip.
 *
 * The saved addresses sit on the shop's hairline grid — the same `.tile-grid`
 * the homepage lays departments and products out on — rather than each drawing
 * its own rounded box. Two of them side by side share one rule between them,
 * which is the whole point of the grid.
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
    <div className="space-y-5 sm:space-y-6">
      <header>
        <span className="eyebrow">Your account</span>
        <h1 className="mt-2 font-display text-[22px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-3 sm:text-[32px]">
          Saved addresses
        </h1>
        <p className="mt-2 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:text-[15px]">
          Add the places you order to most. You can pick any of them at checkout.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-3 border-l-2 border-sale-600 bg-sale-50 px-3.5 py-3 text-[13px] leading-[1.5] text-sale-600"
          >
            {error}
          </p>
        )}
      </header>

      {addresses.length > 0 && (
        <ul className="tile-grid grid-cols-1 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="min-w-0">
              {editing?.id === address.id ? (
                <div className="p-4 sm:p-5">
                  <h2 className="mb-3.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
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
                <div className="flex h-full flex-col p-4 sm:p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      {address.label}
                    </span>
                    {address.isDefault && (
                      <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="break-words text-[13.5px] font-semibold text-ink-950">
                    {address.fullName}
                  </p>
                  <p className="mt-1 break-words text-[13px] leading-[1.6] text-ink-600">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                    {address.landmark ? `, ${address.landmark}` : ""}
                    <br />
                    <span className="tabular-nums">
                      {address.city}, {address.state} {address.pincode}
                    </span>
                    <br />
                    <span className="tabular-nums">{address.phone}</span>
                  </p>
                  {/* Taller on a phone so each action is a comfortable tap. */}
                  <div className="mt-auto flex flex-wrap gap-2 pt-3.5">
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
      )}

      <AnimatePresence initial={false}>
        {adding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
              <h2 className="mb-3.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                New address
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
            className="tap flex h-12 w-full items-center justify-center gap-2 border border-ink-950 bg-surface text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-200 hover:bg-ink-950 hover:text-white sm:text-[12px]"
          >
            <Plus size={15} /> Add a new address
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
