"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, ChevronDown, CircleDot, Loader2, TriangleAlert } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormState } from "@/services/admin/form-state";
import { useAdminUser } from "./admin-user";
import { useStored } from "./use-stored";

/* ======================================================================= *
 *  CollapsibleSection
 * ======================================================================= */

/**
 * A form section that folds.
 *
 * The fields stay mounted while it is shut, so everything in a folded section
 * is still submitted — folding is about the screen, never about the data.
 * Shut, it is `inert`: out of the tab order and away from screen readers.
 *
 * Two things open it by themselves, because a folded section must never be
 * where a save goes to die. The browser cannot focus an invalid field it cannot
 * show, and would refuse the submit without a word: an `invalid` event inside a
 * shut section opens it. And when the server names a field in its error, the
 * section holding that field opens.
 *
 * Open or shut is remembered per admin, per form, in this browser.
 */
export function CollapsibleSection({
  formId,
  title,
  description,
  defaultOpen = false,
  errorField,
  children,
}: {
  /** Names the form, so "Pricing" on a product and on a banner are remembered apart. */
  formId: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  /** The field the server's last error pointed at, if any. */
  errorField?: string | undefined;
  children: React.ReactNode;
}) {
  const user = useAdminUser();
  const key = `weekendcart:admin:section:${user}:${formId}:${title}`;
  const [stored, setStored] = useStored(key, defaultOpen ? "1" : "0");
  const open = stored === "1";
  const set = (next: boolean) => setStored(next ? "1" : "0");
  const body = useRef<HTMLDivElement>(null);
  const id = useId();

  // The server said which field was wrong: show it. Asked of the DOM, because
  // only the DOM knows which section a field ended up in.
  useEffect(() => {
    if (!errorField || !body.current) return;
    const names = [...body.current.querySelectorAll<HTMLElement>("[name]")].map((el) => el.getAttribute("name"));
    if (names.includes(errorField)) setStored("1");
  }, [errorField, setStored]);

  return (
    <section className="bg-surface shadow-sm" onInvalidCapture={() => set(true)}>
      <h2 className="m-0">
        <button
          type="button"
          onClick={() => set(!open)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-700"
        >
          <span className="min-w-0">
            <span className="block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-900">{title}</span>
            {description && <span className="mt-1 block text-[12.5px] font-normal leading-relaxed text-ink-500">{description}</span>}
          </span>
          <ChevronDown size={16} className={cn("mt-0.5 shrink-0 text-ink-500 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </h2>
      <div
        id={id}
        className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div ref={body} className="min-h-0 overflow-hidden" inert={!open}>
          <div className="px-5 pb-5 pt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}

/* ======================================================================= *
 *  SaveBar
 * ======================================================================= */

/** Everything a person can change in a form, as one comparable string. Files are skipped. */
function snapshot(form: HTMLFormElement): string {
  const parts: string[] = [];
  new FormData(form).forEach((value, name) => {
    if (typeof value === "string" && !name.startsWith("$ACTION")) parts.push(`${name}=${value}`);
  });
  return parts.join(String.fromCharCode(10));
}

/**
 * The save control of a form: at the top, sticky, and honest about state.
 *
 * It sits INSIDE the form it saves, as its first child. It says one of four
 * things — nothing has changed, there are unsaved changes, it is saving, it
 * saved (or did not) — and it is where Ctrl+S and Cmd+S land.
 *
 * "Changed" is judged by comparing the form's values with what they were when
 * the page opened or last saved, not by listening for keystrokes: the image,
 * specification and variant editors change hidden inputs from React state, and
 * typing a word and deleting it again is not a change.
 *
 * On a page with several forms (Settings, Team) each has its own bar, and a bar
 * only sticks while its form has unsaved changes, so they do not pile up.
 *
 * It also carries a CAUTION: `state.warning` from a save that went through, or
 * `notice` — something true of the saved record — until a save replaces it. The
 * price guard's sentence used to be printed at the top of the form and inside
 * the pricing section. A product was then set live at ₹6 with no warning seen,
 * because a save made from half way down a long form leaves the top 500px
 * above the window, and the pricing section is shut until somebody opens it.
 * This bar is the only part of a form that is on screen wherever the admin is,
 * so this is where a caution has to be.
 */
export function SaveBar({
  state,
  label = "Save",
  pendingLabel = "Saving…",
  alwaysSticky = true,
  disabled,
  variant = "primary",
  children,
  notice,
}: {
  /** The form's action state, so the bar can tell a save that worked from one that did not. */
  state?: FormState;
  label?: string;
  pendingLabel?: string;
  /** False on pages that hold several forms. */
  alwaysSticky?: boolean;
  disabled?: boolean;
  variant?: ButtonProps["variant"];
  /** Extra controls beside the button — a Cancel link, say. */
  children?: React.ReactNode;
  /** A caution about the record AS SAVED, shown until a save answers with its own. */
  notice?: string | null | undefined;
}) {
  const { pending } = useFormStatus();
  const bar = useRef<HTMLDivElement>(null);
  const baseline = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const wasPending = useRef(false);

  // Watch the form this bar lives in.
  useEffect(() => {
    const form = bar.current?.closest("form");
    if (!form) return;
    // A tick after mount, so editors that fill hidden inputs have done so.
    const first = window.setTimeout(() => {
      baseline.current = snapshot(form);
    }, 60);
    let timer = 0;
    const check = () => {
      window.clearTimeout(timer);
      // After React has re-rendered whatever the event changed.
      timer = window.setTimeout(() => {
        if (baseline.current !== null) setDirty(snapshot(form) !== baseline.current);
      }, 40);
    };
    const events = ["input", "change", "click", "keyup"] as const;
    for (const e of events) form.addEventListener(e, check);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(timer);
      for (const e of events) form.removeEventListener(e, check);
    };
  }, []);

  // A save that worked becomes the new baseline.
  useEffect(() => {
    if (wasPending.current && !pending) {
      const form = bar.current?.closest("form");
      if (state?.ok && form) {
        // React resets an uncontrolled form after its action; wait for that.
        window.setTimeout(() => {
          baseline.current = snapshot(form);
          setDirty(false);
          setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
        }, 80);
      }
    }
    wasPending.current = pending;
  }, [pending, state]);

  // Ctrl+S / Cmd+S. The browser's "save page" is never what is wanted here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
      const form = bar.current?.closest("form");
      if (!form) return;
      // With several forms on a page, the one being worked in wins; failing
      // that, the one with unsaved changes.
      const bars = document.querySelectorAll("[data-save-bar]");
      const focused = form.contains(document.activeElement);
      if (bars.length > 1 && !focused && !dirty) return;
      e.preventDefault();
      if (pending || disabled) return;
      const button = bar.current?.querySelector<HTMLButtonElement>("button[type=submit]");
      form.requestSubmit(button ?? undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, pending, disabled]);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const failed = !pending && !!state?.error;
  // A save that went through speaks for the record from then on: if it carries
  // no warning, the standing one is out of date and must not linger.
  const caution = state?.ok ? state.warning : notice;
  const sticky = alwaysSticky || dirty;

  return (
    <div
      ref={bar}
      data-save-bar
      className={cn(
        "z-30 -mx-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-canvas/95 px-1 py-2.5 backdrop-blur",
        sticky && "sticky top-16",
      )}
    >
      <p role="status" aria-live="polite" className="flex min-w-0 items-center gap-2 text-[12.5px]">
        {pending ? (
          <>
            <Loader2 size={14} className="shrink-0 animate-spin text-ink-500" />
            <span className="text-ink-600">Saving…</span>
          </>
        ) : failed ? (
          <>
            <TriangleAlert size={14} className="shrink-0 text-sale-600" />
            <span className="font-semibold text-sale-700">Not saved — see the message below</span>
          </>
        ) : dirty ? (
          <>
            <CircleDot size={14} className="shrink-0 text-gold-600" />
            <span className="font-semibold text-gold-800">Unsaved changes</span>
          </>
        ) : savedAt && caution ? (
          // Not a green tick: a save the guard points at is not simply "fine".
          <>
            <TriangleAlert size={14} className="shrink-0 text-gold-600" />
            <span className="font-semibold text-gold-800">Saved at {savedAt} — read the note below</span>
          </>
        ) : savedAt ? (
          <>
            <Check size={14} className="shrink-0 text-[#1c6636]" />
            <span className="font-semibold text-[#1c6636]">Saved at {savedAt}</span>
          </>
        ) : (
          <span className="text-ink-400">No changes yet</span>
        )}
        <kbd className="ml-1 hidden bg-ink-100 px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-ink-500 sm:inline">Ctrl S</kbd>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button type="submit" size="sm" variant={variant} disabled={pending || disabled}>
          {pending ? pendingLabel : label}
        </Button>
      </div>
      {caution && !pending && (
        <p role="alert" className="flex w-full items-start gap-2 bg-gold-50 px-3 py-2 text-[12.5px] font-medium leading-relaxed text-gold-800 ring-1 ring-inset ring-gold-500/40">
          <TriangleAlert size={14} className="mt-[3px] shrink-0" />
          <span>{caution}</span>
        </p>
      )}
    </div>
  );
}
