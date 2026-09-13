"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Info, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { BUSINESS } from "@/config/business";
import { formatDate } from "@/lib/utils";
import { checkServiceability } from "@/services/shipping";

interface CheckResult {
  tone: "ok" | "info" | "error";
  title: string;
  detail?: string;
}

const COURIER = BUSINESS.ops.courierPartners[0] ?? "our courier";

/**
 * Asks the courier whether it delivers to a pincode. The answer is theirs; the
 * date is ours — the product's own delivery promise, counted from today.
 */
export function DeliveryCheck({
  deliveryDays,
  codAvailable,
}: {
  deliveryDays: number;
  codAvailable: boolean;
}) {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, startChecking] = useTransition();

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setResult({ tone: "error", title: "Enter a valid 6-digit pincode." });
      return;
    }

    startChecking(async () => {
      let answer: Awaited<ReturnType<typeof checkServiceability>>;
      try {
        answer = await checkServiceability(pincode);
      } catch {
        setResult({ tone: "error", title: "We could not check that pincode just now. Try again in a moment." });
        return;
      }

      if (!answer.configured) {
        setResult({
          tone: "info",
          title: `We deliver across India with ${COURIER}.`,
          detail: `Usually within ${deliveryDays} day${deliveryDays > 1 ? "s" : ""} of dispatch. ${
            codAvailable ? "Cash on Delivery is offered at checkout." : "Prepaid only for this item."
          }`,
        });
        return;
      }
      if (answer.error) {
        setResult({ tone: "error", title: answer.error });
        return;
      }
      if (!answer.serviceable) {
        setResult({
          tone: "error",
          title: `${COURIER} does not deliver to ${pincode} yet.`,
          detail: "Try another pincode, or message us and we will look for a way.",
        });
        return;
      }

      const eta = new Date();
      eta.setDate(eta.getDate() + deliveryDays);
      const place = [answer.city, answer.state].filter(Boolean).join(", ");
      setResult({
        tone: "ok",
        title: `Delivery by ${formatDate(eta.toISOString(), "day")}`,
        detail: [
          place,
          codAvailable && answer.cod ? "Cash on Delivery available" : "Prepaid only",
          `${BUSINESS.ops.returnWindowDays}-day returns`,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    });
  }

  return (
    <section className="rounded-xl border border-hairline bg-surface p-3.5 sm:p-4">
      <h2 className="mb-2.5 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:mb-3 sm:text-[12px]">
        <MapPin size={14} className="shrink-0 text-brand-600" />
        Check delivery to your pincode
      </h2>

      <Form onSubmit={check} className="flex gap-2">
        <label htmlFor="pincode" className="sr-only">
          Pincode
        </label>
        <input
          id="pincode"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setResult(null);
          }}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="e.g. 395006"
          // 16px on phones: iOS zooms the page into any smaller field.
          className="h-11 min-w-0 flex-1 rounded-lg border border-ink-200 bg-canvas px-3.5 text-[16px] tabular-nums text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 sm:text-sm"
        />
        <Button type="submit" variant="subtle" loading={checking} className="shrink-0">
          Check
        </Button>
      </Form>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.title}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {result.tone === "ok" ? (
                <div className="rounded-lg bg-brand-50 p-3">
                  <p className="flex items-center gap-2 text-[12.5px] font-semibold text-brand-800 sm:text-[13px]">
                    <Check size={15} strokeWidth={2.5} className="shrink-0" />
                    {result.title}
                  </p>
                  {result.detail && (
                    <p className="mt-1 pl-[23px] text-[11.5px] text-brand-700/80 sm:text-[12px]">{result.detail}</p>
                  )}
                </div>
              ) : result.tone === "info" ? (
                <div className="rounded-lg bg-canvas p-3">
                  <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-800 sm:text-[13px]">
                    <Info size={15} className="shrink-0 text-brand-600" />
                    {result.title}
                  </p>
                  {result.detail && (
                    <p className="mt-1 pl-[23px] text-[11.5px] text-ink-500 sm:text-[12px]">{result.detail}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-sale-50 p-3">
                  <p className="flex items-start gap-2 text-[12.5px] text-sale-700 sm:text-[13px]">
                    <AlertCircle size={15} className="mt-px shrink-0" />
                    {result.title}
                  </p>
                  {result.detail && (
                    <p className="mt-1 pl-[23px] text-[11.5px] text-sale-700/80 sm:text-[12px]">{result.detail}</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
