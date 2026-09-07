import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "accent"
  | "outline"
  | "ghost"
  | "subtle"
  | "danger"
  | "link";
type Size = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-900 text-white shadow-sm hover:bg-brand-800 active:bg-brand-950 disabled:bg-ink-300",
  accent:
    "bg-gold-500 text-ink-950 shadow-sm hover:bg-gold-400 active:bg-gold-600 disabled:bg-ink-200",
  outline:
    "border border-ink-300 bg-surface text-ink-900 hover:border-ink-900 hover:bg-ink-50 active:bg-ink-100",
  ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200",
  subtle: "bg-ink-100 text-ink-900 hover:bg-ink-200 active:bg-ink-300",
  danger: "bg-sale-600 text-white hover:bg-sale-700 active:bg-sale-700",
  link: "text-brand-700 underline-offset-4 hover:underline p-0 h-auto",
};

const SIZES: Record<Size, string> = {
  xs: "h-8 px-3 text-xs gap-1.5 rounded-md",
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-md",
  md: "h-11 px-5 text-sm gap-2 rounded-lg",
  lg: "h-13 px-7 text-[15px] gap-2.5 rounded-xl",
  icon: "h-11 w-11 rounded-lg",
  "icon-sm": "h-9 w-9 rounded-md",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center font-medium tracking-[-0.01em]",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-200",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-60",
    "whitespace-nowrap select-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", loading, children, disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={buttonClasses(variant, size, className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span
            aria-hidden
            className="mr-0.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    );
  },
);
