import type { Metadata } from "next";
import { ContactStep } from "./contact-step";

export const metadata: Metadata = {
  title: "Checkout — contact details",
  robots: { index: false, follow: false },
};

export default async function CheckoutContactPage() {
  return <ContactStep />;
}
