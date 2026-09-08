import { requireAdmin } from "@/lib/auth/admin";
import { getSettings } from "@/services/settings";
import { TaxForm } from "../settings-forms";

export const metadata = { title: "Tax settings" };

export default async function TaxSettingsPage() {
  await requireAdmin("OWNER");
  const settings = await getSettings();
  return <TaxForm value={settings.tax} />;
}
