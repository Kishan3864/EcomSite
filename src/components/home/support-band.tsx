import Link from "next/link";
import { ArrowRight, MessageSquare, PackageSearch, RotateCcw } from "lucide-react";
import { BUSINESS } from "@/config/business";

/**
 * What to do when something goes wrong — before it does.
 *
 * The last question a first-time buyer asks is never about the product. It is
 * "and if this goes wrong, who do I talk to?", and on most small storefronts
 * the answer is buried in a footer link nobody clicks until they are already
 * angry. Putting the three real routes in front of them — track it, return it,
 * ask a person — is a conversion argument, not a support feature.
 *
 * Every destination already exists; nothing here is new functionality. The
 * hours and the return window come from the business config, so they stay in
 * step with the shipping and refund pages.
 */

const CARD = "card card-interactive group flex h-full flex-col p-4 sm:p-5";

export function SupportBand() {
  const routes = [
    {
      href: "/track",
      icon: PackageSearch,
      title: "Track your order",
      body: `Your order number and ${BUSINESS.ops.courierPartners[0]}'s tracking, in one place. No account needed.`,
      cta: "Track an order",
    },
    {
      href: "/account/returns",
      icon: RotateCcw,
      title: `Return within ${BUSINESS.ops.returnWindowDays} days`,
      body: "Start it yourself from your orders. The refund goes back to the way you paid.",
      cta: "How returns work",
    },
    {
      href: "/contact",
      icon: MessageSquare,
      title: "Talk to a person",
      body: `${BUSINESS.supportHours}. The same people who pack the orders answer the phone.`,
      cta: "Contact us",
    },
  ];

  return (
    <section className="container-page section-tight">
      <div className="card-muted grid gap-6 !rounded-3xl p-5 sm:p-8 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:items-center lg:gap-10">
        <div>
          <span className="eyebrow">Help &amp; support</span>
          <h2 className="t-h2 mt-3">If anything goes wrong</h2>
          <p className="t-body mt-2">Three ways to sort it out, and none of them is a form that disappears.</p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-3">
          {routes.map((route) => (
            <li key={route.href}>
              <Link href={route.href} className={CARD}>
                <span className="icon-tile">
                  <route.icon size={20} aria-hidden />
                </span>
                <h3 className="t-h3 mt-3">{route.title}</h3>
                <p className="t-small mt-1 flex-1">{route.body}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-700">
                  {route.cta}
                  <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
