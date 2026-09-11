import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { getCustomerAddresses, getCustomerProfile } from "@/services/orders";
import { formatIndianMobile } from "@/lib/auth/phone-otp";
import { smsConfigured } from "@/lib/sms";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your details, default delivery address and payment preferences.",
  robots: { index: false, follow: true },
};

export default async function SettingsPage() {
  const [profile, addresses] = await Promise.all([getCustomerProfile(), getCustomerAddresses()]);
  // The account layout already turns guests away; this only narrows the type.
  if (!profile) redirect("/login?next=/account/settings");

  const signInPhone = smsConfigured()
    ? profile.verifiedPhone
      ? formatIndianMobile(profile.verifiedPhone)
      : null
    : undefined;

  return <SettingsClient profile={profile} addresses={addresses} signInPhone={signInPhone} />;
}
