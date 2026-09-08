import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { formatDate } from "@/lib/utils";
import { AddMemberForm, MemberCard, type TeamMember } from "./team-forms";

export const metadata = { title: "Team" };

export default async function TeamSettingsPage() {
  const session = await requireAdmin("OWNER");

  const users = await db.adminUser.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
    },
  });

  // Dates are formatted here so the client component stays free of locale work.
  const members: TeamMember[] = users.map((u) => ({
    ...u,
    lastLoginAt: u.lastLoginAt ? formatDate(u.lastLoginAt) : null,
  }));

  const owners = members.filter((m) => m.role === "OWNER" && m.isActive).length;

  return (
    <div className="grid max-w-3xl gap-4">
      <AddMemberForm />

      {owners === 1 && (
        <p className="rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-[12.5px] text-ink-600">
          There is one active owner. Promote a second before anyone goes on leave — the last owner
          cannot be demoted or switched off.
        </p>
      )}

      {members.map((member) => (
        <MemberCard key={member.id} member={member} isSelf={member.id === session.id} />
      ))}
    </div>
  );
}
