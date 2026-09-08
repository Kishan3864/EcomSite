import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Crown, Power, UserCheck, UserRound, Users, X } from "lucide-react";
import type { Customer, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";
import { ConfirmForm, ParamSelect, SearchBox } from "@/components/admin/client";
import {
  AdminPagination,
  DateCell,
  EmptyRow,
  Money,
  PageHeader,
  Pill,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
  withParams,
} from "@/components/admin/ui";
import { setCustomerActive } from "@/services/admin/customers-actions";
import { insensitive, pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";
import { TIER_OPTIONS, TierPill, isAnonymised, isTier } from "./customer-meta";

const BASE = "/admin/customers";
const SORTS = ["createdAt", "orders", "spend"] as const;
type SortKey = (typeof SORTS)[number];
const isSortKey = (v: string): v is SortKey => (SORTS as readonly string[]).includes(v);

interface Stats {
  orders: number;
  spend: number;
  lastOrderAt: Date | null;
}

/**
 * Order count, lifetime spend and last order date per customer. Cancelled
 * orders never count towards spend, so they are excluded from all three.
 */
async function statsFor(ids: string[]): Promise<Map<string, Stats>> {
  const map = new Map<string, Stats>();
  if (ids.length === 0) return map;
  const groups = await db.order.groupBy({
    by: ["customerId"],
    where: { customerId: { in: ids }, status: { not: "CANCELLED" } },
    _count: { _all: true },
    _sum: { total: true },
    _max: { placedAt: true },
  });
  for (const g of groups) {
    if (!g.customerId) continue;
    map.set(g.customerId, { orders: g._count._all, spend: g._sum.total ?? 0, lastOrderAt: g._max.placedAt });
  }
  return map;
}

/**
 * Phones are stored as "+91 98450 12345"; people search for "9845012345" or
 * "+919845012345". Offer the stored spelling as an extra needle.
 */
function phoneNeedles(q: string): string[] {
  const digits = q.replace(/\D/g, "");
  if (digits.length < 4 || digits.length !== q.replace(/[\s+\-()]/g, "").length) return [q];
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  const needles = new Set([q, local]);
  if (local.length === 10) needles.add(`${local.slice(0, 5)} ${local.slice(5)}`);
  return [...needles];
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseListParams(raw, {
    perPage: 25,
    defaultSort: "createdAt",
    defaultDir: "desc",
    filterKeys: ["tier", "account", "status"],
  });
  const sort: SortKey = isSortKey(params.sort) ? params.sort : "createdAt";
  const { tier, account, status } = params.filters;
  const tierFilter = tier && isTier(tier) ? tier : undefined;

  const where: Prisma.CustomerWhereInput = {
    ...(params.q
      ? {
          OR: [
            { name: insensitive(params.q) },
            { email: insensitive(params.q) },
            ...phoneNeedles(params.q).map((n) => ({ phone: insensitive(n) })),
          ],
        }
      : {}),
    ...(tierFilter ? { tier: tierFilter } : {}),
    // A provider account has no password either, so "can sign in" is a password
    // OR a linked provider — not the presence of a hash.
    ...(account === "account"
      ? { OR: [{ passwordHash: { not: null } }, { providerId: { not: null } }] }
      : {}),
    ...(account === "guest" ? { passwordHash: null, providerId: null } : {}),
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
  };

  let rows: Customer[];
  let total: number;
  let stats: Map<string, Stats>;

  if (sort === "createdAt") {
    [rows, total] = await Promise.all([
      db.customer.findMany({ where, orderBy: { createdAt: params.dir }, ...skipTake(params) }),
      db.customer.count({ where }),
    ]);
    stats = await statsFor(rows.map((r) => r.id));
  } else {
    // Sorting by an aggregate: rank every matching customer, then fetch the page.
    const matches = await db.customer.findMany({ where, select: { id: true, createdAt: true } });
    total = matches.length;
    stats = await statsFor(matches.map((m) => m.id));
    const key = (id: string) => {
      const s = stats.get(id);
      return sort === "orders" ? (s?.orders ?? 0) : (s?.spend ?? 0);
    };
    const sign = params.dir === "asc" ? 1 : -1;
    const ordered = [...matches].sort(
      (a, b) => sign * (key(a.id) - key(b.id)) || b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const { skip, take } = skipTake(params);
    const pageIds = ordered.slice(skip, skip + take).map((m) => m.id);
    const fetched = await db.customer.findMany({ where: { id: { in: pageIds } } });
    const byId = new Map(fetched.map((c) => [c.id, c]));
    rows = pageIds.flatMap((id) => byId.get(id) ?? []);
  }

  const [totalCustomers, registered, peacock, inactive] = await Promise.all([
    db.customer.count(),
    db.customer.count({
      where: { OR: [{ passwordHash: { not: null } }, { providerId: { not: null } }] },
    }),
    db.customer.count({ where: { tier: "PEACOCK_CLUB" } }),
    db.customer.count({ where: { isActive: false } }),
  ]);

  const meta = pageMeta(total, params);
  const current: Record<string, string | undefined> = {
    q: params.q || undefined,
    tier: tierFilter,
    account: account === "account" || account === "guest" ? account : undefined,
    status: status === "active" || status === "inactive" ? status : undefined,
    sort: sort === "createdAt" ? undefined : sort,
    dir: params.dir === "desc" ? undefined : params.dir,
  };
  const listHref = withParams(BASE, current, { page: params.page > 1 ? params.page : null });
  const hasFilters = Boolean(current.q || current.tier || current.account || current.status);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who has signed up or checked out. Deactivate an account to block sign-in; anonymise it to honour an erasure request."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={totalCustomers.toLocaleString("en-IN")} icon={<Users size={16} />} href={BASE} />
        <StatCard
          label="Registered"
          value={registered.toLocaleString("en-IN")}
          hint={`${(totalCustomers - registered).toLocaleString("en-IN")} guest checkouts`}
          icon={<UserCheck size={16} />}
          href={withParams(BASE, {}, { account: "account" })}
        />
        <StatCard
          label="Peacock Club"
          value={peacock.toLocaleString("en-IN")}
          hint="Top loyalty tier"
          icon={<Crown size={16} />}
          href={withParams(BASE, {}, { tier: "PEACOCK_CLUB" })}
        />
        <StatCard
          label="Deactivated"
          value={inactive.toLocaleString("en-IN")}
          hint="Cannot sign in"
          icon={<UserRound size={16} />}
          href={withParams(BASE, {}, { status: "inactive" })}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search name, email or phone…" defaultValue={params.q} className="w-full sm:w-80" />
        <ParamSelect name="tier" value={tierFilter} allLabel="All tiers" options={TIER_OPTIONS} />
        <ParamSelect
          name="account"
          value={current.account}
          allLabel="Accounts & guests"
          options={[
            { value: "account", label: "Has account" },
            { value: "guest", label: "Guest checkout" },
          ]}
        />
        <ParamSelect
          name="status"
          value={current.status}
          allLabel="All statuses"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Deactivated" },
          ]}
        />
        {hasFilters && (
          <Link
            href={withParams(BASE, {}, { sort: current.sort, dir: current.dir })}
            className="inline-flex h-10 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={13} /> Clear
          </Link>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Customer</Th>
            <Th>Phone</Th>
            <Th>Tier</Th>
            <SortTh label="Orders" col="orders" sort={sort} dir={params.dir} current={current} align="right" />
            <SortTh label="Lifetime spend" col="spend" sort={sort} dir={params.dir} current={current} align="right" />
            <Th>Last order</Th>
            <SortTh label="Joined" col="createdAt" sort={sort} dir={params.dir} current={current} />
            <Th>Status</Th>
            {hasRole(session, "MANAGER") && <Th align="right">Actions</Th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={9}
              title={total > 0 ? "Nothing on this page" : hasFilters ? "No customers match" : "No customers yet"}
              body={
                total > 0
                  ? `Only ${meta.totalPages} page${meta.totalPages === 1 ? "" : "s"} of results — use Prev below to go back.`
                  : hasFilters
                    ? "Try a different search or clear the filters."
                    : "Customers appear here as soon as someone signs up or checks out."
              }
            />
          ) : (
            rows.map((c) => {
              const s = stats.get(c.id) ?? { orders: 0, spend: 0, lastOrderAt: null };
              const anon = isAnonymised(c);
              const guest = !c.passwordHash && !c.providerId;
              return (
                <Tr key={c.id}>
                  <Td>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <Link href={`${BASE}/${c.id}`} className="font-medium text-ink-950 hover:text-brand-700">
                        {c.name}
                      </Link>
                      {anon ? (
                        <Pill tone="ink">Anonymised</Pill>
                      ) : (
                        guest && (
                          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-400">Guest</span>
                        )
                      )}
                    </div>
                    <span className="block max-w-[260px] truncate text-[11.5px] text-ink-400">{c.email}</span>
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums">{c.phone ?? <span className="text-ink-300">—</span>}</Td>
                  <Td>
                    <TierPill tier={c.tier} />
                  </Td>
                  <Td align="right">{s.orders}</Td>
                  <Td align="right">
                    <Money value={s.spend} className={cn(s.spend === 0 && "text-ink-400")} />
                  </Td>
                  <Td>{s.lastOrderAt ? <DateCell value={s.lastOrderAt} /> : <span className="text-ink-300">—</span>}</Td>
                  <Td>
                    <DateCell value={c.createdAt} />
                  </Td>
                  <Td>
                    <Pill tone={c.isActive ? "brand" : "neutral"} dot>
                      {c.isActive ? "Active" : "Inactive"}
                    </Pill>
                  </Td>
                  {hasRole(session, "MANAGER") && (
                    <Td align="right">
                      {!anon && (
                        <ConfirmForm
                          action={setCustomerActive}
                          message={
                            c.isActive
                              ? `Deactivate ${c.name}? They will be signed out and unable to sign in until reactivated.`
                              : `Reactivate ${c.name}? They will be able to sign in again.`
                          }
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="active" value={c.isActive ? "false" : "true"} />
                          <input type="hidden" name="returnTo" value={listHref} />
                          <button
                            type="submit"
                            title={c.isActive ? "Deactivate" : "Reactivate"}
                            aria-label={c.isActive ? `Deactivate ${c.name}` : `Reactivate ${c.name}`}
                            className={cn(
                              "rounded-md p-1.5 transition-colors hover:bg-ink-100",
                              c.isActive ? "text-ink-400 hover:text-ink-900" : "text-brand-600 hover:text-brand-800",
                            )}
                          >
                            <Power size={14} />
                          </button>
                        </ConfirmForm>
                      )}
                    </Td>
                  )}
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>

      <AdminPagination meta={meta} hrefFor={(p) => withParams(BASE, current, { page: p })} label="customers" />
    </>
  );
}

function SortTh({
  label,
  col,
  sort,
  dir,
  current,
  align = "left",
}: {
  label: string;
  col: SortKey;
  sort: SortKey;
  dir: "asc" | "desc";
  current: Record<string, string | undefined>;
  align?: "left" | "right";
}) {
  const active = sort === col;
  const nextDir = active ? (dir === "desc" ? "asc" : "desc") : "desc";
  const href = withParams(BASE, current, {
    sort: col === "createdAt" ? null : col,
    dir: nextDir === "desc" ? null : nextDir,
    page: null,
  });
  return (
    <Th align={align}>
      <Link
        href={href}
        className={cn("group inline-flex items-center gap-1 transition-colors hover:text-ink-900", active && "text-ink-900")}
        title={`Sort by ${label.toLowerCase()}`}
      >
        {label}
        {active ? (
          dir === "desc" ? (
            <ArrowDown size={12} />
          ) : (
            <ArrowUp size={12} />
          )
        ) : (
          <ArrowUpDown size={12} className="opacity-0 transition-opacity group-hover:opacity-60" />
        )}
      </Link>
    </Th>
  );
}
