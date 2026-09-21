import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { WishlistClient } from "./wishlist-client";
import { ProductRail } from "@/components/product/product-rail";
import { toCardModels } from "@/lib/card";
import { getRecommended } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Everything you have saved on WeekendCart, ready to move into your bag.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/wishlist" },
};

export default async function WishlistPage() {
  const recommended = await getRecommended(10);

  return (
    <>
      <div className="container-page pb-10 sm:pb-14">
        <PageHeader
          crumbs={[
            { name: "Home", href: "/" },
            { name: "Wishlist", href: "/wishlist" },
          ]}
          title="Your wishlist"
          description="Saved on this device. We will tell you if anything here drops in price."
        />

        <WishlistClient />
      </div>

      <ProductRail
        eyebrow="While you are here"
        title="Highly rated right now"
        href="/products?sort=rating"
        products={toCardModels(recommended)}
      />
    </>
  );
}
