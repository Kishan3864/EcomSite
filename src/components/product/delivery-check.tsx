"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Form } from "@/components/ui/form";

interface CheckResult {
  ok: boolean;
  city?: string;
  date?: string;
  cod?: boolean;
  message: string;
}

/** Serviceability lookup — mocked from the pincode prefix for now. */
const CITY_BY_PREFIX: Record<string, { city: string; days: number }> = {
  "56": { city: "Bengaluru, Karnataka", days: 1 },
  "40": { city: "Mumbai, Maharashtra", days: 2 },
  "41": { city: "Pune, Maharashtra", days: 2 },
  "11": { city: "New Delhi, Delhi", days: 2 },
  "12": { city: "Gurugram, Haryana", days: 2 },
  "60": { city: "Chennai, Tamil Nadu", days: 2 },
  "50": { city: "Hyderabad, Telangana", days: 2 },
  "70": { city: "Kolkata, West Bengal", days: 3 },
  "38": { city: "Ahmedabad, Gujarat", days: 3 },
  "30": { city: "Jaipur, Rajasthan", days: 3 },
  "68": { city: "Kochi, Kerala", days: 4 },
  "22": { city: "Lucknow, Uttar Pradesh", days: 4 },
  "78": { city: "Guwahati, Assam", days: 6 },
};

export function DeliveryCheck({
  deliveryDays,
  codAvailable,
}: {
  deliveryDays: number;
  codAvailable: boolean;
}) {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setResult({ ok: false, message: "Enter a valid 6-digit pincode." });
      return;
    }

    setChecking(true);
    // Simulates the network latency a real serviceability API would add.
    setTimeout(() => {
      const match = CITY_BY_PREFIX[pincode.slice(0, 2)];
      if (!match) {
        setResult({
          ok: false,
          message: "We do not deliver to this pincode yet. Try another, or contact support.",
        });
      } else {
        const eta = new Date();
        eta.setDate(eta.getDate() + Math.max(match.days, deliveryDays));
        setResult({
          ok: true,
          city: match.city,
          date: eta.toISOString(),
          cod: codAvailable && match.days <= 4,
          message: "Delivery available",
        });
      }
      setChecking(false);
    }, 620);
  }

  return (
    <section className="rounded-xl border border-hairline bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
        <MapPin size={14} className="text-brand-600" />
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
          placeholder="e.g. 560102"
          className="h-11 flex-1 rounded-lg border border-ink-200 bg-canvas px-3.5 text-sm tabular-nums text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500"
        />
        <Button type="submit" variant="subtle" loading={checking} className="shrink-0">
          Check
        </Button>
      </Form>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.message}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {result.ok ? (
                <div className="rounded-lg bg-brand-50 p-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-brand-800">
                    <Check size={15} strokeWidth={2.5} />
                    Delivery by {formatDate(result.date!, "day")}
                  </p>
                  <p className="mt-1 pl-[23px] text-[12px] text-brand-700/80">
                    {result.city} · {result.cod ? "Cash on Delivery available" : "Prepaid only"} ·
                    Free returns
                  </p>
                </div>
              ) : (
                <p className="flex items-start gap-2 rounded-lg bg-sale-50 p-3 text-[13px] text-sale-700">
                  <AlertCircle size={15} className="mt-px shrink-0" />
                  {result.message}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
