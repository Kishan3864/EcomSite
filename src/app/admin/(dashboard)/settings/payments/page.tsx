import { requireAdmin } from "@/lib/auth/admin";
import { getSettings } from "@/services/settings";
import { PaymentsForm } from "../settings-forms";

export const metadata = { title: "Payment settings" };

export default async function PaymentSettingsPage() {
  await requireAdmin("OWNER");
  const settings = await getSettings();
  return <PaymentsForm value={settings.payments} />;
}
