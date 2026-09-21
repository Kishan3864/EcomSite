"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { AlertTriangle, Check, Info, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { useStore } from "@/store/store";
import { placeOrder } from "@/services/commerce";
import { cn, formatINR } from "@/lib/utils";

/**
 * Checkout, from a staged basket to a paid order.
 *
 * The old version played four reassuring "contacting your bank" stages that
 * were pure animation, then created an order already marked paid. Now the
 * stages describe what is genuinely happening, and an order becomes paid only
 * where the money actually is: the gateway's verified answer, or a bank credit
 * a person has seen.
 *
 * This page's job ends at the hand-off. Cash on delivery is confirmed here;
 * UPI and the gateway each have a page of their own to go to, and the order
 * they leave behind is real, unpaid and payable from the customer's account.
 * Nothing about the money is decided on this screen.
 */

type Phase =
  | "creating" // writing the order, still unpaid
  | "opening" // handing over to whichever page takes the payment
  | "done" // cash on delivery only; everything else leaves this page
  | "failed";

type Failure = { message: string; needsAccount?: boolean };

const STAGE_LABEL: Record<Phase, { title: string; detail: string }> = {
  creating: { title: "Preparing your order", detail: "Reserving the items in your bag" },
  opening: { title: "Opening secure payment", detail: "Handing over to PayU" },
  done: { title: "Payment confirmed", detail: "Your order is placed" },
  failed: { title: "Payment not completed", detail: "" },
};

export function ProcessingClient() {
  const router = useRouter();
  const { pendingCheckout, dispatch, hydrated } = useStore();
  const reduce = usePrefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("creating");
  const [failure, setFailure] = useState<Failure | null>(null);

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

  // Create the order, then pay for it.
  useEffect(() => {
    if (!hydrated || !pendingCheckout || started.current) return;

    const method = pendingCheckout.input.paymentMethod;
    started.current = true;

    placeOrder(pendingCheckout.input)
      .then(async (result) => {
        if (!result.ok) {
          setFailure({ message: result.error, needsAccount: result.field === "account" });
          setPhase("failed");
          return;
        }

        // Cash on delivery takes no gateway: the order is already confirmed.
        if (method === "cod") {
          finish(result.data.orderId);
          return;
        }

        // UPI is paid on our own page — a QR and the customer's own app — so
        // the staged checkout is cleared here and the order takes over. It is
        // reserved and payable from their account until it is paid or lapses.
        if (method === "upi") {
          dispatch({ type: "checkout/complete" });
          router.replace(`/checkout/upi/${result.data.orderId}`);
          return;
        }

        // Everything else is the gateway. PayU is reached by posting a signed
        // form from the browser, so the hand-off is a page of its own rather
        // than a modal this one has to keep alive.
        dispatch({ type: "checkout/complete" });
        router.replace(`/checkout/payu/${result.data.orderId}`);
      })
      .catch(() => {
        setFailure({
          message: "We could not reach the payment service. Nothing has been charged.",
        });
        setPhase("failed");
      });
  }, [hydrated, pendingCheckout, finish, dispatch, router]);

  const stage = STAGE_LABEL[phase];
  const complete = phase === "done";

  if (phase === "failed" && failure) {
    return (
      <div className="flex min-h-[calc(100dvh-120px)] flex-col items-center justify-center px-3 py-8 sm:px-4 sm:py-16">
        <div className="card w-full max-w-md p-6 text-center sm:p-8">
          <span
            className={cn(
              "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ring-inset",
              failure.needsAccount
                ? "bg-brand-50 text-brand-700 ring-brand-100"
                : "bg-sale-50 text-sale-600 ring-sale-200",
            )}
          >
            {failure.needsAccount ? <UserRound size={24} /> : <AlertTriangle size={24} />}
          </span>
          <h1 className="t-h2 mt-5">
            {failure.needsAccount ? "An account is needed first" : "Payment not completed"}
          </h1>
          <p className="t-body mx-auto mt-2 max-w-[46ch] wrap-break-word">
            {failure.message}
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:justify-center">
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
                <Link href="/account/orders" className={buttonClasses("outline")}>
                  My orders
                </Link>
                <Link href="/cart" className={buttonClasses("ghost")}>
                  Back to bag
                </Link>
              </>
            )}
          </div>

          <p className="t-small mx-auto mt-6 max-w-[46ch] border-t border-line pt-4">
            If money left your account, it is a bank-side hold and reverses on its own within 5 to 7
            business days. Send us the reference and we will chase it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-[calc(100dvh-120px)] flex-col items-center justify-center px-3 py-8 sm:px-4 sm:py-16">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center sm:mb-8">
            <Logo href={null} />
          </div>

          <div className="card overflow-hidden">
            <div className="midnight relative px-5 py-8 text-center sm:px-6 sm:py-10">
              {/* Within the house limits: nothing here scales by more than
                  three per cent and nothing travels. The old frame popped from
                  90% and the tick from 60%, which is a bounce, and a bounce is
                  the wrong note on the screen where the money moves. */}
              <motion.div
                initial={reduce ? false : { scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {complete ? (
                    <motion.span
                      key="done"
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check size={24} className="text-gold-300" />
                    </motion.span>
                  ) : (
                    <motion.span key="busy" exit={{ opacity: 0 }}>
                      <Loader2 size={24} className="animate-spin text-white/85 motion-reduce:animate-none" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              <h1 aria-live="polite" className="t-h2 mt-6 text-white">
                {stage.title}
              </h1>
              {stage.detail && (
                <p className="mt-2 text-[13px] leading-[1.5] text-white/70">{stage.detail}</p>
              )}

              {/* Money in tabular figures, so it holds still as stages change. */}
              {amount !== null && (
                <p className="t-price mt-5 text-[26px] leading-none text-white sm:text-[30px]">
                  {formatINR(amount)}
                </p>
              )}
            </div>

            <div className="card-divided px-5 sm:px-6">
              <p className="flex items-start gap-3 py-4 text-[13px] leading-[1.55] text-ink-600">
                <ShieldCheck size={16} aria-hidden className="mt-0.5 shrink-0 text-brand-700" />
                <span>
                  Your card and UPI details are entered on PayU&apos;s secure page. They never
                  reach our servers.
                </span>
              </p>
              <p className="flex items-start gap-3 py-4 text-[13px] leading-[1.55] text-ink-600">
                <Info size={16} aria-hidden className="mt-0.5 shrink-0 text-ink-500" />
                <span>
                  Do not close this tab. If the payment window did not open, check your pop-up
                  blocker.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
