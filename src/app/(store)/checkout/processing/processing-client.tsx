"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { AlertTriangle, Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/store";
import { placeOrder } from "@/services/commerce";
import { cn, formatINR } from "@/lib/utils";

const STAGES = [
  { label: "Contacting your bank", detail: "Opening a secure channel", ms: 1400 },
  { label: "Authorising payment", detail: "Verifying the transaction", ms: 1600 },
  { label: "Confirming your order", detail: "Reserving stock at the warehouse", ms: 1300 },
  { label: "Done", detail: "Payment received", ms: 700 },
];

type Outcome =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export function ProcessingClient() {
  const [stage, setStage] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const router = useRouter();
  const { pendingCheckout, dispatch, hydrated } = useStore();
  const reduce = usePrefersReducedMotion();

  const amount = pendingCheckout?.amount ?? null;
  const failed = outcome && !outcome.ok ? outcome.error : null;
  // "Confirmed" means the order really exists, not just that the animation ran.
  const complete = Boolean(outcome?.ok) && stage >= STAGES.length;
  // While the server is still working, hold the last step on its spinner.
  const shown = outcome?.ok ? stage : Math.min(stage, STAGES.length - 1);

  /**
   * The order is created exactly once. `sent` also guards the bounce below:
   * finishing an order clears the staged checkout, and without it that would
   * read as "nothing to pay for" and throw the customer back to their bag.
   */
  const sent = useRef(false);

  // Nothing staged and nothing sent means the customer landed here directly.
  useEffect(() => {
    if (hydrated && !pendingCheckout && !sent.current) router.replace("/cart");
  }, [hydrated, pendingCheckout, router]);

  // The reassuring bank-style stages. Purely cosmetic, and independent of the
  // request so a slow server just means the last stage waits a little longer.
  useEffect(() => {
    if (!pendingCheckout || failed) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    STAGES.forEach((s, i) => {
      elapsed += s.ms;
      timers.push(setTimeout(() => setStage(i + 1), elapsed));
    });
    return () => timers.forEach(clearTimeout);
  }, [pendingCheckout, failed]);

  // Deliberately not cancelled on cleanup: a request already sent has to be
  // seen through, or a customer could end up with an order they never saw.
  useEffect(() => {
    if (!hydrated || !pendingCheckout || sent.current) return;
    sent.current = true;

    placeOrder(pendingCheckout.input)
      .then((result) =>
        setOutcome(
          result.ok
            ? { ok: true, orderId: result.data.orderId }
            : { ok: false, error: result.error },
        ),
      )
      .catch(() =>
        setOutcome({
          ok: false,
          error: "We could not reach the payment service. Nothing has been charged.",
        }),
      );
  }, [hydrated, pendingCheckout]);

  // Move on only once the order exists and the stages have played out.
  useEffect(() => {
    if (!outcome?.ok || stage < STAGES.length) return;
    dispatch({ type: "checkout/complete" });
    router.replace(`/order/${outcome.orderId}?placed=1`);
  }, [outcome, stage, dispatch, router]);

  if (failed) {
    return (
      <div className="flex min-h-[calc(100dvh-120px)] flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-7 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sale-50 text-sale-600">
            <AlertTriangle size={26} />
          </span>
          <h1 className="mt-5 font-display text-2xl tracking-[-0.02em] text-ink-950">
            We could not place this order
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-600">{failed}</p>
          <p className="mt-3 text-[12px] text-ink-500">
            Nothing has been charged and your bag is exactly as you left it.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              size="md"
              onClick={() => {
                dispatch({ type: "checkout/abort" });
                router.push("/cart");
              }}
            >
              Back to my bag
            </Button>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium text-ink-600 hover:text-ink-900"
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
                {complete ? (
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
              {complete ? "Payment confirmed" : "Processing your payment"}
            </h1>
            <p className="mt-1.5 text-[13px] text-white/60">
              {complete
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
              const done = i < shown;
              const active = i === shown;
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
          Your order is created and stock is reserved for real. The payment step is simulated — no gateway is connected and no money moves.
        </p>
      </div>
    </div>
  );
}
