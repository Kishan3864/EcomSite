import type { Metadata } from "next";
import { AccountOverview } from "./account-overview";

export const metadata: Metadata = {
  title: "My account",
  description: "Your Mayura account — orders, returns, addresses and saved items.",
  robots: { index: false, follow: true },
};

export default function AccountPage() {
  return <AccountOverview />;
}
