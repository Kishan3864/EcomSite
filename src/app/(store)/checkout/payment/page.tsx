import type { Metadata } from "next";
import { PaymentStep } from "./payment-step";
import { getOffers } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Checkout — payment",
  robots: { index: false, follow: false },
};

export default async function CheckoutPaymentPage() {
  const offers = await getOffers();
  return <PaymentStep offers={offers} />;
}
