"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Lock, Truck } from "lucide-react";
import type { CartLine, DeliveryOption, Offer, OrderTotals } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { estimatedDelivery } from "@/lib/pricing";
import { useStore } from "@/store/store";
import { cn, formatDate, formatINR } from "@/lib/utils";

export function OrderSummary({
  totals,
  lines,
  delivery,
  coupon,
  cta,
  ctaHref,
  onCta,
  footnote,
  showDeliveryEstimate = true,
  className,
}: {
  totals: OrderTotals;
  lines: CartLine[];
  delivery?: DeliveryOption | null;
  coupon?: Offer | null;
  cta?: string;
  ctaHref?: string;
  onCta?: () => void;
  footnote?: string;
  showDeliveryEstimate?: boolean;
  className?: string;
}) {
  const { config } = useStore();
  const eta = estimatedDelivery(lines, delivery);
  const toFree = Math.max(0, config.rates.freeThreshold - totals.itemsTotal);

  const rows: { label: string; value: string; tone?: "muted" | "save" }[] = [
    {
      label: `Items total (${lines.reduce((s, l) => s + l.quantity, 0)})`,
      value: formatINR(totals.mrpTotal),
    },
    ...(totals.productDiscount > 0
      ? [
          {
            label: "Product discount",
            value: `− ${formatINR(totals.productDiscount)}`,
            tone: "save" as const,
          },
        ]
      : []),
    ...(totals.couponDiscount > 0
      ? [
          {
            label: `Coupon (${totals.couponCode})`,
            value: `− ${formatINR(totals.couponDiscount)}`,
            tone: "save" as const,
          },
        ]
      : []),
    {
      label: delivery ? delivery.name : "Delivery",
      value: totals.shipping === 0 ? "Free" : formatINR(totals.shipping),
      tone: totals.shipping === 0 ? "save" : undefined,
    },
    { label: "GST (included)", value: formatINR(totals.tax), tone: "muted" },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-hairline bg-surface",
        className,
      )}
    >
      <div className="border-b border-hairline px-5 py-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
          Order summary
        </h2>
      </div>

      <dl className="space-y-2.5 px-5 py-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 text-[13.5px]">
            <dt className={cn("text-ink-600", row.tone === "muted" && "text-ink-400")}>
              {row.label}
            </dt>
            <dd
              className={cn(
                "shrink-0 tabular-nums",
                row.tone === "save"
                  ? "font-semibold text-brand-700"
                  : row.tone === "muted"
                    ? "text-ink-400"
                    : "text-ink-900",
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex items-baseline justify-between gap-4 border-t border-hairline px-5 py-4">
        <span className="text-[15px] font-semibold text-ink-950">Total payable</span>
        <motion.span
          key={totals.total}
          initial={{ opacity: 0.5, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-xl font-semibold tabular-nums text-ink-950"
        >
          {formatINR(totals.total)}
        </motion.span>
      </div>

      {totals.savings > 0 && (
        <p className="mx-5 mb-4 rounded-lg bg-brand-50 px-3 py-2.5 text-center text-[12.5px] font-semibold text-brand-800">
          You save {formatINR(totals.savings)} on this order
        </p>
      )}

      {showDeliveryEstimate && lines.length > 0 && (
        <p className="mx-5 mb-4 flex items-start gap-2 text-[12.5px] text-ink-600">
          <Truck size={14} className="mt-0.5 shrink-0 text-brand-600" />
          Estimated delivery{" "}
          <strong className="font-semibold text-ink-900">
            {formatDate(eta.from, "day")} – {formatDate(eta.to, "day")}
          </strong>
        </p>
      )}

      {toFree > 0 && (
        <p className="mx-5 mb-4 text-[12px] text-ink-500">
          Add {formatINR(toFree)} more to qualify for free standard delivery.
        </p>
      )}

      {cta && (
        <div className="border-t border-hairline p-5">
          {ctaHref ? (
            <Link href={ctaHref} className={buttonClasses("primary", "lg", "w-full")}>
              {cta}
              <ArrowRight size={17} />
            </Link>
          ) : (
            <button onClick={onCta} className={buttonClasses("primary", "lg", "w-full")}>
              {cta}
              <ArrowRight size={17} />
            </button>
          )}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-400">
            <Lock size={11} />
            {footnote ?? "Secure checkout. Your details are never shared."}
          </p>
        </div>
      )}
      {coupon && !cta && (
        <p className="px-5 pb-5 text-[11.5px] text-ink-400">{coupon.description}</p>
      )}
    </div>
  );
}
