"use client";

import * as React from "react";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared form field styling for checkout, auth and account forms.
 *
 * A field is drawn the way the rest of the site is drawn, which no longer means
 * what the note here used to say. There is no hairline rule around a plane and
 * there is no 4px corner: `@layer base` forces `border-width: 0` and
 * `border-radius: 0` on every element and pseudo-element in the app. What tells
 * a thumb it may type into a rectangle is the fill — every control gets
 * `bg-ink-50` and an inset 1px ink-200 ring, because with no borders left a
 * white box on a white card is not a field, it is a gap.
 *
 * 16px on phones, 14px from sm up: iOS zooms the whole page into any field set
 * smaller than 16px the moment it is focused, which no app would do.
 *
 * The field no longer suppresses its outline. That `outline-none` was throwing
 * away the gold focus ring the whole site is keyboard-navigated by, leaving
 * a one-shade border change as the only sign of where the cursor was.
 */
export const inputClasses = (invalid?: boolean) =>
  cn(
    "h-11 w-full bg-ink-50 px-3.5 text-[16px] text-ink-900 sm:text-[14px]",
    "transition-[box-shadow] duration-200 placeholder:text-ink-400",
    invalid
      ? "focus:shadow-[0_0_0_3px_rgb(184_58_84/0.12)]"
      : "focus:shadow-[0_0_0_3px_rgb(52_69_138/0.12)]",
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

/**
 * Large tappable radio card used for address, delivery and payment choices.
 *
 * THE CHOSEN CARD IS TINTED, LIFTED, BARRED AND TICKED, and three of those four
 * were not rendering. Written down because each one will look redundant to
 * whoever next tries to simplify this:
 *
 *   The bar and the lift arrive together in `rule-l-raised`, ONE declaration.
 *   They used to be `shadow-md rule-l`, and `rule-l` sets `box-shadow` outright
 *   while `shadow-md` composes through `--tw-shadow`; same layer, same
 *   specificity, `rule-l` emitted later. The chosen card got the 2px bar and
 *   nothing else — no elevation, and none of the 1px hairline ring every
 *   elevation carries as its first layer — so it sat FLATTER and edgeless
 *   beside the plain white cards it had been chosen over. Anything added to the
 *   chosen card's depth has to go inside that utility, never beside it.
 *
 *   The fill is brand-100, not brand-50. brand-50 #eef4f7 against the canvas
 *   #f4f3f0 the checkout sits on is a 1.00:1 luminance match — the tint was not
 *   subtle, it was absent. brand-100 clears both grounds: 1.14:1 off the page
 *   and 1.26:1 off the white cards either side of it, which is the comparison
 *   the customer actually makes. The cost is that ink-500 lands at 4.05:1 on
 *   this fill and fails, so anything readable inside a card body is ink-600 or
 *   darker. Audit new text against the fill, not against white.
 *
 *   The marker is a solid ocean square with a white tick. It used to be the
 *   same square with a 4px white inset punched through it, leaving a 10px core
 *   inside an 18px box — so the chosen marker carried visibly LESS ink than the
 *   solid ink-200 squares beside it, and the punch was `--color-surface` white
 *   haloing against a tinted card. It stays 18px: settings-client.tsx sizes its
 *   loading skeletons to this card's height by hand.
 *
 *   Unselected keeps its solid ink-200 marker and gains a hover. `.tap` lives
 *   inside `@media (hover: none)` and this card carried no `hover:` class, so a
 *   mouse got no sign these were clickable at all. Making the chosen state loud
 *   is the fix; making the unchosen state quiet is not. The reason ink-200
 *   stays is that it is a solid 18px mass rather than a 2px line, NOT that it
 *   clears SC 1.4.11 — it does not: #d7dde2 on white is 1.37:1, and ink-300 at
 *   1.88:1 would not clear it either. Reaching 3:1 means a solid ink-500-ish
 *   square, which is a dark grey block sitting beside the ocean one and eats
 *   most of the difference between chosen and not. The unchecked indicator is a
 *   known 1.4.11 gap, recorded rather than papered over with a wrong number.
 *
 *   Hover moves elevation only. It used to add `hover:bg-ink-50`, and ink-50
 *   #f4f6f8 against the checkout canvas #f4f3f0 is a 1.02:1 match — resting
 *   white is 1.11:1, so hovering made the card blend INTO the page instead of
 *   standing off it. Elevation-only is also what the product card and the
 *   category tiles already do.
 *
 * DISABLED BEATS SELECTED, on purpose. A stored `cod` draft against a basket
 * that has since crossed the COD limit used to paint a card as chosen while its
 * own subtitle explained the order could not be sent cash on delivery. That
 * contradiction was survivable only while selection was invisible. `active`
 * drives every visual — fill, bar, marker and the expanded body — and the
 * exposed state follows it, so a screen reader is never told "pressed" about a
 * card rendering as unchosen. The stored-but-unusable value is not a selection
 * the customer made on this screen, and the payment step already treats it as
 * unset.
 *
 * A DISABLED CARD IS STILL FOCUSABLE, which is why there is no `disabled`
 * attribute on the button. `disabled` takes the card out of the tab order, and
 * the one thing that card has to deliver is the sentence explaining why the
 * option is missing — a keyboard user was never landing on it. `aria-disabled`
 * announces it as unavailable, the click handler becomes a no-op, and the
 * explanation goes in `note`: rendered BELOW the card, outside the `opacity-55`
 * wrapper that was compositing it to 2.53:1, and wired to the button with
 * `aria-describedby` so it is read as part of the option.
 *
 * RADIO SEMANTICS ARE OPT-IN, behind `radio`. A set of mutually exclusive
 * options shipped as independent `aria-pressed` toggles: a screen reader heard
 * three unrelated buttons, no "1 of 3", and nothing saying that choosing one
 * unchooses the others — the programmatic half of "the customer cannot tell
 * what is selected". With `radio` the button becomes `role="radio"` with
 * `aria-checked`, takes a roving tabIndex and answers the arrow keys. It is a
 * prop rather than the default so the address step and the settings list keep
 * their current shape until they are converted deliberately; the caller owns
 * the `role="radiogroup"` wrapper and its accessible name.
 */
export function OptionCard({
  selected,
  onSelect,
  title,
  subtitle,
  badge,
  meta,
  children,
  disabled,
  note,
  radio,
  tabbable,
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
  /**
   * A line that belongs to the card but must not be dimmed with it — why the
   * option cannot be picked, typically. Rendered under the card at full
   * contrast and pointed at by `aria-describedby`.
   */
  note?: React.ReactNode;
  /** Opt in to `role="radio"`. The caller owns the `role="radiogroup"`. */
  radio?: boolean;
  /**
   * Which card holds the group's single tab stop. Defaults to the chosen one;
   * pass it when nothing is chosen yet, or the whole group leaves the tab
   * order.
   */
  tabbable?: boolean;
  className?: string;
}) {
  // What the card looks like, as opposed to what the form holds. See the note
  // above: a card that cannot be picked must never look picked.
  const active = selected && !disabled;
  const noteId = React.useId();

  /**
   * Arrow keys move through the group and check what they land on — the radio
   * pattern, which a row of buttons does not get for free. The group is found
   * in the DOM rather than through context: these cards are rendered by three
   * different pages and a context provider for one keydown is a worse trade.
   * A card that cannot be picked still takes focus, because its own handler is
   * the no-op, so arrowing onto it reads the reason instead of selecting it.
   */
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const back = event.key === "ArrowUp" || event.key === "ArrowLeft";
    if (!forward && !back) return;

    const group = event.currentTarget.closest('[role="radiogroup"]');
    if (!group) return;
    const cards = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const here = cards.indexOf(event.currentTarget);
    if (here < 0) return;

    event.preventDefault();
    const next = cards[(here + (forward ? 1 : -1) + cards.length) % cards.length];
    next.focus();
    next.click();
  }

  const card = (
    <div
      className={cn(
        "transition-[background-color,box-shadow] duration-200",
        disabled
          ? "bg-surface shadow-sm opacity-55"
          : active
            ? "bg-brand-100 rule-l-raised [--rule-color:var(--color-brand-700)]"
            : "bg-surface shadow-sm hover:shadow-md",
        className,
      )}
    >
      <button
        type="button"
        onClick={disabled ? undefined : onSelect}
        aria-disabled={disabled || undefined}
        aria-describedby={note ? noteId : undefined}
        {...(radio
          ? {
              role: "radio",
              "aria-checked": active,
              tabIndex: (tabbable ?? active) ? 0 : -1,
              onKeyDown,
            }
          : { "aria-pressed": active })}
        className="tap flex w-full items-start gap-2.5 p-3 text-left sm:gap-3 sm:p-4"
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center transition-colors duration-200",
            // A radio button drawn with no border and no radius: a 20px square
            // that fills with ocean and takes a white tick when it is chosen.
            // 20px rather than 18: at 18 the tick had to drop to 12px to fit,
            // and a 12px tick is the smallest thing on the card carrying the
            // largest meaning. The unchosen square is the same size, so the
            // row never shifts when the choice moves.
            active ? "bg-brand-700 text-white" : "bg-ink-200",
          )}
        >
          {active && <Check size={14} strokeWidth={3} aria-hidden />}
        </span>
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
      {/* A seam, and an indent onto the title's own text column.
          The body used to repeat the button's padding exactly, so it started
          flush at the card's left edge — to the LEFT of the title it belongs
          to — with nothing between the two but two stacked paddings. The left
          inset is the button's own arithmetic: 12 + 18 + 10 on a phone, 16 + 18
          + 12 from sm. brand-300 for the hairline rather than `hairline`, since
          this only ever renders on the tinted fill, where #e6e9ec is invisible
          — and brand-200 barely improved on it at 1.23:1 against brand-100.
          brand-300 #94b7c8 is 1.9:1 on the same fill, which is a seam you can
          see without it becoming a border. */}
      {active && children && (
        <div className="rule-hair-t [--rule-color:var(--color-brand-300)] py-3 pr-3 pl-10 sm:py-4 sm:pr-4 sm:pl-[46px]">
          {children}
        </div>
      )}
    </div>
  );

  if (!note) return card;

  return (
    <>
      {card}
      {/* Outside the card, and outside the `opacity-55` that would take this to
          2.53:1 — the one sentence naming why the option is unavailable has to
          be readable, and WCAG's disabled-control exemption covers a control's
          own label, not an order-eligibility rule the shopper has to act on. */}
      <p id={noteId} className="mt-2 text-[13px] leading-[1.5] text-ink-600">
        {note}
      </p>
    </>
  );
}
