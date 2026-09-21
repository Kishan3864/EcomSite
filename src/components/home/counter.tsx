import { BUSINESS } from "@/config/business";
import { CounterGlyph, type CounterGlyphName } from "@/components/illustration/counter-glyphs";
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

  const cells: { glyph: CounterGlyphName; label: string; value: React.ReactNode }[] = [
    {
      glyph: "pin",
      label: "Ships from",
      value: `${address.city}, ${address.state} ${address.postalCode}`,
    },
    {
      glyph: "phone",
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
      glyph: "van",
      label: "Courier",
      value: `${ops.courierPartners[0]}, tracked end to end`,
    },
    // If every payment method is switched off, the cell carries a fact that is
    // true whatever the switches say rather than an empty label. It must never
    // name a method the checkout will not actually offer.
    pay
      ? { glyph: "note", label: "Pay by", value: pay }
      : {
          glyph: "note",
          label: "Returns",
          value: `${ops.returnWindowDays} days from delivery`,
        },
  ];

  return (
    <section>
      <div className="container-page">
        {/* Two across on a phone and four on a desktop — never a swipe rail.
            A fact hidden behind a horizontal scroll is a fact nobody reads. */}
        <div className="tile-grid grid-cols-2 lg:grid-cols-4">
          {cells.map((cell, i) => (
            <div key={cell.label} className="flex min-h-[84px] flex-col justify-center px-3.5 py-4 sm:min-h-[104px] sm:px-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50">
                  <CounterGlyph name={cell.glyph} delay={i * 80} className="shrink-0 text-brand-700" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  {cell.label}
                </span>
              </div>
              <p className="mt-1.5 text-[13px] font-medium leading-[1.4] text-ink-900 sm:text-[13.5px]">
                {cell.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
