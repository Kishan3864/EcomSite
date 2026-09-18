"use client";

import { useActionState, useState } from "react";
import { IndianRupee, RefreshCw, ShieldQuestion, Undo2 } from "lucide-react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, Label, inputCls } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { refundPayment, refreshPayuPayment, resolveRefund } from "@/services/admin/payments-actions";
import { formatINR } from "@/lib/utils";

/**
 * The interactive parts of the payment panel — refresh, refund, and the way out
 * of a refund PayU never answered for. Everything else about it is
 * server-rendered, because it is a read of rows we already hold.
 *
 * Both forms take their figures in paise, which is what `PaymentAttempt` and
 * `Refund` store, and turn them into rupees only to show or to send. Nothing
 * here decides whether a refund is allowed — that is `payu-ledger`'s job and it
 * is checked again on the server after every one of these submits.
 */

/** Paise to a rupee figure a person reads. */
const inr = (paise: number) => formatINR(paise / 100, { decimals: true });

/* --------------------------- Refresh from PayU ------------------------ */

/**
 * Asks PayU where the open refunds have got to and pulls the settlement
 * figures for this order's payments. Read-only as far as PayU is concerned —
 * it sends nothing and moves no money — so it needs no confirmation, only a
 * clear account of what came back.
 */
export function PayuRefreshForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(refreshPayuPayment, INITIAL_FORM);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas p-3.5">
        <p className="min-w-0 text-[11.5px] leading-relaxed text-ink-500">
          Fees, the payout and the UTR reach PayU two or three working days after the sale, and a
          refund can take longer still. Nothing here updates on its own — ask, and it is written
          down.
        </p>
        <Form action={action}>
          <input type="hidden" name="id" value={orderId} />
          <SubmitButton size="sm" variant="outline" pendingText="Asking PayU…">
            <RefreshCw size={13} /> Refresh from PayU
          </SubmitButton>
        </Form>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}
    </div>
  );
}

/* ------------- Settling a refund PayU never answered for --------------- */

/** One stranded refund, exactly as `refundableForAttempt` reports it. */
export interface StrandedRefund {
  refundId: string;
  /** Our reference — what to search PayU's Refunds table for. */
  token: string;
  amountPaise: number;
  /** When it was raised. The ledger only reports rows old enough to be
   *  stranded at all, so this is never "a moment ago". */
  initiatedAt: Date;
  /** "eleven minutes ago", as the server worked it out — a string rather than
   *  a clock read in the browser, so the first paint and the hydration agree. */
  raisedAgo: string;
}

/**
 * The way out of a payment frozen by a refund PayU never acknowledged.
 *
 * It renders where the block is announced, and not somewhere else on the page,
 * because a message that says "check it in PayU before sending another" and a
 * control that lets the owner say what he found are one thought. Split apart,
 * the owner reads the block, looks it up, comes back, and has nowhere to put
 * the answer — which is exactly the state this panel was in.
 *
 * Two answers, and they are not symmetrical:
 *
 *   PayU has it      the request id goes on the row, the amount stays counted
 *                    against the ceiling, and Refresh from PayU can follow it.
 *   PayU has not     the row is marked failed and its amount becomes
 *                    refundable again — which is the dangerous one, so it says
 *                    so in the confirmation.
 *
 * Nothing here decides anything. `resolveUnacknowledgedRefund` re-reads the row
 * under the same lock the refund itself takes, and refuses if it is no longer
 * the shape being described — or if the refund is young enough that PayU could
 * still be answering it, which is why this form is not rendered at all until
 * the ledger says the refund is genuinely stranded.
 */
function ResolveRefundForm({
  orderNumber,
  refund,
}: {
  orderNumber: string;
  refund: StrandedRefund;
}) {
  const [state, action] = useActionState(resolveRefund, INITIAL_FORM);
  const [requestId, setRequestId] = useState("");

  const amount = inr(refund.amountPaise);
  const typedId = requestId.trim();

  if (state.ok && state.message) {
    return (
      <div className="grid gap-2">
        <Notice tone="ok">{state.message}</Notice>
        <p className="text-[11.5px] leading-relaxed text-ink-500">
          Reload the order to see this payment as it now stands.
        </p>
      </div>
    );
  }

  return (
    <Form
      action={action}
      className="grid gap-2.5 bg-surface p-3.5"
      onSubmit={(event) => {
        // Which of the two buttons was pressed decides what is being confirmed,
        // and the two consequences are very different sentences.
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const confirmed = window.confirm(
          submitter?.value === "sent"
            ? `Record that PayU is carrying the ${amount} refund on order ${orderNumber}, under request ${typedId}?\n\n` +
                `The ${amount} stays counted against what can be refunded, and PayU will be asked about it from now on.`
            : `Record that PayU has NO refund against reference ${refund.token} on order ${orderNumber}?\n\n` +
                `It is marked as failed, which puts ${amount} back within what can be refunded on this payment.\n\n` +
                `Only do this after looking in the PayU dashboard. If PayU does have it, the customer could be paid twice.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="refundId" value={refund.refundId} />

      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}

      <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-900">
        <ShieldQuestion size={14} className="text-gold-500" />
        Settle reference
        <span className="break-all font-mono text-[12px] font-normal text-ink-600">
          {refund.token}
        </span>
      </p>
      <p className="text-[11.5px] leading-relaxed text-ink-500">
        Raised <strong className="font-semibold text-ink-700">{refund.raisedAgo}</strong>, and PayU
        has not answered it since. Open PayU, go to Refunds and search for that reference. Nothing
        more can be refunded on this payment until one of these two is recorded, and both are
        written to the activity log with your name on them.
      </p>

      <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <Label htmlFor={`resolve-request-${refund.refundId}`}>PayU request id</Label>
          <input
            id={`resolve-request-${refund.refundId}`}
            name="requestId"
            value={requestId}
            onChange={(event) => setRequestId(event.target.value)}
            className={inputCls}
            placeholder="9988776655"
            autoComplete="off"
          />
          <FieldError>{state.field === "requestId" ? state.error : undefined}</FieldError>
        </div>
        <SubmitButton
          name="verdict"
          value="sent"
          size="sm"
          variant="outline"
          pendingText="Recording…"
          disabled={typedId === ""}
          className="sm:mt-[22px]"
        >
          PayU has it — record this id
        </SubmitButton>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-[11.5px] leading-relaxed text-ink-500">
          If PayU has no refund under that reference, nothing left the account and the {amount}{" "}
          becomes refundable again. This one was raised {refund.raisedAgo} — if that is only a few
          minutes, look again before you say PayU never took it.
        </p>
        <SubmitButton name="verdict" value="not-sent" size="sm" variant="danger" pendingText="Recording…">
          PayU has no record — mark it failed
        </SubmitButton>
      </div>
    </Form>
  );
}

/* -------------------------------- Refund ------------------------------ */

export interface RefundFormProps {
  /** The captured attempt being refunded — never the order. */
  attemptId: string;
  orderNumber: string;
  /** PayU's payment id, quoted back in the confirmation so it names a real thing. */
  mihpayid: string;
  /**
   * The idempotency handle, derived by the ledger from the state this form was
   * drawn against and sent back with it. The same token twice is one refund:
   * the ledger finds the row the first submit wrote and sends nothing. Because
   * it is derived rather than minted, every render of an unchanged ledger — a
   * reload, a second tab, the twelve-second auto-refresh behind this page —
   * carries the same one, so all of those are one refund too.
   *
   * It is not what stops two admins refunding the same money: they are working
   * from two different states and carry two different tokens. That is the
   * locked claim in `initiateRefund`, on the server, where it belongs.
   */
  token: string;
  capturedPaise: number;
  committedPaise: number;
  refundablePaise: number;
  /** Why the ledger will not refund this payment at all, when it will not. */
  blocked: string | null;
  /**
   * Refunds on this payment that PayU never answered for. When there are any,
   * they are why `blocked` reads as it does, and the control that clears them
   * renders directly under it.
   */
  unacknowledged: StrandedRefund[];
}

/**
 * Give a captured payment back, in whole or in part.
 *
 * Three things stand between a click and real money leaving the account, and
 * all three are load-bearing:
 *
 *   The control is closed until it is opened, so the amount is typed
 *   deliberately rather than sitting on the page waiting to be nudged.
 *
 *   The submit asks for confirmation naming the amount, the order and the PayU
 *   payment, and says it cannot be undone.
 *
 *   The button is disabled while the request is in flight, and the form carries
 *   a token that makes a second submit a no-op on the server even if the button
 *   is somehow pressed again.
 *
 * The ceiling shown here is computed by `refundableForAttempt` on the server
 * and re-checked there on submit. Nothing in this file decides what is allowed.
 */
export function RefundForm({
  attemptId,
  orderNumber,
  mihpayid,
  token,
  capturedPaise,
  committedPaise,
  refundablePaise,
  blocked,
  unacknowledged,
}: RefundFormProps) {
  const [state, action] = useActionState(refundPayment, INITIAL_FORM);
  const [open, setOpen] = useState(false);

  const maxRupees = refundablePaise / 100;
  // Controlled, unlike the rest of the admin's inputs, because the confirmation
  // box and the button have to name the figure actually about to be sent. A
  // confirm that says something other than what leaves the account is worse
  // than no confirm at all.
  const [amount, setAmount] = useState(maxRupees.toFixed(2));

  const typed = Number(amount.replace(/[,₹\s]/g, ""));
  const sane = Number.isFinite(typed) && typed > 0 && typed <= maxRupees;

  // A refund that went through is not offered again from the same render. The
  // page revalidates behind this, so reloading shows the new ceiling.
  if (state.ok && state.message) {
    return (
      <div className="grid gap-2">
        <Notice tone="ok">{state.message}</Notice>
        {/* No figure here on purpose. `refundablePaise` is the ceiling as it
            was BEFORE this refund was sent — it is a prop from the last server
            render and nothing in the browser subtracts what has just gone out,
            so refunding a payment in full printed "the remaining ₹599" under
            the confirmation that it had all gone back. On the one screen where
            real money leaves the account, an inflated "remaining" is the worst
            direction to be wrong in. The reloaded page gets the real ceiling
            from `refundableForAttempt`. */}
        <p className="text-[11.5px] leading-relaxed text-ink-500">
          Press <strong className="font-semibold">Refresh from PayU</strong> in a day or two to see
          whether the bank has paid it out. Reload this order to see what is left.
        </p>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="grid gap-2">
        {/* The action's own sentence, first. A transport failure revalidates the
            page in the same round trip, so the props that carry `blocked` arrive
            on the very render that carries the error — and this branch was
            swallowing it, leaving the generic block where PayU's own words and
            "the money may already be on its way" should have been. */}
        {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
        <p className="bg-canvas px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-600">{blocked}</p>
        {/* The remedy sits with the message, not elsewhere on the page — and
            only for refunds the ledger has decided are old enough to be
            stranded rather than still in flight. */}
        {unacknowledged.map((stranded) => (
          <ResolveRefundForm key={stranded.refundId} orderNumber={orderNumber} refund={stranded} />
        ))}
      </div>
    );
  }

  if (refundablePaise <= 0) {
    return (
      <div className="grid gap-2">
        {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
        <p className="bg-canvas px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-600">
          All {inr(capturedPaise)} of this payment has been given back. There is nothing left to
          refund.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="grid justify-items-start gap-2">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Button
          variant="outline"
          size="sm"
          className="text-sale-600 hover:bg-sale-50"
          onClick={() => setOpen(true)}
        >
          <Undo2 size={14} /> Refund this payment
        </Button>
        <p className="text-[11.5px] leading-relaxed text-ink-500">
          Up to {inr(refundablePaise)} can still go back on PayU payment{" "}
          <span className="font-mono text-[11.5px]">{mihpayid}</span>.
        </p>
      </div>
    );
  }

  return (
    <Form
      action={action}
      className="grid gap-2.5 bg-canvas p-3.5"
      onSubmit={(event) => {
        // The last thing between a click and real money leaving the account. It
        // names the amount, the order, the payment and the fact that it is
        // final, because a confirmation that says "Are you sure?" teaches
        // people to press OK without reading.
        const confirmed = window.confirm(
          `Refund ${inr(Math.round(typed * 100))} of order ${orderNumber} to the customer through PayU?\n\n` +
            `It goes back on PayU payment ${mihpayid} and can take 5 to 7 business days to reach them.\n\n` +
            `It cannot be undone.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="attemptId" value={attemptId} />
      <input type="hidden" name="token" value={token} />

      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}

      <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-900">
        <IndianRupee size={14} className="text-sale-600" />
        Refund on PayU payment
        <span className="font-mono text-[12px] font-normal text-ink-600">{mihpayid}</span>
      </p>

      <div className="grid gap-2.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-start">
        <div>
          <Label htmlFor={`refund-amount-${attemptId}`}>Amount in rupees</Label>
          <input
            id={`refund-amount-${attemptId}`}
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            max={maxRupees.toFixed(2)}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputCls}
            required
            data-error-max={`The most that can go back on this payment is ${inr(refundablePaise)}`}
          />
          <FieldError>{state.field === "amount" ? state.error : undefined}</FieldError>
          {/* The submit is disabled while the figure is one the ledger would
              refuse, so say which way it is wrong rather than leaving a dead
              button and no explanation. */}
          {!sane && amount.trim() !== "" && (
            <FieldError>
              {typed > maxRupees
                ? `The most that can go back on this payment is ${inr(refundablePaise)}.`
                : "Type an amount above zero."}
            </FieldError>
          )}
        </div>
        <p className="text-[11.5px] leading-relaxed text-ink-500">
          {inr(capturedPaise)} was taken
          {committedPaise > 0 ? ` and ${inr(committedPaise)} has already gone back` : ""}, so at most{" "}
          {inr(refundablePaise)} can be refunded. Part of it is fine — the rest stays refundable.
          The money leaves your PayU balance, not the bank, and the customer sees it in 5 to 7
          business days.
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Keep the money
        </Button>
        {/* Disabled while the request is in flight, by `SubmitButton`'s own
            `useFormStatus`, and disabled outright while the typed figure is not
            one the ledger would accept. */}
        <SubmitButton size="sm" variant="danger" pendingText="Sending to PayU…" disabled={!sane}>
          <Undo2 size={14} /> Refund {sane ? inr(Math.round(typed * 100)) : "…"}
        </SubmitButton>
      </div>
    </Form>
  );
}
