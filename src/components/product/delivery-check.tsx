"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, Info, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { BUSINESS } from "@/config/business";
import { cn, formatDate } from "@/lib/utils";
import { checkServiceability } from "@/services/shipping";

interface CheckResult {
  tone: "ok" | "info" | "error";
  title: string;
  detail?: string;
}

const COURIER = BUSINESS.ops.courierPartners[0] ?? "our courier";

/** Icon and tint for each kind of answer. */
const TONES: Record<CheckResult["tone"], { icon: typeof CircleCheck; panel: string; mark: string }> = {
  ok: { icon: CircleCheck, panel: "bg-brand-50 ring-brand-100", mark: "text-brand-700" },
  info: { icon: Info, panel: "bg-ink-50 ring-line", mark: "text-ink-500" },
  error: { icon: CircleAlert, panel: "bg-sale-50 ring-sale-100", mark: "text-sale-600" },
};

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

  const tone = result ? TONES[result.tone] : null;

  return (
    <section aria-labelledby="pincode-heading" className="card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="icon-tile icon-tile-sm">
          <MapPin size={16} aria-hidden />
        </span>
        <h2 id="pincode-heading" className="t-h3 text-[14px]">
          Check delivery to your pincode
        </h2>
      </div>

      <Form onSubmit={check} className="mt-3.5 flex gap-2">
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
          className="h-11 min-w-0 flex-1 rounded-md px-3.5 text-[16px] tabular-nums text-ink-900 outline-none placeholder:text-ink-400 sm:text-[14px]"
        />
        <Button type="submit" loading={checking} className="shrink-0 px-5">
          Check
        </Button>
      </Form>

      <AnimatePresence mode="wait">
        {result && tone && (
          <motion.div
            key={result.title}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              role={result.tone === "error" ? "alert" : "status"}
              className={cn("mt-3 flex items-start gap-2.5 rounded-md p-3 ring-1 ring-inset", tone.panel)}
            >
              <tone.icon size={18} aria-hidden className={cn("mt-px shrink-0", tone.mark)} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-[1.5] tabular-nums text-ink-950">
                  {result.title}
                </p>
                {result.detail && (
                  <p className="mt-0.5 text-[12.5px] leading-[1.55] text-ink-600">{result.detail}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
