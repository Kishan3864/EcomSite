"use client";

import { useActionState, useRef, useState } from "react";
import { Copy } from "lucide-react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, FormSection, Label, inputCls, selectArrow, selectCls, textareaCls } from "@/components/admin/ui";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";
import type { OfferType } from "@/generated/prisma/client";
import { formatDate, formatINR } from "@/lib/utils";
import { OFFER_TYPE, OFFER_TYPES } from "./lib";

export interface OfferFormValues {
  code: string;
  title: string;
  description: string;
  type: OfferType;
  value: string;
  minSpend: string;
  maxDiscount: string;
  categoryId: string;
  accent: string;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
  isActive: boolean;
}

export interface CategoryOption {
  id: string;
  name: string;
}

const DEFAULTS: OfferFormValues = {
  code: "",
  title: "",
  description: "",
  type: "PERCENT",
  value: "",
  minSpend: "0",
  maxDiscount: "",
  categoryId: "",
  accent: "#2c837c",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  isActive: true,
};

const SWATCHES = ["#2c837c", "#b8860b", "#c94f3d", "#3b4a9e", "#7a3b69", "#1f1f1c"];

const VALUE_LABEL: Record<OfferType, { label: string; hint: string; placeholder: string }> = {
  PERCENT: { label: "Percent off", hint: "1–100. Cap it with a maximum discount.", placeholder: "10" },
  FLAT: { label: "Discount in rupees", hint: "Taken off the order subtotal.", placeholder: "500" },
  SHIPPING: { label: "Shipping charge waived", hint: "The delivery fee this code removes, in rupees.", placeholder: "99" },
  BANK: { label: "Instant discount percent", hint: "Applied at the payment step for the named bank.", placeholder: "15" },
};

function readForm(form: HTMLFormElement): OfferFormValues {
  const fd = new FormData(form);
  const g = (k: string) => String(fd.get(k) ?? "");
  const type = OFFER_TYPES.find((t) => t === g("type")) ?? "PERCENT";
  return {
    code: g("code").toUpperCase().replace(/\s+/g, ""),
    title: g("title"),
    description: g("description"),
    type,
    value: g("value"),
    minSpend: g("minSpend"),
    maxDiscount: g("maxDiscount"),
    categoryId: g("categoryId"),
    accent: g("accent") || "#2c837c",
    startsAt: g("startsAt"),
    expiresAt: g("expiresAt"),
    usageLimit: g("usageLimit"),
    isActive: fd.get("isActive") === "on",
  };
}

/**
 * Create + edit form for coupons. Inputs stay uncontrolled (defaultValue) so
 * the server action owns validation; a light `onChange` on the form keeps the
 * storefront-style preview card in sync.
 */
export function OfferForm({
  action,
  initial,
  categories,
  submitLabel = "Save offer",
  aside,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Partial<OfferFormValues>;
  categories: CategoryOption[];
  submitLabel?: string;
  aside?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);
  const [preview, setPreview] = useState<OfferFormValues>({ ...DEFAULTS, ...initial });
  const accentRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const valueMeta = VALUE_LABEL[preview.type];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form
        ref={formRef}
        action={formAction}
        onChange={(e) => setPreview(readForm(e.currentTarget))}
        className="grid gap-5"
      >
        {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
        {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

        <FormSection title="Code & copy" description="The code is what shoppers type; the title and description are what they read.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="offer-code" hint="Letters, numbers, hyphens. Saved in upper case.">
                Coupon code
              </Label>
              <input
                id="offer-code"
                name="code"
                defaultValue={initial?.code ?? ""}
                className={`${inputCls} font-mono uppercase tracking-[0.06em]`}
                placeholder="FESTIVE500"
                maxLength={20}
                autoCapitalize="characters"
                spellCheck={false}
                required
              />
              <FieldError>{err("code")}</FieldError>
            </div>
            <div>
              <Label htmlFor="offer-title">Title</Label>
              <input id="offer-title" name="title" defaultValue={initial?.title ?? ""} className={inputCls} placeholder="₹500 off the festive edit" required />
              <FieldError>{err("title")}</FieldError>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="offer-description" hint="Plain language, one or two sentences. Shown on the coupon card.">
                Description
              </Label>
              <textarea
                id="offer-description"
                name="description"
                rows={3}
                defaultValue={initial?.description ?? ""}
                className={textareaCls}
                placeholder="Flat ₹500 off orders over ₹4,999. Applies to everything, once per customer."
                required
              />
              <FieldError>{err("description")}</FieldError>
            </div>
          </div>
        </FormSection>

        <FormSection title="Discount" description="What the code does. Amounts are whole rupees.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="offer-type">Type</Label>
              <select id="offer-type" name="type" defaultValue={initial?.type ?? "PERCENT"} className={selectCls} style={selectArrow}>
                {OFFER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {OFFER_TYPE[t].label}
                  </option>
                ))}
              </select>
              <FieldError>{err("type")}</FieldError>
            </div>
            <div>
              <Label htmlFor="offer-value" hint={valueMeta.hint}>
                {valueMeta.label}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] text-ink-400">
                  {OFFER_TYPE[preview.type].unit}
                </span>
                <input
                  id="offer-value"
                  name="value"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  defaultValue={initial?.value ?? ""}
                  className={`${inputCls} pl-7`}
                  placeholder={valueMeta.placeholder}
                  required
                />
              </div>
              <FieldError>{err("value")}</FieldError>
            </div>
            <div>
              <Label htmlFor="offer-minSpend" hint="0 means no minimum.">
                Minimum order value
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] text-ink-400">₹</span>
                <input
                  id="offer-minSpend"
                  name="minSpend"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  defaultValue={initial?.minSpend ?? "0"}
                  className={`${inputCls} pl-7`}
                />
              </div>
              <FieldError>{err("minSpend")}</FieldError>
            </div>
            <div>
              <Label htmlFor="offer-maxDiscount" optional hint="Caps percentage and bank offers.">
                Maximum discount
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] text-ink-400">₹</span>
                <input
                  id="offer-maxDiscount"
                  name="maxDiscount"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  defaultValue={initial?.maxDiscount ?? ""}
                  className={`${inputCls} pl-7`}
                  placeholder="No cap"
                />
              </div>
              <FieldError>{err("maxDiscount")}</FieldError>
            </div>
            <div>
              <Label htmlFor="offer-category" optional hint="Leave on Sitewide to apply to every product.">
                Category scope
              </Label>
              <select id="offer-category" name="categoryId" defaultValue={initial?.categoryId ?? ""} className={selectCls} style={selectArrow}>
                <option value="">Sitewide</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError>{err("categoryId")}</FieldError>
            </div>
            <div>
              <Label htmlFor="offer-accent" hint="Colour of the card stripe and type badge.">
                Accent colour
              </Label>
              <div className="flex items-center gap-2">
                <input
                  ref={accentRef}
                  id="offer-accent"
                  name="accent"
                  type="color"
                  defaultValue={initial?.accent ?? "#2c837c"}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-ink-200 bg-canvas p-1"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      aria-label={`Use ${hex}`}
                      onClick={() => {
                        if (accentRef.current) accentRef.current.value = hex;
                        if (formRef.current) setPreview(readForm(formRef.current));
                      }}
                      className="h-6 w-6 rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.12)] transition-transform hover:scale-110"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                  <span className="ml-1 font-mono text-[12px] text-ink-500">{preview.accent}</span>
                </div>
              </div>
              <FieldError>{err("accent")}</FieldError>
            </div>
          </div>
        </FormSection>

        <FormSection title="Validity & limits" description="Offers are only visible between the start and expiry, and only while active.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="offer-startsAt" hint="Leave blank to start immediately.">
                Starts
              </Label>
              <input id="offer-startsAt" name="startsAt" type="datetime-local" defaultValue={initial?.startsAt ?? ""} className={inputCls} />
              <FieldError>{err("startsAt")}</FieldError>
            </div>
            <div>
              <Label htmlFor="offer-expiresAt">Expires</Label>
              <input id="offer-expiresAt" name="expiresAt" type="datetime-local" defaultValue={initial?.expiresAt ?? ""} className={inputCls} required />
              <FieldError>{err("expiresAt")}</FieldError>
            </div>
            <div>
              <Label htmlFor="offer-usageLimit" optional hint="Total redemptions across all customers.">
                Usage limit
              </Label>
              <input
                id="offer-usageLimit"
                name="usageLimit"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                defaultValue={initial?.usageLimit ?? ""}
                className={inputCls}
                placeholder="Unlimited"
              />
              <FieldError>{err("usageLimit")}</FieldError>
            </div>
            <label className="flex cursor-pointer items-start gap-3 self-end pb-2 text-[13.5px] text-ink-800">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={initial?.isActive ?? true}
                className="mt-0.5 h-4 w-4 accent-[var(--color-brand-700)]"
              />
              <span>
                <span className="block font-medium">Active</span>
                <span className="block text-[12.5px] text-ink-500">Inactive codes are rejected at checkout and hidden from /offers.</span>
              </span>
            </label>
          </div>
          <FieldError>{err("isActive")}</FieldError>
        </FormSection>

        <div className="flex items-center justify-end gap-2">
          <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
        </div>
      </form>

      <aside className="space-y-4">
        <div>
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">Storefront preview</p>
          <CouponPreview values={preview} categoryName={categories.find((c) => c.id === preview.categoryId)?.name} />
        </div>
        {aside}
      </aside>
    </div>
  );
}

/** Static twin of the storefront `CouponCodeCard` so the owner sees what shoppers will. */
function CouponPreview({ values, categoryName }: { values: OfferFormValues; categoryName?: string }) {
  const accent = /^#[0-9a-f]{6}$/i.test(values.accent) ? values.accent : "#2c837c";
  const minSpend = Number(values.minSpend) || 0;
  const maxDiscount = Number(values.maxDiscount) || 0;
  const expires = values.expiresAt ? new Date(values.expiresAt) : null;
  const expiresValid = expires && !Number.isNaN(expires.getTime());

  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent }} />
      <span className="absolute -left-2 top-1/2 h-4 w-4 rounded-full bg-canvas" aria-hidden />
      <span className="absolute -right-2 top-1/2 h-4 w-4 rounded-full bg-canvas" aria-hidden />

      <div className="flex-1 p-5">
        <span
          className="inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
          style={{ backgroundColor: accent }}
        >
          {OFFER_TYPE[values.type].label}
        </span>
        <h3 className="mt-3 text-[16px] font-semibold leading-snug text-ink-950">
          {values.title || <span className="text-ink-300">Offer title</span>}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
          {values.description || <span className="text-ink-300">A plain-language description of what the code does.</span>}
        </p>
        <ul className="mt-4 space-y-1 text-[12px] text-ink-500">
          <li>Minimum order {formatINR(minSpend)}</li>
          {maxDiscount > 0 && <li>Maximum discount {formatINR(maxDiscount)}</li>}
          <li>Valid until {expiresValid ? formatDate(expires, "short") : <span className="text-ink-300">—</span>}</li>
          {categoryName && (
            <li>
              Applies to <span className="font-medium text-brand-700">{categoryName}</span> only
            </li>
          )}
        </ul>
      </div>

      <div className="border-t border-dashed border-ink-300 p-4">
        <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-ink-50 px-4 py-3">
          <code className="font-mono text-[14px] font-bold tracking-[0.08em] text-ink-950">
            {values.code || <span className="text-ink-300">CODE</span>}
          </code>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-700">
            <Copy size={13} /> Copy
          </span>
        </div>
      </div>
    </article>
  );
}
