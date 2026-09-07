"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Copy, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

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
    <form
      action={action}
      className={cn("inline", className)}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

/* ---------------------------- Flash message -------------------------- */

/**
 * Server actions that redirect append `?flash=<text>&tone=ok|error`; this
 * shows it once and cleans the URL.
 */
export function FlashMessage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const flash = params.get("flash");
  const tone = params.get("tone") === "error" ? "error" : "ok";
  // Visibility is derived: a flash is shown until it has been dismissed. Keying
  // the dismissal to the message means a new flash shows even if the last one
  // was closed, without any state being set synchronously in an effect.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const visible = Boolean(flash) && dismissed !== flash;

  useEffect(() => {
    if (!flash) return;
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
  }, [flash]);

  return (
    <AnimatePresence>
      {visible && flash && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={cn(
            "mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px]",
            tone === "error"
              ? "border-sale-200 bg-sale-50 text-sale-700"
              : "border-brand-200 bg-brand-50 text-brand-900",
          )}
          role="status"
        >
          {tone === "error" ? (
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          ) : (
            <Check size={15} className="mt-0.5 shrink-0" strokeWidth={2.5} />
          )}
          <span className="flex-1">{flash}</span>
          <button
            onClick={() => setDismissed(flash)}
            aria-label="Dismiss"
            className="-m-1 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
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
  tone?: "ok" | "error" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px]",
        tone === "error" && "border-sale-200 bg-sale-50 text-sale-700",
        tone === "ok" && "border-brand-200 bg-brand-50 text-brand-900",
        tone === "info" && "border-ink-200 bg-ink-50 text-ink-700",
        className,
      )}
    >
      {tone === "error" ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <Check size={14} className="mt-0.5 shrink-0" />}
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
        "flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3 transition-colors focus-within:border-brand-500",
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
          className="rounded p-0.5 text-ink-400 hover:text-ink-700"
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
}: {
  name: string;
  value?: string;
  options: { value: string; label: string }[];
  className?: string;
  allLabel?: string;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  return (
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
        "h-10 rounded-lg border border-ink-200 bg-surface px-3 pr-8 text-[13px] text-ink-800 outline-none focus:border-brand-500",
        className,
      )}
      aria-label={name}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
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
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
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
