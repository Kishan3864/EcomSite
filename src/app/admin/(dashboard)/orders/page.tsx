import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { ParamSelect, SearchBox } from "@/components/admin/client";
import {
  AdminPagination,
  DateCell,
  EmptyRow,
  Money,
  PageHeader,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
  withParams,
} from "@/components/admin/ui";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUSES,
  fromDateInput,
} from "./workflow";
import {
  insensitive,
  pageMeta,
  parseListParams,
  skipTake,
  type RawParams,
} from "@/services/admin/shared";
import { cn, statusLabel } from "@/lib/utils";
import { Form } from "@/components/ui/form";

export const metadata = { title: "Orders" };

const FILTER_KEYS = ["status", "payment", "method", "from", "to", "attention"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireAdmin();
  const raw = await searchParams;
  const params = parseListParams(raw, { perPage: 25, filterKeys: FILTER_KEYS });
  const f = params.filters;

  const from = f.from ? fromDateInput(f.from) : null;
  const to = f.to ? fromDateInput(f.to) : null;
  // An inclusive end date means "up to the end of that day".
  const toEnd = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999) : null;

  // Orders needing a human: confirmed for over a day, or delivered with cash still uncollected.
  const dayAgo = new Date();
  dayAgo.setDate(dayAgo.getDate() - 1);
  const attentionWhere: Prisma.OrderWhereInput = {
    OR: [
      { status: "CONFIRMED", placedAt: { lt: dayAgo } },
      { status: "DELIVERED", paymentStatus: "COD_PENDING" },
    ],
  };

  const where: Prisma.OrderWhereInput = {
    ...(params.q
      ? {
          OR: [
            { number: insensitive(params.q) },
            { contactName: insensitive(params.q) },
            { contactEmail: insensitive(params.q) },
            { contactPhone: insensitive(params.q) },
            { awb: insensitive(params.q) },
          ],
        }
      : {}),
    ...(f.status && ORDER_STATUSES.includes(f.status as never) ? { status: f.status as never } : {}),
    ...(f.payment && PAYMENT_STATUSES.includes(f.payment as never)
      ? { paymentStatus: f.payment as never }
      : {}),
    ...(f.method && PAYMENT_METHODS.includes(f.method as never)
      ? { paymentMethod: f.method as never }
      : {}),
    ...(from || toEnd
      ? { placedAt: { ...(from ? { gte: from } : {}), ...(toEnd ? { lte: toEnd } : {}) } }
      : {}),
    ...(f.attention === "1" ? attentionWhere : {}),
  };

  const [rows, total, statusCounts, attentionCount] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      include: { _count: { select: { lines: true } } },
      ...skipTake(params),
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], where, _count: { _all: true } }),
    db.order.count({ where: attentionWhere }),
  ]);

  const meta = pageMeta(total, params);
  const current = {
    q: params.q || undefined,
    status: f.status,
    payment: f.payment,
    method: f.method,
    from: f.from,
    to: f.to,
    attention: f.attention,
  };

  const summary = ORDER_STATUSES.map((s) => ({
    status: s,
    count: statusCounts.find((c) => c.status === s)?._count._all ?? 0,
  })).filter((s) => s.count > 0);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order placed on the storefront, from payment through to delivery."
        actions={
          attentionCount > 0 && (
            <Link
              href={withParams("/admin/orders", {}, { attention: f.attention === "1" ? null : "1" })}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[12.5px] font-medium transition-colors",
                f.attention === "1"
                  ? "border-gold-400 bg-gold-100 text-gold-900"
                  : "border-ink-200 bg-surface text-ink-700 hover:border-gold-400",
              )}
            >
              <AlertTriangle size={14} />
              {attentionCount} need attention
            </Link>
          )
        }
      />

      {summary.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {summary.map((s) => (
            <Link
              key={s.status}
              href={withParams("/admin/orders", current, {
                status: f.status === s.status ? null : s.status,
                page: null,
              })}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors",
                f.status === s.status
                  ? "border-brand-700 bg-brand-50"
                  : "border-hairline bg-surface hover:border-ink-300",
              )}
            >
              <StatusPill status={s.status} />
              <span className="font-semibold tabular-nums text-ink-900">{s.count}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox
          placeholder="Order number, name, email, phone or AWB…"
          defaultValue={params.q}
          className="w-full sm:w-80"
        />
        <ParamSelect
          name="status"
          value={f.status}
          allLabel="All statuses"
          options={ORDER_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
        />
        <ParamSelect
          name="payment"
          value={f.payment}
          allLabel="Any payment state"
          options={PAYMENT_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
        />
        <ParamSelect
          name="method"
          value={f.method}
          allLabel="Any method"
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))}
        />
        <Form className="flex items-center gap-1.5" action="/admin/orders">
          {params.q && <input type="hidden" name="q" value={params.q} />}
          {f.status && <input type="hidden" name="status" value={f.status} />}
          <input
            type="date"
            name="from"
            defaultValue={f.from ?? ""}
            aria-label="From date"
            className="h-10 rounded-lg border border-ink-200 bg-surface px-2.5 text-[12.5px] text-ink-800 outline-none focus:border-brand-500"
          />
          <span className="text-ink-400">–</span>
          <input
            type="date"
            name="to"
            defaultValue={f.to ?? ""}
            aria-label="To date"
            className="h-10 rounded-lg border border-ink-200 bg-surface px-2.5 text-[12.5px] text-ink-800 outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            className="h-10 rounded-lg border border-ink-200 bg-surface px-3 text-[12.5px] font-medium text-ink-700 transition-colors hover:border-ink-400"
          >
            Apply
          </button>
        </Form>
        {(params.q || Object.values(f).some(Boolean)) && (
          <Link
            href="/admin/orders"
            className="text-[12.5px] font-medium text-ink-500 underline-offset-2 hover:text-sale-600 hover:underline"
          >
            Clear
          </Link>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Placed</Th>
            <Th>Customer</Th>
            <Th align="right">Items</Th>
            <Th align="right">Total</Th>
            <Th>Payment</Th>
            <Th>Status</Th>
            <Th>Delivery by</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={8}
              title="No orders match"
              body="Try a wider date range, or clear the filters."
            />
          ) : (
            rows.map((o) => (
              <Tr key={o.id}>
                <Td>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-mono text-[12.5px] font-semibold text-ink-950 hover:text-brand-700"
                  >
                    {o.number}
                  </Link>
                  {o.awb && <span className="block text-[11px] text-ink-400">AWB {o.awb}</span>}
                </Td>
                <Td>
                  <DateCell value={o.placedAt} time />
                </Td>
                <Td>
                  {o.customerId ? (
                    <Link
                      href={`/admin/customers/${o.customerId}`}
                      className="text-ink-900 hover:text-brand-700"
                    >
                      {o.contactName}
                    </Link>
                  ) : (
                    <span className="text-ink-900">{o.contactName}</span>
                  )}
                  <span className="block text-[11.5px] text-ink-400">{o.contactEmail}</span>
                </Td>
                <Td align="right">{o._count.lines}</Td>
                <Td align="right">
                  <Money value={o.total} className="font-semibold text-ink-950" />
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[12px] text-ink-600">
                      {PAYMENT_METHOD_LABEL[o.paymentMethod]}
                    </span>
                    <StatusPill status={o.paymentStatus} />
                  </div>
                </Td>
                <Td>
                  <StatusPill status={o.status} />
                </Td>
                <Td>
                  <DateCell value={o.estimatedDelivery} />
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>

      <AdminPagination
        meta={meta}
        hrefFor={(p) => withParams("/admin/orders", current, { page: p })}
        label="orders"
      />
    </>
  );
}
