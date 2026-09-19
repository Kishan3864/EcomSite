import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { MAINTENANCE_KEY, normaliseMaintenance } from "@/lib/maintenance";
import { FormSection, VisibilityPill } from "@/components/admin/ui";
import { MaintenanceForm } from "@/components/admin/maintenance-switch";

export const metadata = { title: "Maintenance mode" };

/**
 * Maintenance mode as an ordinary page with an ordinary form.
 *
 * The header button is the quick way. This is the way that cannot fail to
 * open: no popover, no portal, nothing but a form on a page — so the switch
 * can always be reached, and always switched back off.
 */
export default async function MaintenanceSettingsPage() {
  const session = await requireAdmin();
  const state = normaliseMaintenance(
    (await db.storeSetting.findUnique({ where: { key: MAINTENANCE_KEY }, select: { value: true } }))?.value,
  );
  const backByInput = state.backBy ? new Date(Date.parse(state.backBy) + 5.5 * 3_600_000).toISOString().slice(0, 16) : "";

  return (
    <div className="max-w-3xl">
      <FormSection
        title="Maintenance mode"
        description="On, every storefront page shows a holding page and answers HTTP 503 with Retry-After, so search engines come back later instead of indexing it. The admin and its sign-in stay open, payment callbacks keep landing, and you still see the real shop while signed in here."
      >
        <p className="mb-4 flex items-center gap-2 text-[13px] text-ink-700">
          The storefront is
          <VisibilityPill own={state.on ? "hidden" : "active"} label={state.on ? "In maintenance" : "Open"} />
        </p>
        <MaintenanceForm
          idPrefix="mnt-page"
          view={{ on: state.on, message: state.message, backByInput, canEdit: hasRole(session, "MANAGER") }}
        />
      </FormSection>
    </div>
  );
}
