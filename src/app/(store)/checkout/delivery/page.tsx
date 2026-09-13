import type { Metadata } from "next";
import { DeliveryStep } from "./delivery-step";

export const metadata: Metadata = {
  title: "Checkout — delivery",
  robots: { index: false, follow: false },
};

export default async function CheckoutDeliveryPage() {
  return <DeliveryStep />;
}
