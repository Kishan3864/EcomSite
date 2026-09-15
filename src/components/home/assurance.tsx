import Link from "next/link";
import { BUSINESS } from "@/config/business";
import type { PublicPayments } from "@/lib/payment-copy";

/**
 * Why it is safe to hand this shop money.
 *
 * The question a first-time visitor to an unknown Indian storefront is actually
 * asking, answered in the only way that works: with things that are checkable.
 *
 * Deliberately **not** here, and this is the whole design of the band: no
 * padlock icon, no "100% SECURE" ribbon, no SSL badge, no card-network logo
 * wall, no invented customer count or star average. Every one of those is
 * free to print and every fraudulent storefront prints them, which is exactly
 * why they no longer signal anything — a shopper who has been burned reads a
 * trust seal as a warning. What a fraudulent shop cannot easily print is a
 * street address, a phone number answered in stated hours, a named courier, a
 * refund window bound to a published policy, and a plain account of which
 * company holds the card details. So that is what this says.
 *
 * Every number is read from the business config, the same source the shipping,
 * refund and payment policy pages are generated from, so this band cannot drift
 * away from the terms the shop is actually held to. The payment sentence reads
 * the live switches, so it can never name a method the checkout will not offer.
 */
export function Assurance({ payments }: { payments: PublicPayments }) {
  const { ops } = BUSINESS;

  const points: { title: string; body: React.ReactNode }[] = [
    {
      title: "Your card never touches our servers",
      body: payments.gateway ? (
        <>
          Card numbers, CVV and UPI PINs are entered on {ops.paymentAggregator}&apos;s own
          checkout, not here. We are never sent them and we could not store them if we wanted
          to. UPI PINs are entered only inside your own payment app.
        </>
      ) : (
        <>
          UPI is paid straight into the shop&apos;s bank account, and your UPI PIN is entered only
          inside your own payment app. It never reaches us.
        </>
      ),
    },
    {
      title: "A first-party store, not a marketplace",
      body: (
        <>
          We buy the stock, we hold it in {BUSINESS.address.city}, and we invoice it. There is no
          third-party seller between you and us, so there is nobody to be passed to when
          something goes wrong.
        </>
      ),
    },
    {
      title: `${ops.returnWindowDays} days to change your mind`,
      body: (
        <>
          Refunds go back to the way you paid — not to a wallet or store credit. We start it{" "}
          {ops.refundInitiationDays} working days after the item reaches us and passes a check;
          banks take a further {ops.refundSettlementDaysMin}&ndash;{ops.refundSettlementDaysMax}.{" "}
          <Link href="/legal/refunds" className="underline underline-offset-2 hover:text-brand-700">
            The policy in full
          </Link>
          .
        </>
      ),
    },
    {
      title: "Someone here picks up the phone",
      body: (
        <>
          <a
            href={`tel:+${BUSINESS.supportPhoneDigits}`}
            className="font-medium text-ink-900 underline underline-offset-2 hover:text-brand-700"
          >
            {BUSINESS.supportPhone}
          </a>
          , {ops.courierPartners[0]} carries every order with tracking end to end, and our
          registered address is printed on the invoice and in the footer of this page.
        </>
      ),
    },
  ];

  return (
    <section className="bg-canvas">
      <div className="container-page py-12 sm:py-20">
        <div className="max-w-[52ch]">
          <span className="eyebrow">Before you hand over money</span>
          <h2 className="mt-3 font-display text-[24px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:mt-4 sm:text-[34px]">
            Why this shop is safe to buy from
          </h2>
          <p className="mt-3 text-[13.5px] leading-[1.6] text-ink-600 sm:text-[14.5px]">
            No badges and no seals — anyone can print those. Four things you can check instead.
          </p>
        </div>

        {/* Two across on a phone would put four words on a line. One column
            until 768px, then two, then four. */}
        <ul className="mt-8 grid gap-px bg-hairline sm:mt-12 sm:grid-cols-2 xl:grid-cols-4">
          {points.map((point, i) => (
            <li key={point.title} className="bg-surface p-5 sm:p-6">
              <span
                aria-hidden
                className="block font-display text-[15px] leading-none text-ink-400"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3.5 text-[14.5px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink-950">
                {point.title}
              </h3>
              <p className="mt-2.5 text-[13px] leading-[1.6] text-ink-600">{point.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
