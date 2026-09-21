import { cn } from "@/lib/utils";
import { BUSINESS } from "@/config/business";
import { CreditCard, Headset, MapPin, RotateCcw, Truck, type LucideIcon } from "lucide-react";
import { paymentSentence, type PublicPayments } from "@/lib/payment-copy";

/**
 * The counter.
 *
 * Four facts, above the fold on a phone, that a shop which does not exist
 * cannot publish: where it ships from, a telephone a person answers, the
 * courier that carries the parcel, and how it can be paid. Every one of them
 * is checkable in under a minute, which is the only kind of trust signal
 * worth putting on a page — a badge that says "100% SECURE" is not.
 *
 * Deliberately NOT the footer's four promises. Those are about what happens
 * after the order; these are about whether there is anybody here at all. The
 * same four facts twice on one page would be padding.
 *
 * Nothing here may be added to lightly. Specifically forbidden, because every
 * one of them would be a lie today: any claim about GST invoicing
 * (`BUSINESS.gstin` is empty and `isGstRegistered` is false), the Udyam number
 * (it belongs on the privacy and terms pages and nowhere a passer-by sees it),
 * customer counts, star averages, "trusted by" lines, certification marks,
 * trust seals, padlocks, card-network logo walls, and anything at all derived
 * from the clock — this page is revalidated every two minutes, so any countdown
 * on it is wrong by up to two minutes.
 */

export function Counter({ payments }: { payments: PublicPayments }) {
  const { address, ops } = BUSINESS;

  const pay = paymentSentence(payments);

  const cells: { icon: LucideIcon; label: string; value: React.ReactNode }[] = [
    {
      icon: MapPin,
      label: "Ships from",
      value: `${address.city}, ${address.state} ${address.postalCode}`,
    },
    {
      icon: Headset,
      label: "We answer this",
      value: (
        <>
          <a href={`tel:${BUSINESS.supportPhoneTel}`} className="hover:text-brand-700">
            {BUSINESS.supportPhone}
          </a>
          {/* The real hours, not a shortened version of them: a shop that
              quotes hours it does not staff is worse than one that quotes
              none at all. */}
          <span className="mt-0.5 block text-[12px] font-normal leading-[1.4] text-ink-500">
            {BUSINESS.supportHours}
          </span>
        </>
      ),
    },
    {
      icon: Truck,
      label: "Courier",
      value: `${ops.courierPartners[0]}, tracked end to end`,
    },
    // If every payment method is switched off, the cell carries a fact that is
    // true whatever the switches say rather than an empty label. It must never
    // name a method the checkout will not actually offer.
    pay
      ? { icon: CreditCard, label: "Pay by", value: pay }
      : {
          icon: RotateCcw,
          label: "Returns",
          value: `${ops.returnWindowDays} days from delivery`,
        },
  ];

  return (
    <section className="container-page">
      <ul className="card grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
        {cells.map((cell, i) => (
          <li
            key={cell.label}
            className={cn(
              "flex items-start gap-3 p-4 sm:p-5",
              i < 2 && "max-lg:border-b max-lg:border-line",
              i % 2 === 0 && "max-lg:border-r max-lg:border-line",
            )}
          >
            <span className="icon-tile icon-tile-sm mt-0.5 max-sm:hidden">
              <cell.icon size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="t-label">{cell.label}</p>
              <p className="mt-1 text-[13px] font-medium leading-[1.4] text-ink-900">{cell.value}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
