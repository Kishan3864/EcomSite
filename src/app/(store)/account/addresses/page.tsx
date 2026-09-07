import type { Metadata } from "next";
import { AddressesClient } from "./addresses-client";

export const metadata: Metadata = {
  title: "Saved addresses",
  robots: { index: false, follow: true },
};

export default function AddressesPage() {
  return <AddressesClient />;
}
