import type { Metadata } from "next";
import { AccountOverview } from "./account-overview";
import {
  getCustomerAddresses,
  getCustomerOrders,
  getCustomerProfile,
  getCustomerReturns,
} from "@/services/orders";

export const metadata: Metadata = {
  title: "My account",
  description: "Your Mayura account — orders, returns, addresses and saved items.",
  robots: { index: false, follow: true },
};

export default async function AccountPage() {
  const [profile, orders, returns, addresses] = await Promise.all([
    getCustomerProfile(),
    getCustomerOrders(),
    getCustomerReturns(),
    getCustomerAddresses(),
  ]);

  return (
    <AccountOverview
      name={profile?.name ?? "there"}
      orders={orders}
      returns={returns}
      addresses={addresses}
    />
  );
}
