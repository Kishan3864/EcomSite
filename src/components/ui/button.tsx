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
 * Buttons carry the site's two colours, each with one job.
 *
 * `accent` is gold, and it means "this is the thing to press": add to bag,
 * wherever a bag exists. It is the same gold on a product card, in the quick
 * view, on the product page and in the bar that follows you down a phone
 * screen, so the action is one recognisable object the whole way through.
 *
 * `primary` is ocean, and it means "go on": buy now, place the order,
 * continue. Structure is ocean everywhere else on the site, so an ocean
 * button reads as part of the shop rather than as a second accent competing
 * with the gold one.
 *
 * Everything secondary is a plain rule on the surface.
 *
 * No variant carries its own disabled colour. Dimming is done once, in
 * `buttonClasses` — the pale greys that used to sit here were applied on top of
 * that opacity, so a disabled primary ended up as white lettering on something
 * barely darker than the page it stood on.
 */
const VARIANTS: Record<Variant, string> = {
  // Ocean, not near-black. A filled black button is a typographic device;
  // a shop's buy button should be the brand's own colour, so that "the thing
  // you press to spend money" is one recognisable object from the product card
  // through the bag to the last step of the checkout.
  primary: "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900",
  accent: "bg-gold-400 text-ink-950 hover:bg-gold-300 active:bg-gold-500",
  // Filled, not outlined — there are no outlines left. A secondary action is
  // a step of grey off the card it sits on, which is enough to read as a
  // button without competing with the primary beside it. The name stays
  // `outline` because it is spelled out at call sites across the app.
  outline: "bg-ink-100 text-ink-900 hover:bg-ink-200 active:bg-ink-300",
  ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-950 active:bg-ink-200",
  subtle: "bg-ink-100 text-ink-950 hover:bg-ink-200 active:bg-ink-300",
  danger: "bg-sale-600 text-white hover:bg-sale-700 active:bg-sale-700",
  link: "text-brand-700 underline-offset-4 hover:underline tracking-normal",
};

// A step larger than before, because the labels are no longer capitalised:
// "ADD TO BAG" at 11.5px occupies far more of a button than "Add to bag" does,
// so dropping the caps without raising the size leaves the control looking
// empty.
const SIZES: Record<Size, string> = {
  xs: "h-8 px-3 text-[12px] gap-1.5",
  sm: "h-9 px-4 text-[12.5px] gap-1.5",
  md: "h-11 px-5 text-[13.5px] gap-2",
  lg: "h-12 px-7 text-[14px] gap-2.5",
  icon: "h-11 w-11",
  "icon-sm": "h-9 w-9",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(
    // Sentence case with a soft corner. Every button on the shop used to be
    // SET IN SMALL CAPS AT 0.12em, which is a gallery label, not a control —
    // it made "Add to bag" read as signage and cost a third of the button's
    // width in letter-spacing.
    "inline-flex items-center justify-center font-semibold tracking-[0.005em]",
    // The stray double comma here made the whole shorthand invalid, so no
    // button was transitioning anything.
    "transition-[background-color,color,box-shadow] duration-200",
    "disabled:pointer-events-none disabled:opacity-55",
    "whitespace-nowrap select-none",
    // Press feedback on touch screens only; outline and link have no active state.
    "tap",
    VARIANTS[variant],
    /**
     * Three layers, and each is doing a job.
     *
     *   inset 0 1px white/13%   a lit top edge. One pixel of the button's own
     *                           colour mixed towards white, which is what a
     *                           physical key looks like under a room light and
     *                           is most of why a button reads as pressable
     *                           rather than as a coloured rectangle.
     *   inset ring black/9%     the edge. Tinted black rather than a fixed
     *                           grey, because the same class sits on gold, on
     *                           ocean and on pale grey — a grey that reads as
     *                           an edge on the secondary button reads as a
     *                           scratch on the gold one. Inset, so the button
     *                           stays exactly its stated height.
     *   0 1px 2px black/9%      the ground shadow, barely there.
     *
     * Hover lifts it — the ring tightens and the ground shadow spreads — and
     * press inverts it: the top highlight goes out and the shadow moves
     * inside, so the button looks pushed into the page rather than merely
     * recoloured. `transition` above already covers box-shadow.
     *
     * `ghost` and `link` are words, not boxes, and are left alone.
     */
    variant !== "ghost" &&
      variant !== "link" &&
      [
        "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.13),inset_0_0_0_1px_rgb(0_0_0/0.09),0_1px_2px_0_rgb(18_23_27/0.09)]",
        "hover:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.16),inset_0_0_0_1px_rgb(0_0_0/0.11),0_3px_8px_-2px_rgb(18_23_27/0.17)]",
        "active:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.13),inset_0_2px_5px_-1px_rgb(18_23_27/0.2)]",
      ].join(" "),
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
            className="mr-0.5 h-3.5 w-3.5 animate-spin"
          />
        )}
        {children}
      </button>
    );
  },
);
