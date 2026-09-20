import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { buttonClasses } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Card,
  DateCell,
  EmptyRow,
  PageHeader,
  Pill,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/admin/ui";
import { unblockContactSender } from "@/services/admin/messages-actions";

/**
 * What the contact form turned away, and who is on the blocklist.
 *
 * This page exists so an attack is something the owner can see rather than
 * something they infer from a quiet inbox. It is read-only apart from lifting a
 * block: the refusals themselves are a log, and a log you can edit is not one.
 *
 * No message body is shown, because none is stored — see the note on the
 * ContactAbuse model.
 */

const BASE = "/admin/messages/blocked";

/** Plain-language labels; the enum names are for the database, not the owner. */
const REASON: Record<string, { label: string; tone: "neutral" | "gold" | "brand" }> = {
  COOLDOWN: { label: "Too soon after the last one", tone: "neutral" },
  DAILY_CAP: { label: "Over the daily limit", tone: "neutral" },
  HONEYPOT: { label: "Filled the hidden field", tone: "gold" },
  TOO_FAST: { label: "Submitted in under 3s", tone: "gold" },
  VALIDATION: { label: "Failed validation", tone: "neutral" },
  LINK_SPAM: { label: "Links only", tone: "gold" },
  BLOCKED: { label: "On the blocklist", tone: "brand" },
};

function since(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export default async function BlockedPage() {
  const session = await requireAdmin();
  const canManage = hasRole(session, "MANAGER");

  const [attempts, blocks, last24h, last7d, topIps] = await Promise.all([
    db.contactAbuse.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.contactBlock.findMany({ orderBy: { createdAt: "desc" } }),
    db.contactAbuse.count({ where: { createdAt: { gte: since(24) } } }),
    db.contactAbuse.count({ where: { createdAt: { gte: since(24 * 7) } } }),
    db.contactAbuse.groupBy({
      by: ["ip"],
      where: { createdAt: { gte: since(24 * 7) }, ip: { not: null } },
      _count: { ip: true },
      orderBy: { _count: { ip: "desc" } },
      take: 5,
    }),
  ]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Blocked attempts"
        back={{ href: "/admin/messages", label: "Inbox" }}
        meta={
          <span className="text-[12.5px] text-ink-500">
            Contact submissions the form refused, newest first
          </span>
        }
        actions={
          <Link href="/admin/messages" className={buttonClasses("outline", "sm")}>
            Back to inbox
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Refused, last 24 hours" value={String(last24h)} />
        <StatCard label="Refused, last 7 days" value={String(last7d)} />
        <StatCard label="On the blocklist" value={String(blocks.length)} />
      </div>

      {topIps.length > 0 && topIps[0]._count.ip >= 10 ? (
        <div className="mb-5 flex items-start gap-2.5 bg-gold-50 px-4 py-3 text-[13px] leading-[1.6] text-ink-800">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-gold-700" />
          <p>
            <strong className="font-semibold">{topIps[0].ip}</strong> has been refused{" "}
            {topIps[0]._count.ip} times this week. If that is not a customer struggling with the
            form, block it from any of their messages.
          </p>
        </div>
      ) : null}

      <Card title="On the blocklist" padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>What</Th>
              <Th>Value</Th>
              <Th>Added</Th>
              <Th>By</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
          {blocks.length === 0 ? (
            <EmptyRow
              colSpan={5}
              title="Nobody is blocked"
              body="The rate limits do the work on their own. Block someone from their message when you need to."
            />
          ) : (
            blocks.map((block) => (
              <Tr key={block.id}>
                <Td>
                  <Pill tone={block.kind === "IP" ? "gold" : "neutral"}>
                    {block.kind === "IP" ? "IP" : "Email"}
                  </Pill>
                </Td>
                <Td>
                  <span className="font-mono text-[12.5px] text-ink-900">{block.value}</span>
                </Td>
                <Td>
                  <DateCell value={block.createdAt} time />
                </Td>
                <Td>
                  <span className="text-[12.5px] text-ink-600">{block.createdBy ?? "—"}</span>
                </Td>
                <Td>
                  {canManage ? (
                    <Form action={unblockContactSender}>
                      <input type="hidden" name="blockId" value={block.id} />
                      <input type="hidden" name="returnTo" value={BASE} />
                      <button type="submit" className={buttonClasses("outline", "sm")}>
                        Unblock
                      </button>
                    </Form>
                  ) : null}
                </Td>
              </Tr>
            ))
          )}
          </tbody>
        </Table>
      </Card>

      <div className="mt-5">
        <Card
          title="Recent refusals"
          description="The last 100. Nothing the sender typed is kept — only why it was turned away."
          padded={false}
        >
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Why</Th>
                <Th>Email</Th>
                <Th>IP</Th>
                <Th>Signed in</Th>
              </tr>
            </thead>
            <tbody>
            {attempts.length === 0 ? (
              <EmptyRow
                colSpan={5}
                title="Nothing has been refused yet"
                body="Submissions the form turns away will be listed here."
              />
            ) : (
              attempts.map((attempt) => {
                const reason = REASON[attempt.reason] ?? {
                  label: attempt.reason,
                  tone: "neutral" as const,
                };
                return (
                  <Tr key={attempt.id}>
                    <Td>
                      <DateCell value={attempt.createdAt} time />
                    </Td>
                    <Td>
                      <Pill tone={reason.tone}>{reason.label}</Pill>
                    </Td>
                    <Td>
                      <span className="truncate text-[12.5px] text-ink-700">
                        {attempt.email ?? "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[12.5px] tabular-nums text-ink-600">
                        {attempt.ip ?? "—"}
                      </span>
                    </Td>
                    <Td>
                      {attempt.customerId ? (
                        <Pill tone="brand">Account</Pill>
                      ) : (
                        <span className="text-[12.5px] text-ink-400">Guest</span>
                      )}
                    </Td>
                  </Tr>
                );
              })
            )}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
