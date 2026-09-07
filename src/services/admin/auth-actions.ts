"use server";

import { redirect } from "next/navigation";
import { logActivity, signInAdmin, signOutAdmin, getAdminSession } from "@/lib/auth/admin";
import type { FormState } from "./form-state";

export async function loginAdminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const result = await signInAdmin(email, password);
  if (!result.ok) return { error: result.reason };

  await logActivity(result.session, {
    action: "auth.login",
    entity: "AdminUser",
    entityId: result.session.id,
    summary: `${result.session.name} signed in`,
  });

  const safe = next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
  redirect(safe);
}

export async function logoutAdminAction() {
  const session = await getAdminSession();
  if (session) {
    await logActivity(session, {
      action: "auth.logout",
      entity: "AdminUser",
      entityId: session.id,
      summary: `${session.name} signed out`,
    });
  }
  await signOutAdmin();
  redirect("/admin/login");
}
