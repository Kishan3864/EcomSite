import type { Metadata } from "next";
import { ReviewStep } from "./review-step";

export const metadata: Metadata = {
  title: "Checkout — review",
  robots: { index: false, follow: false },
};

export default async function CheckoutReviewPage() {
  return <ReviewStep />;
}
