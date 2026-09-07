import type { Metadata } from "next";
import { ReturnsClient } from "./returns-client";
import { returnRequests } from "@/data/marketing";

export const metadata: Metadata = {
  title: "Returns and refunds",
  description: "Raise a return, track a refund and read the Mayura return policy.",
  robots: { index: false, follow: true },
};

export default function ReturnsPage() {
  return <ReturnsClient seeded={returnRequests} />;
}
