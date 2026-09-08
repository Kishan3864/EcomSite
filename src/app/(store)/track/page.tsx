import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/primitives";
import { TrackLookup } from "./track-client";
import { getCustomerOrders } from "@/services/orders";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Enter your Mayura order number to see exactly where your parcel is and when it will arrive.",
  alternates: { canonical: "/track" },
};

export default async function TrackPage() {
  // Signed in, this is a shortcut list; signed out it is simply empty.
  const orders = await getCustomerOrders();

  return (
    <div className="container-page py-5 sm:py-7">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Track order", href: "/track" },
        ]}
        className="mb-5"
      />

      <header className="mb-8 text-center">
        <h1 className="font-display text-[28px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[36px]">
          Track your order
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-[14px] leading-relaxed text-ink-600">
          Enter your order number and we will show you exactly where the parcel is right now.
        </p>
      </header>

      <TrackLookup orders={orders} />
    </div>
  );
}
