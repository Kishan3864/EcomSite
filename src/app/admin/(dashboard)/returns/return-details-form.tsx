"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, Label, inputCls, textareaCls } from "@/components/admin/ui";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { formatINR } from "@/lib/utils";

/**
 * Refund amount + internal note. The amount input is only rendered while the
 * return is still editable; afterwards it shows as a locked value so the
 * action never receives it.
 */
export function ReturnDetailsForm({
  action,
  initial,
  lineTotal,
  refundMode,
  amountEditable,
  lockedReason,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: { refundAmount: number; adminNote: string };
  lineTotal: number;
  refundMode: string;
  amountEditable: boolean;
  lockedReason: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <form action={formAction} className="grid gap-4">
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="return-refund-amount" hint={`Whole rupees, up to the line total of ${formatINR(lineTotal)}.`}>
            Refund amount
          </Label>
          {amountEditable ? (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13.5px] text-ink-400">₹</span>
              <input
                id="return-refund-amount"
                name="refundAmount"
                type="number"
                inputMode="numeric"
                min={1}
                max={lineTotal}
                step={1}
                defaultValue={initial.refundAmount}
                className={`${inputCls} pl-7 tabular-nums`}
                required
              />
            </div>
          ) : (
            <div
              id="return-refund-amount"
              className="flex h-10 items-center justify-between rounded-lg border border-dashed border-ink-200 bg-canvas px-3 text-[13.5px] text-ink-700"
            >
              <span className="font-medium tabular-nums text-ink-900">{formatINR(initial.refundAmount)}</span>
              <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-400">
                <Lock size={12} /> {lockedReason}
              </span>
            </div>
          )}
          <FieldError>{err("refundAmount")}</FieldError>
        </div>
        <div>
          <Label htmlFor="return-refund-mode" hint="Chosen by the customer when they raised the return.">
            Refund mode
          </Label>
          <div id="return-refund-mode" className="flex h-10 items-center rounded-lg border border-ink-200 bg-canvas px-3 text-[13.5px] text-ink-700">
            <span className="truncate">{refundMode}</span>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="return-admin-note" optional hint="Internal only — never shown to the customer.">
          Admin note
        </Label>
        <textarea
          id="return-admin-note"
          name="adminNote"
          rows={3}
          defaultValue={initial.adminNote}
          className={textareaCls}
          placeholder="Pickup scheduled with Delhivery for Thursday; item inspected on arrival…"
          maxLength={1000}
        />
        <FieldError>{err("adminNote")}</FieldError>
      </div>

      <div className="flex items-center justify-end">
        <SubmitButton size="sm" pendingText="Saving…">
          Save details
        </SubmitButton>
      </div>
    </form>
  );
}
