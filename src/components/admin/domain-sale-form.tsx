"use client";

import { useActionState } from "react";
import { Notice, SubmitButton } from "./client";
import { FieldError, Label, inputCls, textareaCls } from "./ui";
import { Form } from "@/components/ui/form";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { setDomainSale } from "@/services/admin/domain-sale-actions";

export interface DomainSaleView {
  on: boolean;
  offerPrice: number | null;
  regularPrice: number | null;
  /** Formatted for a datetime-local input, in IST, or "". */
  offerEndsInput: string;
  minInput: string;
  suggestInput: string;
  whatsapp: string;
  pitch: string;
  highlights: string[];
}

/**
 * The domain-sale switch. Turning it ON asks first: every page of the site is
 * replaced by the sale page at once, for every visitor.
 */
export function DomainSaleForm({ view }: { view: DomainSaleView }) {
  const [state, action] = useActionState(setDomainSale, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <Form
      action={action}
      className="grid gap-4"
      onSubmit={(e) => {
        const turningOn = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === "true";
        if (
          turningOn &&
          !view.on &&
          !window.confirm(
            "Switch the domain-sale page ON?\n\nThe whole website — every page — will show only the sale page, for everyone, straight away. Nothing can be bought until you switch it off here.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ds-offer" hint="Whole rupees. Shown big, in gold." optional>
            Offer price (₹)
          </Label>
          <input id="ds-offer" name="offerPrice" inputMode="numeric" defaultValue={view.offerPrice ?? ""} placeholder="e.g. 49999" className={inputCls} />
          <FieldError>{err("offerPrice")}</FieldError>
        </div>
        <div>
          <Label htmlFor="ds-regular" hint="Struck through beside the offer; shown alone once the offer ends." optional>
            Regular price (₹)
          </Label>
          <input id="ds-regular" name="regularPrice" inputMode="numeric" defaultValue={view.regularPrice ?? ""} placeholder="e.g. 99999" className={inputCls} />
          <FieldError>{err("regularPrice")}</FieldError>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ds-ends" hint="India time. The countdown runs to this, the same for every visitor; after it the page says the offer has ended." optional>
            Offer ends
          </Label>
          <input
            id="ds-ends"
            name="offerEndsAt"
            type="datetime-local"
            min={view.minInput}
            defaultValue={view.offerEndsInput || (view.on ? "" : view.suggestInput)}
            className={inputCls}
          />
          <FieldError>{err("offerEndsAt")}</FieldError>
        </div>
        <div>
          <Label htmlFor="ds-wa" hint="With country code. Every button on the page opens this chat.">
            WhatsApp number
          </Label>
          <input id="ds-wa" name="whatsapp" inputMode="tel" defaultValue={`+${view.whatsapp}`} className={inputCls} required />
          <FieldError>{err("whatsapp")}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="ds-pitch">Text under the headline</Label>
        <textarea id="ds-pitch" name="pitch" rows={3} maxLength={400} defaultValue={view.pitch} className={textareaCls} />
        <FieldError>{err("pitch")}</FieldError>
      </div>

      <div>
        <Label htmlFor="ds-highlights" hint="One per line, up to six. Leave empty to hide the section." optional>
          Selling points
        </Label>
        <textarea id="ds-highlights" name="highlights" rows={5} defaultValue={view.highlights.join("\n")} className={textareaCls} />
        <FieldError>{err("highlights")}</FieldError>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <a href="/admin/settings/domain-sale/preview" target="_blank" rel="noopener" className="mr-auto text-[12.5px] font-medium text-brand-700 hover:underline">
          Preview the saved page ↗
        </a>
        {view.on ? (
          <>
            <SubmitButton name="on" value="true" size="sm" variant="outline" pendingText="Saving…">
              Save changes
            </SubmitButton>
            <SubmitButton name="on" value="false" size="sm" variant="primary" pendingText="Switching off…">
              Switch OFF — bring the shop back
            </SubmitButton>
          </>
        ) : (
          <>
            <SubmitButton name="on" value="false" size="sm" variant="outline" pendingText="Saving…">
              Save without switching on
            </SubmitButton>
            <SubmitButton name="on" value="true" size="sm" variant="danger" pendingText="Switching on…">
              Switch ON
            </SubmitButton>
          </>
        )}
      </div>
    </Form>
  );
}
