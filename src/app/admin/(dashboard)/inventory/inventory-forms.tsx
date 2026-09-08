"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Check, Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, Label, inputCls, selectArrow, selectCls } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { cn } from "@/lib/utils";
import { STOCK_REASONS, type StockReason } from "./inventory-shared";

type BoundAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/* --------------------------- Adjust stock ---------------------------- */

/**
 * The stock adjustment form. Used as-is inside a card on the ledger page and
 * wrapped in a small dialog by `AdjustStockButton` for the inline "Adjust"
 * control on the stock table. Uncontrolled inputs + `useActionState`, like
 * every other admin form; the action is bound to a product id by the page.
 */
export function AdjustStockForm({
  action,
  stock,
  compact = false,
  autoFocus = false,
  onDone,
  onCancel,
}: {
  action: BoundAction;
  stock: number;
  compact?: boolean;
  autoFocus?: boolean;
  /** Called after a successful save (the dialog uses it to close itself). */
  onDone?: (message: string) => void;
  onCancel?: () => void;
}) {
  const uid = useId();
  const [reason, setReason] = useState<StockReason>("received");
  const [state, formAction] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok) {
      // React resets the form after a successful action; keep the reason
      // state in step with the select's default so the note label matches.
      setReason("received");
      onDone?.(result.message ?? "Saved.");
    }
    return result;
  }, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);
  const noteRequired = reason === "other";

  return (
    <form action={formAction} className="grid gap-4">
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

      <div className={cn("grid gap-4", !compact && "sm:grid-cols-[160px_minmax(0,1fr)]")}>
        <div>
          <Label>Direction</Label>
          <div className="grid h-10 grid-cols-2 gap-0.5 rounded-lg border border-ink-200 bg-canvas p-0.5">
            {(
              [
                { value: "add", label: "Add", icon: Plus },
                { value: "remove", label: "Remove", icon: Minus },
              ] as const
            ).map((d) => (
              <label key={d.value} className="cursor-pointer">
                <input type="radio" name="direction" value={d.value} defaultChecked={d.value === "add"} className="peer sr-only" />
                <span className="flex h-full items-center justify-center gap-1 rounded-md text-[12.5px] font-medium text-ink-500 transition-colors peer-checked:bg-surface peer-checked:text-ink-950 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">
                  <d.icon size={13} strokeWidth={2.5} /> {d.label}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor={`${uid}-qty`} hint={`${stock} in stock now.`}>
            Units
          </Label>
          <input
            id={`${uid}-qty`}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            defaultValue=""
            placeholder="0"
            autoFocus={autoFocus}
            className={cn(inputCls, "tabular-nums")}
            required
          />
          <FieldError>{err("quantity")}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor={`${uid}-reason`}>Reason</Label>
        <select
          id={`${uid}-reason`}
          name="reason"
          defaultValue="received"
          onChange={(e) => setReason(e.target.value as StockReason)}
          className={selectCls}
          style={selectArrow}
        >
          {STOCK_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <FieldError>{err("reason")}</FieldError>
      </div>

      <div className={cn("grid gap-4", !compact && "sm:grid-cols-[minmax(0,1fr)_160px]")}>
        <div>
          <Label htmlFor={`${uid}-note`} optional={!noteRequired}>
            {noteRequired ? "What happened?" : "Note"}
          </Label>
          <input
            id={`${uid}-note`}
            name="note"
            maxLength={200}
            placeholder={noteRequired ? "Describe the change" : "Shown in the ledger"}
            className={inputCls}
            required={noteRequired}
          />
          <FieldError>{err("note")}</FieldError>
        </div>
        <div>
          <Label htmlFor={`${uid}-ref`} optional>
            Reference
          </Label>
          <input id={`${uid}-ref`} name="reference" maxLength={60} placeholder="PO / invoice no." className={inputCls} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClasses("ghost", "sm")}>
            Cancel
          </button>
        )}
        <SubmitButton size="sm" pendingText="Applying…">
          Apply change
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * The inline "Adjust" control for a stock-table row: a small button that opens
 * the adjustment form in a dialog and shows a short confirmation once saved.
 */
export function AdjustStockButton({
  action,
  product,
}: {
  action: BoundAction;
  product: { title: string; sku: string; stock: number };
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Escape closes the dialog even when focus was lost to a re-render after a failed submit.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function finish(message: string) {
    setOpen(false);
    setDone(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(null), 4000);
  }

  return (
    <>
      <span className="inline-flex items-center gap-2">
        {done && (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-700" role="status">
            <Check size={12} strokeWidth={2.5} /> {done}
          </span>
        )}
        <button type="button" onClick={() => setOpen(true)} className={buttonClasses("outline", "xs")}>
          <SlidersHorizontal size={13} /> Adjust
        </button>
      </span>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            className="w-full max-w-md overflow-hidden rounded-xl border border-hairline bg-surface shadow-xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-3.5">
              <div className="min-w-0">
                <h2 id={titleId} className="font-display text-[18px] tracking-[-0.015em] text-ink-950">
                  Adjust stock
                </h2>
                <p className="mt-0.5 truncate text-[12.5px] text-ink-500">
                  {product.title} <span className="text-ink-300">·</span> {product.sku}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-m-1 rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                <X size={16} />
              </button>
            </header>
            <div className="p-5">
              <AdjustStockForm action={action} stock={product.stock} compact autoFocus onDone={finish} onCancel={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ----------------------------- Threshold ----------------------------- */

/** Per-product low-stock alert level. `action` is `setThreshold` bound to the product id. */
export function ThresholdForm({ action, value }: { action: BoundAction; value: number }) {
  const uid = useId();
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = state.field === "threshold" ? state.error : undefined;

  return (
    <form action={formAction} className="grid gap-3">
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}
      <div>
        <Label htmlFor={`${uid}-threshold`} hint="Flag this product as low when stock is at or below this number. 0 turns the alert off.">
          Alert level
        </Label>
        <div className="flex items-center gap-2">
          <input
            id={`${uid}-threshold`}
            name="threshold"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={value}
            className={cn(inputCls, "tabular-nums")}
            required
          />
          <SubmitButton size="sm" variant="outline" pendingText="Saving…">
            Save
          </SubmitButton>
        </div>
        <FieldError>{err}</FieldError>
      </div>
    </form>
  );
}
