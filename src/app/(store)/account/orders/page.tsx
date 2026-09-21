import type { Metadata } from "next";
import { OrdersClient } from "./orders-client";
import { getCustomerOrders } from "@/services/orders";
import { unreviewedCounts } from "@/services/order-reviews";

export const metadata: Metadata = {
  title: "My orders",
  description: "Every order you have placed on WeekendCart, with tracking and invoices.",
  robots: { index: false, follow: true },
};

export default async function OrdersPage() {
  const orders = await getCustomerOrders();
  // Delivered orders with something still to rate, for the "Rate your purchase" nudge.
  const toRate = await unreviewedCounts(orders.filter((o) => o.status === "delivered").map((o) => o.id));
  return <OrdersClient orders={orders} toRate={toRate} />;
}
