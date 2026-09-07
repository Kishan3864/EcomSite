import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "./password";
import { ADMIN_COOKIE, adminToken, cookieOptions } from "./session";
import type { AdminRole } from "@/generated/prisma/client";

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

const ROLE_RANK: Record<AdminRole, number> = { STAFF: 1, MANAGER: 2, OWNER: 3 };

/**
 * Reads the admin cookie and confirms the user is still active with an
 * unrevoked token. Cached per request so layouts and pages share one lookup.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const store = await cookies();
  const claims = await adminToken.verify(store.get(ADMIN_COOKIE)?.value);
  if (!claims) return null;

  const user = await db.adminUser.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, role: true, isActive: true, tokenVersion: true },
  });
  if (!user || !user.isActive || user.tokenVersion !== claims.v) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

/** Use at the top of every admin page/action. Redirects when not signed in. */
export async function requireAdmin(minimumRole: AdminRole = "STAFF"): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (ROLE_RANK[session.role] < ROLE_RANK[minimumRole]) redirect("/admin?denied=1");
  return session;
}

export function hasRole(session: AdminSession, minimumRole: AdminRole) {
  return ROLE_RANK[session.role] >= ROLE_RANK[minimumRole];
}

export async function signInAdmin(email: string, password: string): Promise<
  { ok: true; session: AdminSession } | { ok: false; reason: string }
> {
  const user = await db.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
  // Same message for unknown email and wrong password — no account enumeration.
  const invalid = { ok: false as const, reason: "That email and password do not match." };
  if (!user || !user.isActive) return invalid;
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;

  const token = await adminToken.sign({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    v: user.tokenVersion,
  });
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, cookieOptions(adminToken.ttl));

  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return { ok: true, session: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function signOutAdmin() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

/** Records who did what, for the activity feed. Never throws — logging must not break a save. */
export async function logActivity(
  session: AdminSession | null,
  input: { action: string; entity: string; entityId?: string; summary: string; metadata?: unknown },
) {
  try {
    await db.activityLog.create({
      data: {
        actorId: session?.id ?? null,
        actorName: session?.name ?? "System",
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        summary: input.summary,
        metadata: input.metadata === undefined ? undefined : (input.metadata as object),
      },
    });
  } catch (error) {
    console.error("activity log failed", error);
  }
}
