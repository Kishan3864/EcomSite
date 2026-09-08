import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, IndianRupee, PackageCheck, ReceiptText } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { cn, formatDateTime, formatINR } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmForm, Notice, SubmitButton } from "@/components/admin/client";
import { Card, DateCell, KeyValue, Money, PageHeader, Pill, StatusPill, statusLabelOf } from "@/components/admin/ui";
import { decideReturn, markReturnPickedUp, refundReturn, updateReturnDetails } from "@/services/admin/returns-actions";
import {
  RETURN_STATUS_COPY,
  buildReturnTimeline,
  isRefundAmountEditable,
  shortReturnId,
  type TimelineStep,
} from "../return-helpers";
import { ReturnThumb } from "../return-thumb";
import { ReturnDecisionForm } from "../return-decision-form";
import { ReturnDetailsForm } from "../return-details-form";

export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;

  const row = await db.returnRequest.findUnique({
    where: { id },
    include: {
      orderLine: {
        include: { product: { select: { id: true, slug: true, stock: true, status: true } } },
      },
      order: {
        select: {
          id: true,
          number: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          paymentDetail: true,
          total: true,
          placedAt: true,
          deliveredAt: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          shipCity: true,
          shipState: true,
          lines: { select: { id: true, title: true, quantity: true, price: true } },
          returns: { select: { id: true, orderLineId: true, status: true } },
        },
      },
      customer: { select: { id: true, name: true, email: true, phone: true, tier: true } },
    },
  });
  if (!row) notFound();

  const canManage = hasRole(session, "MANAGER");
  const line = row.orderLine;
  const lineTotal = line.price * line.quantity;
  const detailPath = `/admin/returns/${row.id}`;
  const timeline = buildReturnTimeline(row);
  const customerName = row.customer?.name ?? row.order.contactName;
  const customerEmail = row.customer?.email ?? row.order.contactEmail;
  const customerPhone = row.customer?.phone ?? row.order.contactPhone;
  const refundedLines = new Set(row.order.returns.filter((r) => r.status === "REFUNDED").map((r) => r.orderLineId));
  const returnByLine = new Map(row.order.returns.map((r) => [r.orderLineId, r]));

  const headerAction =
    canManage && row.status === "APPROVED" ? (
      <ConfirmForm action={markReturnPickedUp} message={`Mark ${line.title} as picked up from the customer?`}>
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="next" value={detailPath} />
        <SubmitButton size="sm" pendingText="Updating…">
          <PackageCheck size={14} /> Mark picked up
        </SubmitButton>
      </ConfirmForm>
    ) : canManage && row.status === "PICKED_UP" ? (
      <ConfirmForm
        action={refundReturn}
        message={`Refund ${formatINR(row.refundAmount)} via ${row.refundMode}? This restocks ${line.quantity} × ${line.title} and updates the payment status of order ${row.order.number}. It cannot be undone.`}
      >
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="next" value={detailPath} />
        <SubmitButton size="sm" pendingText="Refunding…">
          <IndianRupee size={14} /> Issue refund of {formatINR(row.refundAmount)}
        </SubmitButton>
      </ConfirmForm>
    ) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <PageHeader
          title={line.title}
          back={{ href: "/admin/returns", label: "Returns" }}
          meta={
            <>
              <StatusPill status={row.status} />
              <span className="font-mono text-[12px] text-ink-400" title={row.id}>
                #{shortReturnId(row.id)}
              </span>
              <span className="text-[12px] text-ink-400">·</span>
              <span className="text-[12px] text-ink-500">Requested {formatDateTime(row.requestedAt)}</span>
              <span className="text-[12px] text-ink-400">·</span>
              <span className="text-[12px] text-ink-500">
                Refund <span className="font-medium text-ink-900 tabular-nums">{formatINR(row.refundAmount)}</span> via {row.refundMode}
              </span>
            </>
          }
          actions={headerAction}
        />

        <Card
          title="Item being returned"
          description="Snapshot of the order line at purchase time — later catalogue edits do not change it."
          actions={
            <>
              {line.product && (
                <Link href={`/admin/products/${line.product.id}`} className={buttonClasses("ghost", "xs")}>
                  <ReceiptText size={13} /> Product
                </Link>
              )}
              <Link href={`/p/${line.slug}`} target="_blank" className={buttonClasses("outline", "xs")}>
                <ExternalLink size={13} /> Storefront
              </Link>
            </>
          }
        >
          <div className="flex gap-4">
            <ReturnThumb src={line.image} alt={line.title} size={88} className="rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium leading-snug text-ink-950">{line.title}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-500">
                {line.brand}
                {line.variantLabel ? ` · ${line.variantLabel}` : ""}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-[13px]">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">Unit price</dt>
                  <dd className="mt-0.5 text-ink-900 tabular-nums">
                    {formatINR(line.price)}
                    {line.mrp > line.price && <span className="ml-1.5 text-[11.5px] text-ink-400 line-through">{formatINR(line.mrp)}</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">Quantity</dt>
                  <dd className="mt-0.5 text-ink-900 tabular-nums">{line.quantity}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">Line total</dt>
                  <dd className="mt-0.5 font-medium text-ink-950 tabular-nums">{formatINR(lineTotal)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[12.5px] text-ink-500">
                {line.product ? (
                  <>
                    Currently <span className="font-medium text-ink-800 tabular-nums">{line.product.stock}</span> in stock
                    {line.product.status !== "ACTIVE" && <> · <StatusPill status={line.product.status} /></>}
                    {row.status === "PICKED_UP" && <> · refunding adds {line.quantity} back.</>}
                  </>
                ) : (
                  "This product is no longer in the catalogue, so a refund will not restock anything."
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Reason">
          <p className="text-[14px] font-medium text-ink-950">{row.reason}</p>
          {row.details ? (
            <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">{row.details}</p>
          ) : (
            <p className="mt-2 text-[13px] text-ink-400">The customer did not add any further details.</p>
          )}
        </Card>

        {row.status === "REQUESTED" &&
          (canManage ? (
            <Card title="Decision" description="Approve to start the pickup, or reject with a note explaining why.">
              <ReturnDecisionForm action={decideReturn.bind(null, row.id)} productTitle={line.title} />
            </Card>
          ) : (
            <Notice tone="info">A manager needs to approve or reject this request before it can move forward.</Notice>
          ))}

        {canManage ? (
          <Card title="Refund & notes" description="The amount to refund and anything the team should know.">
            <ReturnDetailsForm
              action={updateReturnDetails.bind(null, row.id)}
              initial={{ refundAmount: row.refundAmount, adminNote: row.adminNote ?? "" }}
              lineTotal={lineTotal}
              refundMode={row.refundMode}
              amountEditable={isRefundAmountEditable(row.status)}
              lockedReason={`Locked once ${statusLabelOf(row.status).toLowerCase()}`}
            />
          </Card>
        ) : (
          <Card title="Refund & notes">
            <KeyValue
              rows={[
                { label: "Refund amount", value: <Money value={row.refundAmount} className="font-medium" /> },
                { label: "Refund mode", value: row.refundMode },
                {
                  label: "Admin note",
                  value: row.adminNote ? (
                    <span className="whitespace-pre-line">{row.adminNote}</span>
                  ) : (
                    <span className="text-ink-400">None yet</span>
                  ),
                },
              ]}
            />
          </Card>
        )}
      </div>

      <aside className="space-y-4">
        <Card title="Timeline">
          <Timeline steps={timeline} rejected={row.status === "REJECTED"} />
          <p className="mt-4 border-t border-hairline pt-3 text-[11.5px] text-ink-400">Last updated {formatDateTime(row.updatedAt)}</p>
        </Card>

        <Card
          title="Order"
          actions={
            <Link href={`/admin/orders/${row.order.id}`} className={buttonClasses("ghost", "xs")}>
              Open <ExternalLink size={12} />
            </Link>
          }
        >
          <KeyValue
            rows={[
              {
                label: "Number",
                value: (
                  <Link href={`/admin/orders/${row.order.id}`} className="font-medium text-brand-700 hover:underline">
                    {row.order.number}
                  </Link>
                ),
              },
              { label: "Status", value: <StatusPill status={row.order.status} /> },
              {
                label: "Payment",
                value: (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <StatusPill status={row.order.paymentStatus} />
                    <span className="text-[12px] text-ink-500">
                      {row.order.paymentMethod}
                      {row.order.paymentDetail ? ` · ${row.order.paymentDetail}` : ""}
                    </span>
                  </span>
                ),
              },
              { label: "Order total", value: <Money value={row.order.total} className="font-medium" /> },
              { label: "Placed", value: <DateCell value={row.order.placedAt} /> },
              {
                label: "Delivered",
                value: row.order.deliveredAt ? <DateCell value={row.order.deliveredAt} /> : <span className="text-ink-400">Not yet</span>,
              },
              { label: "Ship to", value: `${row.order.shipCity}, ${row.order.shipState}` },
            ]}
          />
          <div className="mt-3 border-t border-hairline pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
              Lines · {refundedLines.size}/{row.order.lines.length} refunded
            </p>
            <ul className="space-y-1.5">
              {row.order.lines.map((l) => {
                const ret = returnByLine.get(l.id);
                const isThis = l.id === line.id;
                return (
                  <li key={l.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className={cn("min-w-0 truncate", isThis ? "font-medium text-ink-950" : "text-ink-700")}>
                      {l.quantity} × {l.title}
                    </span>
                    {ret ? (
                      isThis ? (
                        <StatusPill status={ret.status} />
                      ) : (
                        <Link href={`/admin/returns/${ret.id}`} title="Open this return">
                          <StatusPill status={ret.status} />
                        </Link>
                      )
                    ) : (
                      <span className="shrink-0 text-[11.5px] text-ink-400">Kept</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        <Card title="Customer">
          <KeyValue
            rows={[
              {
                label: "Name",
                value: row.customer ? (
                  <Link href={`/admin/customers/${row.customer.id}`} className="font-medium text-brand-700 hover:underline">
                    {customerName}
                  </Link>
                ) : (
                  <span>
                    {customerName} <Pill className="ml-1">Guest</Pill>
                  </span>
                ),
              },
              {
                label: "Email",
                value: (
                  <a href={`mailto:${customerEmail}`} className="break-all hover:text-brand-700">
                    {customerEmail}
                  </a>
                ),
              },
              {
                label: "Phone",
                value: customerPhone ? (
                  <a href={`tel:${customerPhone}`} className="hover:text-brand-700">
                    {customerPhone}
                  </a>
                ) : (
                  <span className="text-ink-400">—</span>
                ),
              },
              ...(row.customer ? [{ label: "Tier", value: <Pill tone="gold">{row.customer.tier.replace(/_/g, " ")}</Pill> }] : []),
            ]}
          />
        </Card>
      </aside>
    </div>
  );
}

function Timeline({ steps, rejected }: { steps: TimelineStep[]; rejected: boolean }) {
  return (
    <ol className="relative ml-1.5 border-l border-hairline">
      {steps.map((s) => (
        <li key={s.status} className="relative pb-5 pl-5 last:pb-0">
          <span
            className={cn(
              "absolute -left-[5.5px] top-1.5 h-2.5 w-2.5 rounded-full border-2",
              s.state === "done" && "border-brand-600 bg-brand-600",
              s.state === "current" && (rejected ? "border-sale-500 bg-sale-500" : "border-brand-600 bg-surface ring-4 ring-brand-100"),
              s.state === "upcoming" && "border-ink-300 bg-surface",
            )}
          />
          <p className={cn("text-[13px] font-medium leading-tight", s.state === "upcoming" ? "text-ink-400" : "text-ink-900")}>{s.label}</p>
          {s.at ? (
            <p className="mt-0.5 text-[12px] text-ink-500">{formatDateTime(s.at)}</p>
          ) : (
            <p className="mt-0.5 text-[12px] text-ink-400">Pending</p>
          )}
          {s.state === "current" && <p className="mt-0.5 text-[11.5px] text-ink-400">{RETURN_STATUS_COPY[s.status].hint}</p>}
        </li>
      ))}
    </ol>
  );
}
