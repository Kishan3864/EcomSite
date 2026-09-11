"use client";

import { useState } from "react";
import type { Address } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { INDIAN_STATES } from "@/data/marketing";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";

const EMPTY: Omit<Address, "id"> = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "Karnataka",
  pincode: "",
  isDefault: false,
};

export function AddressForm({
  initial,
  onSave,
  onCancel,
  submitLabel = "Save address",
}: {
  initial?: Address;
  onSave: (address: Address) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<Omit<Address, "id">>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof Omit<Address, "id">>(key: K, value: Omit<Address, "id">[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.fullName.trim().length < 2) next.fullName = "Enter the recipient's name.";
    if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(form.phone.replace(/\s/g, "")))
      next.phone = "Enter a 10-digit mobile number.";
    if (form.line1.trim().length < 5) next.line1 = "Flat, house or building is required.";
    if (form.city.trim().length < 2) next.city = "Enter your city.";
    if (!/^\d{6}$/.test(form.pincode)) next.pincode = "Enter a valid 6-digit pincode.";

    setErrors(next);
    if (Object.keys(next).length) return;

    onSave({ ...form, id: initial?.id ?? `addr_${Date.now().toString(36)}` });
  }

  return (
    <Form onSubmit={submit} className="space-y-3 sm:space-y-4">
      <div>
        <span className="mb-1.5 block text-[12.5px] font-medium text-ink-800 sm:mb-2">
          Address type
        </span>
        <div className="flex gap-2">
          {(["Home", "Work", "Other"] as const).map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => set("label", label)}
              aria-pressed={form.label === label}
              className={cn(
                "tap min-h-10 rounded-lg border px-4 py-2 text-[12.5px] font-medium transition-colors sm:min-h-0 sm:text-[13px]",
                form.label === label
                  ? "border-brand-900 bg-brand-900 text-white"
                  : "border-ink-200 bg-surface text-ink-700 hover:border-ink-400",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
          <Input
            id="fullName"
            autoComplete="name"
            value={form.fullName}
            invalid={Boolean(errors.fullName)}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Recipient name"
          />
        </Field>

        <Field label="Mobile number" htmlFor="addrPhone" error={errors.phone}>
          <Input
            id="addrPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            invalid={Boolean(errors.phone)}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+91 98450 12345"
          />
        </Field>

        <Field
          label="Flat, house no, building"
          htmlFor="line1"
          error={errors.line1}
          className="sm:col-span-2"
        >
          <Input
            id="line1"
            autoComplete="address-line1"
            value={form.line1}
            invalid={Boolean(errors.line1)}
            onChange={(e) => set("line1", e.target.value)}
            placeholder="402, Brigade Sanctuary"
          />
        </Field>

        <Field
          label="Area, street, sector"
          htmlFor="line2"
          optional
          className="sm:col-span-2"
        >
          <Input
            id="line2"
            autoComplete="address-line2"
            value={form.line2 ?? ""}
            onChange={(e) => set("line2", e.target.value)}
            placeholder="HSR Layout Sector 3"
          />
        </Field>

        <Field label="Landmark" htmlFor="landmark" optional className="sm:col-span-2">
          <Input
            id="landmark"
            value={form.landmark ?? ""}
            onChange={(e) => set("landmark", e.target.value)}
            placeholder="Opposite the BDA park"
          />
        </Field>

        <Field label="Pincode" htmlFor="pincode" error={errors.pincode}>
          <Input
            id="pincode"
            inputMode="numeric"
            autoComplete="postal-code"
            value={form.pincode}
            invalid={Boolean(errors.pincode)}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="560102"
          />
        </Field>

        <Field label="City" htmlFor="city" error={errors.city}>
          <Input
            id="city"
            autoComplete="address-level2"
            value={form.city}
            invalid={Boolean(errors.city)}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Bengaluru"
          />
        </Field>

        <Field label="State" htmlFor="state" className="sm:col-span-2">
          <Select
            id="state"
            autoComplete="address-level1"
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
          >
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-[12.5px] text-ink-700 sm:min-h-0 sm:text-[13px]">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => set("isDefault", e.target.checked)}
          className="h-4 w-4 shrink-0 accent-[var(--color-brand-700)]"
        />
        Make this my default delivery address
      </label>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" className="flex-1 sm:flex-initial">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </Form>
  );
}
