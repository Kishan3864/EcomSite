import type { Metadata } from "next";
import { AddressStep } from "./address-step";

export const metadata: Metadata = {
  title: "Checkout — address",
  robots: { index: false, follow: false },
};

export default async function CheckoutAddressPage() {
  return <AddressStep />;
}
