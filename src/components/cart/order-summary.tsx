"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Lock, Truck } from "lucide-react";
import type { CartLine, DeliveryOption, Offer, OrderTotals } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { estimatedDelivery } from "@/lib/pricing";
import { useStore } from "@/store/store";
import { cn, formatDate, formatINR } from "@/lib/utils";

// Labels such as "Create an account to pay" are wider than a 320px screen at
// the lg button's padding, so on phones the padding narrows and the label may
// take two lines inside the same 48px button rather than overflow it.
const CTA_FIT = "w-full px-4 text-center whitespace-normal sm:px-8 sm:whitespace-nowrap";

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
    ...(totals.tax > 0
      ? [{ label: "GST (included)", value: formatINR(totals.tax), tone: "muted" as const }]
      : []),
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-hairline bg-surface",
        className,
      )}
    >
      <div className="border-b border-hairline px-4 py-3 sm:px-5 sm:py-4">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:text-[12px]">
          Order summary
        </h2>
      </div>

      <dl className="space-y-2 px-4 py-3 sm:space-y-2.5 sm:px-5 sm:py-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 text-[13px] sm:text-[13.5px]"
          >
            <dt className={cn("min-w-0 text-ink-600", row.tone === "muted" && "text-ink-400")}>
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

      <div className="flex items-baseline justify-between gap-4 border-t border-hairline px-4 py-3 sm:px-5 sm:py-4">
        <span className="text-[14px] font-semibold text-ink-950 sm:text-[15px]">Total payable</span>
        <motion.span
          key={totals.total}
          initial={{ opacity: 0.5, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-[17px] font-semibold tabular-nums text-ink-950 sm:text-xl"
        >
          {formatINR(totals.total)}
        </motion.span>
      </div>

      {totals.savings > 0 && (
        <p className="mx-4 mb-3 rounded-lg bg-brand-50 px-3 py-2 text-center text-[12px] font-semibold text-brand-800 sm:mx-5 sm:mb-4 sm:py-2.5 sm:text-[12.5px]">
          You save {formatINR(totals.savings)} on this order
        </p>
      )}

      {showDeliveryEstimate && lines.length > 0 && (
        <p className="mx-4 mb-3 flex items-start gap-2 text-[12.5px] text-ink-600 sm:mx-5 sm:mb-4">
          <Truck size={14} className="mt-0.5 shrink-0 text-brand-600" />
          Estimated delivery{" "}
          <strong className="font-semibold text-ink-900">
            {formatDate(eta.from, "day")} – {formatDate(eta.to, "day")}
          </strong>
        </p>
      )}

      {toFree > 0 && (
        <p className="mx-4 mb-3 text-[12px] text-ink-500 sm:mx-5 sm:mb-4">
          Add {formatINR(toFree)} more to qualify for free standard delivery.
        </p>
      )}

      {cta && (
        <div className="border-t border-hairline p-4 sm:p-5">
          {ctaHref ? (
            <Link href={ctaHref} className={buttonClasses("primary", "lg", CTA_FIT)}>
              {cta}
              <ArrowRight size={17} />
            </Link>
          ) : (
            <button onClick={onCta} className={buttonClasses("primary", "lg", CTA_FIT)}>
              {cta}
              <ArrowRight size={17} />
            </button>
          )}
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-400 sm:mt-3">
            <Lock size={11} />
            {footnote ?? "Secure checkout. Your details are never shared."}
          </p>
        </div>
      )}
      {coupon && !cta && (
        <p className="px-4 pb-4 text-[11.5px] text-ink-400 sm:px-5 sm:pb-5">{coupon.description}</p>
      )}
    </div>
  );
}
