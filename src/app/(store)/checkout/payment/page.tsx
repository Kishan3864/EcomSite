import type { Metadata } from "next";
import { PaymentStep } from "./payment-step";

export const metadata: Metadata = {
  title: "Checkout — payment",
  robots: { index: false, follow: false },
};

export default async function CheckoutPaymentPage() {
  return <PaymentStep />;
}
