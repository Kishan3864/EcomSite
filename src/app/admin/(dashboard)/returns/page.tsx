import Link from "next/link";
import { ArrowRight, Check, IndianRupee, PackageCheck, X } from "lucide-react";
import type { Prisma, ReturnStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { cn, formatINR } from "@/lib/utils";
import { ConfirmForm, ParamSelect, SearchBox } from "@/components/admin/client";
import {
  AdminPagination,
  DateCell,
  EmptyRow,
  Money,
  PageHeader,
  StatCard,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
  withParams,
} from "@/components/admin/ui";
import { approveReturn, markReturnPickedUp, refundReturn } from "@/services/admin/returns-actions";
import { insensitive, pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";
import {
  DECISION_SLA_HOURS,
  RETURN_STATUSES,
  RETURN_STATUS_COPY,
  ageLabel,
  hoursBetween,
  isReturnOpen,
  isReturnStatus,
  shortReturnId,
} from "./return-helpers";
import { ReturnThumb } from "./return-thumb";

const BASE = "/admin/returns";

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseListParams(raw, {
    perPage: 20,
    defaultSort: "requestedAt",
    defaultDir: "desc",
    filterKeys: ["status"],
  });
  const status = isReturnStatus(params.filters.status) ? params.filters.status : undefined;
  const canManage = hasRole(session, "MANAGER");

  const where: Prisma.ReturnRequestWhereInput = {
    ...(status ? { status } : {}),
    ...(params.q
      ? {
          OR: [
            { order: { number: insensitive(params.q) } },
            { order: { contactName: insensitive(params.q) } },
            { order: { contactEmail: insensitive(params.q) } },
            { customer: { name: insensitive(params.q) } },
            { customer: { email: insensitive(params.q) } },
            { orderLine: { title: insensitive(params.q) } },
            { id: insensitive(params.q) },
          ],
        }
      : {}),
  };

  const [rows, total, grouped] = await Promise.all([
    db.returnRequest.findMany({
      where,
      orderBy: [{ requestedAt: params.dir }, { id: "asc" }],
      include: {
        order: { select: { id: true, number: true, contactName: true, contactEmail: true } },
        orderLine: { select: { title: true, image: true, brand: true, variantLabel: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
      ...skipTake(params),
    }),
    db.returnRequest.count({ where }),
    db.returnRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries(RETURN_STATUSES.map((s) => [s, 0])) as Record<ReturnStatus, number>;
  for (const g of grouped) counts[g.status] = g._count._all;

  const meta = pageMeta(total, params);
  const current = {
    q: params.q || undefined,
    status,
    dir: params.dir === "asc" ? "asc" : undefined,
  };
  const listHref = withParams(BASE, current, { page: params.page > 1 ? params.page : undefined });
  const filtered = Boolean(params.q || status);
  // One clock for the whole render so every age is measured against the same instant.
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Returns"
        description="Every return raised by a customer, from request to refund. Approve, arrange the pickup and issue the refund from here."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {RETURN_STATUSES.map((s) => (
          <StatCard
            key={s}
            label={RETURN_STATUS_COPY[s].label}
            value={counts[s]}
            hint={RETURN_STATUS_COPY[s].hint}
            href={withParams(BASE, {}, { status: s })}
          />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Order number, customer or product…" defaultValue={params.q} className="w-full sm:w-80" />
        <ParamSelect
          name="status"
          value={status}
          allLabel="All statuses"
          options={RETURN_STATUSES.map((s) => ({ value: s, label: RETURN_STATUS_COPY[s].label }))}
        />
        <ParamSelect name="dir" value={current.dir} allLabel="Newest first" options={[{ value: "asc", label: "Oldest first" }]} />
        {filtered && (
          <Link href={BASE} className="inline-flex h-10 items-center gap-1 px-2 text-[12.5px] font-medium text-ink-500 hover:text-brand-700">
            <X size={13} /> Clear
          </Link>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th className="px-2.5">Request</Th>
            <Th className="px-2.5">Order</Th>
            <Th className="px-2.5">Product</Th>
            <Th className="px-2.5">Customer</Th>
            <Th className="px-2.5">Reason</Th>
            <Th align="right" className="px-2.5">Refund</Th>
            <Th className="px-2.5">Status</Th>
            <Th className="px-2.5">Requested</Th>
            <Th align="right" className="px-2.5">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={9}
              title={filtered ? "No returns match" : "No return requests yet"}
              body={
                filtered
                  ? "Try a different search or clear the filters."
                  : "Requests customers raise from their account will show up here."
              }
            />
          ) : (
            rows.map((r) => {
              const customerName = r.customer?.name ?? r.order.contactName;
              const customerEmail = r.customer?.email ?? r.order.contactEmail;
              const detail = `${BASE}/${r.id}`;
              return (
                <Tr key={r.id}>
                  <Td className="px-2.5">
                    <Link href={detail} title={r.id} className="font-mono text-[12px] font-medium text-ink-950 hover:text-brand-700">
                      #{shortReturnId(r.id)}
                    </Link>
                  </Td>
                  <Td className="px-2.5">
                    <Link href={`/admin/orders/${r.order.id}`} className="whitespace-nowrap text-[12.5px] font-medium text-ink-900 hover:text-brand-700">
                      {r.order.number}
                    </Link>
                  </Td>
                  <Td className="px-2.5">
                    <div className="flex items-center gap-3">
                      <ReturnThumb src={r.orderLine.image} alt="" size={36} />
                      <div className="min-w-0">
                        <Link href={detail} className="block max-w-[150px] truncate font-medium text-ink-950 hover:text-brand-700">
                          {r.orderLine.title}
                        </Link>
                        <span className="block max-w-[150px] truncate text-[11.5px] text-ink-400">
                          {r.orderLine.brand}
                          {r.orderLine.variantLabel ? ` · ${r.orderLine.variantLabel}` : ""}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td className="px-2.5">
                    {r.customer ? (
                      <Link href={`/admin/customers/${r.customer.id}`} className="block font-medium text-ink-900 hover:text-brand-700">
                        {customerName}
                      </Link>
                    ) : (
                      <span className="block font-medium text-ink-900">{customerName}</span>
                    )}
                    <span className="block max-w-[130px] truncate text-[11.5px] text-ink-400">{customerEmail}</span>
                  </Td>
                  <Td className="max-w-[110px] px-2.5">
                    <span className="block truncate text-ink-700" title={r.reason}>
                      {r.reason}
                    </span>
                  </Td>
                  <Td align="right" className="px-2.5">
                    <Money value={r.refundAmount} className="font-medium text-ink-900" />
                    <span className="ml-auto block max-w-[90px] truncate text-[11.5px] text-ink-400" title={r.refundMode}>
                      {r.refundMode}
                    </span>
                  </Td>
                  <Td className="px-2.5">
                    <StatusPill status={r.status} />
                  </Td>
                  <Td className="px-2.5">
                    <DateCell value={r.requestedAt} />
                    <span className="block">
                      <AgeCell status={r.status} requestedAt={r.requestedAt} resolvedAt={r.resolvedAt} now={now} />
                    </span>
                  </Td>
                  <Td align="right" className="px-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {canManage && r.status === "REQUESTED" && (
                        <ConfirmForm action={approveReturn} message={`Approve the return for ${r.orderLine.title}? You can add a note from the return page.`}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="next" value={listHref} />
                          <RowButton title="Approve">
                            <Check size={14} strokeWidth={2.5} />
                          </RowButton>
                        </ConfirmForm>
                      )}
                      {canManage && r.status === "APPROVED" && (
                        <ConfirmForm action={markReturnPickedUp} message={`Mark ${r.orderLine.title} as picked up from the customer?`}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="next" value={listHref} />
                          <RowButton title="Mark picked up">
                            <PackageCheck size={14} />
                          </RowButton>
                        </ConfirmForm>
                      )}
                      {canManage && r.status === "PICKED_UP" && (
                        <ConfirmForm
                          action={refundReturn}
                          message={`Refund ${formatINR(r.refundAmount)} via ${r.refundMode} for ${r.orderLine.title}? This restocks the item and updates order ${r.order.number}. It cannot be undone.`}
                        >
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="next" value={listHref} />
                          <RowButton title="Issue refund">
                            <IndianRupee size={14} />
                          </RowButton>
                        </ConfirmForm>
                      )}
                      <Link
                        href={detail}
                        title="Open"
                        className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>

      <AdminPagination meta={meta} hrefFor={(p) => withParams(BASE, current, { page: p })} label="returns" />
    </>
  );
}

function RowButton({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      title={title}
      aria-label={title}
      className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-brand-50 hover:text-brand-800"
    >
      {children}
    </button>
  );
}

function AgeCell({
  status,
  requestedAt,
  resolvedAt,
  now,
}: {
  status: ReturnStatus;
  requestedAt: Date;
  resolvedAt: Date | null;
  now: Date;
}) {
  if (!isReturnOpen(status)) {
    const closedAt = resolvedAt ?? now;
    const turnaround = hoursBetween(requestedAt, closedAt) < 24 ? "same day" : `in ${ageLabel(requestedAt, closedAt)}`;
    return <span className="whitespace-nowrap text-[12px] text-ink-400">Closed {turnaround}</span>;
  }
  const overdue = status === "REQUESTED" && hoursBetween(requestedAt, now) > DECISION_SLA_HOURS;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn("text-[12.5px] font-medium tabular-nums", overdue ? "text-sale-600" : "text-ink-700")}>
        {ageLabel(requestedAt, now)}
      </span>
      {overdue && (
        <span className="rounded-full bg-sale-100 px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-wide text-sale-700">
          Overdue
        </span>
      )}
    </span>
  );
}
