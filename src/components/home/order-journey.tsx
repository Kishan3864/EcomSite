import { BUSINESS } from "@/config/business";
import { JourneyLine } from "@/components/illustration/journey-line";
import { paymentSentence, type PublicPayments } from "@/lib/payment-copy";

/**
 * What happens after you pay.
 *
 * The band that answers the question an unknown shop never answers: money
 * leaves the customer's hands, and then what? Four steps, drawn as one line,
 * each labelled with a real number from the business config rather than a
 * comfortable one — including the slow parts. A shop that admits it takes two
 * working days to reach the courier is more believable than one that claims
 * same-day dispatch it cannot manage, and the numbers here are the same ones
 * the shipping and refund policies are bound by, so they cannot drift apart.
 *
 * It runs no query. It cannot be empty, it cannot go stale, and it looks the
 * same on the day the shop holds three products as on the day it holds three
 * hundred — which is exactly what a band this early in a shop's life needs to
 * be. Nothing in it is derived from the clock.
 */

export function OrderJourney({ payments }: { payments: PublicPayments }) {
  const { ops } = BUSINESS;
  const pay = paymentSentence(payments);

  const steps = [
    {
      label: "You place the order",
      // Lower-cased so it reads as the end of the label's sentence rather than
      // as a second heading.
      value: pay ? `Paid by ${pay.toLowerCase()}` : "Paid online or on delivery",
    },
    {
      label: "We hand it to the courier",
      value: `Within ${ops.dispatchDays} working days`,
    },
    {
      label: `${ops.courierPartners[0]} carries it`,
      value: `${ops.deliveryDaysMin}–${ops.deliveryDaysMax} working days, tracked`,
    },
    {
      label: `You have ${ops.returnWindowDays} days`,
      value: `Refund started ${ops.refundInitiationDays} working days after we check it`,
    },
  ];

  return (
    <section className="container-page py-12 sm:py-24">
      <div className="max-w-[46ch]">
        <span className="eyebrow">Before you order</span>
        <h2 className="mt-3 font-display text-[22px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-4 sm:text-[32px]">
          What happens after you pay
        </h2>
        <p className="mt-2.5 text-[13px] leading-[1.55] text-ink-500 sm:text-[14px]">
          The whole route, including the slow parts. These are the same numbers our shipping and
          refund policies are held to.
        </p>
      </div>

      <div className="card mt-8 px-4 py-6 sm:mt-12 sm:px-8 sm:py-10">
        <JourneyLine steps={steps} />
      </div>
    </section>
  );
}
