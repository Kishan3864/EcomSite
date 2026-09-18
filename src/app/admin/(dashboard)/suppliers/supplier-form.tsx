"use client";

import { useActionState } from "react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, FormSection, Label, inputCls, textareaCls } from "@/components/admin/ui";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { Form } from "@/components/ui/form";

export interface SupplierFormValues {
  name: string;
  slug: string;
  contactName: string;
  phone: string;
  email: string;
  gstin: string;
  city: string;
  notes: string;
  isActive: boolean;
}

/**
 * Wholesaler form — the brand form's twin, uncontrolled inputs plus
 * `useActionState`, so one component serves create (action = createSupplier)
 * and edit (action bound to the id).
 */
export function SupplierForm({
  action,
  initial,
  submitLabel = "Save wholesaler",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Partial<SupplierFormValues>;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <Form action={formAction} className="grid gap-5">
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

      <FormSection
        title="Who they are"
        description="Your own record of the wholesaler. None of this is ever shown to a shopper."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-name">Wholesaler name</Label>
            <input id="s-name" name="name" defaultValue={initial?.name ?? ""} className={inputCls} placeholder="Sadar Bazar Traders" required />
            <FieldError>{err("name")}</FieldError>
          </div>
          <div>
            <Label htmlFor="s-slug" hint="Used by the products filter. Leave blank to derive from the name.">
              Slug
            </Label>
            <input id="s-slug" name="slug" defaultValue={initial?.slug ?? ""} className={inputCls} placeholder="auto" />
            <FieldError>{err("slug")}</FieldError>
          </div>
          <div>
            <Label htmlFor="s-contact" hint="The person you actually deal with.">
              Contact person
            </Label>
            <input id="s-contact" name="contactName" defaultValue={initial?.contactName ?? ""} className={inputCls} placeholder="Ramesh bhai" required />
            <FieldError>{err("contactName")}</FieldError>
          </div>
          <div>
            <Label htmlFor="s-phone">Phone</Label>
            <input id="s-phone" name="phone" type="tel" defaultValue={initial?.phone ?? ""} className={inputCls} placeholder="+91 98450 12345" required />
            <FieldError>{err("phone")}</FieldError>
          </div>
          <div>
            <Label htmlFor="s-email" optional>
              Email
            </Label>
            <input id="s-email" name="email" type="email" defaultValue={initial?.email ?? ""} className={inputCls} placeholder="orders@example.com" />
            <FieldError>{err("email")}</FieldError>
          </div>
          <div>
            <Label htmlFor="s-city" optional>
              City or market
            </Label>
            <input id="s-city" name="city" defaultValue={initial?.city ?? ""} className={inputCls} placeholder="Delhi — Sadar Bazar" />
            <FieldError>{err("city")}</FieldError>
          </div>
          <div>
            <Label htmlFor="s-gstin" hint="15 characters. Lets you match a purchase invoice back to this row." optional>
              GSTIN
            </Label>
            <input
              id="s-gstin"
              name="gstin"
              maxLength={15}
              defaultValue={initial?.gstin ?? ""}
              className={`${inputCls} font-mono text-[13px] uppercase`}
              placeholder="07AABCU9603R1ZM"
            />
            <FieldError>{err("gstin")}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="s-notes" hint="Terms, minimum order, which lane they sit in — whatever you want to remember." optional>
              Notes
            </Label>
            <textarea id="s-notes" name="notes" rows={4} defaultValue={initial?.notes ?? ""} className={textareaCls} />
            <FieldError>{err("notes")}</FieldError>
          </div>
        </div>
      </FormSection>

      <FormSection title="Still buying from them?">
        <label className="flex cursor-pointer items-start gap-3 text-[13.5px] text-ink-800">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initial?.isActive ?? true}
            className="mt-0.5 h-4 w-4 accent-[var(--color-brand-700)]"
          />
          <span>
            <span className="block font-medium">Active</span>
            <span className="block text-[12.5px] text-ink-500">
              An inactive wholesaler drops out of the product picker, but every product already bought from them keeps
              its record.
            </span>
          </span>
        </label>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </Form>
  );
}
