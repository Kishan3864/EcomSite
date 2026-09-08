"use client";

import { useActionState } from "react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, FormSection, Label, inputCls, selectArrow, selectCls, textareaCls } from "@/components/admin/ui";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { LOYALTY_POINTS_MAX, TIER_OPTIONS } from "./customer-meta";

export interface CustomerFormValues {
  name: string;
  phone: string;
  tier: string;
  loyaltyPoints: number;
  isActive: boolean;
  notes: string;
}

/**
 * Edit form for a customer. E-mail is deliberately not editable here — it is
 * the sign-in identity and changing it silently would lock the shopper out.
 */
export function CustomerForm({
  action,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: CustomerFormValues;
}) {
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <form action={formAction} className="grid gap-5">
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

      <FormSection title="Contact" description="What appears on invoices, packing slips and support replies.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="customer-name">Full name</Label>
            <input id="customer-name" name="name" defaultValue={initial.name} className={inputCls} maxLength={80} required />
            <FieldError>{err("name")}</FieldError>
          </div>
          <div>
            <Label htmlFor="customer-phone" optional hint="Indian mobile number; stored as +91 XXXXX XXXXX.">
              Phone
            </Label>
            <input
              id="customer-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={initial.phone}
              className={inputCls}
              placeholder="+91 98450 12345"
            />
            <FieldError>{err("phone")}</FieldError>
          </div>
        </div>
      </FormSection>

      <FormSection title="Loyalty" description="Tier and points drive the perks the shopper sees in their account.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="customer-tier">Tier</Label>
            <select id="customer-tier" name="tier" defaultValue={initial.tier} className={selectCls} style={selectArrow}>
              {TIER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <FieldError>{err("tier")}</FieldError>
          </div>
          <div>
            <Label htmlFor="customer-points" hint="Whole number. Adjustments are recorded in the activity log.">
              Loyalty points
            </Label>
            <input
              id="customer-points"
              name="loyaltyPoints"
              type="number"
              inputMode="numeric"
              min={0}
              max={LOYALTY_POINTS_MAX}
              step={1}
              defaultValue={initial.loyaltyPoints}
              className={inputCls}
              required
            />
            <FieldError>{err("loyaltyPoints")}</FieldError>
          </div>
        </div>
      </FormSection>

      <FormSection title="Internal notes" description="Only staff see this. Never shown to the customer.">
        <div>
          <textarea
            id="customer-notes"
            name="notes"
            rows={4}
            maxLength={2000}
            defaultValue={initial.notes}
            className={textareaCls}
            placeholder="Delivery preferences, past support issues, anything the next person picking up the phone should know…"
            aria-label="Internal notes"
          />
          <FieldError>{err("notes")}</FieldError>
        </div>
      </FormSection>

      <FormSection title="Access">
        <label className="flex cursor-pointer items-start gap-3 text-[13.5px] text-ink-800">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initial.isActive}
            className="mt-0.5 h-4 w-4 accent-[var(--color-brand-700)]"
          />
          <span>
            <span className="block font-medium">Active</span>
            <span className="block text-[12.5px] text-ink-500">
              Inactive customers cannot sign in or place orders from their account. Their order history is kept.
            </span>
          </span>
        </label>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <SubmitButton pendingText="Saving…">Save customer</SubmitButton>
      </div>
    </form>
  );
}
