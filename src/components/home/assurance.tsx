import Link from "next/link";
import { Building2, PhoneCall, RotateCcw, ShieldCheck, type LucideIcon } from "lucide-react";
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

  const points: { title: string; icon: LucideIcon; body: React.ReactNode }[] = [
    {
      title: "Your card never touches our servers",
      icon: ShieldCheck,
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
      icon: Building2,
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
      icon: RotateCcw,
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
      icon: PhoneCall,
      body: (
        <>
          <a
            href={`tel:${BUSINESS.supportPhoneTel}`}
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
    <section className="container-page section">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-12">
        <div className="lg:sticky-under-header lg:self-start">
          <span className="eyebrow">Before you hand over money</span>
          <h2 className="t-h2 mt-3">Why this shop is safe to buy from</h2>
          <p className="t-body mt-2">
            No badges and no seals — anyone can print those. Four things you can check instead.
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {points.map((point) => (
            <li key={point.title} className="card p-5 sm:p-6">
              <span className="icon-tile">
                <point.icon size={20} aria-hidden />
              </span>
              <h3 className="t-h3 mt-4">{point.title}</h3>
              <p className="t-body mt-1.5 !text-[13px]">{point.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
