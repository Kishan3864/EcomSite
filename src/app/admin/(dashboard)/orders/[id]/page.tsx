import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeIndianRupee,
  Gift,
  MapPin,
  Package,
  Printer,
  RotateCcw,
  User,
} from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { buttonClasses } from "@/components/ui/button";
import {
  Card,
  DateCell,
  KeyValue,
  Money,
  PageHeader,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/admin/ui";
import { advanceOrderStatus, markCodPaid } from "@/services/admin/orders-actions";
import { cn, formatDateTime, formatINR, statusLabel } from "@/lib/utils";
import {
  ADVANCE_LABEL,
  DELIVERY_SPEED_LABEL,
  PAYMENT_METHOD_LABEL,
  addressLines,
  canCancel,
  nextStatus,
  toDateInput,
} from "../workflow";
import { AddEventForm, AdminNoteForm, CancelOrderForm, ShipmentForm } from "../order-forms";
import { Form } from "@/components/ui/form";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      lines: true,
      events: { orderBy: { at: "desc" } },
      returns: { include: { orderLine: { select: { title: true } } } },
      customer: { select: { id: true, name: true, tier: true, _count: { select: { orders: true } } } },
    },
  });
  if (!order) notFound();

  const canEdit = hasRole(session, "MANAGER");
  const advance = nextStatus(order.status);
  const showCod = order.paymentMethod === "COD" && order.paymentStatus !== "PAID";

  return (
    <>
      <PageHeader
        title={order.number}
        back={{ href: "/admin/orders", label: "Orders" }}
        meta={
          <>
            <StatusPill status={order.status} />
            <StatusPill status={order.paymentStatus} />
            <span className="text-[12px] text-ink-500">
              placed {formatDateTime(order.placedAt)}
            </span>
          </>
        }
        actions={
          <>
            <Link
              href={`/admin/orders/${order.id}/invoice`}
              target="_blank"
              className={buttonClasses("outline", "sm")}
            >
              <Printer size={14} /> Invoice
            </Link>
            {canEdit && showCod && (
              <Form action={markCodPaid}>
                <input type="hidden" name="id" value={order.id} />
                <button type="submit" className={buttonClasses("outline", "sm")}>
                  <BadgeIndianRupee size={14} /> Mark cash collected
                </button>
              </Form>
            )}
            {canEdit && advance && (
              <Form action={advanceOrderStatus}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value={advance} />
                <button type="submit" className={buttonClasses("primary", "sm")}>
                  {ADVANCE_LABEL[advance] ?? `Move to ${statusLabel(advance)}`}
                  <ArrowRight size={14} />
                </button>
              </Form>
            )}
          </>
        }
      />

      {order.status === "CANCELLED" && order.cancelReason && (
        <div className="mb-5 rounded-xl border border-sale-200 bg-sale-50 px-4 py-3 text-[13px] text-sale-700">
          <strong className="font-semibold">Cancelled:</strong> {order.cancelReason}
          {order.cancelledAt && <> · {formatDateTime(order.cancelledAt)}</>}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Card title={`${order.lines.length} item${order.lines.length === 1 ? "" : "s"}`} padded={false}>
            <Table className="rounded-none border-0">
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th align="right">Unit price</Th>
                  <Th align="right">Qty</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l) => (
                  <Tr key={l.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md bg-ink-100">
                          {/* Snapshot image stored on the line; any host is possible. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={l.image} alt="" className="h-full w-full object-cover" />
                        </span>
                        <span className="min-w-0">
                          {l.productId ? (
                            <Link
                              href={`/admin/products/${l.productId}`}
                              className="block truncate font-medium text-ink-950 hover:text-brand-700"
                            >
                              {l.title}
                            </Link>
                          ) : (
                            <span className="block truncate font-medium text-ink-950">{l.title}</span>
                          )}
                          <span className="block text-[11.5px] text-ink-400">
                            {l.brand}
                            {l.variantLabel ? ` · ${l.variantLabel}` : ""}
                          </span>
                        </span>
                      </div>
                    </Td>
                    <Td align="right">
                      <Money value={l.price} />
                      {l.mrp > l.price && (
                        <span className="block text-[11px] text-ink-400 line-through">
                          {formatINR(l.mrp)}
                        </span>
                      )}
                    </Td>
                    <Td align="right">{l.quantity}</Td>
                    <Td align="right">
                      <Money value={l.price * l.quantity} className="font-semibold text-ink-950" />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <dl className="space-y-2 border-t border-hairline px-5 py-4 text-[13px]">
              <Row label="Items total" value={formatINR(order.mrpTotal)} />
              {order.productDiscount > 0 && (
                <Row label="Product discount" value={`− ${formatINR(order.productDiscount)}`} save />
              )}
              {order.couponDiscount > 0 && (
                <Row
                  label={`Coupon ${order.couponCode ?? ""}`}
                  value={`− ${formatINR(order.couponDiscount)}`}
                  save
                />
              )}
              <Row
                label={order.deliveryName}
                value={order.shipping === 0 ? "Free" : formatINR(order.shipping)}
              />
              <Row label="GST (included)" value={formatINR(order.tax)} muted />
              <div className="flex items-baseline justify-between border-t border-hairline pt-2.5">
                <dt className="text-[14px] font-semibold text-ink-950">Total</dt>
                <dd className="text-[16px] font-semibold tabular-nums text-ink-950">
                  {formatINR(order.total)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Shipment">
            <ShipmentForm
              orderId={order.id}
              courier={order.courier ?? ""}
              awb={order.awb ?? ""}
              estimatedDelivery={toDateInput(order.estimatedDelivery)}
              readOnly={!canEdit}
            />
          </Card>

          <Card
            title="Timeline"
            description="What the customer sees on their tracking page."
            actions={canEdit ? <AddEventForm orderId={order.id} defaultLocation={order.shipCity} /> : null}
          >
            {order.events.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-ink-400">No updates yet.</p>
            ) : (
              <ol className="relative border-l border-hairline pl-6">
                {order.events.map((e, i) => (
                  <li key={e.id} className="relative pb-5 last:pb-0">
                    <span
                      className={cn(
                        "absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-surface",
                        i === 0 ? "bg-brand-600" : "bg-ink-300",
                      )}
                    />
                    <p className="text-[13.5px] font-semibold text-ink-950">{e.title}</p>
                    {e.description && (
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-600">
                        {e.description}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11.5px] text-ink-400">
                      {e.location} · {formatDateTime(e.at)}
                      {e.actorName ? ` · ${e.actorName}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {order.returns.length > 0 && (
            <Card title="Returns from this order" padded={false}>
              <ul className="divide-y divide-hairline">
                {order.returns.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <RotateCcw size={14} className="shrink-0 text-brand-600" />
                    <Link
                      href={`/admin/returns/${r.id}`}
                      className="min-w-0 flex-1 truncate text-[13px] text-ink-900 hover:text-brand-700"
                    >
                      {r.orderLine.title}
                    </Link>
                    <Money value={r.refundAmount} className="text-[12.5px] text-ink-600" />
                    <StatusPill status={r.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <Card title="Customer">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-[12px] font-bold text-brand-800">
                {order.contactName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                {order.customer ? (
                  <Link
                    href={`/admin/customers/${order.customer.id}`}
                    className="block font-semibold text-ink-950 hover:text-brand-700"
                  >
                    {order.contactName}
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 font-semibold text-ink-950">
                    {order.contactName}
                    <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-500">
                      Guest
                    </span>
                  </span>
                )}
                <a
                  href={`mailto:${order.contactEmail}`}
                  className="block truncate text-[12.5px] text-ink-600 hover:text-brand-700"
                >
                  {order.contactEmail}
                </a>
                <a
                  href={`tel:${order.contactPhone}`}
                  className="block text-[12.5px] text-ink-600 hover:text-brand-700"
                >
                  {order.contactPhone}
                </a>
                {order.customer && (
                  <p className="mt-1 text-[11.5px] text-ink-400">
                    {order.customer._count.orders} orders · {statusLabel(order.customer.tier)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card title="Delivery">
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-700">
              <MapPin size={14} className="mt-0.5 shrink-0 text-brand-600" />
              <span>
                {addressLines(order).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </p>
            <div className="mt-3 border-t border-hairline pt-3">
              <KeyValue
                rows={[
                  { label: "Speed", value: DELIVERY_SPEED_LABEL[order.deliverySpeed] },
                  {
                    label: "Expected",
                    value: <DateCell value={order.estimatedDelivery} />,
                  },
                  ...(order.scheduledDate
                    ? [{ label: "Scheduled for", value: <DateCell value={order.scheduledDate} /> }]
                    : []),
                  ...(order.deliveredAt
                    ? [{ label: "Delivered", value: <DateCell value={order.deliveredAt} time /> }]
                    : []),
                  ...(order.giftWrap
                    ? [
                        {
                          label: "Gift wrap",
                          value: (
                            <span className="inline-flex items-center gap-1.5 text-brand-700">
                              <Gift size={12} /> Yes
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </Card>

          <Card title="Payment">
            <KeyValue
              rows={[
                { label: "Method", value: PAYMENT_METHOD_LABEL[order.paymentMethod] },
                { label: "State", value: <StatusPill status={order.paymentStatus} /> },
                ...(order.paymentDetail ? [{ label: "Detail", value: order.paymentDetail }] : []),
                ...(order.paymentRef
                  ? [{ label: "Reference", value: <span className="font-mono text-[12px]">{order.paymentRef}</span> }]
                  : []),
                { label: "Amount", value: formatINR(order.total) },
              ]}
            />
          </Card>

          {order.customerNote && (
            <Card title="Customer note">
              <p className="text-[13px] leading-relaxed text-ink-700">{order.customerNote}</p>
            </Card>
          )}

          <Card title="Internal note" description="Your team only — never shown to the customer.">
            <AdminNoteForm orderId={order.id} note={order.adminNote ?? ""} />
          </Card>

          {canEdit && canCancel(order.status) && (
            <Card title="Danger zone">
              <CancelOrderForm orderId={order.id} />
            </Card>
          )}

          <Card title="Fulfilment" padded={false}>
            <ul className="divide-y divide-hairline text-[13px]">
              <li className="flex items-center gap-2 px-5 py-2.5">
                <Package size={14} className="text-ink-400" />
                <span className="flex-1 text-ink-600">Courier</span>
                <span className="text-ink-900">{order.courier ?? "Not set"}</span>
              </li>
              <li className="flex items-center gap-2 px-5 py-2.5">
                <User size={14} className="text-ink-400" />
                <span className="flex-1 text-ink-600">AWB</span>
                <span className="font-mono text-[12px] text-ink-900">{order.awb ?? "—"}</span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  save,
  muted,
}: {
  label: string;
  value: string;
  save?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={muted ? "text-ink-400" : "text-ink-600"}>{label}</dt>
      <dd
        className={
          save
            ? "font-semibold tabular-nums text-brand-700"
            : muted
              ? "tabular-nums text-ink-400"
              : "tabular-nums text-ink-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}
