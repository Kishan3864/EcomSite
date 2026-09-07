import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/primitives";
import { TrackDetail } from "../track-client";

export const metadata: Metadata = {
  title: "Order tracking",
  robots: { index: false, follow: true },
};

export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container-page py-5 sm:py-7">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Track order", href: "/track" },
          { name: "Shipment", href: `/track/${id}` },
        ]}
        className="mb-5"
      />
      <TrackDetail id={id} />
    </div>
  );
}
