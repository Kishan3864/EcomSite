"use client";

import { useEffect } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { CheckoutTrustRow } from "@/components/checkout/trust-row";
import { useStore } from "@/store/store";
import { cn, formatINR } from "@/lib/utils";

/**
 * Four steps, not five.
 *
 * There was a whole screen for choosing between three delivery speeds, gift
 * wrapping and a GSTIN field. The shop has one delivery, does not wrap gifts,
 * and almost nobody buying a kettle is claiming input credit — so the screen
 * asked four questions with one real answer between them and put a click
 * between the customer and paying. What it used to say about the delivery date
 * is now on the address and review steps, where it is read rather than chosen.
 */
export const CHECKOUT_STEPS = [
  { id: "contact", label: "Contact", href: "/checkout/contact" },
  { id: "address", label: "Address", href: "/checkout/address" },
  { id: "payment", label: "Payment", href: "/checkout/payment" },
  { id: "review", label: "Review", href: "/checkout/review" },
] as const;

export type StepId = (typeof CHECKOUT_STEPS)[number]["id"];

/** Every step draws its own 2px segment of one continuous rule. */
/** One step of the progress bar: a numbered circle and its label. */
const STEP_BASE =
  "flex min-w-0 items-center gap-2 text-[12.5px] font-semibold leading-none transition-colors duration-200";

export function CheckoutShell({
  step,
  title,
  description,
  children,
  aside,
  action,
  total,
}: {
  step: StepId;
  title: string;
  description?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  /** The step's next action, pinned to the bottom of the screen below lg. */
  action?: React.ReactNode;
  /** Shown beside `action` where there is room for it (tablets). */
  total?: number;
}) {
  const { cart, hydrated } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && cart.length === 0) router.replace("/cart");
  }, [hydrated, cart.length, router]);

  const index = CHECKOUT_STEPS.findIndex((s) => s.id === step);

  if (!hydrated) {
    return (
      <div className="container-page py-6 sm:py-10">
        <div className="skeleton h-12 sm:h-16" />
        {/* The trust panel's own height, reserved. It renders below the heading
            on every step and only after hydration, so with nothing standing in
            for it the whole page jumped by the panel's height the moment the
            store arrived. ~126px stacked on a phone, ~112px once it is three
            columns from md. The heading block above it is still unmatched —
            that is older and not this change's to fix, but this is the tall
            part. */}
        <div className="skeleton mt-4 h-[126px] sm:mt-6 md:h-28" />
        <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_368px]">
          <div className="skeleton h-80 sm:h-96" />
          <div className="skeleton h-72" />
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container-page py-8 sm:py-14">
        <EmptyState
          title="Your bag is empty"
          body="There is nothing to check out yet. Add something first and we will bring you straight back here."
          action={
            <Link href="/products" className={buttonClasses("primary", "md")}>
              Browse products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="pb-6 sm:pb-10">
      {/* The reassurance strip used to be here, above the progress nav: three
          uppercase stamps in a full-bleed band, the first thing on the page and
          the last thing anyone read. It is now CheckoutTrustRow, under the
          heading, where it has room to say what it means. The note that stood
          here argued that the padlock and shield glyphs it once carried were the
          badge every scam site wears; that argument has moved with it, along
          with the distinction it was missing and the owner's own decision to
          overrule half of it — see trust-row.tsx. */}

      {/* Progress: numbered circles joined by a line. The current step is
          filled with a soft ring, finished ones carry a tick and link back,
          the ones ahead are outlined. Labels show from 640px; on a phone only
          the current step is named, so four steps fit a 320px screen. */}
      <nav aria-label="Checkout progress" className="border-b bg-surface">
        <div className="container-page">
          <ol className="flex items-center gap-2 py-3 sm:gap-3 sm:py-4">
            {CHECKOUT_STEPS.map((s, i) => {
              const done = i < index;
              const current = i === index;
              const classes = cn(
                STEP_BASE,
                current ? "text-ink-950" : done ? "text-ink-600 hover:text-ink-950" : "text-ink-400",
              );
              const mark = (
                <span
                  aria-hidden
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] tabular-nums",
                    current
                      ? "bg-brand-700 text-white shadow-[0_0_0_4px_var(--color-brand-100)]"
                      : done
                        ? "bg-brand-50 text-brand-700"
                        : "border border-line-strong bg-surface text-ink-400",
                  )}
                >
                  {done ? <Check size={14} strokeWidth={2.5} /> : i + 1}
                </span>
              );
              const label = (
                <span className={cn("min-w-0 truncate", !current && "hidden sm:inline")}>{s.label}</span>
              );

              return (
                <li key={s.id} className={cn("flex min-w-0 items-center gap-2 sm:gap-3", i < CHECKOUT_STEPS.length - 1 && "flex-1")}>
                  {done ? (
                    <Link href={s.href} aria-label={`Back to ${s.label}`} className={cn("tap", classes)}>
                      {mark}
                      {label}
                    </Link>
                  ) : (
                    <span aria-current={current ? "step" : undefined} className={classes}>
                      {mark}
                      {label}
                    </span>
                  )}
                  {i < CHECKOUT_STEPS.length - 1 && (
                    <span aria-hidden className={cn("h-px min-w-3 flex-1", done ? "bg-brand-300" : "bg-line")} />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </nav>

      <div className="container-page pt-6 sm:pt-10">
        <header className="mb-5 sm:mb-8">
          <span className="eyebrow">
            Step {index + 1} of {CHECKOUT_STEPS.length}
          </span>
          <h1 className="mt-2.5 font-display text-[22px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-3 sm:text-[32px]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-[46ch] text-[13px] leading-[1.55] text-ink-600 sm:mt-2.5 sm:text-[14px]">
              {description}
            </p>
          )}
        </header>

        {/* Under the heading rather than above the nav, and outside the motion
            grid below: anything inside that re-slides on every step change,
            and a promise that animates in four times reads as decoration. On a
            phone this is the first thing past the title, which is where a
            first-time shopper's nerve is actually tested. */}
        <CheckoutTrustRow className="mb-6 sm:mb-8" />

        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_368px] lg:gap-8"
        >
          <div className="min-w-0">{children}</div>
          <aside className="min-w-0 space-y-3 sm:space-y-4 lg:sticky lg:top-6 lg:h-fit">
            {aside}
          </aside>
        </motion.div>

        {/* Below lg the summary stacks under the form, so the way forward is
            pinned to the bottom edge instead of sitting a long scroll away.
            Sticky rather than fixed: it rides along through the form and the
            summary, then parks above the footer. */}
        {action && (
          <div className="sticky bottom-0 z-30 -mx-3 mt-4 border-t bg-surface/95 px-3 pb-safe shadow-[0_-10px_24px_-14px_rgb(18_23_27/0.2)] backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-4 py-2.5">
              {total !== undefined && (
                <p className="hidden min-w-0 sm:block">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    Total payable
                  </span>
                  <span className="mt-0.5 block text-[17px] font-semibold leading-tight tabular-nums text-ink-950">
                    {formatINR(total)}
                  </span>
                </p>
              )}
              {action}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Shared bag summary shown alongside every checkout step. */
export function CheckoutAside() {
  const { cart } = useStore();

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <h2 className="min-w-0 truncate text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          {cart.length} item{cart.length > 1 ? "s" : ""} in your bag
        </h2>
        {/* Padding widens the touch target; the negative margin keeps the layout.
            Off from lg, so the desktop focus ring still hugs the word. */}
        <Link
          href="/cart"
          className="-m-2.5 shrink-0 p-2.5 text-[12.5px] font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-800 lg:m-0 lg:p-0"
        >
          Edit
        </Link>
      </div>
      <ul className="card-divided border-t">
        {cart.map((line) => (
          <li key={line.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
            {/* Routed through the shared image component like every other
                picture on the site, so the remote-image policy applies here
                too; it used to be a raw <img> with the lint rule switched off. */}
            <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-100">
              <Image src={line.image} alt="" fill sizes="48px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink-900">
                {line.title}
              </span>
              <span className="mt-0.5 block text-[13px] text-ink-500">
                {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty{" "}
                <span className="tabular-nums">{line.quantity}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
