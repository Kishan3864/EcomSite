import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/primitives";
import { TrackLookup } from "./track-client";
import { getCustomerOrders } from "@/services/orders";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Enter your WeekendCart order number to see exactly where your parcel is and when it will arrive.",
  alternates: { canonical: "/track" },
};

export default async function TrackPage() {
  // Signed in, this is a shortcut list; signed out it is simply empty.
  const orders = await getCustomerOrders();

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="aurora pointer-events-none absolute inset-x-0 top-0 h-[340px] opacity-80 sm:h-[400px]" />
      <div aria-hidden className="grid-lines pointer-events-none absolute inset-x-0 top-0 h-[340px] sm:h-[400px]" />

      <div className="container-page relative pb-12 pt-5 sm:pb-16 sm:pt-7">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Track order", href: "/track" },
          ]}
          className="mb-6 sm:mb-10"
        />

        <header className="mx-auto mb-6 max-w-xl text-center sm:mb-8">
          <h1 className="t-h1">Track your order</h1>
          <p className="t-body mx-auto mt-2 max-w-lg">
            Enter your order number and we will show you exactly where the parcel is right now.
          </p>
        </header>

        <TrackLookup orders={orders} />
      </div>
    </div>
  );
}
