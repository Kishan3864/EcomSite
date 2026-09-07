"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useStore } from "@/store/store";
import { cn, formatINR } from "@/lib/utils";

const STAGES = [
  { label: "Contacting your bank", detail: "Opening a secure channel", ms: 1400 },
  { label: "Authorising payment", detail: "Verifying the transaction", ms: 1600 },
  { label: "Confirming your order", detail: "Reserving stock at the warehouse", ms: 1300 },
  { label: "Done", detail: "Payment received", ms: 700 },
];

export function ProcessingClient() {
  const [stage, setStage] = useState(0);
  const router = useRouter();
  const { pendingOrder, dispatch, hydrated } = useStore();
  const reduce = usePrefersReducedMotion();

  const amount = pendingOrder?.totals.total ?? null;

  // Placing the order clears pendingOrder, which re-runs the effect below.
  // Without this latch that re-run would treat the cleared order as "nothing
  // to pay for" and bounce the customer to the cart mid-navigation.
  const placed = useRef(false);

  useEffect(() => {
    if (!hydrated || placed.current) return;

    if (!pendingOrder) {
      router.replace("/cart");
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    STAGES.forEach((s, i) => {
      elapsed += s.ms;
      timers.push(setTimeout(() => setStage(i + 1), elapsed));
    });

    timers.push(
      setTimeout(() => {
        placed.current = true;
        dispatch({ type: "order/place", order: pendingOrder });
        router.replace(`/order/${pendingOrder.id}?placed=1`);
      }, elapsed + 500),
    );

    return () => timers.forEach(clearTimeout);
  }, [hydrated, pendingOrder, dispatch, router]);

  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo href={null} size="md" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-lg">
          <div className="peacock-surface px-6 py-8 text-center">
            <motion.div
              animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur"
            >
              <AnimatePresence mode="wait">
                {stage >= STAGES.length ? (
                  <motion.span
                    key="done"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 18 }}
                  >
                    <Check size={30} className="text-gold-300" strokeWidth={3} />
                  </motion.span>
                ) : (
                  <motion.span key="spin" exit={{ opacity: 0 }}>
                    <Loader2 size={28} className="animate-spin text-gold-300" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            <h1 className="mt-5 font-display text-2xl tracking-[-0.02em] text-white">
              {stage >= STAGES.length ? "Payment confirmed" : "Processing your payment"}
            </h1>
            <p className="mt-1.5 text-[13px] text-white/60">
              {stage >= STAGES.length
                ? "Taking you to your order confirmation…"
                : "Please do not close this window or press back."}
            </p>
            {amount != null && (
              <p className="mt-4 inline-block rounded-lg bg-white/10 px-4 py-2 text-[15px] font-semibold tabular-nums text-white">
                {formatINR(amount)}
              </p>
            )}
          </div>

          <ol className="divide-y divide-hairline">
            {STAGES.map((s, i) => {
              const done = i < stage;
              const active = i === stage;
              return (
                <li key={s.label} className="flex items-center gap-3 px-5 py-3.5">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                      done
                        ? "bg-brand-600 text-white"
                        : active
                          ? "bg-brand-100 text-brand-700"
                          : "border border-ink-200 text-ink-300",
                    )}
                  >
                    {done ? (
                      <Check size={13} strokeWidth={3} />
                    ) : active ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <span className="text-[10px] font-bold">{i + 1}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[13.5px] font-medium transition-colors",
                        done || active ? "text-ink-950" : "text-ink-400",
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="block text-[11.5px] text-ink-400">{s.detail}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="border-t border-hairline bg-canvas px-5 py-3.5">
            <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-ink-500">
              <Lock size={11} className="text-brand-600" />
              Secured with 256-bit encryption
              <span className="mx-1 text-ink-300">·</span>
              <ShieldCheck size={11} className="text-brand-600" />
              PCI-DSS compliant
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-ink-400">
          This is a demonstration checkout. No payment gateway is connected and no money moves.
        </p>
      </div>
    </div>
  );
}
