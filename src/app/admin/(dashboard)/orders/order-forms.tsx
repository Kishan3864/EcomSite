"use client";

import { useActionState, useState } from "react";
import { Ban, Plus, Save, Truck } from "lucide-react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, Label, inputCls, textareaCls } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { INITIAL_FORM } from "@/services/admin/form-state";
import {
  addOrderEvent,
  cancelOrder,
  setAdminNote,
  setShipment,
} from "@/services/admin/orders-actions";

/** Courier and AWB, edited in place on the order detail page. */
export function ShipmentForm({
  orderId,
  courier,
  awb,
  estimatedDelivery,
  readOnly,
}: {
  orderId: string;
  courier: string;
  awb: string;
  estimatedDelivery: string;
  readOnly?: boolean;
}) {
  const [state, action] = useActionState(setShipment, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={orderId} />
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="courier">Courier</Label>
          <input
            id="courier"
            name="courier"
            defaultValue={courier}
            className={inputCls}
            disabled={readOnly}
            placeholder="WeekendCart Express"
          />
        </div>
        <div>
          <Label htmlFor="awb">AWB / tracking no.</Label>
          <input
            id="awb"
            name="awb"
            defaultValue={awb}
            className={inputCls}
            disabled={readOnly}
            placeholder="MYRX…"
          />
          <FieldError>{err("awb")}</FieldError>
        </div>
        <div>
          <Label htmlFor="eta">Expected delivery</Label>
          <input
            id="eta"
            name="estimatedDelivery"
            type="date"
            defaultValue={estimatedDelivery}
            className={inputCls}
            disabled={readOnly}
          />
          <FieldError>{err("estimatedDelivery")}</FieldError>
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <SubmitButton size="sm" variant="outline" pendingText="Saving…">
            <Truck size={14} /> Save shipment
          </SubmitButton>
        </div>
      )}
    </form>
  );
}

/** Free-text tracking update appended to the customer-visible timeline. */
export function AddEventForm({ orderId, defaultLocation }: { orderId: string; defaultLocation: string }) {
  const [state, action] = useActionState(addOrderEvent, INITIAL_FORM);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add a tracking update
      </Button>
    );
  }

  return (
    <form action={action} className="grid gap-3 rounded-xl border border-hairline bg-canvas p-4">
      <input type="hidden" name="id" value={orderId} />
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

      <div>
        <Label htmlFor="ev-title">Title</Label>
        <input
          id="ev-title"
          name="title"
          className={inputCls}
          required
          placeholder="Delayed by weather"
        />
        <FieldError>{state.field === "title" ? state.error : undefined}</FieldError>
      </div>
      <div>
        <Label htmlFor="ev-desc" optional>
          Description
        </Label>
        <textarea id="ev-desc" name="description" rows={2} className={textareaCls} />
      </div>
      <div>
        <Label htmlFor="ev-loc" optional>
          Location
        </Label>
        <input id="ev-loc" name="location" defaultValue={defaultLocation} className={inputCls} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <SubmitButton size="sm" pendingText="Adding…">
          Add update
        </SubmitButton>
      </div>
    </form>
  );
}

/** Internal note — never shown to the customer. */
export function AdminNoteForm({ orderId, note }: { orderId: string; note: string }) {
  const [state, action] = useActionState(setAdminNote, INITIAL_FORM);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={orderId} />
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}
      <textarea
        name="adminNote"
        rows={3}
        defaultValue={note}
        className={textareaCls}
        placeholder="Only your team sees this."
      />
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="outline" pendingText="Saving…">
          <Save size={14} /> Save note
        </SubmitButton>
      </div>
    </form>
  );
}

/** Cancelling needs a reason; it also restocks, so it is deliberately two-step. */
export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(cancelOrder, INITIAL_FORM);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full border-sale-300 text-sale-600 hover:border-sale-500 hover:bg-sale-50"
        onClick={() => setOpen(true)}
      >
        <Ban size={14} /> Cancel order
      </Button>
    );
  }

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={orderId} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Label htmlFor="cancel-reason" hint="Shown to the customer on their order page.">
        Why is this being cancelled?
      </Label>
      <textarea
        id="cancel-reason"
        name="reason"
        rows={2}
        className={textareaCls}
        required
        placeholder="Out of stock at the warehouse"
      />
      <p className="text-[11.5px] leading-relaxed text-ink-500">
        Every item goes back into stock and the payment is marked refunded.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Keep order
        </Button>
        <SubmitButton size="sm" variant="danger" pendingText="Cancelling…">
          Cancel and restock
        </SubmitButton>
      </div>
    </form>
  );
}
