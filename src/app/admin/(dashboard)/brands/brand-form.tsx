"use client";

import { useActionState } from "react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, FormSection, Label, inputCls, textareaCls } from "@/components/admin/ui";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";

export interface BrandFormValues {
  name: string;
  slug: string;
  logoText: string;
  tagline: string;
  origin: string;
  description: string;
  isActive: boolean;
}

/**
 * Reference admin form. Uncontrolled inputs + `useActionState`, so the same
 * component serves create (action = createBrand) and edit (action bound to id).
 */
export function BrandForm({
  action,
  initial,
  submitLabel = "Save brand",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Partial<BrandFormValues>;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <form action={formAction} className="grid gap-5">
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

      <FormSection title="Identity" description="What customers see on product pages and in filters.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="brand-name">Brand name</Label>
            <input id="brand-name" name="name" defaultValue={initial?.name ?? ""} className={inputCls} required />
            <FieldError>{err("name")}</FieldError>
          </div>
          <div>
            <Label htmlFor="brand-slug" hint="Used in URLs. Leave blank to derive from the name.">
              Slug
            </Label>
            <input id="brand-slug" name="slug" defaultValue={initial?.slug ?? ""} className={inputCls} placeholder="auto" />
            <FieldError>{err("slug")}</FieldError>
          </div>
          <div>
            <Label htmlFor="brand-logo" optional>
              Logo text
            </Label>
            <input id="brand-logo" name="logoText" defaultValue={initial?.logoText ?? ""} className={inputCls} placeholder="Wordmark as displayed" />
          </div>
          <div>
            <Label htmlFor="brand-origin">Based in</Label>
            <input id="brand-origin" name="origin" defaultValue={initial?.origin ?? ""} className={inputCls} placeholder="Bengaluru" required />
            <FieldError>{err("origin")}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="brand-tagline">Tagline</Label>
            <input id="brand-tagline" name="tagline" defaultValue={initial?.tagline ?? ""} className={inputCls} placeholder="One line on what they make" required />
            <FieldError>{err("tagline")}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="brand-description" optional>
              About the brand
            </Label>
            <textarea id="brand-description" name="description" rows={4} defaultValue={initial?.description ?? ""} className={textareaCls} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Visibility">
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
              Inactive brands are hidden from filters and the brand strip; their products stay visible.
            </span>
          </span>
        </label>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
