import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Archive, Mail, Package, RotateCcw, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { formatDateTime } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { CopyButton } from "@/components/admin/client";
import { Card, DateCell, KeyValue, Money, PageHeader, Pill, StatusPill } from "@/components/admin/ui";
import { replyToMessage, setMessageStatus } from "@/services/admin/messages-actions";
import { ReplyForm } from "../reply-form";

const TIER: Record<string, { label: string; tone: "neutral" | "gold" | "brand" }> = {
  SILVER: { label: "Silver", tone: "neutral" },
  GOLD: { label: "Gold", tone: "gold" },
  PEACOCK_CLUB: { label: "Peacock Club", tone: "brand" },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;

  const message = await db.contactMessage.findUnique({ where: { id } });
  if (!message) notFound();

  const orderNumber = message.orderNumber?.trim() || null;
  const emailMatch = { equals: message.email, mode: "insensitive" as const };

  const [customer, order, guestOrders, earlier] = await Promise.all([
    db.customer.findFirst({
      where: { email: emailMatch },
      select: { id: true, name: true, tier: true, createdAt: true, _count: { select: { orders: true } } },
    }),
    orderNumber
      ? db.order.findFirst({
          where: { number: { equals: orderNumber, mode: "insensitive" } },
          select: { id: true, number: true, status: true, paymentStatus: true, total: true, placedAt: true, contactEmail: true },
        })
      : null,
    db.order.count({ where: { contactEmail: emailMatch } }),
    db.contactMessage.findMany({
      where: { email: emailMatch, NOT: { id } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, topic: true, status: true, createdAt: true },
    }),
  ]);

  const canManage = hasRole(session, "MANAGER");
  const replyAction = replyToMessage.bind(null, message.id);
  const isClosed = message.status === "CLOSED";

  const subject = `Re: ${message.topic}${orderNumber ? ` (${orderNumber})` : ""} — Mayura`;
  const mailto = `mailto:${message.email}?subject=${encodeURIComponent(subject)}${
    message.reply ? `&body=${encodeURIComponent(message.reply)}` : ""
  }`;

  const tier = customer ? (TIER[customer.tier] ?? { label: customer.tier, tone: "neutral" as const }) : null;
  const orderEmailMismatch = Boolean(order && order.contactEmail.toLowerCase() !== message.email.toLowerCase());

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <PageHeader
          title={message.topic}
          back={{ href: "/admin/messages", label: "Inbox" }}
          meta={
            <>
              <StatusPill status={message.status} />
              <span className="text-[12.5px] text-ink-500">
                from <span className="font-medium text-ink-800">{message.name}</span>
              </span>
              <span className="text-[12px] text-ink-400">·</span>
              <DateCell value={message.createdAt} time />
            </>
          }
          actions={
            <>
              <a href={mailto} className={buttonClasses("outline", "sm")}>
                <Mail size={14} /> Reply by email
              </a>
              {canManage &&
                (isClosed ? (
                  <form action={setMessageStatus}>
                    <input type="hidden" name="id" value={message.id} />
                    <input type="hidden" name="status" value={message.reply ? "REPLIED" : "NEW"} />
                    <button type="submit" className={buttonClasses("primary", "sm")}>
                      <RotateCcw size={14} /> Reopen
                    </button>
                  </form>
                ) : (
                  <form action={setMessageStatus}>
                    <input type="hidden" name="id" value={message.id} />
                    <input type="hidden" name="status" value="CLOSED" />
                    <button type="submit" className={buttonClasses("subtle", "sm")}>
                      <Archive size={14} /> Close
                    </button>
                  </form>
                ))}
            </>
          }
        />

        <div className="grid gap-5">
          <Card title="Message" padded={false}>
            <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-800">
                {initials(message.name) || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-ink-950">{message.name}</p>
                <p className="flex flex-wrap items-center gap-1 text-[12.5px] text-ink-500">
                  <span className="truncate">{message.email}</span>
                  <CopyButton value={message.email} label="Copy" />
                </p>
              </div>
              {orderNumber && (
                <Link
                  href={`/admin/orders?q=${encodeURIComponent(orderNumber)}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-[12px] font-medium tabular-nums text-ink-800 transition-colors hover:border-brand-500 hover:text-brand-700"
                >
                  <Package size={13} /> {orderNumber}
                </Link>
              )}
            </div>
            <p className="whitespace-pre-wrap px-5 py-5 text-[14px] leading-relaxed text-ink-900">{message.message}</p>
          </Card>

          <Card
            title="Reply"
            description={
              message.repliedAt
                ? `Replied ${formatDateTime(message.repliedAt)}${isClosed ? " · conversation closed" : ""}`
                : isClosed
                  ? "Closed without a reply"
                  : "No reply yet"
            }
          >
            <div className="grid gap-5">
              {message.reply && (
                <blockquote className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3 text-[13.5px] leading-relaxed text-ink-900 whitespace-pre-wrap">
                  {message.reply}
                </blockquote>
              )}
              {canManage ? (
                <ReplyForm action={replyAction} initial={message.reply ?? ""} hasReply={Boolean(message.reply)} />
              ) : (
                !message.reply && (
                  <p className="text-[13px] text-ink-500">A manager or the owner can reply to this message.</p>
                )
              )}
            </div>
          </Card>
        </div>
      </div>

      <aside className="space-y-4">
        <Card title="Customer">
          {customer ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-600">
                  <UserRound size={15} />
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="block truncate text-[13.5px] font-medium text-ink-950 hover:text-brand-700"
                  >
                    {customer.name}
                  </Link>
                  {tier && (
                    <Pill tone={tier.tone} className="mt-0.5">
                      {tier.label}
                    </Pill>
                  )}
                </div>
              </div>
              <KeyValue
                rows={[
                  {
                    label: "Orders",
                    value: (
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(message.email)}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {customer._count.orders} {customer._count.orders === 1 ? "order" : "orders"}
                      </Link>
                    ),
                  },
                  { label: "Customer since", value: <DateCell value={customer.createdAt} /> },
                ]}
              />
            </div>
          ) : (
            <div className="text-[13px] text-ink-600">
              <p>No account uses this email.</p>
              {guestOrders > 0 ? (
                <p className="mt-1.5">
                  <Link
                    href={`/admin/orders?q=${encodeURIComponent(message.email)}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {guestOrders} guest {guestOrders === 1 ? "order" : "orders"}
                  </Link>{" "}
                  were placed with it.
                </p>
              ) : (
                <p className="mt-1.5 text-ink-400">No orders were placed with it either.</p>
              )}
            </div>
          )}
        </Card>

        {orderNumber && (
          <Card title="Order">
            {order ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/orders?q=${encodeURIComponent(order.number)}`}
                    className="text-[13.5px] font-medium tabular-nums text-ink-950 hover:text-brand-700"
                  >
                    {order.number}
                  </Link>
                  <StatusPill status={order.status} />
                </div>
                <KeyValue
                  rows={[
                    { label: "Payment", value: <StatusPill status={order.paymentStatus} /> },
                    { label: "Total", value: <Money value={order.total} /> },
                    { label: "Placed", value: <DateCell value={order.placedAt} time /> },
                  ]}
                />
                {orderEmailMismatch && (
                  <p className="flex items-start gap-2 rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-[12px] leading-snug text-gold-800">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      This order was placed with <span className="font-medium">{order.contactEmail}</span>, not the
                      sender&apos;s email. Verify before sharing order details.
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <div className="text-[13px] text-ink-600">
                <p>
                  No order matches <span className="font-medium tabular-nums text-ink-900">{orderNumber}</span>.
                </p>
                <p className="mt-1.5 text-ink-400">
                  The customer may have mistyped it.{" "}
                  <Link
                    href={`/admin/orders?q=${encodeURIComponent(message.email)}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    Search their orders
                  </Link>
                </p>
              </div>
            )}
          </Card>
        )}

        {earlier.length > 0 && (
          <Card title="Earlier messages" description="From the same email address" padded={false}>
            <ul className="divide-y divide-hairline">
              {earlier.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/admin/messages/${e.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-canvas"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink-900">{e.topic}</span>
                      <DateCell value={e.createdAt} />
                    </span>
                    <StatusPill status={e.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Details">
          <KeyValue
            rows={[
              { label: "Received", value: <DateCell value={message.createdAt} time /> },
              {
                label: "Replied",
                value: message.repliedAt ? <DateCell value={message.repliedAt} time /> : <span className="text-ink-400">—</span>,
              },
              { label: "Status", value: <StatusPill status={message.status} /> },
              {
                label: "Reference",
                value: (
                  <span className="flex items-center gap-1 text-[12px] text-ink-500">
                    <span className="truncate font-mono">{message.id.slice(-8)}</span>
                    <CopyButton value={message.id} />
                  </span>
                ),
              },
            ]}
          />
        </Card>
      </aside>
    </div>
  );
}
