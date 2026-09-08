import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { SettingsTabs } from "./tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  // Only owners change how the store runs; everyone else gets their profile tab.
  const session = await requireAdmin();

  return (
    <>
      <PageHeader
        title="Settings"
        description="How the store presents itself, charges for delivery, takes payment and manages the team."
      />
      <SettingsTabs isOwner={session.role === "OWNER"} />
      <div className="mt-6">{children}</div>
    </>
  );
}
