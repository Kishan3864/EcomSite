"use server";

import { redirect } from "next/navigation";
import { logActivity, signInAdmin, signOutAdmin, getAdminSession } from "@/lib/auth/admin";
import type { FormState } from "./form-state";
import { clientIp, rateLimit, TOO_MANY } from "@/lib/rate-limit";

export async function loginAdminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  // The admin login is the most valuable door on the site, so it gets the
  // tightest limit: a handful of tries, then a wait.
  const ip = await clientIp();
  if (!rateLimit("admin-login:ip", ip, 6, 15 * 60_000) || !rateLimit("admin-login:email", email.toLowerCase(), 6, 15 * 60_000))
    return { error: TOO_MANY };

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
