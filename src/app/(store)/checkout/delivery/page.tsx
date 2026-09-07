import type { Metadata } from "next";
import { DeliveryStep } from "./delivery-step";
import { getOffers } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Checkout — delivery",
  robots: { index: false, follow: false },
};

export default async function CheckoutDeliveryPage() {
  const offers = await getOffers();
  return <DeliveryStep offers={offers} />;
}
