"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
 * The maintenance switch in the admin header.
 *
 * Red and worded when the shop is down, so nobody leaves it on by accident and
 * nobody has to open anything to find out. The panel holds the message, the
 * optional "back by" time and the one button that flips it — and turning it ON
 * asks first, because it takes the shop away from every shopper at once.
 */
export function MaintenanceSwitch({ view }: { view: MaintenanceView }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(setMaintenance, INITIAL_FORM);
  const panel = useRef<HTMLDivElement>(null);

  // Escape and a click outside both close it, like any menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={panel}>
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

      {open && (
        <div
          role="dialog"
          aria-label="Maintenance mode"
          className="absolute right-0 top-11 z-50 w-[min(92vw,380px)] bg-surface p-4 shadow-lg ring-1 ring-ink-200"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
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

          {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
          {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

          {view.canEdit ? (
            <Form
              action={action}
              className="mt-2 grid gap-3"
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
              <div>
                <Label htmlFor="mnt-message">Message on the holding page</Label>
                <textarea id="mnt-message" name="message" rows={3} maxLength={600} defaultValue={view.message} className={textareaCls} />
                <FieldError>{state.field === "message" ? state.error : undefined}</FieldError>
              </div>
              <div>
                <Label htmlFor="mnt-back" hint="Optional, India time. Shown to shoppers and sent as Retry-After." optional>
                  Back by
                </Label>
                <input id="mnt-back" name="backBy" type="datetime-local" defaultValue={view.backByInput} className={inputCls} />
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
          ) : (
            <p className="mt-2 text-[12.5px] text-ink-500">Only a manager can change this.</p>
          )}
        </div>
      )}
    </div>
  );
}
