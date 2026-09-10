"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { AlertTriangle, Check, Loader2, Lock, ShieldCheck, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { useStore } from "@/store/store";
import { placeOrder } from "@/services/commerce";
import { confirmPayment, failPayment, paymentStatusOf, startPayment } from "@/services/payments";
import { cn, formatINR } from "@/lib/utils";
import { BUSINESS } from "@/config/business";

/**
 * Checkout, from a staged basket to a paid order.
 *
 * The old version played four reassuring "contacting your bank" stages that
 * were pure animation, then created an order already marked paid. Now the
 * stages describe what is genuinely happening, and the order only becomes paid
 * when Razorpay says the money moved.
 *
 * The flow is deliberately paranoid about the last mile. Razorpay's checkout
 * hands a success back to the browser, and that is checked — but a browser can
 * be closed, a phone can die, and a UPI collect can land two minutes after the
 * customer walks away. So the page also polls its own server, and the webhook
 * confirms the order whether or not anybody is still watching this screen.
 */

type Phase =
  | "creating" // writing the order, still unpaid
  | "opening" // asking the gateway for a payment session
  | "waiting" // checkout is open, or the webhook is still to land
  | "done"
  | "failed";

type Failure = { message: string; needsAccount?: boolean };

/** The slice of the Razorpay checkout API this page uses. */
interface RazorpayCheckout {
  open(): void;
  on(event: string, handler: (payload: { error?: { description?: string } }) => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

const STAGE_LABEL: Record<Phase, { title: string; detail: string }> = {
  creating: { title: "Preparing your order", detail: "Reserving the items in your bag" },
  opening: { title: "Opening secure payment", detail: "Handing over to Razorpay" },
  waiting: { title: "Waiting for payment", detail: "Complete the payment in the window that opened" },
  done: { title: "Payment confirmed", detail: "Your order is placed" },
  failed: { title: "Payment not completed", detail: "" },
};

export function ProcessingClient() {
  const router = useRouter();
  const { pendingCheckout, dispatch, hydrated } = useStore();
  const reduce = usePrefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("creating");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const amount = pendingCheckout?.amount ?? null;

  /**
   * The order is created exactly once. `started` also guards the bounce below:
   * finishing an order clears the staged checkout, and without it that would
   * read as "nothing to pay for" and throw the customer back to their bag.
   */
  const started = useRef(false);

  useEffect(() => {
    if (hydrated && !pendingCheckout && !started.current) router.replace("/cart");
  }, [hydrated, pendingCheckout, router]);

  const finish = useCallback(
    (id: string) => {
      setPhase("done");
      dispatch({ type: "checkout/complete" });
      // A moment on the confirmation so it registers as an outcome rather than
      // a flash between two screens.
      setTimeout(() => router.replace(`/order/${id}?placed=1`), 900);
    },
    [dispatch, router],
  );

  /** Open Razorpay's checkout for an order that already exists as PENDING. */
  const pay = useCallback(
    async (id: string) => {
      setPhase("opening");

      const session = await startPayment(id);
      if (!session.ok || !session.gatewayOrderId || !session.keyId) {
        setFailure({ message: session.error ?? "We could not start the payment." });
        setPhase("failed");
        return;
      }

      if (!window.Razorpay) {
        setFailure({
          message:
            "The payment window could not load. Check your connection or any ad blocker, then try again.",
        });
        setPhase("failed");
        return;
      }

      setPhase("waiting");

      const checkout = new window.Razorpay({
        key: session.keyId,
        order_id: session.gatewayOrderId,
        amount: session.amountPaise,
        currency: "INR",
        name: BUSINESS.brandName,
        description: `Order ${session.orderNumber}`,
        prefill: session.prefill,
        notes: { orderId: id },
        theme: { color: "#0b1611" },
        retry: { enabled: false },

        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const result = await confirmPayment({
            orderId: id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });

          if (result.ok && result.status === "paid") {
            finish(id);
            return;
          }
          if (!result.ok) {
            setFailure({ message: result.error ?? "This payment could not be verified." });
            setPhase("failed");
            return;
          }
          // Authorised but not yet settled. The poll below will catch it.
          setPhase("waiting");
        },

        modal: {
          escape: false,
          ondismiss: async () => {
            // Closing the window is not proof nothing was paid: a UPI collect
            // can still be approved on the phone. Ask the server before
            // declaring failure and releasing the stock.
            const status = await paymentStatusOf(id);
            if (status === "paid") {
              finish(id);
              return;
            }
            await failPayment({
              orderId: id,
              gatewayOrderId: session.gatewayOrderId,
              reason: "Payment window closed before completion",
            });
            setFailure({
              message:
                "The payment window was closed before the payment completed. Nothing has been charged, and your bag is unchanged.",
            });
            setPhase("failed");
          },
        },
      });

      checkout.on("payment.failed", (payload) => {
        setFailure({
          message:
            payload.error?.description ??
            "The payment did not go through. Nothing has been charged.",
        });
        setPhase("failed");
      });

      checkout.open();
    },
    [finish],
  );

  // Create the order, then pay for it.
  useEffect(() => {
    if (!hydrated || !pendingCheckout || started.current || !scriptReady) return;
    started.current = true;

    placeOrder(pendingCheckout.input)
      .then(async (result) => {
        if (!result.ok) {
          setFailure({ message: result.error, needsAccount: result.field === "account" });
          setPhase("failed");
          return;
        }

        setOrderId(result.data.orderId);

        // Cash on delivery takes no gateway: the order is already confirmed.
        if (pendingCheckout.input.paymentMethod === "cod") {
          finish(result.data.orderId);
          return;
        }

        await pay(result.data.orderId);
      })
      .catch(() => {
        setFailure({
          message: "We could not reach the payment service. Nothing has been charged.",
        });
        setPhase("failed");
      });
  }, [hydrated, pendingCheckout, scriptReady, pay, finish]);

  /**
   * Poll our own database, not the gateway.
   *
   * The webhook is what confirms an order, and it can arrive before, during or
   * after the browser's callback. Polling our own record means whichever gets
   * there first wins and the customer never waits on the slower one.
   */
  useEffect(() => {
    if (phase !== "waiting" || !orderId) return;
    let cancelled = false;

    const id = setInterval(async () => {
      const status = await paymentStatusOf(orderId);
      if (cancelled) return;
      if (status === "paid") {
        clearInterval(id);
        finish(orderId);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [phase, orderId, finish]);

  const stage = STAGE_LABEL[phase];
  const complete = phase === "done";

  if (phase === "failed" && failure) {
    return (
      <div className="flex min-h-[calc(100dvh-120px)] flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md border border-hairline bg-surface p-7 text-center">
          <span
            className={cn(
              "mx-auto flex h-14 w-14 items-center justify-center",
              failure.needsAccount ? "bg-brand-50 text-brand-700" : "bg-sale-50 text-sale-600",
            )}
          >
            {failure.needsAccount ? <UserRound size={26} /> : <AlertTriangle size={26} />}
          </span>
          <h1 className="mt-5 font-display text-2xl tracking-[-0.02em] text-ink-950">
            {failure.needsAccount ? "An account is needed first" : "Payment not completed"}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-600">
            {failure.message}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {failure.needsAccount ? (
              <>
                <Link href="/register?next=/checkout/review" className={buttonClasses("primary")}>
                  Create an account
                </Link>
                <Link href="/login?next=/checkout/review" className={buttonClasses("outline")}>
                  Sign in
                </Link>
              </>
            ) : (
              <>
                <Link href="/checkout/review" className={buttonClasses("primary")}>
                  Try again
                </Link>
                <Link href="/cart" className={buttonClasses("outline")}>
                  Back to bag
                </Link>
              </>
            )}
          </div>

          <p className="mt-6 text-[12px] leading-relaxed text-ink-500">
            If money left your account, it is a bank-side hold and reverses on its own within 5 to 7
            business days. Send us the reference and we will chase it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Loaded before the order is created, so the window can open the instant
          the gateway session exists rather than after a second round trip. */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
        onError={() => {
          setFailure({
            message:
              "The payment window could not load. Check your connection or any ad blocker, then try again.",
          });
          setPhase("failed");
        }}
      />

      <div className="flex min-h-[calc(100dvh-120px)] flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Logo href={null} />
          </div>

          <div className="overflow-hidden border border-hairline bg-surface">
            <div className="peacock-surface px-6 py-8 text-center">
              <motion.div
                initial={reduce ? false : { scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mx-auto flex h-16 w-16 items-center justify-center border border-white/20 bg-white/10"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {complete ? (
                    <motion.span
                      key="done"
                      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <Check size={30} className="text-gold-300" strokeWidth={3} />
                    </motion.span>
                  ) : (
                    <motion.span key="busy" exit={{ opacity: 0 }}>
                      <Loader2 size={28} className="animate-spin text-white/80" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              <h1 className="mt-5 font-display text-[22px] tracking-[-0.02em] text-white">
                {stage.title}
              </h1>
              <p className="mt-1.5 text-[13px] text-white/60">{stage.detail}</p>

              {amount !== null && (
                <p className="mt-4 font-display text-[26px] leading-none text-white">
                  {formatINR(amount)}
                </p>
              )}
            </div>

            <div className="space-y-3 px-6 py-6">
              <p className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-600">
                <Lock size={14} className="mt-0.5 shrink-0 text-brand-600" />
                Your card and UPI details are entered on Razorpay&apos;s secure page. They never
                reach our servers.
              </p>
              <p className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-600">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-600" />
                Do not close this tab. If the payment window did not open, check your pop-up
                blocker.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
