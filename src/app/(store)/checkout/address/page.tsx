import type { Metadata } from "next";
import { AddressStep } from "./address-step";
import { getOffers } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Checkout — address",
  robots: { index: false, follow: false },
};

export default async function CheckoutAddressPage() {
  const offers = await getOffers();
  return <AddressStep offers={offers} />;
}
