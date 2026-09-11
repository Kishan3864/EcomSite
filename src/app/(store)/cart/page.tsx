import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/primitives";
import { CartClient } from "./cart-client";
import { getOffers } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Your bag",
  description: "Review the items in your WeekendCart bag, apply a coupon and check out.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cart" },
};

export default async function CartPage() {
  const offers = await getOffers();

  return (
    <div className="container-page py-4 sm:py-7">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Your bag", href: "/cart" },
        ]}
        className="mb-3 sm:mb-5"
      />

      <header className="mb-4 sm:mb-7">
        <h1 className="font-display text-[24px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[36px]">
          Your bag
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-600 sm:mt-2 sm:text-[14px]">
          Items stay here on this device until you check out. Nothing is reserved.
        </p>
      </header>

      <CartClient offers={offers} />
    </div>
  );
}
