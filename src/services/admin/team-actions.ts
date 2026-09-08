"use server";

import { cookies } from "next/headers";
import type { AdminRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getAdminSession, logActivity, requireAdmin } from "@/lib/auth/admin";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { ADMIN_COOKIE, adminToken, cookieOptions } from "@/lib/auth/session";
import type { FormState } from "./form-state";
import { revalidateAdmin, str } from "./shared";

/**
 * Team management. Two rules keep the account from being locked out: the last
 * active owner can never be demoted or switched off, and nobody can deactivate
 * themselves.
 */

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const ROLES: AdminRole[] = ["OWNER", "MANAGER", "STAFF"];

function readRole(formData: FormData): AdminRole | null {
  const raw = str(formData, "role");
  return (ROLES as string[]).includes(raw) ? (raw as AdminRole) : null;
}

async function otherActiveOwners(exceptId: string) {
  return db.adminUser.count({ where: { role: "OWNER", isActive: true, id: { not: exceptId } } });
}

export async function createTeamMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("OWNER");

  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const role = readRole(formData);
  const password = str(formData, "password");

  if (name.length < 2) return { error: "Enter their full name.", field: "name" };
  if (!EMAIL.test(email)) return { error: "Enter a valid email address.", field: "email" };
  if (!role) return { error: "Pick a role.", field: "role" };
  const problem = passwordProblem(password);
  if (problem) return { error: problem, field: "password" };

  const clash = await db.adminUser.findUnique({ where: { email }, select: { id: true } });
  if (clash) return { error: "Someone already uses that email.", field: "email" };

  const user = await db.adminUser.create({
    data: { name, email, role, passwordHash: await hashPassword(password) },
  });

  await logActivity(session, {
    action: "team.create",
    entity: "AdminUser",
    entityId: user.id,
    summary: `Added ${name} as ${role.toLowerCase()}`,
  });
  revalidateAdmin("settings");
  return { ok: true, message: `${name} can now sign in.` };
}

export async function updateTeamMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("OWNER");

  const id = str(formData, "id");
  const name = str(formData, "name");
  const role = readRole(formData);
  const isActive = str(formData, "isActive") === "on";

  if (!id) return { error: "That team member no longer exists." };
  if (name.length < 2) return { error: "Enter their full name.", field: "name" };
  if (!role) return { error: "Pick a role.", field: "role" };

  const user = await db.adminUser.findUnique({ where: { id } });
  if (!user) return { error: "That team member no longer exists." };

  if (user.id === session.id && !isActive)
    return { error: "You cannot switch off your own account." };

  const losingOwner = user.role === "OWNER" && (role !== "OWNER" || !isActive);
  if (losingOwner && (await otherActiveOwners(user.id)) === 0)
    return { error: "This is the last active owner. Promote someone else first." };

  // Switching an account off, or changing its role, must end its live sessions.
  const revoke = !isActive || role !== user.role;

  await db.adminUser.update({
    where: { id },
    data: { name, role, isActive, tokenVersion: revoke ? { increment: 1 } : undefined },
  });

  await logActivity(session, {
    action: "team.update",
    entity: "AdminUser",
    entityId: id,
    summary: `Updated ${name} (${role.toLowerCase()}, ${isActive ? "active" : "switched off"})`,
  });
  revalidateAdmin("settings");
  return { ok: true, message: "Saved." };
}

export async function resetTeamPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("OWNER");

  const id = str(formData, "id");
  const password = str(formData, "password");
  const problem = passwordProblem(password);
  if (problem) return { error: problem, field: "password" };

  const user = await db.adminUser.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!user) return { error: "That team member no longer exists." };

  await db.adminUser.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), tokenVersion: { increment: 1 } },
  });

  await logActivity(session, {
    action: "team.password",
    entity: "AdminUser",
    entityId: id,
    summary: `Reset the password for ${user.name}`,
  });
  revalidateAdmin("settings");
  return { ok: true, message: `${user.name} is signed out everywhere and needs the new password.` };
}

export async function removeTeamMember(formData: FormData): Promise<void> {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");
  if (!id || id === session.id) return;

  const user = await db.adminUser.findUnique({
    where: { id },
    select: { id: true, name: true, role: true },
  });
  if (!user) return;
  if (user.role === "OWNER" && (await otherActiveOwners(user.id)) === 0) return;

  // ActivityLog.actorId is SetNull, so the history survives the deletion.
  await db.adminUser.delete({ where: { id } });
  await logActivity(session, {
    action: "team.delete",
    entity: "AdminUser",
    entityId: id,
    summary: `Removed ${user.name} from the team`,
  });
  revalidateAdmin("settings");
}

/* ------------------------------ Own account ------------------------------ */

/** Re-issues the cookie so a self-service change never signs you out. */
async function refreshOwnCookie(id: string) {
  const user = await db.adminUser.findUnique({ where: { id } });
  if (!user) return;
  const token = await adminToken.sign({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    v: user.tokenVersion,
  });
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, cookieOptions(adminToken.ttl));
}

export async function updateOwnProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin();

  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  if (name.length < 2) return { error: "Enter your full name.", field: "name" };
  if (!EMAIL.test(email)) return { error: "Enter a valid email address.", field: "email" };

  const clash = await db.adminUser.findFirst({
    where: { email, id: { not: session.id } },
    select: { id: true },
  });
  if (clash) return { error: "Someone already uses that email.", field: "email" };

  await db.adminUser.update({ where: { id: session.id }, data: { name, email } });
  await refreshOwnCookie(session.id);

  await logActivity(
    { ...session, name },
    {
      action: "profile.update",
      entity: "AdminUser",
      entityId: session.id,
      summary: "Updated their own profile",
    },
  );
  revalidateAdmin("settings");
  return { ok: true, message: "Your details are saved." };
}

export async function changeOwnPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin();

  const current = str(formData, "currentPassword");
  const next = str(formData, "newPassword");
  const confirm = str(formData, "confirmPassword");

  const user = await db.adminUser.findUnique({ where: { id: session.id } });
  if (!user) return { error: "Sign in again to change your password." };
  if (!(await verifyPassword(current, user.passwordHash)))
    return { error: "That is not your current password.", field: "currentPassword" };

  const problem = passwordProblem(next);
  if (problem) return { error: problem, field: "newPassword" };
  if (next !== confirm)
    return { error: "The two new passwords do not match.", field: "confirmPassword" };
  if (next === current)
    return { error: "Choose a password you have not used here.", field: "newPassword" };

  // Bumping the version signs out every other device; this one gets a fresh cookie.
  await db.adminUser.update({
    where: { id: session.id },
    data: { passwordHash: await hashPassword(next), tokenVersion: { increment: 1 } },
  });
  await refreshOwnCookie(session.id);

  await logActivity(session, {
    action: "profile.password",
    entity: "AdminUser",
    entityId: session.id,
    summary: "Changed their own password",
  });
  return { ok: true, message: "Password changed. Your other devices have been signed out." };
}

/** Used by the settings page to decide which tabs to render. */
export async function currentAdmin() {
  return getAdminSession();
}
