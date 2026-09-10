import type { Metadata } from "next";
import { ReturnsClient } from "./returns-client";
import { getCustomerOrders, getCustomerReturns } from "@/services/orders";

export const metadata: Metadata = {
  title: "Returns and refunds",
  description: "Raise a return, track a refund and read the WeekendCart return policy.",
  robots: { index: false, follow: true },
};

export default async function ReturnsPage() {
  const [requests, orders] = await Promise.all([getCustomerReturns(), getCustomerOrders()]);
  return <ReturnsClient requests={requests} orders={orders} />;
}
