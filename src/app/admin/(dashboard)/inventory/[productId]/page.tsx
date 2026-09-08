import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/admin/client";
import {
  AdminPagination,
  Card,
  DateCell,
  EmptyRow,
  KeyValue,
  PageHeader,
  Pill,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
  withParams,
} from "@/components/admin/ui";
import { adjustStock, setThreshold } from "@/services/admin/inventory-actions";
import { pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";
import { AdjustStockForm, ThresholdForm } from "../inventory-forms";
import { ORDER_NUMBER_RE, STOCK_STATE_META, stockStateOf } from "../inventory-shared";

export const metadata = { title: "Stock ledger" };

const MOVEMENT_ORDER = [{ createdAt: "desc" as const }, { id: "desc" as const }];

/**
 * Movement ledger for one product. Newest first, with a running balance so a
 * manager can see what the stock was after any given change.
 */
export default async function InventoryLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<RawParams>;
}) {
  const session = await requireAdmin();
  const { productId } = await params;
  const list = parseListParams(await searchParams, { perPage: 25 });

  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      title: true,
      sku: true,
      slug: true,
      status: true,
      stock: true,
      lowStockThreshold: true,
      soldCount: true,
      updatedAt: true,
      brand: { select: { name: true } },
      category: { select: { name: true, slug: true } },
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, alt: true } },
    },
  });
  if (!product) notFound();

  const where = { productId: product.id };
  const { skip, take } = skipTake(list);
  const [rows, total, ledger, newer] = await Promise.all([
    db.stockMovement.findMany({ where, orderBy: MOVEMENT_ORDER, skip, take }),
    db.stockMovement.count({ where }),
    db.stockMovement.aggregate({ where, _sum: { delta: true } }),
    // Sum of the movements newer than this page, so the running balance can
    // start from the current stock without loading the whole ledger.
    skip > 0
      ? db.stockMovement.findMany({ where, orderBy: MOVEMENT_ORDER, take: skip, select: { delta: true } })
      : Promise.resolve([]),
  ]);

  const ledgerTotal = ledger._sum.delta ?? 0;
  const drift = product.stock - ledgerTotal;
  // Balance after the newest row on this page, then walk back one row at a time.
  const pageStart = product.stock - newer.reduce((sum, m) => sum + m.delta, 0);
  const entries = rows.map((m, i) => ({
    ...m,
    after: pageStart - rows.slice(0, i).reduce((sum, x) => sum + x.delta, 0),
  }));

  const meta = pageMeta(total, list);
  const state = stockStateOf(product.stock, product.lowStockThreshold);
  const stateMeta = STOCK_STATE_META[state];
  const canAdjust = hasRole(session, "MANAGER");
  const thumb = product.images[0];
  const base = `/admin/inventory/${product.id}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              {thumb && (
                <Image
                  src={thumb.url}
                  alt={thumb.alt || product.title}
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 rounded-lg border border-hairline object-cover"
                />
              )}
              <span>{product.title}</span>
            </span>
          }
          back={{ href: "/admin/inventory", label: "Inventory" }}
          meta={
            <>
              <StatusPill status={product.status} />
              <Pill tone={stateMeta.tone} dot>
                {stateMeta.label}
              </Pill>
              <span className="font-mono text-[12px] text-ink-500">{product.sku}</span>
              <span className="text-[12px] text-ink-400">
                {product.brand.name} · {product.category.name}
              </span>
            </>
          }
          actions={
            <>
              {canAdjust && (
                <Link href={`/admin/products/${product.id}`} className={buttonClasses("outline", "sm")}>
                  <Pencil size={14} /> Edit product
                </Link>
              )}
              {product.status === "ACTIVE" && (
                <Link href={`/p/${product.slug}`} target="_blank" className={buttonClasses("outline", "sm")}>
                  <ExternalLink size={14} /> View on storefront
                </Link>
              )}
            </>
          }
        />

        {drift !== 0 && (
          <Notice tone="info" className="mb-4">
            The ledger adds up to {ledgerTotal.toLocaleString("en-IN")} but the product shows {product.stock.toLocaleString("en-IN")} in stock.
            The {Math.abs(drift).toLocaleString("en-IN")}-unit difference came from a change that did not record a movement; a correction
            below will bring the ledger back in line.
          </Notice>
        )}

        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th align="right">Change</Th>
              <Th align="right">Balance</Th>
              <Th>Reason</Th>
              <Th>Reference</Th>
              <Th>By</Th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <EmptyRow colSpan={6} title="No movements yet" body="Every adjustment, order and return will be listed here." />
            ) : (
              entries.map((m) => (
                <Tr key={m.id}>
                  <Td>
                    <DateCell value={m.createdAt} time />
                  </Td>
                  <Td align="right">
                    <span className={cn("font-semibold", m.delta > 0 ? "text-brand-700" : m.delta < 0 ? "text-sale-600" : "text-ink-500")}>
                      {m.delta > 0 ? "+" : ""}
                      {m.delta.toLocaleString("en-IN")}
                    </span>
                  </Td>
                  <Td align="right" className="font-medium text-ink-950">
                    {m.after.toLocaleString("en-IN")}
                  </Td>
                  <Td className="max-w-[320px] text-ink-700">{m.reason}</Td>
                  <Td>
                    {m.reference ? (
                      ORDER_NUMBER_RE.test(m.reference) ? (
                        <Link
                          href={`/admin/orders?q=${encodeURIComponent(m.reference)}`}
                          className="font-mono text-[12.5px] font-medium text-brand-700 hover:underline"
                        >
                          {m.reference}
                        </Link>
                      ) : (
                        <span className="font-mono text-[12.5px] text-ink-600">{m.reference}</span>
                      )
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-600">{m.actorName ?? <span className="text-ink-300">—</span>}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>

        <AdminPagination meta={meta} hrefFor={(p) => withParams(base, {}, { page: p })} label="movements" />
      </div>

      <aside className="space-y-4">
        <Card title="On hand">
          <p
            className={cn(
              "font-display text-[40px] leading-none tracking-[-0.03em] tabular-nums",
              state === "out" ? "text-sale-600" : state === "low" ? "text-sale-600" : "text-ink-950",
            )}
          >
            {product.stock.toLocaleString("en-IN")}
          </p>
          <p className="mt-1.5 text-[12.5px] text-ink-500">
            {state === "out"
              ? "Shoppers cannot add this to their bag."
              : state === "low"
                ? `At or below the alert level of ${product.lowStockThreshold}.`
                : product.lowStockThreshold > 0
                  ? `Alert when ${product.lowStockThreshold} or fewer remain.`
                  : "Low-stock alert is off."}
          </p>
          <div className="mt-4">
            <KeyValue
              rows={[
                { label: "Sold", value: <span className="tabular-nums">{product.soldCount.toLocaleString("en-IN")}</span> },
                { label: "Movements", value: <span className="tabular-nums">{total.toLocaleString("en-IN")}</span> },
                { label: "Ledger total", value: <span className="tabular-nums">{ledgerTotal.toLocaleString("en-IN")}</span> },
                { label: "Updated", value: <DateCell value={product.updatedAt} time /> },
              ]}
            />
          </div>
        </Card>

        {canAdjust ? (
          <>
            <Card title="Adjust stock" description="Adds a ledger entry and updates the number shoppers see.">
              <AdjustStockForm action={adjustStock.bind(null, product.id)} stock={product.stock} compact />
            </Card>
            <Card title="Low-stock alert">
              <ThresholdForm action={setThreshold.bind(null, product.id)} value={product.lowStockThreshold} />
            </Card>
          </>
        ) : (
          <Card title="Adjust stock">
            <p className="text-[13px] text-ink-500">Only managers and the owner can change stock levels.</p>
          </Card>
        )}
      </aside>
    </div>
  );
}
