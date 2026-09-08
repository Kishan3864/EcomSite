"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/admin/client";
import { FieldError, Label, textareaCls } from "@/components/admin/ui";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";

/**
 * Approve / reject a REQUESTED return. One form, two submit buttons: the
 * clicked button's `decision` value tells the action which way to go.
 */
export function ReturnDecisionForm({
  action,
  productTitle,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  productTitle: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <form action={formAction} className="grid gap-4">
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}

      <div>
        <Label htmlFor="return-note" hint="Required when rejecting. Saved as the admin note on this return.">
          Note
        </Label>
        <textarea
          id="return-note"
          name="note"
          rows={3}
          className={textareaCls}
          placeholder="e.g. Approved under the 14-day policy; pickup from the delivery address."
          maxLength={1000}
        />
        <FieldError>{err("note")}</FieldError>
      </div>

      <DecisionButtons productTitle={productTitle} />
    </form>
  );
}

function DecisionButtons({ productTitle }: { productTitle: string }) {
  const { pending, data } = useFormStatus();
  const submitting = pending ? String(data?.get("decision") ?? "") : "";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="submit"
        name="decision"
        value="reject"
        variant="outline"
        size="sm"
        loading={submitting === "reject"}
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm(`Reject the return for ${productTitle}? The customer will see it as not eligible. This cannot be undone.`)) {
            e.preventDefault();
          }
        }}
      >
        <X size={14} /> Reject
      </Button>
      <Button type="submit" name="decision" value="approve" size="sm" loading={submitting === "approve"} disabled={pending}>
        <Check size={14} strokeWidth={2.5} /> Approve return
      </Button>
    </div>
  );
}
