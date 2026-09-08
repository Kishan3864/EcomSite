import { CalendarDays, Download, Trash2, Users } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmForm, ParamSelect, SearchBox } from "@/components/admin/client";
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
import { deleteSubscriber } from "@/services/admin/messages-actions";
import { insensitive, pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";

const BASE = "/admin/messages/subscribers";

function sourceLabel(source: string) {
  return source.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Midnight today, the most recent Monday and the 1st of the month, server-local. */
function periodStarts(now: Date) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = new Date(today);
  week.setDate(week.getDate() - ((today.getDay() + 6) % 7));
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  return { week, month };
}

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseListParams(raw, { perPage: 25, defaultSort: "createdAt", defaultDir: "desc", filterKeys: ["source"] });
  const source = params.filters.source || undefined;

  const where: Prisma.NewsletterSubscriberWhereInput = {
    ...(params.q ? { email: insensitive(params.q) } : {}),
    ...(source ? { source } : {}),
  };

  const { week, month } = periodStarts(new Date());

  const [rows, total, sources, allCount, weekCount, monthCount] = await Promise.all([
    db.newsletterSubscriber.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(params) }),
    db.newsletterSubscriber.count({ where }),
    db.newsletterSubscriber.findMany({ distinct: ["source"], select: { source: true }, orderBy: { source: "asc" } }),
    db.newsletterSubscriber.count(),
    db.newsletterSubscriber.count({ where: { createdAt: { gte: week } } }),
    db.newsletterSubscriber.count({ where: { createdAt: { gte: month } } }),
  ]);

  const meta = pageMeta(total, params);
  const current = { q: params.q || undefined, source };
  const filtered = Boolean(params.q || source);
  const returnTo = withParams(BASE, current, { page: params.page > 1 ? params.page : undefined });
  const exportHref = withParams(`${BASE}/export`, current, {});
  const canDelete = hasRole(session, "OWNER");

  return (
    <>
      <PageHeader
        title="Newsletter subscribers"
        back={{ href: "/admin/messages", label: "Inbox" }}
        description={
          allCount === 0
            ? "Nobody has signed up yet. The footer form and checkout opt-in feed this list."
            : `${allCount.toLocaleString("en-IN")} ${allCount === 1 ? "person has" : "people have"} opted in to hear from Mayura.`
        }
        actions={
          <a href={exportHref} className={buttonClasses("outline", "sm")} title="Download a CSV of the current list">
            <Download size={14} /> Export CSV{filtered ? " (filtered)" : ""}
          </a>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Subscribers" value={allCount.toLocaleString("en-IN")} hint="total on the list" icon={<Users size={16} />} />
        <StatCard label="Joined this week" value={weekCount} hint="since Monday" icon={<CalendarDays size={16} />} />
        <StatCard label="Joined this month" value={monthCount} hint="since the 1st" icon={<CalendarDays size={16} />} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search by email…" defaultValue={params.q} className="w-full sm:w-72" />
        <ParamSelect
          name="source"
          value={source}
          allLabel="All sources"
          options={sources.map((s) => ({ value: s.source, label: sourceLabel(s.source) }))}
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Email</Th>
            <Th>Source</Th>
            <Th>Subscribed</Th>
            {canDelete && <Th align="right">Actions</Th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={canDelete ? 4 : 3}
              title={filtered ? "No subscribers match" : "No subscribers yet"}
              body={
                filtered
                  ? "Try a different email or clear the source filter."
                  : "Sign-ups from the storefront footer and checkout will appear here."
              }
            />
          ) : (
            rows.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium text-ink-950">{s.email}</Td>
                <Td>
                  <Pill tone="neutral">{sourceLabel(s.source)}</Pill>
                </Td>
                <Td>
                  <DateCell value={s.createdAt} time />
                </Td>
                {canDelete && (
                  <Td align="right">
                    <ConfirmForm
                      action={deleteSubscriber}
                      message={`Remove ${s.email} from the newsletter? They will need to sign up again to receive emails.`}
                    >
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button
                        type="submit"
                        title="Remove subscriber"
                        className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </ConfirmForm>
                  </Td>
                )}
              </Tr>
            ))
          )}
        </tbody>
      </Table>

      <AdminPagination meta={meta} hrefFor={(p) => withParams(BASE, current, { page: p })} label="subscribers" />
    </>
  );
}
