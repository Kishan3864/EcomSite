import type { Metadata } from "next";
import { OrderClient } from "./order-client";

export const metadata: Metadata = {
  title: "Order confirmed",
  description: "Your Mayura order confirmation.",
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderClient id={id} />;
}
