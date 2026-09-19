"use client";

import { useActionState } from "react";
import { Notice } from "@/components/admin/client";
import { FieldError, FormSection, Label, inputCls, textareaCls } from "@/components/admin/ui";
import { INITIAL_FORM, type FormState } from "@/services/admin/form-state";
import {
  saveInventorySettings,
  savePaymentSettings,
  saveShippingSettings,
  saveStoreSettings,
  saveTaxSettings,
} from "@/services/admin/settings-actions";
import type { StoreSettings } from "@/services/settings";
import { Form } from "@/components/ui/form";
import { SaveBar } from "@/components/admin/form-kit";

/* ---------------------------- Shared pieces ---------------------------- */

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/** Every settings tab is one form with one save button and one status line. */
function SettingsForm({
  action,
  children,
  saveLabel = "Save changes",
}: {
  action: Action;
  children: (err: (field: string) => string | undefined) => React.ReactNode;
  saveLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <Form action={formAction} className="grid max-w-3xl gap-4">
      <SaveBar state={state} label={saveLabel} />
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}
      {children(err)}
    </Form>
  );
}

function Field({
  name,
  label,
  hint,
  optional,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
}) {
  return (
    <div>
      <Label htmlFor={name} hint={hint} optional={optional}>
        {label}
      </Label>
      <input id={name} name={name} className={inputCls} {...props} />
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** Rupee input: whole rupees only, with the symbol shown inside the field. */
function Rupees(props: React.InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; hint?: string; error?: string }) {
  const { name, label, hint, error, ...rest } = props;
  return (
    <div>
      <Label htmlFor={name} hint={hint}>
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-400">
          ₹
        </span>
        <input
          id={name}
          name={name}
          type="number"
          min={0}
          step={1}
          className={`${inputCls} pl-7 tabular-nums`}
          {...rest}
        />
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function Toggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 bg-canvas p-3.5 transition-colors">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-brand-800"
      />
      <span>
        <span className="block text-[13px] font-medium text-ink-900">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-500">{description}</span>
      </span>
    </label>
  );
}

/* -------------------------------- Store -------------------------------- */

export function StoreForm({ value }: { value: StoreSettings["store"] }) {
  return (
    <SettingsForm action={saveStoreSettings}>
      {(err) => (
        <>
          <FormSection
            title="Identity"
            description="Used in the header, page titles and transactional copy."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Store name" defaultValue={value.name} error={err("name")} required />
              <Field
                name="legalName"
                label="Registered company name"
                defaultValue={value.legalName}
                error={err("legalName")}
                required
              />
            </div>
            <Field
              name="tagline"
              label="Tagline"
              hint="One short line, shown under the logo in the footer."
              optional
              defaultValue={value.tagline}
            />
          </FormSection>

          <FormSection title="Support" description="Shown on invoices, the contact page and the footer.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="supportEmail"
                label="Support email"
                type="email"
                defaultValue={value.supportEmail}
                error={err("supportEmail")}
                required
              />
              <Field
                name="supportPhone"
                label="Support phone"
                defaultValue={value.supportPhone}
                error={err("supportPhone")}
                required
              />
            </div>
          </FormSection>

          <FormSection title="Legal" description="Printed on every tax invoice.">
            <div>
              <Label htmlFor="address">Registered address</Label>
              <textarea
                id="address"
                name="address"
                rows={3}
                defaultValue={value.address}
                className={textareaCls}
                required
              />
              <FieldError>{err("address")}</FieldError>
            </div>
            <Field
              name="gstin"
              label="GSTIN"
              hint="15 characters, capitals and digits."
              defaultValue={value.gstin}
              error={err("gstin")}
              maxLength={15}
              className={`${inputCls} font-mono uppercase`}
            />
          </FormSection>
        </>
      )}
    </SettingsForm>
  );
}

/* ------------------------------- Shipping ------------------------------- */

export function ShippingForm({ value }: { value: StoreSettings["shipping"] }) {
  return (
    <SettingsForm action={saveShippingSettings}>
      {(err) => (
        <>
          <FormSection
            title="Delivery charges"
            description="Applied at checkout. Set a fee to zero to make that option free for everyone."
          >
            <Rupees
              name="freeThreshold"
              label="Free delivery over"
              hint="Order value at which standard delivery becomes free."
              defaultValue={value.freeThreshold}
              error={err("freeThreshold")}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Rupees
                name="standardFee"
                label="Standard fee"
                defaultValue={value.standardFee}
                error={err("standardFee")}
              />
              <Rupees
                name="expressFee"
                label="Express fee"
                defaultValue={value.expressFee}
                error={err("expressFee")}
              />
              <Rupees
                name="scheduledFee"
                label="Scheduled fee"
                defaultValue={value.scheduledFee}
                error={err("scheduledFee")}
              />
            </div>
          </FormSection>

          <FormSection
            title="Delivery promise"
            description="The working-day range quoted on the product page and at checkout."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Standard delivery</Label>
                <div className="flex items-center gap-2">
                  <input
                    name="standardMin"
                    type="number"
                    min={1}
                    defaultValue={value.standardDays[0]}
                    aria-label="Fastest standard delivery in days"
                    className={`${inputCls} tabular-nums`}
                  />
                  <span className="text-[13px] text-ink-500">to</span>
                  <input
                    name="standardMax"
                    type="number"
                    min={1}
                    defaultValue={value.standardDays[1]}
                    aria-label="Slowest standard delivery in days"
                    className={`${inputCls} tabular-nums`}
                  />
                  <span className="shrink-0 text-[13px] text-ink-500">days</span>
                </div>
                <FieldError>{err("standardMin") ?? err("standardMax")}</FieldError>
              </div>
              <div>
                <Label>Express delivery</Label>
                <div className="flex items-center gap-2">
                  <input
                    name="expressMin"
                    type="number"
                    min={1}
                    defaultValue={value.expressDays[0]}
                    aria-label="Fastest express delivery in days"
                    className={`${inputCls} tabular-nums`}
                  />
                  <span className="text-[13px] text-ink-500">to</span>
                  <input
                    name="expressMax"
                    type="number"
                    min={1}
                    defaultValue={value.expressDays[1]}
                    aria-label="Slowest express delivery in days"
                    className={`${inputCls} tabular-nums`}
                  />
                  <span className="shrink-0 text-[13px] text-ink-500">days</span>
                </div>
                <FieldError>{err("expressMin") ?? err("expressMax")}</FieldError>
              </div>
            </div>
          </FormSection>
        </>
      )}
    </SettingsForm>
  );
}

/* ------------------------------- Payments ------------------------------- */

export function PaymentsForm({ value }: { value: StoreSettings["payments"] }) {
  return (
    <SettingsForm action={savePaymentSettings}>
      {(err) => (
        <>
          <FormSection
            title="Ways to pay"
            description="Three, and they differ by who holds the money on the way to you. Switching one off hides it from the checkout immediately; at least one must stay on. A method whose keys are missing stays hidden whatever this says, so the checkout never offers a dead end."
          >
            <Toggle
              name="upi"
              label="UPI — straight to your bank"
              description="A QR and a tap through to Google Pay, PhonePe or Paytm. No gateway and no commission; the customer sends you the 12-digit reference and you confirm it from the order page. Needs UPI_VPA in .env."
              defaultChecked={value.upi}
            />
            <Toggle
              name="gateway"
              label="Pay online — PayU"
              description="Card, UPI, net banking and wallets on PayU's own checkout, confirmed the moment it goes through. PayU chooses which of those to show, so there is nothing to switch here. Needs PAYU_KEY and PAYU_SALT in .env."
              defaultChecked={value.gateway}
            />
            <Toggle
              name="cod"
              label="Cash on delivery"
              description="Collected by the courier at the door. A product can be marked prepaid-only on its own page, and a bag holding one of those is not offered COD whatever this says."
              defaultChecked={value.cod}
            />
            <Rupees
              name="codLimit"
              label="Maximum order value for cash on delivery"
              hint="Above this the order must be paid for online. Higher-value COD orders are the most common source of returns."
              defaultValue={value.codLimit}
              error={err("codLimit")}
            />
          </FormSection>

          <FormSection
            title="While PayU is in test mode"
            description="PAYU_MODE in .env decides whether the gateway takes real money. Until it says live, the option is shown only to you — signed in here, in the same browser — so a customer cannot pay on a checkout that takes nothing."
          >
            <Toggle
              name="gatewayDemo"
              label="Show the test checkout to everyone"
              description="For demonstrating it to someone who cannot sign in here. It is labelled as a demo on the page. Leave it off on a shop with real customers: PayU's test checkout has a Simulate Success button, and an order marked paid with no money behind it is worse than a missing option."
              defaultChecked={value.gatewayDemo}
            />
          </FormSection>
        </>
      )}
    </SettingsForm>
  );
}

/* ---------------------------------- Tax --------------------------------- */

export function TaxForm({ value }: { value: StoreSettings["tax"] }) {
  return (
    <SettingsForm action={saveTaxSettings}>
      {(err) => (
        <FormSection
          title="GST"
          description="Used to split every invoice into taxable value and tax."
        >
          <div>
            <Label htmlFor="gstRate" hint="A whole or half percentage between 0 and 28.">
              GST rate
            </Label>
            <div className="relative max-w-[180px]">
              <input
                id="gstRate"
                name="gstRate"
                type="number"
                min={0}
                max={28}
                step={0.5}
                defaultValue={value.gstRate}
                className={`${inputCls} pr-8 tabular-nums`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-400">
                %
              </span>
            </div>
            <FieldError>{err("gstRate")}</FieldError>
          </div>
          <Toggle
            name="pricesIncludeTax"
            label="Product prices include GST"
            description="Leave this on for Indian retail. Invoices back the tax out of the price rather than adding it on top."
            defaultChecked={value.pricesIncludeTax}
          />
        </FormSection>
      )}
    </SettingsForm>
  );
}

/* ------------------------------- Inventory ------------------------------ */

export function InventoryForm({ value }: { value: StoreSettings["inventory"] }) {
  return (
    <SettingsForm action={saveInventorySettings}>
      {(err) => (
        <FormSection
          title="Stock alerts"
          description="The default for new products. Each product can override it on its own page."
        >
          <div>
            <Label htmlFor="lowStockThreshold" hint="Products at or below this count show as low stock.">
              Low-stock alert level
            </Label>
            <input
              id="lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              min={0}
              step={1}
              defaultValue={value.lowStockThreshold}
              className={`${inputCls} max-w-[180px] tabular-nums`}
            />
            <FieldError>{err("lowStockThreshold")}</FieldError>
          </div>
          <Toggle
            name="allowBackorders"
            label="Allow orders when stock runs out"
            description="Off by default: checkout blocks any line that exceeds the stock on hand."
            defaultChecked={value.allowBackorders}
          />
        </FormSection>
      )}
    </SettingsForm>
  );
}
