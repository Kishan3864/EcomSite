"use client";

import { useActionState, useState } from "react";
import {
  BadgeIndianRupee,
  Ban,
  CalendarClock,
  Check,
  ExternalLink,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Truck,
} from "lucide-react";
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
import { bookShipment, refreshTracking, requestDelhiveryPickup } from "@/services/admin/shipping-actions";
import { confirmUpiPayment, rejectUpiPayment } from "@/services/admin/upi-actions";
import { Form } from "@/components/ui/form";

export interface CourierLink {
  /** "staging" books test shipments that never move; "production" books real ones. */
  env: "staging" | "production";
}

/**
 * The courier's own panel: book the parcel with Delhivery, then ask for a
 * pickup, print the label and pull tracking. Everything it does can also be
 * done by hand on Delhivery's site and typed into the form underneath.
 */
function DelhiveryPanel({
  orderId,
  orderNumber,
  awb,
  courier,
  status,
  paymentMethod,
  paymentStatus,
  link,
}: {
  orderId: string;
  orderNumber: string;
  awb: string;
  courier: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  link: CourierLink | null;
}) {
  const [book, bookAction] = useActionState(bookShipment, INITIAL_FORM);
  const [pickup, pickupAction] = useActionState(requestDelhiveryPickup, INITIAL_FORM);
  const [track, trackAction] = useActionState(refreshTracking, INITIAL_FORM);
  const [pickupOpen, setPickupOpen] = useState(false);

  if (!link) {
    return (
      <p className="bg-canvas px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-500">
        Delhivery is not connected yet, so book this parcel on Delhivery One and type the courier and
        waybill below. To connect it, add the three <code className="text-ink-700">DELHIVERY_*</code> keys
        to <code className="text-ink-700">.env</code> — see <code className="text-ink-700">docs/delhivery.md</code>.
      </p>
    );
  }

  const testMode = link.env === "staging";
  const badge = (
    <span
      className={
        testMode
          ? "bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-amber-800"
          : "bg-brand-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand-800"
      }
    >
      {testMode ? "Test mode" : "Live"}
    </span>
  );

  // Booked with someone else by hand: the panel has nothing to add.
  if (awb && courier !== "Delhivery") return null;

  if (!awb) {
    const blocked =
      status === "CANCELLED" || status === "RETURNED"
        ? `${orderNumber} is ${status.toLowerCase()}.`
        : paymentMethod !== "COD" && paymentStatus !== "PAID"
          ? "Waiting for the payment to be confirmed."
          : null;

    return (
      <Form action={bookAction} className="grid gap-2.5 bg-canvas p-3.5">
        <input type="hidden" name="id" value={orderId} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-900">
            <Truck size={14} className="text-brand-600" /> Delhivery {badge}
          </p>
          <SubmitButton size="sm" pendingText="Booking…" disabled={!!blocked}>
            <PackageCheck size={14} /> Book with Delhivery
          </SubmitButton>
        </div>
        <p className="text-[11.5px] leading-relaxed text-ink-500">
          {blocked ??
            (testMode
              ? "Creates a test shipment on Delhivery's staging system. It gets a real-looking waybill and tracking, but no courier is dispatched and nothing is billed."
              : `Creates the shipment on your Delhivery One account, marks ${orderNumber} packed, and puts the waybill on the customer's order page.`)}
        </p>
        {book.error && <Notice tone="error">{book.error}</Notice>}
        {book.ok && book.message && <Notice tone="ok">{book.message}</Notice>}
      </Form>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-2.5 bg-canvas p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-900">
          <Truck size={14} className="text-brand-600" /> Delhivery {badge}
          <span className="font-mono text-[12px] font-normal text-ink-600">{awb}</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Form action={trackAction}>
            <input type="hidden" name="id" value={orderId} />
            <SubmitButton size="sm" variant="outline" pendingText="Checking…">
              <RefreshCw size={13} /> Refresh tracking
            </SubmitButton>
          </Form>
          <Button size="sm" variant="outline" onClick={() => setPickupOpen((v) => !v)}>
            <CalendarClock size={13} /> Request pickup
          </Button>
          <a
            href={`/api/admin/orders/${orderId}/label`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-8 items-center gap-1.5 px-2.5 text-[12.5px] font-medium text-ink-800 transition-colors hover:bg-surface"
          >
            <Printer size={13} /> Label
          </a>
          {!testMode && (
            <a
              href={`https://www.delhivery.com/track-v2/package/${awb}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 px-2.5 text-[12.5px] font-medium text-ink-800 transition-colors hover:bg-surface"
            >
              <ExternalLink size={13} /> Track on Delhivery
            </a>
          )}
        </div>
      </div>

      {track.error && <Notice tone="error">{track.error}</Notice>}
      {track.ok && track.message && <Notice tone="ok">{track.message}</Notice>}

      {pickupOpen && (
        <Form action={pickupAction} className="flex flex-wrap items-end gap-2 pt-2.5">
          <input type="hidden" name="id" value={orderId} />
          <div>
            <Label htmlFor="pickup-date" hint="The courier comes to your registered pickup address after 2 pm.">
              Pickup date
            </Label>
            <input id="pickup-date" name="date" type="date" min={today} defaultValue={today} className={inputCls} required />
            <FieldError>{pickup.field === "date" ? pickup.error : undefined}</FieldError>
          </div>
          <SubmitButton size="sm" pendingText="Requesting…">
            Request pickup
          </SubmitButton>
          {pickup.error && !pickup.field && <Notice tone="error">{pickup.error}</Notice>}
          {pickup.ok && pickup.message && <Notice tone="ok">{pickup.message}</Notice>}
        </Form>
      )}
    </div>
  );
}

/**
 * A UPI payment the customer says they have made, waiting on the owner.
 *
 * Confirming is the only way a UPI order becomes paid, so the card states the
 * amount and the reference and asks for them to be found in the bank first.
 * Rejecting is not a cancellation: the reference is cleared, the order stays,
 * and the customer is told to send the right one — a mistyped digit is the
 * usual reason, and cancelling their order over it would be absurd.
 */
export function UpiVerifyForm({
  orderId,
  amount,
  utr,
  readOnly,
}: {
  orderId: string;
  amount: string;
  utr: string;
  readOnly?: boolean;
}) {
  const [confirmState, confirmAction] = useActionState(confirmUpiPayment, INITIAL_FORM);
  const [rejectState, rejectAction] = useActionState(rejectUpiPayment, INITIAL_FORM);
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="grid gap-3">
      <div className="bg-gold-50 p-3.5">
        <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-900">
          <BadgeIndianRupee size={15} className="text-gold-700" />
          Customer says they have paid {amount}
        </p>
        <p className="mt-2 text-[12px] text-ink-600">UPI reference (UTR)</p>
        <p className="font-mono text-[17px] font-semibold tracking-[0.04em] text-ink-950 tabular-nums">
          {utr}
        </p>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-600">
          Find this reference for <strong>{amount}</strong> in your bank or UPI app before you
          confirm. Confirming marks the order paid and tells the customer it is being packed.
        </p>
      </div>

      {confirmState.error && <Notice tone="error">{confirmState.error}</Notice>}
      {confirmState.ok && confirmState.message && <Notice tone="ok">{confirmState.message}</Notice>}
      {rejectState.ok && rejectState.message && <Notice tone="ok">{rejectState.message}</Notice>}

      {!readOnly && !rejecting && (
        <div className="flex flex-wrap gap-2">
          <Form action={confirmAction}>
            <input type="hidden" name="id" value={orderId} />
            <SubmitButton size="sm" pendingText="Confirming…">
              <Check size={14} /> Yes, {amount} received
            </SubmitButton>
          </Form>
          <Button
            variant="outline"
            size="sm"
            className="text-sale-600 hover:bg-sale-50"
            onClick={() => setRejecting(true)}
          >
            <Ban size={14} /> Not in my bank
          </Button>
        </div>
      )}

      {!readOnly && rejecting && (
        <Form action={rejectAction} className="grid gap-2 bg-canvas p-3.5">
          <input type="hidden" name="id" value={orderId} />
          {rejectState.error && !rejectState.field && <Notice tone="error">{rejectState.error}</Notice>}
          <Label htmlFor="upi-reason" hint="The customer sees this in their email.">
            What did you find?
          </Label>
          <textarea
            id="upi-reason"
            name="reason"
            rows={2}
            className={textareaCls}
            required
            defaultValue="We could not find this reference in our account."
          />
          <FieldError>{rejectState.field === "reason" ? rejectState.error : undefined}</FieldError>
          <p className="text-[11.5px] leading-relaxed text-ink-500">
            The order is kept and its stock stays reserved. Only the reference is cleared, so the
            customer can send the correct one or pay again.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(false)}>
              Back
            </Button>
            <SubmitButton size="sm" variant="danger" pendingText="Sending…">
              Clear reference and tell them
            </SubmitButton>
          </div>
        </Form>
      )}
    </div>
  );
}

/** Courier and AWB, edited in place on the order detail page. */
export function ShipmentForm({
  orderId,
  orderNumber,
  courier,
  awb,
  estimatedDelivery,
  status,
  paymentMethod,
  paymentStatus,
  courierLink,
  readOnly,
}: {
  orderId: string;
  orderNumber: string;
  courier: string;
  awb: string;
  estimatedDelivery: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  courierLink: CourierLink | null;
  readOnly?: boolean;
}) {
  const [state, action] = useActionState(setShipment, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <div className="grid gap-4">
      {!readOnly && (
        <DelhiveryPanel
          orderId={orderId}
          orderNumber={orderNumber}
          awb={awb}
          courier={courier}
          status={status}
          paymentMethod={paymentMethod}
          paymentStatus={paymentStatus}
          link={courierLink}
        />
      )}

    <Form action={action} className="grid gap-3">
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
            placeholder="Delhivery"
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
            placeholder="e.g. 1234567890123"
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
    </Form>
    </div>
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
    <Form action={action} className="grid gap-3 bg-canvas p-4">
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
    </Form>
  );
}

/** Internal note — never shown to the customer. */
export function AdminNoteForm({ orderId, note }: { orderId: string; note: string }) {
  const [state, action] = useActionState(setAdminNote, INITIAL_FORM);

  return (
    <Form action={action} className="grid gap-2">
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
    </Form>
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
        className="w-full text-sale-600 hover:bg-sale-50"
        onClick={() => setOpen(true)}
      >
        <Ban size={14} /> Cancel order
      </Button>
    );
  }

  return (
    <Form action={action} className="grid gap-2">
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
    </Form>
  );
}
