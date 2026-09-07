import type { Metadata } from "next";
import { OrdersClient } from "./orders-client";

export const metadata: Metadata = {
  title: "My orders",
  description: "Every order you have placed on Mayura, with tracking and invoices.",
  robots: { index: false, follow: true },
};

export default function OrdersPage() {
  return <OrdersClient />;
}
