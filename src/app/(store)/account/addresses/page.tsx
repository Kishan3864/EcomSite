import type { Metadata } from "next";
import { AddressesClient } from "./addresses-client";
import { getCustomerAddresses } from "@/services/orders";

export const metadata: Metadata = {
  title: "Saved addresses",
  robots: { index: false, follow: true },
};

export default async function AddressesPage() {
  const addresses = await getCustomerAddresses();
  return <AddressesClient addresses={addresses} />;
}
