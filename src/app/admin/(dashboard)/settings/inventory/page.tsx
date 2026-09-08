import { requireAdmin } from "@/lib/auth/admin";
import { getSettings } from "@/services/settings";
import { InventoryForm } from "../settings-forms";

export const metadata = { title: "Inventory settings" };

export default async function InventorySettingsPage() {
  await requireAdmin("OWNER");
  const settings = await getSettings();
  return <InventoryForm value={settings.inventory} />;
}
