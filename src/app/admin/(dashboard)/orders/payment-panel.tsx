import type { ComponentProps } from "react";
import { CreditCard, Undo2 } from "lucide-react";
import { db } from "@/lib/db";
import { REFUND_STATE_LABEL, describeRefundEta, type RefundState } from "@/lib/payments/refund-status";
import { refundableForAttempt } from "@/services/payu-ledger";
import { Card, DateCell, KeyValue, Pill, StatusPill } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/client";
import { formatDateTime, formatINR } from "@/lib/utils";
import { PayuRefreshForm, RefundForm } from "./payment-forms";

/**
 * The whole PayU picture for one order, as far as this database holds it.
 *
 * It is its own server component, and does its own reads, for two reasons. The
 * order page's `findUnique` is already large, and `PaymentAttempt.payload` and
 * `Refund.payload` are unbounded JSON columns holding PayU's verbatim replies —
 * pulling those into the main query would make every order render carry them
 * whether or not anybody opens them. And keeping the payment reads here means
 * an order with no gateway payment at all (cash, or a UPI transfer confirmed by
 * hand) costs one small query and renders nothing.
 *
 * Every figure on a `PaymentAttempt` or a `Refund` is PAISE. Order totals and
 * line prices, three cards away on the same page, are whole RUPEES. That is the
 * one unit mismatch on this screen and `inr()` below is the only place it is
 * crossed.
 */

/** Paise to rupees, with the two decimals a fee or a payout actually has. */
const inr = (paise: number) => formatINR(paise / 100, { decimals: true });

type PillTone = NonNullable<ComponentProps<typeof Pill>["tone"]>;

/**
 * Refund states get their own pill rather than going through `StatusPill`.
 *
 * `STATUS_TONES` is keyed by the bare status string and a return request
 * already owns `REQUESTED`, where it means "the customer has asked". On a
 * refund the same word means "PayU has sent it to the bank, 5 to 7 business
 * days" — the opposite end of the story. Sharing the map would make one of the
 * two lie, so refunds are labelled from `REFUND_STATE_LABEL`, which is also
 * what `describeRefundEta` is written against.
 */
const REFUND_TONES: Record<RefundState, PillTone> = {
  QUEUED: "gold",
  IN_PROGRESS: "sky",
  REQUESTED: "sky",
  SUCCESS: "brand",
  FAILURE: "sale",
  OD_HIT: "gold",
};

function RefundPill({ status }: { status: RefundState }) {
  return (
    <Pill tone={REFUND_TONES[status]} dot>
      {REFUND_STATE_LABEL[status]}
    </Pill>
  );
}

/**
 * A value PayU has not given us, said out loud.
 *
 * The owner asked to see everything, and a blank cell does not distinguish
 * "PayU never sent this" from "we forgot to show it". Every row that can be
 * empty renders this instead.
 */
const missing = (why: string) => <span className="text-ink-400">{why}</span>;

const mono = (value: string) => <span className="break-all font-mono text-[12px]">{value}</span>;

/**
 * A gateway id with a copy button beside it.
 *
 * These are the values that get read down a phone to PayU support or pasted
 * into a bank's search box, so they are worth a click rather than a careful
 * select. `CopyButton` is the admin's existing one; nothing new is introduced.
 */
function IdValue({ value }: { value: string }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {mono(value)}
      <CopyButton value={value} />
    </span>
  );
}

/**
 * Read one field out of a gateway payload we already store.
 *
 * PayU's capture response carries more than `PaymentAttempt` has columns for —
 * the bank reference among them, which the owner asks for by name. Rather than
 * add columns for fields that only ever come from the payload, the panel reads
 * them back out of the payload it is already showing. Nothing is fetched and
 * nothing new is stored.
 */
function fromPayload(payload: unknown, ...keys: string[]): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const row = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

/** PayU's verbatim reply, kept out of the way until somebody wants it. */
function RawPayload({ payload, label }: { payload: unknown; label: string }) {
  if (payload === null || payload === undefined) return null;
  return (
    <details className="mt-3 min-w-0 bg-surface">
      <summary className="cursor-pointer select-none px-3.5 py-2.5 text-[12px] font-medium text-ink-500 transition-colors marker:text-ink-300 hover:text-brand-700">
        {label}
      </summary>
      <pre className="overflow-x-auto px-3.5 pb-3.5 text-[11.5px] leading-relaxed text-ink-700">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </details>
  );
}

export async function PaymentSection({
  orderId,
  orderNumber,
  canEdit,
}: {
  orderId: string;
  orderNumber: string;
  canEdit: boolean;
}) {
  const attempts = await db.paymentAttempt.findMany({
    where: { orderId },
    // Oldest first: a customer who failed twice and then paid should read top
    // to bottom as what actually happened to them.
    orderBy: { createdAt: "asc" },
    include: { refunds: { orderBy: { initiatedAt: "asc" } } },
  });

  // Cash, or a UPI transfer confirmed against the bank by hand. There is no
  // gateway story to tell, and the Payment card in the sidebar already says
  // everything there is.
  if (attempts.length === 0) return null;

  // Only a capture can be given back, and the ceiling belongs to the capture
  // rather than to the order — a duplicate payment leaves one order with two
  // captured attempts and only one of them is being refunded. The arithmetic
  // is `refundableForAttempt`'s and is asked for rather than repeated.
  //
  // REFUNDED counts as a payment PayU took, because that is what it is:
  // `recomputeRefundTotals` moves an attempt there once the whole capture has
  // been confirmed back. Leaving it out made a fully refunded order say
  // "nothing on this order was captured by PayU" on the same screen as its
  // ₹999 capture and its ₹999 refund.
  const captured = attempts.filter(
    (attempt) => attempt.status === "CAPTURED" || attempt.status === "REFUNDED",
  );
  const ceilings = new Map(
    (await Promise.all(captured.map((attempt) => refundableForAttempt(attempt.id))))
      .filter((state) => state !== null)
      .map((state) => [state.attemptId, state] as const),
  );

  const refunds = attempts
    .flatMap((attempt) => attempt.refunds.map((refund) => ({ refund, attempt })))
    .sort((a, b) => b.refund.initiatedAt.getTime() - a.refund.initiatedAt.getTime());

  // Only what PayU has actually confirmed. A queued refund is a promise, not
  // money that has moved, and the two must not be added together.
  const confirmed = refunds.filter(({ refund }) => refund.status === "SUCCESS");
  const refundedPaise = confirmed.reduce((sum, { refund }) => sum + refund.amount, 0);

  return (
    <>
      <Card
        title="PayU"
        description={
          attempts.length === 1
            ? "The one attempt at paying for this order, exactly as PayU reported it."
            : `Every attempt at paying for this order — ${attempts.length} of them, oldest first.`
        }
      >
        <div className="grid gap-4">
          {attempts.map((attempt, index) => {
            const upi = attempt.upiApp ? ` · ${attempt.upiApp}` : "";
            const instrument = attempt.cardMasked || fromPayload(attempt.payload, "card_no", "cardnum");
            const bank = attempt.bankName || fromPayload(attempt.payload, "bank_name", "bankcode");
            const bankRef = fromPayload(attempt.payload, "bank_ref_num", "bank_ref_no", "bankRefNum");
            const failed =
              attempt.status === "FAILED" || attempt.failureCode || attempt.failureDescription;

            const hasSettlement =
              attempt.gatewayFee !== null ||
              attempt.gatewayFeeTax !== null ||
              attempt.settledAmount !== null ||
              attempt.settlementId !== null ||
              attempt.utrNumber !== null ||
              attempt.valueDate !== null;

            return (
              <div key={attempt.id} className="min-w-0 bg-canvas p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-900">
                    <CreditCard size={14} className="text-brand-600" />
                    {attempts.length === 1 ? "Payment" : `Attempt ${index + 1} of ${attempts.length}`}
                    <StatusPill status={attempt.status} />
                  </p>
                  <span className="text-[13px] font-semibold tabular-nums text-ink-950">
                    {inr(attempt.amount)}
                  </span>
                </div>

                <div className="mt-1.5">
                  <KeyValue
                    rows={[
                      { label: "Our txn id", value: <IdValue value={attempt.gatewayOrderId} /> },
                      {
                        label: "PayU payment id",
                        value: attempt.gatewayPaymentId ? (
                          <IdValue value={attempt.gatewayPaymentId} />
                        ) : (
                          missing("PayU never issued one — this attempt never reached a payment")
                        ),
                      },
                      {
                        label: "Method",
                        value: attempt.method
                          ? `${attempt.method}${upi}`
                          : missing("PayU did not say"),
                      },
                      {
                        label: "Instrument",
                        value: instrument ? mono(instrument) : missing("PayU did not say"),
                      },
                      { label: "Bank", value: bank || missing("PayU did not say") },
                      {
                        label: "Bank reference",
                        value: bankRef ? mono(bankRef) : missing("PayU did not send one"),
                      },
                      { label: "Currency", value: attempt.currency },
                      { label: "Started", value: <DateCell value={attempt.createdAt} time /> },
                      { label: "Last change", value: <DateCell value={attempt.updatedAt} time /> },
                      ...(failed
                        ? [
                            {
                              label: "Failure code",
                              value: attempt.failureCode
                                ? mono(attempt.failureCode)
                                : missing("PayU gave no code"),
                            },
                            {
                              label: "Why it failed",
                              value: attempt.failureDescription ? (
                                <span className="text-sale-700">{attempt.failureDescription}</span>
                              ) : (
                                missing("PayU gave no reason")
                              ),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>

                <div className="mt-3 min-w-0 bg-surface p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                    Settlement
                  </p>
                  {hasSettlement ? (
                    <div className="mt-1">
                      <KeyValue
                        rows={[
                          {
                            label: "PayU's fee",
                            value:
                              attempt.gatewayFee === null
                                ? missing("Not reported yet")
                                : inr(attempt.gatewayFee),
                          },
                          {
                            label: "GST on the fee",
                            value:
                              attempt.gatewayFeeTax === null
                                ? missing("Not reported yet")
                                : inr(attempt.gatewayFeeTax),
                          },
                          {
                            label: "Reached the bank",
                            value:
                              attempt.settledAmount === null ? (
                                missing("Not paid out yet")
                              ) : (
                                <span className="font-semibold tabular-nums">
                                  {inr(attempt.settledAmount)}
                                </span>
                              ),
                          },
                          {
                            label: "Settlement id",
                            value: attempt.settlementId
                              ? mono(attempt.settlementId)
                              : missing("Not paid out yet"),
                          },
                          {
                            label: "UTR",
                            value: attempt.utrNumber ? (
                              <IdValue value={attempt.utrNumber} />
                            ) : (
                              missing("Not paid out yet")
                            ),
                          },
                          {
                            label: "Value date",
                            value: attempt.valueDate ? (
                              <DateCell value={attempt.valueDate} />
                            ) : (
                              missing("Not paid out yet")
                            ),
                          },
                        ]}
                      />
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
                      PayU has not reported a payout for this payment yet. Fees, the settlement
                      batch and the UTR usually appear two or three working days after the sale.
                    </p>
                  )}
                  <p className="mt-2 text-[11.5px] text-ink-400">
                    {attempt.settlementSyncedAt
                      ? `Last asked ${formatDateTime(attempt.settlementSyncedAt)}.`
                      : "PayU has never been asked about this payment."}
                  </p>
                </div>

                <RawPayload payload={attempt.payload} label="PayU's raw reply to this payment" />
              </div>
            );
          })}

          {canEdit && <PayuRefreshForm orderId={orderId} />}
        </div>
      </Card>

      <Card
        title="Refunds"
        description="Money going back to the customer, raised here and carried out by PayU."
      >
        <div className="grid gap-4">
          {refunds.length === 0 ? (
            <p className="text-[13px] text-ink-400">No refund has been raised on this order.</p>
          ) : (
            <>
              {refundedPaise > 0 && (
                <p className="text-[12.5px] text-ink-600">
                  <span className="font-semibold tabular-nums text-ink-900">
                    {inr(refundedPaise)}
                  </span>{" "}
                  has been confirmed back by PayU across {confirmed.length} refund
                  {confirmed.length === 1 ? "" : "s"}
                  {refunds.length > confirmed.length
                    ? `, out of ${refunds.length} raised.`
                    : "."}
                </p>
              )}
              {refunds.map(({ refund, attempt }) => (
                <div key={refund.id} className="min-w-0 bg-canvas p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-900">
                      <Undo2 size={14} className="text-brand-600" />
                      <span className="text-[13px] tabular-nums text-ink-950">
                        {inr(refund.amount)}
                      </span>
                      <RefundPill status={refund.status} />
                    </p>
                    <span className="text-[11.5px] text-ink-400">
                      {formatDateTime(refund.initiatedAt)}
                    </span>
                  </div>

                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
                    {describeRefundEta(refund.status)}
                  </p>
                  {refund.failureReason && (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-sale-700">
                      {refund.failureReason}
                    </p>
                  )}

                  <div className="mt-1.5">
                    <KeyValue
                      rows={[
                        { label: "Raised by", value: refund.initiatedByName },
                        { label: "Our reference", value: <IdValue value={refund.token} /> },
                        {
                          label: "PayU request id",
                          value: refund.requestId ? (
                            <IdValue value={refund.requestId} />
                          ) : (
                            missing("PayU never acknowledged this one")
                          ),
                        },
                        {
                          label: "On payment",
                          value: mono(attempt.gatewayPaymentId ?? attempt.gatewayOrderId),
                        },
                        {
                          label: "Last checked",
                          value: refund.lastCheckedAt ? (
                            <DateCell value={refund.lastCheckedAt} time />
                          ) : (
                            missing("Not since it was raised")
                          ),
                        },
                      ]}
                    />
                  </div>

                  <RawPayload payload={refund.payload} label="PayU's raw reply to this refund" />
                </div>
              ))}
            </>
          )}

          {canEdit ? (
            captured.length === 0 ? (
              <p className="text-[12.5px] leading-relaxed text-ink-500">
                Nothing on this order was captured by PayU, so there is nothing it can refund.
              </p>
            ) : (
              captured.map((attempt) => {
                const state = ceilings.get(attempt.id);
                if (!state) return null;
                return (
                  <RefundForm
                    key={attempt.id}
                    attemptId={attempt.id}
                    orderNumber={orderNumber}
                    mihpayid={state.mihpayid ?? attempt.gatewayOrderId}
                    // The ledger's token, not a fresh one per render. This page
                    // re-renders every twelve seconds behind an open refund
                    // form, and a token minted here changed with it — so the
                    // reload and the second tab the comments promised to cover
                    // each got their own. Derived from the ledger, the same
                    // unchanged state always yields the same token.
                    token={state.nextToken}
                    capturedPaise={state.capturedPaise}
                    committedPaise={state.committedPaise}
                    refundablePaise={state.refundablePaise}
                    blocked={state.blocked}
                    unacknowledged={state.unacknowledged}
                  />
                );
              })
            )
          ) : (
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              Only a manager can raise a refund.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
