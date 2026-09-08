import type { Metadata } from "next";
import { OrdersClient } from "./orders-client";
import { getCustomerOrders } from "@/services/orders";

export const metadata: Metadata = {
  title: "My orders",
  description: "Every order you have placed on Mayura, with tracking and invoices.",
  robots: { index: false, follow: true },
};

export default async function OrdersPage() {
  const orders = await getCustomerOrders();
  return <OrdersClient orders={orders} />;
}
