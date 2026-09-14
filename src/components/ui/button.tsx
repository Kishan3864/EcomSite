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

/**
 * Buttons are flat, square and lettered in small caps.
 *
 * The old set leaned on shadows, soft corners and a scale-down press, which
 * read as consumer-app rather than considered retail. Colour now does the
 * work: near-black ink for the action we want pressed, warming into indigo as
 * the pointer lands on it; saffron for the single filled accent a page is
 * allowed; a plain ink rule for everything secondary.
 *
 * No variant carries its own disabled colour. Dimming is done once, in
 * `buttonClasses` — the pale greys that used to sit here were applied on top of
 * that opacity, so a disabled primary ended up as white lettering on something
 * barely darker than the page it stood on.
 */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink-950 text-white hover:bg-brand-800 active:bg-brand-900",
  accent: "bg-gold-400 text-ink-950 hover:bg-gold-300 active:bg-gold-500",
  outline:
    "border border-ink-950 bg-transparent text-ink-950 hover:bg-ink-950 hover:text-white",
  ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-950 active:bg-ink-200",
  subtle: "bg-ink-100 text-ink-950 hover:bg-ink-200 active:bg-ink-300",
  danger: "bg-sale-600 text-white hover:bg-sale-700 active:bg-sale-700",
  link: "text-brand-700 underline-offset-4 hover:underline normal-case tracking-normal",
};

const SIZES: Record<Size, string> = {
  xs: "h-8 px-3 text-[10.5px] gap-1.5",
  sm: "h-9 px-4 text-[11px] gap-1.5",
  md: "h-11 px-6 text-[11.5px] gap-2",
  lg: "h-12 px-8 text-[12px] gap-2.5",
  icon: "h-11 w-11",
  "icon-sm": "h-9 w-9",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center font-semibold uppercase tracking-[0.12em]",
    "transition-[background-color,border-color,color] duration-200",
    "disabled:pointer-events-none disabled:opacity-55",
    "whitespace-nowrap select-none",
    // Press feedback on touch screens only; outline and link have no active state.
    "tap",
    VARIANTS[variant],
    SIZES[size],
    // `link` is a word inside a sentence rather than a control, so it gives the
    // box back after the size has been applied. tailwind-merge keeps the last
    // class it is handed, and the size above would otherwise leave a link
    // sitting in a 44px-tall well with 24px of padding on either side.
    variant === "link" && "h-auto p-0",
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
