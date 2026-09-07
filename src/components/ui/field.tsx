"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared form field styling for checkout, auth and account forms. */

export const inputClasses = (invalid?: boolean) =>
  cn(
    "h-11 w-full rounded-lg border bg-canvas px-3.5 text-[14px] text-ink-900 outline-none",
    "transition-colors placeholder:text-ink-400",
    invalid
      ? "border-sale-500 focus:border-sale-600"
      : "border-ink-200 hover:border-ink-300 focus:border-brand-500",
  );

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px] font-medium text-ink-800"
      >
        {label}
        {optional && <span className="text-[11px] font-normal text-ink-400">Optional</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-sale-600">
          <AlertCircle size={12} className="mt-px shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11.5px] text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(inputClasses(invalid), className)}
      {...props}
    />
  );
});

export function Select({
  className,
  invalid,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(inputClasses(invalid), "appearance-none pr-9", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2377776f' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

/** Large tappable radio card used for address, delivery and payment choices. */
export function OptionCard({
  selected,
  onSelect,
  title,
  subtitle,
  badge,
  meta,
  children,
  disabled,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface transition-all duration-200",
        selected ? "border-brand-700 shadow-[0_0_0_1px_var(--color-brand-700)]" : "border-ink-200",
        disabled && "opacity-55",
        className,
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={selected}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span
          className={cn(
            "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-all",
            selected ? "border-[5px] border-brand-700" : "border-ink-300",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-ink-950">{title}</span>
            {badge}
          </span>
          {subtitle && (
            <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-600">
              {subtitle}
            </span>
          )}
        </span>
        {meta && <span className="shrink-0 text-right">{meta}</span>}
      </button>
      {selected && children && <div className="border-t border-hairline p-4">{children}</div>}
    </div>
  );
}
