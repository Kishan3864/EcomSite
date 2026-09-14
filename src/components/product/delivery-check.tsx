"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
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

/**
 * A rule down the left is the whole of the difference between the three
 * answers. Three tinted panels would put three coloured boxes into a column
 * that is otherwise ink on paper, and the wording of each answer already says
 * plainly which one it is — the rule only has to mark where it begins.
 */
const TONE_RULE: Record<CheckResult["tone"], string> = {
  ok: "border-brand-700",
  info: "border-rule",
  error: "border-sale-600",
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

  return (
    <section className="border-t border-hairline pt-4 sm:pt-5">
      <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        Check delivery to your pincode
      </h2>

      <Form onSubmit={check} className="mt-2.5 flex gap-2 sm:mt-3">
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
          // Paper, not canvas: the field now sits straight on the page rather
          // than inside a tinted panel, and a canvas-coloured input on a
          // canvas-coloured page is a border with nothing in it.
          // 16px on phones: iOS zooms the page into any smaller field.
          className="h-11 min-w-0 flex-1 rounded-field border border-ink-200 bg-surface px-3.5 text-[16px] tabular-nums text-ink-900 outline-none transition-colors placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 sm:text-[14px]"
        />
        <Button type="submit" variant="outline" loading={checking} className="shrink-0">
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
            <div
              role={result.tone === "error" ? "alert" : "status"}
              className={cn("mt-3.5 border-l-2 pl-3.5", TONE_RULE[result.tone])}
            >
              {/* Tabular figures because this line is usually a date or the
                  pincode read back, and both are numerals in running text. */}
              <p className="text-[13px] font-medium leading-[1.5] tabular-nums text-ink-950 sm:text-[13.5px]">
                {result.title}
              </p>
              {result.detail && (
                <p className="mt-1 max-w-[46ch] text-[13px] leading-[1.55] text-ink-600">
                  {result.detail}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
