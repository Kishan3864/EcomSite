import type { Metadata } from "next";
import { tokenFromParams } from "@/lib/order-token";
import { reviewLinkState } from "@/services/order-reviews";
import { ReviewLinkClient } from "./review-link-client";

export const metadata: Metadata = {
  title: "Review your order",
  robots: { index: false, follow: false },
};

/**
 * Where a "Rate this product" button in a review email lands.
 *
 * The order is already verified by the signed token in the link, so there is
 * nothing to look up and nobody has to sign in: the form for that product is
 * the first thing on the page. What the token allows is decided in
 * src/services/order-reviews.ts, and re-checked when the review is posted.
 */
export default async function ReviewLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string; productId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orderId, productId } = await params;
  const token = tokenFromParams(await searchParams);
  const state = await reviewLinkState(orderId, productId, token);

  return (
    <div className="container-page py-6 sm:py-12">
      <ReviewLinkClient state={state} token={token ?? ""} />
    </div>
  );
}
