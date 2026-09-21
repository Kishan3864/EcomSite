import { BUSINESS } from "@/config/business";
import { CreditCard, PackageCheck, RotateCcw, Truck } from "lucide-react";
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

  const icons = [CreditCard, PackageCheck, Truck, RotateCcw];

  return (
    <section className="container-page section">
      <div className="max-w-[52ch]">
        <span className="eyebrow">Before you order</span>
        <h2 className="t-h2 mt-3">What happens after you pay</h2>
        <p className="t-body mt-2">
          The whole route, including the slow parts. These are the same numbers our shipping and
          refund policies are held to.
        </p>
      </div>

      <ol className="relative mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <span
          aria-hidden
          className="absolute left-[12%] right-[12%] top-[38px] hidden h-px bg-gradient-to-r from-brand-200 via-iris-300 to-gold-300 lg:block"
        />
        {steps.map((step, i) => {
          const Icon = icons[i];
          return (
            <li key={step.label} className="card relative p-5">
              <div className="flex items-center justify-between">
                <span className="icon-tile relative bg-surface ring-1 ring-inset ring-brand-100">
                  <Icon size={20} aria-hidden />
                </span>
                <span className="t-label !text-ink-400">Step {i + 1}</span>
              </div>
              <h3 className="t-h3 mt-4">{step.label}</h3>
              <p className="t-small mt-1">{step.value}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
