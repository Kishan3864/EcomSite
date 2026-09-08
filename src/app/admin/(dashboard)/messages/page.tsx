import Link from "next/link";
import { CheckCheck, Clock, Mail, Sparkles } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { ParamSelect, SearchBox } from "@/components/admin/client";
import {
  AdminPagination,
  DateCell,
  EmptyRow,
  PageHeader,
  StatCard,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
  withParams,
} from "@/components/admin/ui";
import { insensitive, pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";

const STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "REPLIED", label: "Replied" },
  { value: "CLOSED", label: "Closed" },
];

function isStatus(value: string | undefined): value is "NEW" | "REPLIED" | "CLOSED" {
  return value === "NEW" || value === "REPLIED" || value === "CLOSED";
}

function excerpt(text: string, max = 110) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Midnight today and the most recent Monday, in server-local time. */
function periodStarts(now: Date) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = new Date(today);
  week.setDate(week.getDate() - ((today.getDay() + 6) % 7));
  return { today, week };
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireAdmin();
  const raw = await searchParams;
  const params = parseListParams(raw, {
    perPage: 20,
    defaultSort: "createdAt",
    defaultDir: "desc",
    filterKeys: ["status", "topic"],
  });
  const status = isStatus(params.filters.status) ? params.filters.status : undefined;
  const topic = params.filters.topic || undefined;

  const where: Prisma.ContactMessageWhereInput = {
    ...(status ? { status } : {}),
    ...(topic ? { topic } : {}),
    ...(params.q
      ? {
          OR: [
            { name: insensitive(params.q) },
            { email: insensitive(params.q) },
            { orderNumber: insensitive(params.q) },
            { message: insensitive(params.q) },
          ],
        }
      : {}),
  };

  const { today, week } = periodStarts(new Date());

  const [rows, total, topics, newToday, awaiting, repliedThisWeek] = await Promise.all([
    db.contactMessage.findMany({
      where,
      orderBy: { createdAt: params.dir },
      ...skipTake(params),
    }),
    db.contactMessage.count({ where }),
    db.contactMessage.findMany({ distinct: ["topic"], select: { topic: true }, orderBy: { topic: "asc" } }),
    db.contactMessage.count({ where: { createdAt: { gte: today } } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.contactMessage.count({ where: { status: "REPLIED", repliedAt: { gte: week } } }),
  ]);

  const meta = pageMeta(total, params);
  const current = {
    q: params.q || undefined,
    status,
    topic,
    dir: params.dir === "asc" ? "asc" : undefined,
  };
  const filtered = Boolean(params.q || status || topic);

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Messages from the storefront contact form. Reply, close what is done, and keep an eye on what is waiting."
        actions={
          <Link href="/admin/messages/subscribers" className={buttonClasses("outline", "sm")}>
            <Mail size={14} /> Newsletter subscribers
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="New today"
          value={newToday}
          hint="received since midnight"
          icon={<Sparkles size={16} />}
          href="/admin/messages?status=NEW"
        />
        <StatCard
          label="Awaiting reply"
          value={awaiting}
          hint={awaiting === 1 ? "open message with no reply" : "open messages with no reply"}
          icon={<Clock size={16} />}
          href="/admin/messages?status=NEW"
        />
        <StatCard
          label="Replied this week"
          value={repliedThisWeek}
          hint="since Monday"
          icon={<CheckCheck size={16} />}
          href="/admin/messages?status=REPLIED"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox
          placeholder="Search name, email, order number or message…"
          defaultValue={params.q}
          className="w-full sm:w-80"
        />
        <ParamSelect name="status" value={status} allLabel="All statuses" options={STATUS_OPTIONS} />
        <ParamSelect
          name="topic"
          value={topic}
          allLabel="All topics"
          options={topics.map((t) => ({ value: t.topic, label: t.topic }))}
        />
        <ParamSelect
          name="dir"
          value={current.dir}
          allLabel="Newest first"
          options={[{ value: "asc", label: "Oldest first" }]}
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Status</Th>
            <Th>From</Th>
            <Th>Topic</Th>
            <Th>Order</Th>
            <Th>Message</Th>
            <Th>Received</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={6}
              title={filtered ? "No messages match" : "Your inbox is empty"}
              body={
                filtered
                  ? "Try a different search, or clear the status and topic filters."
                  : "Messages sent through the storefront contact form will appear here."
              }
            />
          ) : (
            rows.map((m) => {
              const isNew = m.status === "NEW";
              return (
                <Tr key={m.id} className={cn(isNew && "bg-gold-50/40")}>
                  <Td>
                    <StatusPill status={m.status} />
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/messages/${m.id}`}
                      className={cn("text-ink-950 hover:text-brand-700", isNew ? "font-semibold" : "font-medium")}
                    >
                      {m.name}
                    </Link>
                    <span className="block max-w-[220px] truncate text-[11.5px] text-ink-400">{m.email}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-700">{m.topic}</Td>
                  <Td>
                    {m.orderNumber ? (
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(m.orderNumber)}`}
                        className="whitespace-nowrap font-medium tabular-nums text-brand-700 hover:underline"
                      >
                        {m.orderNumber}
                      </Link>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </Td>
                  <Td className="w-full max-w-0">
                    <Link href={`/admin/messages/${m.id}`} className="block truncate text-ink-600 hover:text-ink-900">
                      {excerpt(m.message)}
                    </Link>
                  </Td>
                  <Td>
                    <DateCell value={m.createdAt} time />
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>

      <AdminPagination
        meta={meta}
        hrefFor={(p) => withParams("/admin/messages", current, { page: p })}
        label="messages"
      />
    </>
  );
}
