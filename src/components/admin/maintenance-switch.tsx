"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Construction, X } from "lucide-react";
import { Notice, SubmitButton } from "./client";
import { FieldError, Label, inputCls, textareaCls } from "./ui";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { setMaintenance } from "@/services/admin/maintenance-actions";

export interface MaintenanceView {
  on: boolean;
  message: string;
  /** Already formatted for a datetime-local input, in IST, or "". */
  backByInput: string;
  canEdit: boolean;
}

/**
 * The form that flips maintenance mode. Used twice: in the header's panel, and
 * on its own page under Settings, so the switch never depends on a popover
 * working — if one road to it is blocked for any reason, the other is a plain
 * page with a plain form.
 *
 * Turning it ON asks first, because it takes the shop away from every shopper
 * at once.
 */
export function MaintenanceForm({ view, idPrefix = "mnt" }: { view: MaintenanceView; idPrefix?: string }) {
  const [state, action] = useActionState(setMaintenance, INITIAL_FORM);

  if (!view.canEdit) return <p className="text-[12.5px] text-ink-500">Only a manager can change this.</p>;

  return (
    <Form
      action={action}
      className="grid gap-3"
      onSubmit={(e) => {
        const turningOn = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === "true";
        if (
          turningOn &&
          !view.on &&
          !window.confirm(
            "Switch maintenance mode ON?\n\nEvery shopper will see the holding page instead of the shop, straight away, until you switch it off. Orders cannot be placed meanwhile.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}
      <div>
        <Label htmlFor={`${idPrefix}-message`}>Message on the holding page</Label>
        <textarea id={`${idPrefix}-message`} name="message" rows={3} maxLength={600} defaultValue={view.message} className={textareaCls} />
        <FieldError>{state.field === "message" ? state.error : undefined}</FieldError>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-back`} hint="Optional, India time. Shown to shoppers and sent as Retry-After." optional>
          Back by
        </Label>
        <input id={`${idPrefix}-back`} name="backBy" type="datetime-local" defaultValue={view.backByInput} className={inputCls} />
        <FieldError>{state.field === "backBy" ? state.error : undefined}</FieldError>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {view.on ? (
          <>
            <SubmitButton name="on" value="true" size="sm" variant="outline" pendingText="Saving…">
              Save message
            </SubmitButton>
            <SubmitButton name="on" value="false" size="sm" variant="primary" pendingText="Opening…">
              Switch OFF — open the shop
            </SubmitButton>
          </>
        ) : (
          <SubmitButton name="on" value="true" size="sm" variant="danger" pendingText="Switching on…">
            Switch ON
          </SubmitButton>
        )}
      </div>
    </Form>
  );
}

/**
 * The maintenance button in the admin header, and its panel.
 *
 * Red and worded when the shop is down, so nobody leaves it on by accident.
 *
 * The panel is drawn in a portal on <body>, position fixed, over a full-screen
 * backdrop that closes it. Nothing about it depends on the header's stacking
 * context, on a parent's overflow, or on a document-level mouse listener
 * racing the button's own click — three ways a popover anchored inside a
 * sticky, blurred header can fail to show on one page or one browser and not
 * another.
 */
export function MaintenanceSwitch({ view }: { view: MaintenanceView }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={view.on ? "The storefront is showing the maintenance page" : "The storefront is open"}
        className={cn(
          "flex h-9 items-center gap-2 px-3 text-[12px] font-semibold transition-colors",
          view.on ? "bg-sale-600 text-white hover:bg-sale-700" : "bg-canvas text-ink-600 hover:text-ink-950",
        )}
      >
        <Construction size={14} />
        <span className="hidden sm:inline">{view.on ? "MAINTENANCE ON" : "Maintenance: off"}</span>
        <span className="sm:hidden">{view.on ? "ON" : "Off"}</span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100]">
            <button type="button" aria-label="Close" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 h-full w-full cursor-default bg-ink-950/20" />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Maintenance mode"
              className="absolute right-3 top-[68px] max-h-[calc(100dvh-84px)] w-[min(calc(100vw-24px),400px)] overflow-y-auto bg-surface p-4 shadow-xl ring-1 ring-ink-200 sm:right-6"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-ink-950">Maintenance mode</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
                    {view.on
                      ? "Shoppers see a holding page (HTTP 503). The admin stays open, and you still see the shop while signed in."
                      : "The storefront is open. Switching this on shows every shopper a holding page; the admin and payment callbacks keep working."}
                  </p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-ink-400 hover:text-ink-900">
                  <X size={15} />
                </button>
              </div>
              <MaintenanceForm view={view} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
