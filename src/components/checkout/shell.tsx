"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, Lock, RotateCcw, ShieldCheck, ShoppingBag } from "lucide-react";
import type { Offer } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { useStore } from "@/store/store";
import { cn } from "@/lib/utils";

export const CHECKOUT_STEPS = [
  { id: "contact", label: "Contact", href: "/checkout/contact" },
  { id: "address", label: "Address", href: "/checkout/address" },
  { id: "delivery", label: "Delivery", href: "/checkout/delivery" },
  { id: "payment", label: "Payment", href: "/checkout/payment" },
  { id: "review", label: "Review", href: "/checkout/review" },
] as const;

export type StepId = (typeof CHECKOUT_STEPS)[number]["id"];

export function CheckoutShell({
  step,
  title,
  description,
  children,
  aside,
}: {
  step: StepId;
  title: string;
  description?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
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
      <div className="container-page py-10">
        <div className="skeleton h-16 rounded-xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_368px]">
          <div className="skeleton h-96 rounded-xl" />
          <div className="skeleton h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container-page py-14">
        <EmptyState
          icon={<ShoppingBag size={26} />}
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
    <div className="pb-10">
      {/* Reassurance strip — the site header already carries the logo. */}
      <div className="border-b border-hairline bg-brand-950 py-2.5 text-white">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11.5px] font-medium text-white/70">
          <span className="flex items-center gap-1.5">
            <Lock size={12} className="text-gold-300" />
            Secure checkout
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-gold-300" />
            256-bit encryption
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <RotateCcw size={12} className="text-gold-300" />
            Easy returns on everything
          </span>
        </div>
      </div>

      {/* Stepper */}
      <nav aria-label="Checkout progress" className="border-b border-hairline bg-surface">
        <div className="container-page">
          <ol className="flex items-center gap-1 overflow-x-auto py-4 no-scrollbar sm:gap-2">
            {CHECKOUT_STEPS.map((s, i) => {
              const done = i < index;
              const current = i === index;
              const content = (
                <span
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                    current
                      ? "bg-brand-50 text-brand-800"
                      : done
                        ? "text-ink-700 hover:bg-ink-50"
                        : "text-ink-400",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      current
                        ? "bg-brand-700 text-white"
                        : done
                          ? "bg-brand-100 text-brand-700"
                          : "border border-ink-200 text-ink-400",
                    )}
                  >
                    {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                  </span>
                  {s.label}
                </span>
              );

              return (
                <li key={s.id} className="flex items-center gap-1 sm:gap-2">
                  {done ? (
                    <Link href={s.href} aria-label={`Back to ${s.label}`}>
                      {content}
                    </Link>
                  ) : (
                    <span aria-current={current ? "step" : undefined}>{content}</span>
                  )}
                  {i < CHECKOUT_STEPS.length - 1 && (
                    <span className="h-px w-4 shrink-0 bg-ink-200 sm:w-8" aria-hidden />
                  )}
                </li>
              );
            })}
          </ol>
          <motion.div
            className="h-0.5 rounded-full bg-brand-600"
            initial={false}
            animate={{ width: `${((index + 1) / CHECKOUT_STEPS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 180, damping: 26 }}
          />
        </div>
      </nav>

      <div className="container-page pt-7">
        <header className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            Step {index + 1} of {CHECKOUT_STEPS.length}
          </p>
          <h1 className="mt-1.5 font-display text-[26px] leading-[1.1] tracking-[-0.025em] text-ink-950 sm:text-[32px]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">
              {description}
            </p>
          )}
        </header>

        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_368px] lg:gap-8"
        >
          <div className="min-w-0">{children}</div>
          <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">{aside}</aside>
        </motion.div>
      </div>
    </div>
  );
}

/** Shared bag summary shown alongside every checkout step. */
export function CheckoutAside({ offers }: { offers: Offer[] }) {
  const { cart, coupon } = useStore();
  const applied = offers.find((o) => o.code === coupon);

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
          {cart.length} item{cart.length > 1 ? "s" : ""} in your bag
        </h2>
        <Link href="/cart" className="text-[12px] font-semibold text-brand-700 hover:underline">
          Edit
        </Link>
      </div>
      <ul className="divide-y divide-hairline">
        {cart.map((line) => (
          <li key={line.id} className="flex items-center gap-3 px-5 py-3">
            <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-md bg-ink-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={line.image} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink-900">
                {line.title}
              </span>
              <span className="block text-[11.5px] text-ink-500">
                {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.quantity}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {applied && (
        <p className="border-t border-hairline bg-brand-50 px-5 py-2.5 text-[12px] font-medium text-brand-800">
          Coupon {applied.code} applied
        </p>
      )}
    </div>
  );
}
