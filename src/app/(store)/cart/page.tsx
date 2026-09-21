import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { CartClient } from "./cart-client";

export const metadata: Metadata = {
  title: "Your bag",
  description: "Review the items in your WeekendCart bag and check out.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cart" },
};

export default async function CartPage() {
  return (
    <div className="container-page pb-10 sm:pb-14">
      <PageHeader
        crumbs={[
          { name: "Home", href: "/" },
          { name: "Your bag", href: "/cart" },
        ]}
        title="Your bag"
        description="Items stay here on this device until you check out. Nothing is reserved."
      />

      <CartClient />
    </div>
  );
}
