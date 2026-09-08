import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getAdminSession, logActivity } from "@/lib/auth/admin";

/**
 * GET /admin/messages/subscribers/export
 *
 * Downloads the newsletter list as CSV (`email,source,createdAt`). Honours the
 * same `q` and `source` filters as the list page so "export what I see" works.
 * Anyone signed in to the admin may export; the download is logged.
 */

export const dynamic = "force-dynamic";

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const source = url.searchParams.get("source")?.trim() ?? "";

  const where: Prisma.NewsletterSubscriberWhereInput = {
    ...(q ? { email: { contains: q, mode: "insensitive" } } : {}),
    ...(source ? { source } : {}),
  };

  const rows = await db.newsletterSubscriber.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { email: true, source: true, createdAt: true },
  });

  const lines = [
    "email,source,createdAt",
    ...rows.map((r) => [r.email, r.source, r.createdAt.toISOString()].map(csvCell).join(",")),
  ];

  await logActivity(session, {
    action: "subscriber.export",
    entity: "NewsletterSubscriber",
    summary: `Exported ${rows.length} newsletter ${rows.length === 1 ? "subscriber" : "subscribers"} as CSV`,
    metadata: { q: q || undefined, source: source || undefined, count: rows.length },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(`${lines.join("\r\n")}\r\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mayura-subscribers-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
