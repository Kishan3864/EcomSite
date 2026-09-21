"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  MapPin,
  ShoppingBag,
  UserRound,
  type LucideIcon,
} from "lucide-react";
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

/** One glyph per step, drawn inside the step's circle (presentational only). */
const STEP_ICONS: Record<StepId, LucideIcon> = {
  contact: UserRound,
  address: MapPin,
  payment: CreditCard,
  review: ClipboardCheck,
};

/**
 * The progress stepper: a circle per step joined by a rule. The current step
 * is filled cobalt with a halo, finished ones carry a tick and link back, the
 * ones ahead are outlined. Phones name only the current step so four fit 320px.
 */
function CheckoutStepper({ index }: { index: number }) {
  return (
    <nav aria-label="Checkout progress" className="card px-3 py-3 sm:px-5 sm:py-4">
      <ol className="flex items-center gap-2 sm:gap-3">
        {CHECKOUT_STEPS.map((s, i) => {
          const done = i < index;
          const current = i === index;
          const Icon = STEP_ICONS[s.id];
          const last = i === CHECKOUT_STEPS.length - 1;

          const body = (
            <>
              <span
                aria-hidden
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow,color] duration-200",
                  current
                    ? "bg-brand-700 text-white shadow-[0_0_0_4px_var(--color-brand-100)]"
                    : done
                      ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200"
                      : "bg-surface text-ink-500 ring-1 ring-inset ring-line-strong",
                )}
              >
                {done ? <Check size={16} /> : <Icon size={16} />}
              </span>
              <span className={cn("min-w-0 flex-col leading-none", current ? "flex" : "hidden sm:flex")}>
                <span className="t-label text-[10px] tabular-nums">Step {i + 1}</span>
                <span
                  className={cn(
                    "mt-1 truncate text-[13px] font-semibold",
                    current ? "text-ink-950" : done ? "text-ink-700" : "text-ink-500",
                  )}
                >
                  {s.label}
                </span>
              </span>
            </>
          );

          return (
            <li key={s.id} className={cn("flex min-w-0 items-center gap-2 sm:gap-3", !last && "flex-1")}>
              {done ? (
                <Link
                  href={s.href}
                  aria-label={`Back to ${s.label}`}
                  className="tap flex min-w-0 items-center gap-2.5 rounded-full transition-opacity duration-200 hover:opacity-80"
                >
                  {body}
                </Link>
              ) : (
                <span aria-current={current ? "step" : undefined} className="flex min-w-0 items-center gap-2.5">
                  {body}
                </span>
              )}
              {!last && (
                <span aria-hidden className="relative h-0.5 min-w-3 flex-1 overflow-hidden rounded-full bg-line">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-brand-600 to-brand-400 transition-[width] duration-300 ease-out",
                      done ? "w-full" : "w-0",
                    )}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

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
  // Below lg the summary folds away behind a toggle; lg always shows it.
  const [summaryOpen, setSummaryOpen] = useState(false);
  const summaryId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  // The sentinel sits right above the stepper: once it scrolls under the
  // header, the stepper is pinned.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      rootMargin: "-120px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hydrated, cart.length]);

  useEffect(() => {
    if (hydrated && cart.length === 0) router.replace("/cart");
  }, [hydrated, cart.length, router]);

  const index = CHECKOUT_STEPS.findIndex((s) => s.id === step);

  if (!hydrated) {
    return (
      <div className="container-page pb-10 pt-5 sm:pt-7">
        <div className="skeleton h-[62px] rounded-xl sm:h-[70px]" />
        <div className="skeleton mt-6 h-16 max-w-md rounded-md sm:mt-8 sm:h-20" />
        {/* The trust panel's own height, reserved, so the page does not jump
            when the store arrives. */}
        <div className="skeleton mt-5 h-[126px] rounded-xl sm:mt-6 md:h-24" />
        <div className="mt-5 grid gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="skeleton h-80 rounded-xl sm:h-96" />
          <div className="skeleton h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container-page py-8 sm:py-14">
        <EmptyState
          icon={<ShoppingBag size={24} />}
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
      <div className="container-page pt-5 sm:pt-7">
        {/* Pinned just under the header while the step scrolls; the sentinel
            above it tells us when it is stuck so it can lift. */}
        <div ref={sentinel} aria-hidden className="h-px" />
        <div
          className={cn(
            "sticky z-30 -mx-1 rounded-[calc(var(--radius-xl)+4px)] px-1 transition-[top,box-shadow] duration-300 ease-out",
            stuck && "shadow-[0_14px_30px_-20px_rgb(10_15_26/0.45)]",
          )}
          style={{ top: "calc(var(--header-h) + 8px)" }}
        >
          <CheckoutStepper index={index} />
        </div>

        <header className="pb-5 pt-6 sm:pb-6 sm:pt-8">
          <span className="eyebrow">
            Step {index + 1} of {CHECKOUT_STEPS.length}
          </span>
          <h1 className="t-h1 mt-2.5">{title}</h1>
          {description && <p className="t-body mt-1.5 max-w-[52ch]">{description}</p>}
        </header>

        {/* Outside the motion grid below, so the promise does not re-slide on
            every step change. */}
        <CheckoutTrustRow className="mb-5 sm:mb-8" />

        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8"
        >
          <div className="min-w-0">{children}</div>
          {aside && (
            <aside className="min-w-0 max-lg:order-first lg:sticky lg:top-[calc(var(--header-h)+104px)] lg:h-fit lg:transition-[top] lg:duration-300">
              {/* Phones and tablets: a collapsible summary above the form. */}
              <button
                type="button"
                onClick={() => setSummaryOpen((o) => !o)}
                aria-expanded={summaryOpen}
                aria-controls={summaryId}
                className="tap card flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 hover:border-brand-200 lg:hidden"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="icon-tile icon-tile-sm" aria-hidden>
                    <ShoppingBag size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink-900">
                      {summaryOpen ? "Hide order summary" : "Show order summary"}
                    </span>
                    <span className="t-small block">
                      {cart.length} item{cart.length > 1 ? "s" : ""}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {total !== undefined && <span className="t-price text-[15px]">{formatINR(total)}</span>}
                  <ChevronDown
                    size={18}
                    aria-hidden
                    className={cn("text-ink-500 transition-transform duration-200", summaryOpen && "rotate-180")}
                  />
                </span>
              </button>
              <div
                id={summaryId}
                className={cn("space-y-3 max-lg:mt-3 sm:space-y-4", summaryOpen ? "block" : "hidden lg:block")}
              >
                {aside}
              </div>
            </aside>
          )}
        </motion.div>

        {/* Below lg the way forward is pinned to the bottom edge. Sticky rather
            than fixed: it rides along through the form, then parks above the
            footer. */}
        {action && (
          <div className="glass sticky bottom-0 z-30 -mx-3 mt-5 border-t border-line px-3 pb-safe shadow-[0_-12px_28px_-18px_rgb(10_15_26/0.28)] sm:-mx-6 sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-4 py-3">
              {total !== undefined && (
                <p className="hidden min-w-0 sm:block">
                  <span className="t-label block">Total payable</span>
                  <span className="t-price mt-1 block text-[18px] leading-tight">{formatINR(total)}</span>
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
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <h2 className="t-label min-w-0 truncate">
          {cart.length} item{cart.length > 1 ? "s" : ""} in your bag
        </h2>
        {/* Padding widens the touch target; the negative margin keeps the layout. */}
        <Link
          href="/cart"
          className="-m-2 shrink-0 rounded-full px-3 py-2 text-[12.5px] font-semibold text-brand-700 transition-colors duration-200 hover:bg-brand-50"
        >
          Edit
        </Link>
      </div>
      <ul className="card-divided border-t border-line">
        {cart.map((line) => (
          <li key={line.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            {/* Routed through the shared image component so the remote-image
                policy applies here too. */}
            <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-md bg-ink-100 ring-1 ring-inset ring-line">
              <Image src={line.image} alt="" fill sizes="48px" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink-900">{line.title}</span>
              <span className="t-small mt-0.5 block">
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
