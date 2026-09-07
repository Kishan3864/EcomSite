import type { Metadata } from "next";
import { ReviewStep } from "./review-step";
import { getOffers } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Checkout — review",
  robots: { index: false, follow: false },
};

export default async function CheckoutReviewPage() {
  const offers = await getOffers();
  return <ReviewStep offers={offers} />;
}
