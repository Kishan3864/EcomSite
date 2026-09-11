"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, CircleDollarSign, PackageOpen, RotateCcw, Truck } from "lucide-react";
import type { Order, ReturnRequest } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { Field, Select } from "@/components/ui/field";
import { requestReturn } from "@/services/commerce";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate, formatINR } from "@/lib/utils";

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

/**
 * `requests` and `orders` are the customer's real records. Raising a return
 * writes to the database and refreshes the page, so what is on screen is always
 * what the warehouse sees.
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
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="font-display text-[22px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[34px]">
          Returns and refunds
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-600 sm:mt-2 sm:text-[14px]">
          Free pickup from every serviceable pincode. Refunds start within 48 hours of the item
          reaching our warehouse.
        </p>
      </header>

      <section>
        <h2 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:mb-3 sm:text-[12px]">
          Your return requests
        </h2>
        {requests.length === 0 ? (
          <EmptyState
            icon={<RotateCcw size={24} />}
            title="No returns yet"
            body="Nothing to see here — which is usually a good sign."
            className="px-4 py-8 sm:px-6 sm:py-10"
          />
        ) : (
          <ul className="space-y-2.5 sm:space-y-3">
            <AnimatePresence initial={false}>
              {requests.map((request) => {
                const stepIndex = STATUS_STEPS.indexOf(request.status);
                return (
                  <motion.li
                    key={request.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-xl border border-hairline bg-surface"
                  >
                    <div className="flex gap-3 p-3.5 sm:gap-4 sm:p-4">
                      <span className="relative h-[72px] w-[58px] shrink-0 overflow-hidden rounded-lg bg-ink-100 sm:h-20 sm:w-16">
                        <Image
                          src={request.image}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 64px, 58px"
                          className="object-cover"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[13px] font-medium text-ink-950 sm:line-clamp-none sm:text-[13.5px]">
                          {request.productTitle}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-ink-500 sm:text-[12px]">
                          Order {request.orderNumber} · {request.reason}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-ink-500 sm:text-[12px]">
                          Requested {formatDate(request.requestedAt, "short")}
                        </p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 sm:text-[12.5px]">
                          <CircleDollarSign size={13} className="shrink-0" />
                          {formatINR(request.refundAmount)} to {request.refundMode}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-hairline bg-canvas px-3.5 py-2.5 sm:px-4 sm:py-3">
                      {request.status === "rejected" ? (
                        <p className="text-[12.5px] font-medium text-sale-600">
                          This return was not approved. Contact support for details.
                        </p>
                      ) : (
                        <ol className="flex items-center">
                          {STATUS_STEPS.map((step, i) => {
                            const done = i <= stepIndex;
                            return (
                              <li key={step} className="flex flex-1 items-center last:flex-none">
                                <span className="flex flex-col items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                                      done
                                        ? "bg-brand-600 text-white"
                                        : "border border-ink-200 text-ink-300",
                                    )}
                                  >
                                    {done ? <Check size={11} strokeWidth={3} /> : i + 1}
                                  </span>
                                  <span
                                    className={cn(
                                      "whitespace-nowrap text-[10.5px]",
                                      done ? "font-medium text-ink-800" : "text-ink-400",
                                    )}
                                  >
                                    {STATUS_LABEL[step]}
                                  </span>
                                </span>
                                {i < STATUS_STEPS.length - 1 && (
                                  <span
                                    className={cn(
                                      "mx-1 -mt-4 h-0.5 flex-1 rounded-full",
                                      i < stepIndex ? "bg-brand-600" : "bg-ink-200",
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
        )}
      </section>

      <section>
        <h2 className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:text-[12px]">
          Start a new return
        </h2>
        <p className="mb-2.5 text-[12.5px] text-ink-500 sm:mb-3 sm:text-[13px]">
          Delivered items are eligible for the return window shown on each product page.
        </p>

        {eligible.length === 0 ? (
          <EmptyState
            icon={<PackageOpen size={24} />}
            title="Nothing eligible right now"
            body="Once an order is delivered it will show up here for the length of its return window."
            action={
              <Link href="/account/orders" className={buttonClasses("outline", "md")}>
                View my orders
              </Link>
            }
            className="px-4 py-8 sm:px-6 sm:py-10"
          />
        ) : (
          <ul className="space-y-2.5 sm:space-y-3">
            {eligible.map(({ order, line }) => (
              <li
                key={`${order.id}-${line.id}`}
                className="overflow-hidden rounded-xl border border-hairline bg-surface"
              >
                <div className="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-4">
                  <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                    <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[13px] font-medium text-ink-950 sm:text-[13.5px]">
                      {line.title}
                    </p>
                    {/* At 320px the order number is wider than this column. */}
                    <p className="break-words text-[11.5px] text-ink-500 sm:text-[12px]">
                      Order {order.number} · delivered{" "}
                      {formatDate(order.estimatedDelivery, "short")}
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
                      <div className="border-t border-hairline p-3.5 sm:p-4">
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
                        <p className="mt-3 flex items-start gap-2 rounded-lg bg-ink-50 p-3 text-[12.5px] leading-relaxed text-ink-600 sm:text-[12px]">
                          <Truck size={13} className="mt-px shrink-0 text-brand-600" />
                          A pickup will be scheduled within 24 hours. Keep the item in its original
                          packaging with all tags attached.
                        </p>
                        {error && (
                          <p role="alert" className="mt-3 text-[12.5px] font-medium text-sale-600">
                            {error}
                          </p>
                        )}
                        <div className="mt-3 flex gap-2">
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
        )}
      </section>

      <p className="rounded-xl border border-hairline bg-surface p-3.5 text-[12.5px] leading-relaxed text-ink-600 sm:p-4">
        Read the full{" "}
        <Link href="/legal/refunds" className="font-semibold text-brand-700 hover:underline">
          return policy
        </Link>{" "}
        for category-specific windows. Beauty and personal care items can only be returned
        unopened.
      </p>
    </div>
  );
}
