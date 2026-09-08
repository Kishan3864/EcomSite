import { requireAdmin } from "@/lib/auth/admin";
import { getSettings } from "@/services/settings";
import { ShippingForm } from "../settings-forms";

export const metadata = { title: "Shipping settings" };

export default async function ShippingSettingsPage() {
  await requireAdmin("OWNER");
  const settings = await getSettings();
  return <ShippingForm value={settings.shipping} />;
}
