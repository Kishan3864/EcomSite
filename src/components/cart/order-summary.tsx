"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import type { CartLine, DeliveryOption, OrderTotals } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { estimatedDelivery } from "@/lib/pricing";
import { useStore } from "@/store/store";
import { cn, formatDate, formatINR } from "@/lib/utils";

/**
 * What the order costs, set as a ledger rather than as a card.
 *
 * A shopper reads a bill the way they read a receipt: down the right-hand
 * column. So every line is one ruled row of a fixed height with the label left
 * and the figure right, and every figure is set in the text face with tabular
 * numerals — Fraunces' proportional figures made the column wander a couple of
 * pixels a row, which is exactly the wobble that makes a shop look improvised.
 */

// Labels such as "Create an account to pay" are wider than a 320px screen at
// the lg button's padding, so on phones the padding narrows and the label may
// take two lines inside the same 48px button rather than overflow it.
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
    <div className={cn("card", className)}>
      <div className="px-4 py-3 sm:px-5">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          Order summary
        </h2>
      </div>

      <dl className="px-4 sm:px-5">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              "flex h-11 items-center justify-between gap-4",
              i > 0 && "rule-hair-t",
            )}
          >
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

        {/* The heavier rule is the one typographic signal that the column has
            been added up; nothing else on the summary is allowed to be louder. */}
        <div className="flex h-14 items-center justify-between gap-4">
          <dt className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950">
            Total payable
          </dt>
          <dd className="min-w-0">
            <motion.span
              key={totals.total}
              initial={{ opacity: 0.5, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="block text-[19px] font-semibold leading-none tabular-nums text-ink-950 sm:text-[21px]"
            >
              {formatINR(totals.total)}
            </motion.span>
          </dd>
        </div>
      </dl>

      {notes && (
        <div className="space-y-1.5 px-4 py-3 sm:px-5 sm:py-3.5">
          {totals.savings > 0 && (
            <p className="text-[13px] leading-[1.5] text-ink-600">
              You save{" "}
              <span className="font-semibold tabular-nums text-sale-600">
                {formatINR(totals.savings)}
              </span>{" "}
              on this order
            </p>
          )}

          {showDeliveryEstimate && lines.length > 0 && (
            <p className="text-[13px] leading-[1.5] text-ink-600">
              Estimated delivery{" "}
              <span className="font-semibold tabular-nums text-ink-900">
                {formatDate(eta.from, "day")} – {formatDate(eta.to, "day")}
              </span>
            </p>
          )}

          {toFree > 0 && (
            <p className="text-[13px] leading-[1.5] text-ink-500">
              Add <span className="tabular-nums">{formatINR(toFree)}</span> more to qualify for free
              standard delivery.
            </p>
          )}
        </div>
      )}

      {cta && (
        <div className="p-4 sm:p-5">
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
          {/* The sentence does the reassuring. A padlock glyph beside it is the
              badge every scam site wears, and it is worth less than the words.
              That still holds here, and it is not contradicted by the marks the
              payment step now carries: those name a mechanism a customer is
              scanning for — a card, a banknote, PhonePe — where a padlock beside
              "secure" only asserts a virtue about us. Wayfinding gets a glyph.
              A claim does not. This line is a claim. */}
          <p className="mt-3 text-center text-[13px] leading-[1.5] text-ink-500">
            {footnote ?? "Secure checkout. Your details are never shared."}
          </p>
        </div>
      )}
    </div>
  );
}
