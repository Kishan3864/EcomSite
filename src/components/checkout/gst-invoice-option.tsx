"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Field, Input } from "@/components/ui/field";

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/;

/**
 * A business buying for the company needs its own GSTIN on the invoice to claim
 * the input credit. Kept behind a checkbox because it is meaningless to the
 * shoppers who make up most of the orders.
 */
export function GstInvoiceOption({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(Boolean(value));
  const [draft, setDraft] = useState(value ?? "");

  const trimmed = draft.trim().toUpperCase();
  const invalid = trimmed.length > 0 && !GSTIN.test(trimmed);

  function set(next: string) {
    setDraft(next);
    const clean = next.trim().toUpperCase();
    // Only a well-formed number is carried forward; a half-typed one would end
    // up printed on a document the buyer files with their return.
    onChange(GSTIN.test(clean) ? clean : null);
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={open}
          onChange={(e) => {
            setOpen(e.target.checked);
            if (!e.target.checked) {
              setDraft("");
              onChange(null);
            }
          }}
          className="mt-0.5 h-4 w-4 accent-[var(--color-brand-700)]"
        />
        <span>
          <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-950 sm:text-[14px]">
            <Building2 size={15} className="text-brand-600" />
            This is a business purchase
          </span>
          <span className="mt-1 block text-[12.5px] text-ink-600">
            Add your GSTIN and it goes on the tax invoice, so your business can claim the input
            credit.
          </span>
        </span>
      </label>

      {open && (
        <Field
          label="GSTIN"
          htmlFor="buyer-gstin"
          className="mt-3 sm:mt-4"
          error={invalid ? "A GSTIN is 15 characters, like 29ABCDE1234F1Z5." : undefined}
          hint="Fifteen characters, exactly as it appears on your registration certificate."
        >
          <Input
            id="buyer-gstin"
            value={draft}
            maxLength={15}
            autoComplete="off"
            spellCheck={false}
            invalid={invalid}
            onChange={(e) => set(e.target.value)}
            placeholder="29ABCDE1234F1Z5"
            className="font-mono uppercase"
          />
        </Field>
      )}
    </div>
  );
}
