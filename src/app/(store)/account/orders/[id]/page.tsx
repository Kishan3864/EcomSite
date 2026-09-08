import type { Metadata } from "next";
import { OrderDetailClient } from "./order-detail-client";
import { getOrderForViewer } from "@/services/orders";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderForViewer(id);
  return <OrderDetailClient order={order} />;
}
