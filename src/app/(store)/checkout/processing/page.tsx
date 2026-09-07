import type { Metadata } from "next";
import { ProcessingClient } from "./processing-client";

export const metadata: Metadata = {
  title: "Processing your payment",
  robots: { index: false, follow: false },
};

export default function ProcessingPage() {
  return <ProcessingClient />;
}
