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

const CARD =
  "group flex flex-col rounded-xl border border-hairline bg-surface p-4 transition-[box-shadow,border-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md sm:p-5";

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
    <section className="border-t border-hairline bg-canvas">
      <div className="container-page py-10 sm:py-14">
        <div className="mb-5 sm:mb-7">
          <h2 className="font-display text-[20px] leading-[1.15] text-ink-950 sm:text-[24px]">
            If anything goes wrong
          </h2>
          <p className="mt-1.5 text-[13px] text-ink-500 sm:text-[14px]">
            Three ways to sort it out, and none of them is a form that disappears.
          </p>
        </div>

        <ul className="grid gap-2.5 sm:grid-cols-3 sm:gap-4">
          {routes.map((route) => (
            <li key={route.href}>
              <Link href={route.href} className={CARD}>
                <route.icon size={19} className="text-brand-700" aria-hidden />
                <h3 className="mt-3 text-[14px] font-semibold tracking-[-0.01em] text-ink-950">
                  {route.title}
                </h3>
                <p className="mt-1.5 flex-1 text-[12.5px] leading-[1.55] text-ink-600">
                  {route.body}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-700">
                  {route.cta}
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
