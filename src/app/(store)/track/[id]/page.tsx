import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/primitives";
import { TrackDetail } from "../track-client";
import { getOrderForViewer } from "@/services/orders";
import { reviewPanelFor } from "@/services/order-reviews";
import { tokenFromParams } from "@/lib/order-token";

export const metadata: Metadata = {
  title: "Order tracking",
  robots: { index: false, follow: true },
};

export default async function TrackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  // The signed token from the order email, for a reader with no session.
  const order = await getOrderForViewer(id, tokenFromParams(await searchParams));
  // Only once the viewer has been let in: the panel carries the review token.
  const review = order ? await reviewPanelFor(order.id) : null;

  return (
    <div className="container-page py-4 sm:py-7">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Track order", href: "/track" },
          { name: "Shipment", href: `/track/${id}` },
        ]}
        className="mb-3 sm:mb-5"
      />
      <TrackDetail order={order} review={review} />
    </div>
  );
}
