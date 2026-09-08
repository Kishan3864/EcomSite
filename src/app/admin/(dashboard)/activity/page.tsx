import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { ParamSelect, SearchBox } from "@/components/admin/client";
import {
  AdminPagination,
  EmptyRow,
  PageHeader,
  Pill,
  Table,
  Td,
  Th,
  Tr,
  withParams,
} from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";
import { insensitive, pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";

export const metadata = { title: "Activity log" };

const FILTER_KEYS = ["actor", "entity", "action", "from", "to"];

/** Where a logged entity can be opened, when the row still points somewhere. */
const ENTITY_LINK: Record<string, (id: string) => string> = {
  Order: (id) => `/admin/orders/${id}`,
  Product: (id) => `/admin/products/${id}`,
  Customer: (id) => `/admin/customers/${id}`,
  Brand: () => "/admin/brands",
  Category: () => "/admin/categories",
  Banner: (id) => `/admin/banners/${id}`,
  Offer: (id) => `/admin/offers/${id}`,
  Review: () => "/admin/reviews",
  Question: () => "/admin/reviews",
  ReturnRequest: () => "/admin/returns",
  ContactMessage: () => "/admin/messages",
  AdminUser: () => "/admin/settings/team",
  StoreSetting: () => "/admin/settings",
};

/** Deletions and cancellations read as warnings; the rest is routine. */
function toneFor(action: string) {
  if (/delete|remove|cancel|reject/.test(action)) return "sale" as const;
  if (/create|add/.test(action)) return "brand" as const;
  return "neutral" as const;
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireAdmin("MANAGER");
  const raw = await searchParams;
  const params = parseListParams(raw, { perPage: 40, filterKeys: FILTER_KEYS });
  const f = params.filters;

  const from = f.from ? new Date(f.from) : null;
  const to = f.to ? new Date(f.to) : null;
  const toEnd = to && !Number.isNaN(to.getTime())
    ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999)
    : null;
  const fromStart = from && !Number.isNaN(from.getTime()) ? from : null;

  const where: Prisma.ActivityLogWhereInput = {
    ...(params.q
      ? { OR: [{ summary: insensitive(params.q) }, { actorName: insensitive(params.q) }] }
      : {}),
    ...(f.actor ? { actorName: f.actor } : {}),
    ...(f.entity ? { entity: f.entity } : {}),
    ...(f.action ? { action: { startsWith: f.action } } : {}),
    ...(fromStart || toEnd
      ? { createdAt: { ...(fromStart ? { gte: fromStart } : {}), ...(toEnd ? { lte: toEnd } : {}) } }
      : {}),
  };

  const [rows, total, actors, entities, actionGroups] = await Promise.all([
    db.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(params) }),
    db.activityLog.count({ where }),
    db.activityLog.groupBy({ by: ["actorName"], orderBy: { actorName: "asc" } }),
    db.activityLog.groupBy({ by: ["entity"], orderBy: { entity: "asc" } }),
    db.activityLog.groupBy({ by: ["action"], orderBy: { action: "asc" } }),
  ]);

  // Actions are stored as "orders.cancel"; the filter offers the group only.
  const actionPrefixes = [...new Set(actionGroups.map((a) => a.action.split(".")[0]))].sort();

  const meta = pageMeta(total, params);
  const current = {
    q: params.q || undefined,
    actor: f.actor,
    entity: f.entity,
    action: f.action,
    from: f.from,
    to: f.to,
  };
  const filtered = Boolean(params.q) || Object.values(f).some(Boolean);

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Every change made from the admin panel, newest first. Records are kept even after the account that made them is removed."
        meta={
          <span className="text-[12.5px] text-ink-500">
            {total.toLocaleString("en-IN")} {total === 1 ? "entry" : "entries"}
            {filtered ? " matching" : " recorded"}
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox
          placeholder="Search what changed, or who changed it…"
          defaultValue={params.q}
          className="w-full sm:w-80"
        />
        <ParamSelect
          name="actor"
          value={f.actor}
          allLabel="Anyone"
          options={actors.map((a) => ({ value: a.actorName, label: a.actorName }))}
        />
        <ParamSelect
          name="entity"
          value={f.entity}
          allLabel="Anything"
          options={entities.map((e) => ({ value: e.entity, label: e.entity }))}
        />
        <ParamSelect
          name="action"
          value={f.action}
          allLabel="Any action"
          options={actionPrefixes.map((a) => ({ value: a, label: a }))}
        />
        <form className="flex items-center gap-1.5" action="/admin/activity">
          {params.q && <input type="hidden" name="q" value={params.q} />}
          {f.actor && <input type="hidden" name="actor" value={f.actor} />}
          {f.entity && <input type="hidden" name="entity" value={f.entity} />}
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
        </form>
        {filtered && (
          <Link
            href="/admin/activity"
            className="text-[12.5px] font-medium text-ink-500 underline-offset-2 hover:text-sale-600 hover:underline"
          >
            Clear
          </Link>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>When</Th>
            <Th>Who</Th>
            <Th>What changed</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={4}
              title={filtered ? "Nothing matches" : "Nothing recorded yet"}
              body={
                filtered
                  ? "Try a wider date range, or clear the filters."
                  : "Changes made from the admin panel will show up here."
              }
            />
          ) : (
            rows.map((row) => {
              const href = row.entityId ? ENTITY_LINK[row.entity]?.(row.entityId) : undefined;
              return (
                <Tr key={row.id}>
                  <Td>
                    <span className="whitespace-nowrap text-[12.5px] text-ink-600">
                      {formatDateTime(row.createdAt)}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-ink-900">{row.actorName}</span>
                  </Td>
                  <Td>
                    {href ? (
                      <Link href={href} className="text-ink-900 hover:text-brand-700">
                        {row.summary}
                      </Link>
                    ) : (
                      <span className="text-ink-900">{row.summary}</span>
                    )}
                    <span className="block text-[11px] text-ink-400">{row.entity}</span>
                  </Td>
                  <Td>
                    <Pill tone={toneFor(row.action)}>{row.action}</Pill>
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>

      <AdminPagination
        meta={meta}
        hrefFor={(p) => withParams("/admin/activity", current, { page: p })}
        label="entries"
      />
    </>
  );
}
