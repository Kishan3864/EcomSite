"use client";

import { useState, useTransition } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  BadgeCheck,
  ClipboardList,
  Info,
  PackageOpen,
  RotateCcw,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Order, ReturnRequest } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { Field, Select } from "@/components/ui/field";
import { StatusPill, type StatusTone } from "@/components/account/status-pill";
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

const STEP_ICON: Record<string, LucideIcon> = {
  requested: ClipboardList,
  approved: BadgeCheck,
  picked_up: Truck,
  refunded: Wallet,
};

function returnTone(status: ReturnRequest["status"]): StatusTone {
  if (status === "refunded") return "done";
  if (status === "rejected") return "alert";
  return "progress";
}

const REASONS = [
  "Size or fit is wrong",
  "Item arrived damaged",
  "Received the wrong product",
  "Quality not as expected",
  "Changed my mind",
  "Found a better price elsewhere",
];

/** Section heading: icon tile, title and an optional line. */
function SectionHead({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="icon-tile icon-tile-sm">
        <Icon size={16} aria-hidden />
      </span>
      <div className="min-w-0 pt-1">
        <h2 className="t-h3">{title}</h2>
        {description && <p className="t-small mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

/**
 * `requests` and `orders` are the customer's real records. Raising a return
 * writes to the database and refreshes the page.
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
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        className="pb-0 pt-1 sm:pb-0 sm:pt-0"
        crumbs={[
          { name: "Home", href: "/" },
          { name: "My account", href: "/account" },
          { name: "Returns and refunds", href: "/account/returns" },
        ]}
        title="Returns and refunds"
        description="Free pickup from every serviceable pincode. Refunds start within 48 hours of the item reaching our warehouse."
      />

      <section>
        <SectionHead icon={RotateCcw} title="Your return requests" />
        {requests.length === 0 ? (
          <EmptyState
            icon={<RotateCcw size={24} />}
            title="No returns yet"
            body="Nothing to see here — which is usually a good sign."
            className="py-10 sm:py-12"
          />
        ) : (
          <ul className="space-y-3 sm:space-y-4">
            <AnimatePresence initial={false}>
              {requests.map((request) => {
                const stepIndex = STATUS_STEPS.indexOf(request.status);
                return (
                  <motion.li
                    key={request.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card overflow-hidden"
                  >
                    <div className="flex gap-3 p-4 sm:gap-4 sm:p-5">
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gradient-to-b from-ink-50 to-ink-100 sm:h-20 sm:w-20">
                        <Image src={request.image} alt="" fill sizes="80px" className="object-cover" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                          <p className="line-clamp-2 min-w-0 flex-1 text-[13.5px] font-medium leading-[1.4] text-ink-950">
                            {request.productTitle}
                          </p>
                          <StatusPill tone={returnTone(request.status)}>{STATUS_LABEL[request.status]}</StatusPill>
                        </div>
                        <p className="t-small mt-1 tabular-nums">
                          Order {request.orderNumber} · {request.reason}
                        </p>
                        <p className="t-small tabular-nums">Requested {formatDate(request.requestedAt, "short")}</p>
                        <p className="mt-1.5 text-[13px] text-ink-600">
                          Refund{" "}
                          <span className="t-price">{formatINR(request.refundAmount)}</span> to{" "}
                          {request.refundMode}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-line bg-ink-50/60 px-4 py-4 sm:px-5">
                      {request.status === "rejected" ? (
                        <p className="flex items-start gap-2 text-[13px] font-medium text-sale-700">
                          <AlertTriangle size={16} className="mt-px shrink-0" />
                          This return was not approved. Contact support for details.
                        </p>
                      ) : (
                        <ol className="flex items-start" aria-label="Return progress">
                          {STATUS_STEPS.map((step, i) => {
                            const done = i <= stepIndex;
                            const current = i === stepIndex;
                            const Icon = STEP_ICON[step];
                            return (
                              <li
                                key={step}
                                className="flex flex-1 items-start last:flex-none"
                                aria-current={current ? "step" : undefined}
                              >
                                <span className="flex w-14 flex-col items-center gap-1.5 text-center sm:w-20">
                                  <span
                                    aria-hidden
                                    className={cn(
                                      "flex h-8 w-8 items-center justify-center rounded-full",
                                      current
                                        ? "bg-brand-700 text-white ring-4 ring-brand-100"
                                        : done
                                          ? "bg-brand-600 text-white"
                                          : "bg-surface text-ink-400 ring-1 ring-inset ring-line-strong",
                                    )}
                                  >
                                    <Icon size={14} />
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[11px] font-semibold leading-tight",
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
                                      "-mx-3 mt-[15px] h-0.5 min-w-2 flex-1 rounded-full sm:-mx-4",
                                      i < stepIndex ? "bg-brand-600" : "bg-line-strong",
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
        <SectionHead
          icon={PackageOpen}
          title="Start a new return"
          description={
            eligible.length > 0
              ? "Delivered items are eligible for the return window shown on each product page."
              : undefined
          }
        />
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
            className="py-10 sm:py-12"
          />
        ) : (
          <ul className="space-y-3">
            {eligible.map(({ order, line }) => {
              const key = `${order.id}-${line.id}`;
              const open = openFor === key;
              return (
                <li key={key} className={cn("card overflow-hidden transition-colors", open && "border-brand-200")}>
                  <div className="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-4">
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-b from-ink-50 to-ink-100">
                      <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13.5px] font-medium text-ink-950">{line.title}</p>
                      {/* At 320px the order number is wider than this column. */}
                      <p className="t-small mt-0.5 break-words tabular-nums">
                        Order {order.number} · delivered {deliveryFact(order, "short").value}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={open ? "subtle" : "outline"}
                      aria-expanded={open}
                      onClick={() => setOpenFor((s) => (s === key ? null : key))}
                      className="h-10 shrink-0 sm:h-9"
                    >
                      <RotateCcw size={14} /> Return
                    </Button>
                  </div>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-line bg-ink-50/60 p-4 sm:p-5">
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
                          <p className="t-small mt-3 flex items-start gap-2">
                            <Info size={14} aria-hidden className="mt-0.5 shrink-0" />
                            A pickup will be scheduled within 24 hours. Keep the item in its original
                            packaging with all tags attached.
                          </p>
                          {error && (
                            <p
                              role="alert"
                              className="mt-3 flex items-start gap-2 rounded-md bg-sale-50 px-3.5 py-3 text-[13px] leading-[1.5] text-sale-700 ring-1 ring-inset ring-sale-200"
                            >
                              <AlertTriangle size={16} className="mt-px shrink-0" />
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
                            <Button size="sm" variant="ghost" onClick={() => setOpenFor(null)} className="h-10 sm:h-9">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="card-muted flex items-start gap-2.5 rounded-xl p-4 text-[13px] leading-[1.6] text-ink-600">
        <Info size={16} aria-hidden className="mt-0.5 shrink-0 text-brand-700" />
        <span>
          Read the full{" "}
          <Link href="/legal/refunds" className="font-medium text-brand-700 hover:underline">
            return policy
          </Link>{" "}
          for category-specific windows. Beauty and personal care items can only be returned
          unopened.
        </span>
      </p>
    </div>
  );
}
