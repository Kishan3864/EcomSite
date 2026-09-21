"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Briefcase, Home, MapPin, Pencil, Phone, Plus, Star, Trash2 } from "lucide-react";
import type { Address } from "@/lib/types";
import { AddressForm } from "@/components/checkout/address-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/primitives";
import { removeAddress, saveAddress } from "@/services/commerce";
import { useStore } from "@/store/store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** A glyph for the address label; anything unfamiliar gets a pin. */
function labelIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("home")) return Home;
  if (l.includes("work") || l.includes("office")) return Briefcase;
  return MapPin;
}

const ADD_TILE =
  "flex w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-line-strong bg-surface p-5 text-[13px] font-semibold text-ink-700 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-800";

/**
 * Addresses belong to the account, so every change is written to the database
 * first; the client store is updated alongside so an open checkout sees it.
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
      <PageHeader
        className="pb-0 pt-1 sm:pb-0 sm:pt-0"
        crumbs={[
          { name: "Home", href: "/" },
          { name: "My account", href: "/account" },
          { name: "Saved addresses", href: "/account/addresses" },
        ]}
        title="Saved addresses"
        description="Add the places you order to most. You can pick any of them at checkout."
      />

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-sale-50 px-3.5 py-3 text-[13px] leading-[1.5] text-sale-700 ring-1 ring-inset ring-sale-200"
        >
          <AlertTriangle size={16} className="mt-px shrink-0" />
          {error}
        </p>
      )}

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <section className="card p-4 sm:p-5" aria-labelledby="new-address">
              <div className="mb-4 flex items-center gap-3">
                <span className="icon-tile icon-tile-sm">
                  <Plus size={16} aria-hidden />
                </span>
                <h2 id="new-address" className="t-h3">
                  New address
                </h2>
              </div>
              <AddressForm
                onCancel={() => setAdding(false)}
                onSave={(address) => persist(address, "Address saved", () => setAdding(false))}
              />
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        {addresses.map((address) => {
          const Icon = labelIcon(address.label);
          const isEditing = editing?.id === address.id;
          return (
            <li
              key={address.id}
              className={cn(
                "card min-w-0 p-4 sm:p-5",
                isEditing && "md:col-span-2",
                address.isDefault && !isEditing && "border-brand-200 ring-1 ring-brand-100",
              )}
            >
              {isEditing ? (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="icon-tile icon-tile-sm">
                      <Pencil size={16} aria-hidden />
                    </span>
                    <h2 className="t-h3">Edit address</h2>
                  </div>
                  <AddressForm
                    initial={address}
                    submitLabel="Save changes"
                    onCancel={() => setEditing(null)}
                    onSave={(updated) => persist(updated, "Address updated", () => setEditing(null))}
                  />
                </>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="icon-tile">
                        <Icon size={18} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="t-label">{address.label}</p>
                        <p className="t-h3 mt-1 break-words">{address.fullName}</p>
                      </div>
                    </div>
                    {address.isDefault && (
                      <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-brand-700 px-2.5 text-[11px] font-semibold text-white">
                        <Star size={14} className="fill-current" /> Default
                      </span>
                    )}
                  </div>
                  <p className="t-body mt-3 break-words text-[13px]">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                    {address.landmark ? `, ${address.landmark}` : ""}
                    <br />
                    <span className="tabular-nums">
                      {address.city}, {address.state} {address.pincode}
                    </span>
                  </p>
                  <p className="t-small mt-1.5 inline-flex items-center gap-1.5 tabular-nums">
                    <Phone size={14} aria-hidden /> {address.phone}
                  </p>
                  <div className="flex-1" />
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3.5">
                    <Button size="xs" variant="outline" onClick={() => setEditing(address)} className="h-10 sm:h-8">
                      <Pencil size={14} /> Edit
                    </Button>
                    {!address.isDefault && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => persist({ ...address, isDefault: true }, "Default address updated")}
                        className="h-10 sm:h-8"
                      >
                        <Star size={14} /> Make default
                      </Button>
                    )}
                    {addresses.length > 1 && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="h-10 text-sale-600 hover:bg-sale-50 hover:text-sale-700 sm:h-8"
                        onClick={() => drop(address)}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}

        {!adding && (
          <li className={cn(addresses.length === 0 && "md:col-span-2")}>
            <button type="button" onClick={() => setAdding(true)} className={cn(ADD_TILE, "h-full min-h-[152px]")}>
              <span className="icon-tile">
                <Plus size={18} aria-hidden />
              </span>
              Add a new address
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
