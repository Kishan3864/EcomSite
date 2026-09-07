import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Mayura Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Every admin page sits inside this shell; the session check happens here first. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const settings = await getSettings();

  // Badge counts for the sidebar — cheap aggregate queries, one round-trip each.
  const [orders, returns, reviews, questions, messages, lowStock] = await Promise.all([
    db.order.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
    db.returnRequest.count({ where: { status: "REQUESTED" } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.question.count({ where: { status: "PENDING" } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.product.count({
      where: { status: "ACTIVE", stock: { lte: settings.inventory.lowStockThreshold } },
    }),
  ]);

  return (
    <AdminShell
      user={{ name: session.name, email: session.email, role: session.role }}
      counts={{ orders, returns, reviews: reviews + questions, messages, lowStock }}
    >
      {children}
    </AdminShell>
  );
}
