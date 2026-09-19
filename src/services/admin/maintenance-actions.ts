"use server";

import { revalidatePath } from "next/cache";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import { MAINTENANCE_DEFAULT, normaliseMaintenance, saveMaintenance } from "@/lib/maintenance";
import type { FormState } from "./form-state";
import { str } from "./shared";

/**
 * Flip the maintenance switch, or change what the holding page says.
 *
 * MANAGER and above: it takes the whole shop away from every shopper, which is
 * the weight of cancelling an order, not of editing a banner. Audited either
 * way, with who and when, because "why was the site down on Tuesday" is a
 * question somebody will ask.
 *
 * The "back by" time arrives as a datetime-local string, which carries no zone.
 * The admin is run from India, so it is read as IST.
 */
export async function setMaintenance(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");

  const on = str(formData, "on") === "true";
  const message = str(formData, "message").trim();
  if (message.length > 600) return { error: "Keep the message under 600 characters.", field: "message" };

  const backByRaw = str(formData, "backBy").trim();
  let backBy: string | null = null;
  if (backByRaw) {
    const parsed = Date.parse(`${backByRaw}${backByRaw.length === 16 ? ":00" : ""}+05:30`);
    if (Number.isNaN(parsed)) return { error: "That is not a date and time.", field: "backBy" };
    if (on && parsed < Date.now()) return { error: "“Back by” is already in the past.", field: "backBy" };
    backBy = new Date(parsed).toISOString();
  }

  const state = normaliseMaintenance({ on, message: message || MAINTENANCE_DEFAULT.message, backBy });
  await saveMaintenance(state);

  await logActivity(session, {
    action: on ? "store.maintenance.on" : "store.maintenance.off",
    entity: "StoreSetting",
    entityId: "maintenance",
    summary: on
      ? `Switched maintenance mode ON — the storefront serves a holding page${backBy ? `, back by ${backBy}` : ""}`
      : "Switched maintenance mode OFF — the storefront is open",
    metadata: { on, backBy, message: state.message },
  });

  // The holding page comes from the proxy, which already believes the new
  // state. This is for the admin header, and for any page cached while it was
  // open or shut.
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: on
      ? "Maintenance mode is ON. Shoppers see the holding page; you still see the shop while signed in here."
      : "Maintenance mode is OFF. The storefront is open.",
  };
}
