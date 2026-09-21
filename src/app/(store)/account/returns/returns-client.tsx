"use client";

import { useState, useTransition } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import type { Order, ReturnRequest } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { Field, Select } from "@/components/ui/field";
import { requestReturn } from "@/services/commerce";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate, formatINR } from "@/lib/utils";
import { deliveryFact } from "@/lib/order-display";

const STATUS_STEPS: ReturnRequest["status"][] = [
  "requested",
  "approved",
  "picked_up",
  "refunded",
];

const STATUS_LABEL: Record<ReturnRequest["status"], string> = {
  requested: "Requested",
  approved: "Approved",
  picked_up: "Picked up",
  refunded: "Refunded",
  rejected: "Not eligible",
};

const REASONS = [
  "Size or fit is wrong",
  "Item arrived damaged",
  "Received the wrong product",
  "Quality not as expected",
  "Changed my mind",
  "Found a better price elsewhere",
];

/** The heading every block on the account screens wears. */
const PANEL_HEAD =
  "px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:px-5 sm:py-3.5";

/** The same heading, standing on its own above a block that draws its own box. */
const LOOSE_HEAD =
  "mb-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500";

/**
 * `requests` and `orders` are the customer's real records. Raising a return
 * writes to the database and refreshes the page, so what is on screen is always
 * what the warehouse sees.
 *
 * The four stages of a return are drawn the way the shipment timeline draws its
 * stops: square nodes on one rule, inked as far as the parcel has actually got.
 * It is the same journey as the one on the order page, so it is the same
 * picture, turned on its side.
 */
export function ReturnsClient({
  requests,
  orders,
}: {
  requests: ReturnRequest[];
  orders: Order[];
}) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  // Already-returned lines must not offer a second return.
  const returnedTitles = new Set(requests.map((r) => `${r.orderNumber}::${r.productTitle}`));
  const eligible = orders
    .filter((o) => o.status === "delivered")
    .flatMap((o) => o.lines.map((line) => ({ order: o, line })))
    .filter(({ order, line }) => !returnedTitles.has(`${order.number}::${line.title}`));

  function raise(order: Order, line: { id: string; title: string; image: string }) {
    setError(null);
    startTransition(async () => {
      const result = await requestReturn({
        orderId: order.id,
        orderLineId: line.id,
        reason,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpenFor(null);
      toast({
        title: "Return requested",
        description: `${line.title} — pickup will be scheduled within 24 hours.`,
        image: line.image,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      <header>
        <span className="eyebrow">Your account</span>
        <h1 className="mt-2 font-display text-[22px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-3 sm:text-[32px]">
          Returns and refunds
        </h1>
        <p className="mt-2 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:text-[15px]">
          Free pickup from every serviceable pincode. Refunds start within 48 hours of the item
          reaching our warehouse.
        </p>
      </header>

      {requests.length === 0 ? (
        <section>
          <h2 className={LOOSE_HEAD}>Your return requests</h2>
          <EmptyState
            title="No returns yet"
            body="Nothing to see here — which is usually a good sign."
            className="px-4 py-8 sm:px-6 sm:py-10"
          />
        </section>
      ) : (
        <section className="bg-surface shadow-sm">
          <h2 className={PANEL_HEAD}>Your return requests</h2>
          <ul>
            <AnimatePresence initial={false}>
              {requests.map((request) => {
                const stepIndex = STATUS_STEPS.indexOf(request.status);
                return (
                  <motion.li
                    key={request.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex gap-3 px-4 py-4 sm:gap-4 sm:px-5">
                      <span className="relative h-[72px] w-[58px] shrink-0 overflow-hidden bg-ink-100 sm:h-20 sm:w-16">
                        <Image
                          src={request.image}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 64px, 58px"
                          className="object-cover"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[13.5px] font-medium leading-[1.4] text-ink-950 sm:line-clamp-none">
                          {request.productTitle}
                        </p>
                        <p className="mt-1 text-[13px] leading-[1.5] tabular-nums text-ink-500">
                          Order {request.orderNumber} · {request.reason}
                        </p>
                        <p className="text-[13px] leading-[1.5] tabular-nums text-ink-500">
                          Requested {formatDate(request.requestedAt, "short")}
                        </p>
                        <p className="mt-1.5 text-[13px] text-ink-600">
                          Refund{" "}
                          <span className="font-semibold tabular-nums text-ink-950">
                            {formatINR(request.refundAmount)}
                          </span>{" "}
                          to {request.refundMode}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 py-3.5 sm:px-5">
                      {request.status === "rejected" ? (
                        <p className="text-[13px] font-medium text-sale-600">
                          This return was not approved. Contact support for details.
                        </p>
                      ) : (
                        <ol className="flex items-start">
                          {STATUS_STEPS.map((step, i) => {
                            const done = i <= stepIndex;
                            return (
                              <li key={step} className="flex flex-1 items-start last:flex-none">
                                <span className="flex flex-col items-center gap-2">
                                  <span
                                    aria-hidden
                                    className={cn(
                                      "h-[11px] w-[11px] shrink-0",
                                      done ? "bg-brand-700" : "bg-surface",
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.1em]",
                                      done ? "text-ink-900" : "text-ink-500",
                                    )}
                                  >
                                    {STATUS_LABEL[step]}
                                  </span>
                                </span>
                                {i < STATUS_STEPS.length - 1 && (
                                  <span
                                    aria-hidden
                                    className={cn(
                                      "mx-2 mt-[5px] h-px flex-1",
                                      i < stepIndex ? "bg-brand-700" : "bg-rule",
                                    )}
                                  />
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </section>
      )}

      {eligible.length === 0 ? (
        <section>
          <h2 className={LOOSE_HEAD}>Start a new return</h2>
          <EmptyState
            title="Nothing eligible right now"
            body="Once an order is delivered it will show up here for the length of its return window."
            action={
              <Link href="/account/orders" className={buttonClasses("outline", "md")}>
                View my orders
              </Link>
            }
            className="px-4 py-8 sm:px-6 sm:py-10"
          />
        </section>
      ) : (
        <section className="bg-surface shadow-sm">
          <header className="px-4 py-3 sm:px-5 sm:py-3.5">
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              Start a new return
            </h2>
            <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-500">
              Delivered items are eligible for the return window shown on each product page.
            </p>
          </header>

          <ul>
            {eligible.map(({ order, line }) => (
              <li
                key={`${order.id}-${line.id}`}
              >
                <div className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5">
                  <span className="relative h-16 w-14 shrink-0 overflow-hidden bg-ink-100">
                    <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[13.5px] font-medium text-ink-950">
                      {line.title}
                    </p>
                    {/* At 320px the order number is wider than this column. */}
                    <p className="mt-0.5 break-words text-[13px] leading-[1.5] tabular-nums text-ink-500">
                      Order {order.number} · delivered{" "}
                      {deliveryFact(order, "short").value}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={openFor === `${order.id}-${line.id}` ? "subtle" : "outline"}
                    onClick={() =>
                      setOpenFor((s) =>
                        s === `${order.id}-${line.id}` ? null : `${order.id}-${line.id}`,
                      )
                    }
                    className="h-10 shrink-0 sm:h-9"
                  >
                    <RotateCcw size={13} /> Return
                  </Button>
                </div>

                <AnimatePresence initial={false}>
                  {openFor === `${order.id}-${line.id}` && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 py-4 sm:px-5">
                        <Field label="Why are you returning this?" htmlFor={`reason-${line.id}`}>
                          <Select
                            id={`reason-${line.id}`}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          >
                            {REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <p className="mt-3.5 pl-3.5 text-[13px] leading-[1.55] text-ink-600">
                          A pickup will be scheduled within 24 hours. Keep the item in its original
                          packaging with all tags attached.
                        </p>
                        {error && (
                          <p
                            role="alert"
                            className="mt-3.5 rule-l [--rule-color:var(--color-sale-600)] bg-sale-50 px-3.5 py-3 text-[13px] leading-[1.5] text-sale-600"
                          >
                            {error}
                          </p>
                        )}
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            loading={pending}
                            onClick={() => raise(order, line)}
                            className="h-10 flex-1 sm:h-9 sm:flex-initial"
                          >
                            Confirm return
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setOpenFor(null)}
                            className="h-10 sm:h-9"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="pl-3.5 text-[13px] leading-[1.6] text-ink-600">
        Read the full{" "}
        <Link href="/legal/refunds" className="font-medium text-brand-700 hover:underline">
          return policy
        </Link>{" "}
        for category-specific windows. Beauty and personal care items can only be returned
        unopened.
      </p>
    </div>
  );
}
