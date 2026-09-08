import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { StatusPill } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";
import { PasswordForm, ProfileForm } from "./profile-forms";

export const metadata = { title: "Your account" };

export default async function ProfileSettingsPage() {
  const session = await requireAdmin();

  const [me, recent] = await Promise.all([
    db.adminUser.findUnique({
      where: { id: session.id },
      select: { name: true, email: true, lastLoginAt: true, createdAt: true },
    }),
    db.activityLog.findMany({
      where: { actorId: session.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, summary: true, createdAt: true },
    }),
  ]);
  if (!me) return null;

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-surface px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-900 text-[13px] font-bold text-white">
          {me.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-950">
            {me.name} <StatusPill status={session.role} />
          </p>
          <p className="text-[12px] text-ink-500">
            On the team since {formatDate(me.createdAt)}
            {me.lastLoginAt ? ` · last signed in ${formatDate(me.lastLoginAt)}` : ""}
          </p>
        </div>
      </div>

      <ProfileForm name={me.name} email={me.email} />
      <PasswordForm />

      <section className="rounded-xl border border-hairline bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
            Your recent changes
          </h2>
          <Link
            href="/admin/activity"
            className="text-[12.5px] font-medium text-brand-700 hover:underline"
          >
            Full activity log
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-[12.5px] text-ink-500">Nothing recorded yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {recent.map((row) => (
              <li key={row.id} className="flex flex-wrap justify-between gap-2 text-[12.5px]">
                <span className="text-ink-800">{row.summary}</span>
                <span className="text-ink-400">{formatDate(row.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
