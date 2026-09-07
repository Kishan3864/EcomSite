import type { Metadata } from "next";
import { ContactStep } from "./contact-step";
import { getOffers } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Checkout — contact details",
  robots: { index: false, follow: false },
};

export default async function CheckoutContactPage() {
  const offers = await getOffers();
  return <ContactStep offers={offers} />;
}
