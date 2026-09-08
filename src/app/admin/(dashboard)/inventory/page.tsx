import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, Boxes, Download, History, Layers, PackageX } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { ParamSelect, SearchBox } from "@/components/admin/client";
import {
  AdminPagination,
  DateCell,
  EmptyRow,
  PageHeader,
  Pill,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
  withParams,
} from "@/components/admin/ui";
import { adjustStock } from "@/services/admin/inventory-actions";
import { pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";
import { AdjustStockButton } from "./inventory-forms";
import { SORT_OPTIONS, STOCK_STATE_OPTIONS, stockStateOf } from "./inventory-shared";
import {
  ACTIVE_OR_DRAFT,
  INVENTORY_LIST_OPTIONS,
  inventoryOrderBy,
  inventoryWhere,
  lowStockWhere,
  outOfStockWhere,
} from "./query";

export const metadata = { title: "Inventory" };

/**
 * Stock table for everything that is (or is about to be) on sale. The URL
 * carries search, category, stock state, sort and page, so a filtered view
 * can be bookmarked and the dashboard can deep-link to `?stock=low`.
 */
export default async function InventoryPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseListParams(raw, INVENTORY_LIST_OPTIONS);
  const where = inventoryWhere(params);

  const [rows, total, categories, skuCount, lowCount, outCount, units] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: inventoryOrderBy(params.sort),
      select: {
        id: true,
        title: true,
        sku: true,
        status: true,
        stock: true,
        lowStockThreshold: true,
        soldCount: true,
        category: { select: { name: true, slug: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, alt: true } },
      },
      ...skipTake(params),
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    db.product.count({ where: ACTIVE_OR_DRAFT }),
    db.product.count({ where: { ...ACTIVE_OR_DRAFT, ...lowStockWhere } }),
    db.product.count({ where: { ...ACTIVE_OR_DRAFT, ...outOfStockWhere } }),
    db.product.aggregate({ where: ACTIVE_OR_DRAFT, _sum: { stock: true } }),
  ]);

  // Newest movement per product on this page — one query, not one per row.
  const lastMoves =
    rows.length === 0
      ? []
      : await db.stockMovement.findMany({
          where: { productId: { in: rows.map((r) => r.id) } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          distinct: ["productId"],
          select: { productId: true, delta: true, createdAt: true, reason: true },
        });
  const lastMoveFor = new Map(lastMoves.map((m) => [m.productId, m]));

  const meta = pageMeta(total, params);
  const current = {
    q: params.q || undefined,
    category: params.filters.category,
    stock: params.filters.stock,
    sort: params.sort === INVENTORY_LIST_OPTIONS.defaultSort ? undefined : params.sort,
  };
  const canAdjust = hasRole(session, "MANAGER");
  const filtered = Boolean(params.q || params.filters.category || params.filters.stock);

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Units on hand for every active and draft product. Adjust stock here so the ledger always explains the number shoppers see."
        actions={
          <a href={withParams("/admin/inventory/export", current, {})} className={buttonClasses("outline", "sm")}>
            <Download size={14} /> Export CSV
          </a>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products tracked" value={skuCount} hint="Active and draft SKUs" icon={<Layers size={16} />} href="/admin/inventory" />
        <StatCard
          label="Low stock"
          value={lowCount}
          hint="At or below their alert level"
          icon={<AlertTriangle size={16} />}
          href="/admin/inventory?stock=low"
        />
        <StatCard label="Out of stock" value={outCount} hint="Cannot be ordered right now" icon={<PackageX size={16} />} href="/admin/inventory?stock=out" />
        <StatCard label="Units on hand" value={(units._sum.stock ?? 0).toLocaleString("en-IN")} hint="Across all tracked products" icon={<Boxes size={16} />} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search title or SKU…" defaultValue={params.q} className="w-full sm:w-72" />
        <ParamSelect
          name="category"
          value={params.filters.category}
          allLabel="All categories"
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
        />
        <ParamSelect name="stock" value={params.filters.stock} allLabel="All stock states" options={STOCK_STATE_OPTIONS} />
        <ParamSelect
          name="sort"
          value={params.sort === INVENTORY_LIST_OPTIONS.defaultSort ? "" : params.sort}
          allLabel="Stock: low to high"
          options={[...SORT_OPTIONS]}
          className="sm:ml-auto"
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Product</Th>
            <Th>Category</Th>
            <Th align="right">Stock</Th>
            <Th align="right">Threshold</Th>
            <Th align="right">Sold</Th>
            <Th>Last movement</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={7}
              title={filtered ? "No products match" : "Nothing to track yet"}
              body={filtered ? "Try a different search, category or stock state." : "Products appear here once they are created as active or draft."}
            />
          ) : (
            rows.map((p) => {
              const state = stockStateOf(p.stock, p.lowStockThreshold);
              const last = lastMoveFor.get(p.id);
              const thumb = p.images[0];
              return (
                <Tr key={p.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      {thumb ? (
                        <Image
                          src={thumb.url}
                          alt={thumb.alt || p.title}
                          width={40}
                          height={40}
                          className="h-10 w-10 shrink-0 rounded-md border border-hairline object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-canvas text-ink-300">
                          <Boxes size={16} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/inventory/${p.id}`}
                            className="max-w-[320px] truncate font-medium text-ink-950 hover:text-brand-700"
                          >
                            {p.title}
                          </Link>
                          {p.status === "DRAFT" && <Pill tone="neutral">Draft</Pill>}
                        </div>
                        <span className="block font-mono text-[11.5px] text-ink-400">{p.sku}</span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Link
                      href={withParams("/admin/inventory", current, { category: p.category.slug, page: null })}
                      className="text-ink-600 hover:text-brand-700"
                    >
                      {p.category.name}
                    </Link>
                  </Td>
                  <Td align="right">
                    {state === "out" ? (
                      <Pill tone="sale" dot>
                        Out
                      </Pill>
                    ) : (
                      <span className={cn("text-[14px] font-semibold", state === "low" ? "text-sale-600" : "text-ink-950")}>
                        {p.stock.toLocaleString("en-IN")}
                      </span>
                    )}
                  </Td>
                  <Td align="right" className="text-ink-500">
                    {p.lowStockThreshold === 0 ? <span title="Alert off">—</span> : p.lowStockThreshold}
                  </Td>
                  <Td align="right" className="text-ink-600">
                    {p.soldCount.toLocaleString("en-IN")}
                  </Td>
                  <Td>
                    {last ? (
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <DateCell value={last.createdAt} />
                        <span
                          className={cn("font-semibold tabular-nums", last.delta > 0 ? "text-brand-700" : last.delta < 0 ? "text-sale-600" : "text-ink-500")}
                          title={last.reason}
                        >
                          {last.delta > 0 ? "+" : ""}
                          {last.delta}
                        </span>
                      </span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      {canAdjust && (
                        <AdjustStockButton
                          action={adjustStock.bind(null, p.id)}
                          product={{ title: p.title, sku: p.sku, stock: p.stock }}
                        />
                      )}
                      <Link
                        href={`/admin/inventory/${p.id}`}
                        title="Movement ledger"
                        className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
                      >
                        <History size={14} />
                      </Link>
                    </div>
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>

      <AdminPagination meta={meta} hrefFor={(p) => withParams("/admin/inventory", current, { page: p })} label="products" />
    </>
  );
}
