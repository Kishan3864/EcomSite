import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/primitives";
import { WishlistClient } from "./wishlist-client";
import { ProductRail } from "@/components/product/product-rail";
import { toCardModels } from "@/lib/card";
import { getRecommended } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Everything you have saved on Mayura, ready to move into your bag.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/wishlist" },
};

export default async function WishlistPage() {
  const recommended = await getRecommended(10);

  return (
    <>
      <div className="container-page py-5 sm:py-7">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Wishlist", href: "/wishlist" },
          ]}
          className="mb-5"
        />

        <header className="mb-7">
          <h1 className="font-display text-[28px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[36px]">
            Your wishlist
          </h1>
          <p className="mt-2 text-[14px] text-ink-600">
            Saved on this device. We will tell you if anything here drops in price.
          </p>
        </header>

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
