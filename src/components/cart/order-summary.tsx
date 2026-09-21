"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Receipt, Tag, Truck } from "lucide-react";
import type { CartLine, DeliveryOption, OrderTotals } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { estimatedDelivery } from "@/lib/pricing";
import { useStore } from "@/store/store";
import { cn, formatDate, formatINR } from "@/lib/utils";

/**
 * What the order costs: one ruled row per figure, label left, figure right,
 * every number in tabular figures so the column reads straight down.
 */

// Labels such as "Create an account to pay" are wider than a 320px screen at
// the lg button's padding, so on phones the label may take two lines inside
// the same 48px button rather than overflow it.
const CTA_FIT = "w-full px-4 text-center whitespace-normal sm:px-8 sm:whitespace-nowrap";

export function OrderSummary({
  totals,
  lines,
  delivery,
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
    {
      label: delivery ? delivery.name : "Delivery",
      value: totals.shipping === 0 ? "Free" : formatINR(totals.shipping),
      tone: totals.shipping === 0 ? "save" : undefined,
    },
    ...(totals.tax > 0
      ? [{ label: "GST (included)", value: formatINR(totals.tax), tone: "muted" as const }]
      : []),
  ];

  const notes =
    totals.savings > 0 || (showDeliveryEstimate && lines.length > 0) || toFree > 0;

  return (
    <div className={cn("card overflow-hidden", className)}>
      <div className="flex items-center gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <span className="icon-tile icon-tile-sm" aria-hidden>
          <Receipt size={16} />
        </span>
        <h2 className="t-h3">Order summary</h2>
      </div>

      <dl className="px-4 sm:px-5">
        {rows.map((row) => (
          <div key={row.label} className="flex min-h-10 items-center justify-between gap-4 py-1.5">
            <dt
              className={cn(
                "min-w-0 truncate text-[13px]",
                row.tone === "muted" ? "text-ink-500" : "text-ink-600",
              )}
            >
              {row.label}
            </dt>
            <dd
              className={cn(
                "shrink-0 text-[13px] font-medium tabular-nums",
                row.tone === "save"
                  ? "text-sale-600"
                  : row.tone === "muted"
                    ? "text-ink-500"
                    : "text-ink-900",
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}

        {/* The one heavier rule: the column has been added up. */}
        <div className="mt-1.5 flex items-center justify-between gap-4 border-t border-dashed border-line-strong py-4">
          <dt className="text-[13.5px] font-semibold text-ink-950">Total payable</dt>
          <dd className="min-w-0">
            <motion.span
              key={totals.total}
              initial={{ opacity: 0.5, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="t-price block text-[20px] leading-none sm:text-[22px]"
            >
              {formatINR(totals.total)}
            </motion.span>
          </dd>
        </div>
      </dl>

      {notes && (
        <div className="mx-4 mb-4 space-y-2 card-muted px-3.5 py-3 sm:mx-5">
          {totals.savings > 0 && (
            <p className="flex items-start gap-2 text-[12.5px] leading-[1.5] text-ink-600">
              <Tag size={14} aria-hidden className="mt-0.5 shrink-0 text-sale-600" />
              <span>
                You save{" "}
                <span className="font-semibold tabular-nums text-sale-600">
                  {formatINR(totals.savings)}
                </span>{" "}
                on this order
              </span>
            </p>
          )}

          {showDeliveryEstimate && lines.length > 0 && (
            <p className="flex items-start gap-2 text-[12.5px] leading-[1.5] text-ink-600">
              <Truck size={14} aria-hidden className="mt-0.5 shrink-0 text-brand-700" />
              <span>
                Estimated delivery{" "}
                <span className="font-semibold tabular-nums text-ink-900">
                  {formatDate(eta.from, "day")} – {formatDate(eta.to, "day")}
                </span>
              </span>
            </p>
          )}

          {toFree > 0 && (
            <p className="flex items-start gap-2 text-[12.5px] leading-[1.5] text-ink-500">
              <Truck size={14} aria-hidden className="mt-0.5 shrink-0 text-ink-500" />
              <span>
                Add <span className="tabular-nums">{formatINR(toFree)}</span> more to qualify for free
                standard delivery.
              </span>
            </p>
          )}
        </div>
      )}

      {cta && (
        <div className="border-t border-line p-4 sm:p-5">
          {/* Gold: the one "press this" colour, for the bag's and the order's
              main buy action. */}
          {ctaHref ? (
            <Link href={ctaHref} className={buttonClasses("accent", "lg", CTA_FIT)}>
              {cta}
              <ArrowRight size={18} />
            </Link>
          ) : (
            <button onClick={onCta} className={buttonClasses("accent", "lg", CTA_FIT)}>
              {cta}
              <ArrowRight size={18} />
            </button>
          )}
          {/* The sentence does the reassuring; a padlock beside it would be a
              seal, not wayfinding. */}
          <p className="t-small mt-3 text-center">
            {footnote ?? "Secure checkout. Your details are never shared."}
          </p>
        </div>
      )}
    </div>
  );
}
