import type { Metadata } from "next";
import { OrderDetailClient } from "./order-detail-client";
import { getOrderForViewer } from "@/services/orders";
import { reviewPanelFor } from "@/services/order-reviews";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderForViewer(id);
  // Only once the viewer has been let in: the panel carries the review token.
  const review = order ? await reviewPanelFor(order.id) : null;
  return <OrderDetailClient order={order} review={review} />;
}
