"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { XCircle } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { cancelOwnOrder } from "@/services/commerce";

/**
 * Lets a customer cancel their own order, before it is packed.
 *
 * Two steps on purpose. Cancelling is not undoable and the first click is
 * usually a question ("can I?") rather than a decision, so the button opens the
 * reason field and the second click is the one that acts.
 */
function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" variant="outline" loading={pending}>
      <XCircle size={16} /> {pending ? "Cancelling…" : "Yes, cancel this order"}
    </Button>
  );
}

export function CancelForm({ orderId, paid }: { orderId: string; paid: boolean }) {
  const [state, action] = useActionState(cancelOwnOrder, {});
  const [open, setOpen] = useState(false);

  if (state.ok) {
    return (
      <p className="text-[13px] leading-[1.55] text-ink-600">
        This order is cancelled.{" "}
        {paid
          ? "We have raised your refund — you will get an email when your bank confirms it."
          : "Nothing was charged."}
      </p>
    );
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-600 transition-colors hover:bg-sale-50 hover:text-sale-700"
        >
          <XCircle size={16} aria-hidden /> Cancel this order
        </button>
        {state.error ? (
          <p className="mt-2 text-[13px] leading-[1.5] text-sale-700">{state.error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <Form action={action} className="card-muted p-4 text-left sm:p-5">
      <input type="hidden" name="orderId" value={orderId} />
      <p className="text-[13.5px] leading-[1.55] text-ink-800">
        Cancel this order?{" "}
        {paid
          ? "We will put your money back the way you paid — your bank takes a few business days once we send it."
          : "Nothing has been charged, so there is nothing to refund."}
      </p>

      <div className="mt-3">
        <Field label="Why? (optional)" htmlFor="cancel-reason">
          <Input
            id="cancel-reason"
            name="reason"
            maxLength={200}
            placeholder="Changed my mind, ordered by mistake…"
          />
        </Field>
      </div>

      {state.error ? (
        <p role="alert" className="mt-3 rounded-md bg-sale-50 px-3.5 py-2.5 text-[13px] leading-[1.5] text-sale-700 ring-1 ring-inset ring-sale-200">
          {state.error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2.5">
        <ConfirmButton />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={buttonClasses("subtle", "md")}
        >
          Keep my order
        </button>
      </div>
    </Form>
  );
}
