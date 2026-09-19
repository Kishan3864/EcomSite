"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Copy, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { VisibilityToggle } from "./ui";

/**
 * Interactive admin primitives. Everything here is deliberately small — forms
 * post to server actions, and the URL is the source of truth for list state.
 */

/* ---------------------------- Submit button -------------------------- */

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

/* ---------------------------- Confirm action ------------------------- */

/**
 * A form whose submit asks for confirmation first. Wrap a destructive server
 * action: `<ConfirmForm action={deleteThing} message="Delete?">…</ConfirmForm>`
 */
export function ConfirmForm({
  action,
  message,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Form
      action={action}
      className={cn("inline", className)}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Form>
  );
}

/**
 * The on/off switch of a list row, as a form of its own.
 *
 * One component for every list, so no page draws its own switch. When the
 * switch has a blast radius — a department holding products a shopper can see —
 * the caller passes `confirm` with the real number in it, and the submit asks
 * first. Without it the switch just switches.
 */
export function ToggleForm({
  action,
  on,
  what,
  confirm,
  storefront = true,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  on: boolean;
  what: string;
  confirm?: string | null;
  storefront?: boolean;
  /** The hidden inputs the action reads. */
  children: React.ReactNode;
}) {
  return (
    <Form
      action={action}
      className="inline"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <VisibilityToggle on={on} what={what} storefront={storefront} />
    </Form>
  );
}

/* ---------------------------- Flash message -------------------------- */

/**
 * Server actions that redirect append `?flash=<text>&tone=ok|error|warn`; this
 * shows it once and cleans the URL.
 *
 * `warn` is for a change that went through but needs a second look — a product
 * just put on sale at a price the guard points at. It is gold, it is announced,
 * and unlike the other two it does NOT fade after four seconds: a caution that
 * disappears while somebody is still reading the table below it is not one.
 */
export function FlashMessage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const flash = params.get("flash");
  const wanted = params.get("tone");
  const tone = wanted === "error" || wanted === "warn" ? wanted : "ok";
  // Visibility is derived: a flash is shown until it has been dismissed. Keying
  // the dismissal to the message means a new flash shows even if the last one
  // was closed, without any state being set synchronously in an effect.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const visible = Boolean(flash) && dismissed !== flash;

  useEffect(() => {
    if (!flash || tone === "warn") return;
    const t = setTimeout(() => {
      setDismissed(flash);
      const next = new URLSearchParams(params.toString());
      next.delete("flash");
      next.delete("tone");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 4200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash, tone]);

  return (
    <AnimatePresence>
      {visible && flash && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={cn(
            "mb-5 flex items-start gap-2.5 px-4 py-3 text-[13px]",
            tone === "error"
              ? "bg-sale-50 text-sale-700"
              : tone === "warn"
                ? "bg-gold-50 font-medium text-gold-800 ring-1 ring-inset ring-gold-500/40"
                : "bg-brand-50 text-brand-900",
          )}
          role={tone === "warn" ? "alert" : "status"}
        >
          {tone !== "ok" ? (
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          ) : (
            <Check size={15} className="mt-0.5 shrink-0" strokeWidth={2.5} />
          )}
          <span className="flex-1">{flash}</span>
          <button
            onClick={() => setDismissed(flash)}
            aria-label="Dismiss"
            className="-m-1 p-1 opacity-60 transition-opacity hover:opacity-100"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ----------------------------- Inline notice ------------------------- */

export function Notice({
  tone = "ok",
  children,
  className,
}: {
  tone?: "ok" | "error" | "info" | "warn";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 px-3.5 py-2.5 text-[13px]",
        tone === "error" && "bg-sale-50 text-sale-700",
        tone === "ok" && "bg-brand-50 text-brand-900",
        tone === "info" && "bg-ink-50 text-ink-700",
        tone === "warn" && "bg-gold-50 text-gold-800",
        className,
      )}
    >
      {tone === "error" || tone === "warn" ? (
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      ) : (
        <Check size={14} className="mt-0.5 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}

/* ------------------------------- Search ------------------------------ */

/** GET form that writes `q` into the URL and resets the page. */
export function SearchBox({
  placeholder = "Search…",
  defaultValue = "",
  className,
}: {
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commit(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set("q", next);
    else sp.delete("q");
    sp.delete("page");
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <div
      className={cn(
        "field-edge flex h-10 items-center gap-2 bg-surface px-3 transition-colors",
        className,
      )}
    >
      <Search size={15} className="shrink-0 text-ink-400" />
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(e.target.value.trim()), 350);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (timer.current) clearTimeout(timer.current);
            commit(value.trim());
          }
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink-400"
        aria-label="Search"
      />
      {value && (
        <button
          onClick={() => {
            setValue("");
            commit("");
          }}
          aria-label="Clear"
          className="p-0.5 text-ink-400 hover:text-ink-700"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/** A select that updates a URL param on change. */
export function ParamSelect({
  name,
  value,
  options,
  className,
  allLabel = "All",
  label,
}: {
  name: string;
  value?: string | undefined;
  options: { value: string; label: string }[];
  className?: string;
  allLabel?: string;
  /** A visible caption above the select. With it, the select fills its cell. */
  label?: string;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const select = (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const sp = new URLSearchParams(params.toString());
        if (e.target.value) sp.set(name, e.target.value);
        else sp.delete(name);
        sp.delete("page");
        const qs = sp.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }}
      className={cn(
        "h-10 bg-surface px-3 pr-8 text-[13px] text-ink-800 outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
        label && "w-full min-w-0",
        // A filter that is doing something looks like it.
        label && value && "font-semibold text-brand-900 ring-1 ring-brand-600",
        className,
      )}
      aria-label={label ?? name}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  if (!label) return select;
  return (
    <label className="grid min-w-0 gap-1">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">{label}</span>
      {select}
    </label>
  );
}

/* ---------------------------- Filter bar --------------------------- */

/**
 * A list's search, sort and filters, arranged so they hold at any width.
 *
 * A row of selects that wraps looks broken at every width it was not drawn
 * for. So: search and sort share the top row and never move; the filters sit
 * below in a grid whose columns follow the width — two on a phone, up to seven
 * on a wide screen — each the full width of its cell, with a caption. On a
 * phone the grid is folded behind one Filters button that says how many are in
 * use, because seven selects are a screen and a half before the first product.
 * Below that, every filter in use is a chip that removes itself, so the state
 * of the list can be read without opening anything.
 */
export function FilterBar({
  search,
  sort,
  chips,
  clearHref,
  children,
}: {
  search: React.ReactNode;
  sort: React.ReactNode;
  chips: { label: string; href: string }[];
  clearHref: string;
  /** The ParamSelects, each given a `label`. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  return (
    <div className="mb-4 grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0 [&>*]:w-full">{search}</div>
        <div className="grid grid-cols-2 gap-2 sm:block">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panel}
            className="flex h-10 items-center justify-center gap-2 bg-surface px-3 text-[13px] font-semibold text-ink-800 sm:hidden"
          >
            <SlidersHorizontal size={14} />
            Filters{chips.length > 0 ? ` (${chips.length})` : ""}
          </button>
          <div className="min-w-0 sm:w-52">{sort}</div>
        </div>
      </div>

      <div
        id={panel}
        className={cn(
          "gap-x-2 gap-y-3 bg-canvas sm:grid sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7",
          open ? "grid grid-cols-2" : "hidden",
        )}
      >
        {children}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              scroll={false}
              className="inline-flex items-center gap-1.5 bg-brand-50 px-2 py-1 text-[12px] font-medium text-brand-900 transition-colors hover:bg-brand-100"
            >
              {chip.label}
              <X size={12} aria-hidden />
              <span className="sr-only">Remove filter</span>
            </Link>
          ))}
          <Link href={clearHref} scroll={false} className="px-2 py-1 text-[12px] font-semibold text-ink-500 underline-offset-2 hover:text-ink-950 hover:underline">
            Clear all
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Copy ------------------------------- */

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11.5px] font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
    >
      {done ? <Check size={12} className="text-brand-600" /> : <Copy size={12} />}
      {done ? "Copied" : label}
    </button>
  );
}

/* -------------------------- Pending overlay -------------------------- */

export function PendingHint({ text = "Saving…" }: { text?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-500">
      <Loader2 size={12} className="animate-spin" /> {text}
    </span>
  );
}
