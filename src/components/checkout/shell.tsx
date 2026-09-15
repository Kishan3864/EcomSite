"use client";

import { useEffect } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
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
const STEP_BASE =
  "flex h-11 w-full items-center justify-center rule-b px-1 text-[11px] font-semibold uppercase leading-none tracking-[0.1em] transition-colors duration-200 sm:h-12 sm:text-[11.5px] sm:tracking-[0.12em]";

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
      {/* Reassurance strip. The sentences are the reassurance; the padlock and
          shield glyphs that used to sit beside them are the badge every scam
          site wears, and they were spending the page's one warm colour three
          times over on a line nobody was meant to look at. */}
      <div className="bg-surface">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-ink-500 sm:gap-x-8 sm:py-3 sm:text-[11.5px] sm:tracking-[0.12em]">
          <span>Secure checkout</span>
          <span>256-bit encryption</span>
          <span className="hidden sm:inline">Easy returns on everything</span>
        </div>
      </div>

      {/* The progress indicator is one rule across the page with the current
          step marked in ink, the steps behind it in grey and the ones ahead in
          hairline. It used to be a row of coloured pills and a sliding bar,
          which is two indicators for one piece of information and needed a
          horizontal scroll to fit a 320px screen. */}
      <nav aria-label="Checkout progress" className="bg-surface">
        <div className="container-page">
          <ol className="flex">
            {CHECKOUT_STEPS.map((s, i) => {
              const done = i < index;
              const current = i === index;
              const classes = cn(
                STEP_BASE,
                current
                  ? "[--rule-color:var(--color-ink-950)] text-ink-950"
                  : done
                    ? "[--rule-color:var(--color-ink-400)] text-ink-500 hover:text-ink-950"
                    : "text-ink-400",
              );

              return (
                <li key={s.id} className="min-w-0 flex-1">
                  {done ? (
                    <Link href={s.href} aria-label={`Back to ${s.label}`} className={cn("tap", classes)}>
                      <span className="min-w-0 truncate">{s.label}</span>
                    </Link>
                  ) : (
                    <span aria-current={current ? "step" : undefined} className={classes}>
                      <span className="min-w-0 truncate">{s.label}</span>
                    </span>
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
          <div className="sticky bottom-0 z-30 -mx-3 mt-4 bg-surface px-3 pb-safe sm:-mx-6 sm:px-6 lg:hidden">
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
    <div className="bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <h2 className="min-w-0 truncate text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          {cart.length} item{cart.length > 1 ? "s" : ""} in your bag
        </h2>
        {/* Padding widens the touch target; the negative margin keeps the layout.
            Off from lg, so the desktop focus ring still hugs the word. */}
        <Link
          href="/cart"
          className="-m-2.5 shrink-0 p-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-colors duration-200 hover:text-brand-700 lg:m-0 lg:p-0"
        >
          Edit
        </Link>
      </div>
      <ul>
        {cart.map((line) => (
          <li key={line.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
            {/* Routed through the shared image component like every other
                picture on the site, so the remote-image policy applies here
                too; it used to be a raw <img> with the lint rule switched off. */}
            <span className="relative h-14 w-12 shrink-0 overflow-hidden bg-ink-100">
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
