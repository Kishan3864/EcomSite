import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getSettings } from "@/services/settings";
import { StoreForm } from "./settings-forms";

export const metadata = { title: "Store settings" };

export default async function StoreSettingsPage() {
  const session = await requireAdmin();
  // Managers and staff still have a Settings link; theirs opens on their own
  // account rather than bouncing them off the section entirely.
  if (session.role !== "OWNER") redirect("/admin/settings/profile");

  const settings = await getSettings();
  return <StoreForm value={settings.store} />;
}
