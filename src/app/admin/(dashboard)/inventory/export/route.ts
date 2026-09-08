import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { parseListParams, type RawParams } from "@/services/admin/shared";
import { INVENTORY_LIST_OPTIONS, inventoryOrderBy, inventoryWhere } from "../query";

export const dynamic = "force-dynamic";

/**
 * GET /admin/inventory/export?q=&category=&stock=&sort=
 *
 * The same filters as the stock table, so "Export CSV" downloads exactly the
 * rows the manager is looking at. Route handlers sit outside the dashboard
 * layout's session check, so the guard is repeated here.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Sign in to export inventory." }, { status: 401 });

  const raw: RawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const params = parseListParams(raw, INVENTORY_LIST_OPTIONS);

  const rows = await db.product.findMany({
    where: inventoryWhere(params),
    orderBy: inventoryOrderBy(params.sort),
    select: {
      sku: true,
      title: true,
      stock: true,
      lowStockThreshold: true,
      status: true,
      category: { select: { name: true } },
    },
  });

  const lines = [
    ["sku", "title", "category", "stock", "threshold", "status"],
    ...rows.map((p) => [p.sku, p.title, p.category.name, p.stock, p.lowStockThreshold, p.status]),
  ].map((cells) => cells.map(csvCell).join(","));

  // Leading BOM so Excel opens the file as UTF-8 (product titles use “ ” and ₹).
  const bom = String.fromCharCode(0xfeff);
  const body = `${bom}${lines.join("\r\n")}\r\n`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mayura-inventory-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  const text = value;
  // Neutralise spreadsheet formula injection, then quote anything that needs it.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
