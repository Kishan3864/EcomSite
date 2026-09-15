"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared form field styling for checkout, auth and account forms.
 *
 * A field is drawn the way the rest of the site is drawn — a hairline rule
 * around a plane — with one deliberate exception: the 4px corner. Everything
 * else on the shop is square, and on a 360px phone that small softening is the
 * only thing telling a thumb which of two bordered rectangles it is allowed to
 * type into. Checkout is not the place to win a purity argument.
 *
 * 16px on phones, 14px from sm up: iOS zooms the whole page into any field set
 * smaller than 16px the moment it is focused, which no app would do.
 *
 * The field no longer suppresses its outline. That `outline-none` was throwing
 * away the ember focus ring the whole site is keyboard-navigated by, leaving
 * a one-shade border change as the only sign of where the cursor was.
 */
export const inputClasses = (invalid?: boolean) =>
  cn(
    "h-11 w-full rounded-lg border bg-surface px-3.5 text-[16px] text-ink-900 sm:text-[14px]",
    "transition-[border-color,box-shadow] duration-200 placeholder:text-ink-400",
    invalid
      ? "border-sale-600 focus:border-sale-600 focus:shadow-[0_0_0_3px_rgb(184_58_84/0.12)]"
      : "border-hairline hover:border-ink-300 focus:border-brand-600 focus:shadow-[0_0_0_3px_rgb(52_69_138/0.12)]",
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
      {/* Small caps in ink, the same label the rest of the site uses over a
          ledger row or a department list, so a form reads as part of the shop
          rather than as a web form dropped into it. */}
      <label
        htmlFor={htmlFor}
        className="mb-2 flex items-baseline justify-between gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500"
      >
        {label}
        {optional && <span className="font-medium text-ink-400">Optional</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-[1.5] text-sale-600">
          <AlertCircle size={13} className="mt-[3px] shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-[13px] leading-[1.5] text-ink-500">{hint}</p>
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
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23676d77' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
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
        "rounded-field border bg-surface transition-colors duration-200",
        // Choosing a card changes the colour of its rule; it does not lay a
        // second rule over the first. The shadow that used to sit here was only
        // ever faking a 2px border, and a shadow is the one thing this design
        // never draws structure with.
        selected ? "border-brand-700" : "border-hairline",
        disabled && "opacity-55",
        className,
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={selected}
        className="tap flex w-full items-start gap-2.5 p-3 text-left sm:gap-3 sm:p-4"
      >
        <span
          className={cn(
            "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center is-circle rounded-full border transition-all",
            selected ? "border-[5px] border-brand-700" : "border-ink-300",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-2">
            <span className="text-[13.5px] font-semibold text-ink-950 sm:text-[14px]">{title}</span>
            {badge}
          </span>
          {subtitle && (
            <span className="mt-1 block max-w-[46ch] text-[13px] leading-[1.5] text-ink-600">
              {subtitle}
            </span>
          )}
        </span>
        {meta && <span className="shrink-0 text-right">{meta}</span>}
      </button>
      {selected && children && (
        <div className="border-t border-hairline p-3 sm:p-4">{children}</div>
      )}
    </div>
  );
}
