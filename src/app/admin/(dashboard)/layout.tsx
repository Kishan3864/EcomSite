import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { getMaintenance, pickerBounds, toIstInput } from "@/lib/maintenance";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · WeekendCart Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Every admin page sits inside this shell; the session check happens here first. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  // Badge counts for the sidebar — cheap aggregate queries, one round-trip each.
  const [orders, returns, reviews, questions, messages, lowStock] = await Promise.all([
    db.order.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
    db.returnRequest.count({ where: { status: "REQUESTED" } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.question.count({ where: { status: "PENDING" } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.product.count({
      where: { status: "ACTIVE", stock: { lte: db.product.fields.lowStockThreshold } },
    }),
  ]);

  // The same check the proxy uses. The action that flips the switch overwrites
  // its few-second memory, so this is never behind a click — and reading it
  // here means a pause whose time has passed also ends when the owner looks.
  const maintenance = await getMaintenance();
  // datetime-local wants local wall-clock time with no zone; the admin is run in IST.
  const backByInput = maintenance.backBy ? toIstInput(new Date(maintenance.backBy)) : "";

  return (
    <AdminShell
      maintenance={{
        on: maintenance.on,
        message: maintenance.message,
        backByInput,
        ...pickerBounds(),
        canEdit: hasRole(session, "MANAGER"),
      }}
      user={{ name: session.name, email: session.email, role: session.role }}
      counts={{ orders, returns, reviews: reviews + questions, messages, lowStock }}
    >
      {children}
    </AdminShell>
  );
}
