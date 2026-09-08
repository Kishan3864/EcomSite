import type { Metadata } from "next";
import { getOrderForViewer } from "@/services/orders";
import { OrderClient } from "./order-client";

export const metadata: Metadata = {
  title: "Order confirmed",
  description: "Your Mayura order confirmation.",
  robots: { index: false, follow: false },
};

/**
 * Confirmations are read from the database, and only for someone entitled to
 * see them: the customer who placed the order, or the browser that placed it
 * as a guest. Anyone else gets the "we could not find that order" screen.
 */
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderForViewer(id);
  return <OrderClient order={order} />;
}
