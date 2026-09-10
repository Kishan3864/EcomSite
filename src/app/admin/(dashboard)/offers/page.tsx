import Link from "next/link";
import { BadgePercent, CalendarClock, Pencil, Plus, Power, Ticket, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { formatDate, formatINR } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmForm, CopyButton, ParamSelect, SearchBox } from "@/components/admin/client";
import {
  AdminPagination,
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
import { deleteOffer, toggleOfferActive } from "@/services/admin/offers-actions";
import { insensitive, pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";
import type { Prisma } from "@/generated/prisma/client";
import { OFFER_STATUS, OFFER_TYPE, OFFER_TYPES, offerStatus } from "./lib";
import { Form } from "@/components/ui/form";

export default async function OffersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseListParams(raw, { perPage: 20, defaultSort: "createdAt", filterKeys: ["status", "type"] });
  const now = new Date();

  const statusWhere: Record<string, Prisma.OfferWhereInput> = {
    active: { isActive: true, startsAt: { lte: now }, expiresAt: { gte: now } },
    scheduled: { isActive: true, startsAt: { gt: now } },
    expired: { expiresAt: { lt: now } },
    inactive: { isActive: false },
  };
  const typeFilter = OFFER_TYPES.find((t) => t === params.filters.type);

  const where: Prisma.OfferWhereInput = {
    ...(params.q ? { OR: [{ code: insensitive(params.q) }, { title: insensitive(params.q) }] } : {}),
    ...(statusWhere[params.filters.status] ?? {}),
    ...(typeFilter ? { type: typeFilter } : {}),
  };

  const [rows, total, liveCount, scheduledCount, expiredCount, usage] = await Promise.all([
    db.offer.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { expiresAt: "asc" }],
      include: { category: { select: { name: true, slug: true } } },
      ...skipTake(params),
    }),
    db.offer.count({ where }),
    db.offer.count({ where: statusWhere.active }),
    db.offer.count({ where: statusWhere.scheduled }),
    db.offer.count({ where: statusWhere.expired }),
    db.offer.aggregate({ _sum: { usedCount: true } }),
  ]);
  const meta = pageMeta(total, params);
  const current = { q: params.q || undefined, status: params.filters.status, type: params.filters.type };

  return (
    <>
      <PageHeader
        title="Coupons & offers"
        description="Codes shoppers enter at checkout, plus bank offers. Live offers appear on the storefront /offers page automatically."
        actions={
          hasRole(session, "MANAGER") && (
            <Link href="/admin/offers/new" className={buttonClasses("primary", "sm")}>
              <Plus size={15} /> New offer
            </Link>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live now" value={liveCount} hint="Visible on the storefront" icon={<Ticket size={16} />} href="/admin/offers?status=active" />
        <StatCard label="Scheduled" value={scheduledCount} hint="Start in the future" icon={<CalendarClock size={16} />} href="/admin/offers?status=scheduled" />
        <StatCard label="Expired" value={expiredCount} hint="Past their end date" href="/admin/offers?status=expired" />
        <StatCard label="Redemptions" value={usage._sum.usedCount ?? 0} hint="All codes, all time" icon={<BadgePercent size={16} />} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search code or title…" defaultValue={params.q} className="w-full sm:w-72" />
        <ParamSelect
          name="status"
          value={params.filters.status}
          allLabel="All statuses"
          options={[
            { value: "active", label: "Active" },
            { value: "scheduled", label: "Scheduled" },
            { value: "expired", label: "Expired" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <ParamSelect
          name="type"
          value={params.filters.type}
          allLabel="All types"
          options={OFFER_TYPES.map((t) => ({ value: t, label: OFFER_TYPE[t].label }))}
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Code</Th>
            <Th>Offer</Th>
            <Th>Type</Th>
            <Th align="right">Value</Th>
            <Th align="right">Min spend</Th>
            <Th align="right">Max discount</Th>
            <Th>Scope</Th>
            <Th>Valid</Th>
            <Th align="right">Used</Th>
            <Th>Status</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={11}
              title={params.q || params.filters.status || params.filters.type ? "No offers match" : "No offers yet"}
              body={
                params.q || params.filters.status || params.filters.type
                  ? "Try a different search or clear the filters."
                  : "Create your first coupon code and it will show on the storefront as soon as it is live."
              }
            />
          ) : (
            rows.map((o) => {
              const status = offerStatus(o, now);
              const type = OFFER_TYPE[o.type];
              const canDelete = hasRole(session, "OWNER") && o.usedCount === 0;
              return (
                <Tr key={o.id}>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/offers/${o.id}`}
                        className="font-mono text-[12.5px] font-bold tracking-[0.06em] text-ink-950 hover:text-brand-700"
                      >
                        {o.code}
                      </Link>
                      <CopyButton value={o.code} label="" />
                    </div>
                  </Td>
                  <Td className="max-w-[260px]">
                    <Link href={`/admin/offers/${o.id}`} className="block truncate font-medium text-ink-950 hover:text-brand-700">
                      {o.title}
                    </Link>
                    <span className="block truncate text-[11.5px] text-ink-400">{o.description}</span>
                  </Td>
                  <Td>
                    <Pill tone={type.tone}>{type.short}</Pill>
                  </Td>
                  <Td align="right" className="font-medium text-ink-950">
                    {type.unit === "%" ? `${o.value}%` : formatINR(o.value)}
                    {o.type === "SHIPPING" && <span className="block text-[11px] font-normal text-ink-400">waived</span>}
                  </Td>
                  <Td align="right">{o.minSpend > 0 ? formatINR(o.minSpend) : <span className="text-ink-400">—</span>}</Td>
                  <Td align="right">{o.maxDiscount ? formatINR(o.maxDiscount) : <span className="text-ink-400">—</span>}</Td>
                  <Td>
                    {o.category ? (
                      <span className="text-ink-800">{o.category.name}</span>
                    ) : (
                      <span className="text-ink-500">Sitewide</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-[12.5px] tabular-nums text-ink-600">
                    <span className="block">{formatDate(o.startsAt, "short")}</span>
                    <span className="block text-ink-400">→ {formatDate(o.expiresAt, "short")}</span>
                  </Td>
                  <Td align="right">
                    <span className="font-medium text-ink-950">{o.usedCount}</span>
                    <span className="text-ink-400"> / {o.usageLimit ?? "∞"}</span>
                  </Td>
                  <Td>
                    <Pill tone={OFFER_STATUS[status].tone} dot>
                      {OFFER_STATUS[status].label}
                    </Pill>
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1">
                      {hasRole(session, "MANAGER") && (
                        <>
                          <Link
                            href={`/admin/offers/${o.id}`}
                            title="Edit"
                            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
                          >
                            <Pencil size={14} />
                          </Link>
                          <Form action={toggleOfferActive}>
                            <input type="hidden" name="id" value={o.id} />
                            <button
                              type="submit"
                              title={o.isActive ? "Deactivate" : "Activate"}
                              className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
                            >
                              <Power size={14} />
                            </button>
                          </Form>
                        </>
                      )}
                      {hasRole(session, "OWNER") && (
                        <ConfirmForm
                          action={deleteOffer}
                          message={
                            canDelete
                              ? `Delete ${o.code}? This cannot be undone.`
                              : `${o.code} has been redeemed ${o.usedCount} times and cannot be deleted. Deactivate it instead.`
                          }
                        >
                          <input type="hidden" name="id" value={o.id} />
                          <button
                            type="submit"
                            title={canDelete ? "Delete" : "Used codes cannot be deleted — deactivate instead"}
                            className={
                              canDelete
                                ? "rounded-md p-1.5 text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600"
                                : "cursor-not-allowed rounded-md p-1.5 text-ink-200"
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </ConfirmForm>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>

      <AdminPagination meta={meta} hrefFor={(p) => withParams("/admin/offers", current, { page: p })} label="offers" />
    </>
  );
}
