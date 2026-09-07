"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Tag, X } from "lucide-react";
import type { Offer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { evaluateCoupon } from "@/lib/pricing";
import { useStore } from "@/store/store";
import { cn, formatINR } from "@/lib/utils";

export function CouponBox({
  offers,
  itemsTotal,
  categories,
}: {
  offers: Offer[];
  itemsTotal: number;
  categories: string[];
}) {
  const { coupon, dispatch } = useStore();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const applied = offers.find((o) => o.code === coupon);

  function apply(code: string) {
    const offer = offers.find((o) => o.code === code.toUpperCase().trim());
    const result = evaluateCoupon(offer, itemsTotal, categories);
    if (!result.ok) {
      setError(result.reason ?? "That code cannot be applied.");
      return;
    }
    setError(null);
    setInput("");
    setOpen(false);
    dispatch({ type: "coupon/set", code: offer!.code });
  }

  return (
    <section className="rounded-xl border border-hairline bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
        <Tag size={14} className="text-brand-600" />
        Coupons and offers
      </h2>

      <AnimatePresence mode="wait">
        {applied ? (
          <motion.div
            key="applied"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-brand-400 bg-brand-50 p-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-800">
                <Check size={14} strokeWidth={2.5} />
                {applied.code} applied
              </p>
              <p className="mt-0.5 text-[12px] text-brand-700/80">{applied.title}</p>
            </div>
            <button
              onClick={() => dispatch({ type: "coupon/set", code: null })}
              aria-label="Remove coupon"
              className="shrink-0 rounded-md p-1 text-brand-700 transition-colors hover:bg-brand-100"
            >
              <X size={15} />
            </button>
          </motion.div>
        ) : (
          <motion.div key="entry" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                apply(input);
              }}
              className="flex gap-2"
            >
              <label htmlFor="coupon" className="sr-only">
                Coupon code
              </label>
              <input
                id="coupon"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="Enter a coupon code"
                className="h-11 flex-1 rounded-lg border border-ink-200 bg-canvas px-3.5 text-sm uppercase tracking-[0.04em] text-ink-900 outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-400 focus:border-brand-500"
              />
              <Button type="submit" variant="subtle" disabled={!input.trim()}>
                Apply
              </Button>
            </form>
            {error && (
              <p className="mt-2 flex items-start gap-1.5 text-[12px] text-sale-600">
                <AlertCircle size={13} className="mt-px shrink-0" />
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-3 text-[12.5px] font-semibold text-brand-700 underline-offset-4 hover:underline"
      >
        {open ? "Hide available coupons" : `View ${offers.length} available coupons`}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {offers.map((offer) => {
                const check = evaluateCoupon(offer, itemsTotal, categories);
                return (
                  <li
                    key={offer.id}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-lg border border-dashed p-3",
                      check.ok ? "border-ink-300" : "border-ink-200 opacity-60",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[12.5px] font-bold tracking-[0.04em] text-ink-950">
                        {offer.code}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-ink-700">{offer.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-400">
                        {check.ok
                          ? offer.type === "shipping"
                            ? "Waives the express shipping fee"
                            : `Saves ${formatINR(check.discount)} on this order`
                          : check.reason}
                      </p>
                    </div>
                    <Button
                      size="xs"
                      variant={check.ok ? "primary" : "outline"}
                      disabled={!check.ok}
                      onClick={() => apply(offer.code)}
                      className="shrink-0"
                    >
                      Apply
                    </Button>
                  </li>
                );
              })}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}
