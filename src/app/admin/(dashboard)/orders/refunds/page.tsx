import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { formatINR } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
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
import { overstatedOrders } from "@/services/refunds";

/**
 * What the shop owes against what actually went back.
 *
 * Every row here is an order whose stored payment status claims money has been
 * returned while the refund ledger cannot show a rupee of it. They exist
 * because two paths — cancelling an order and settling a return — used to write
 * REFUNDED without calling the gateway, so the claim and the money parted
 * company.
 *
 * Deliberately read-only. Nothing here corrects a row, and the migration that
 * introduced this page rewrote nothing: the right answer differs per order —
 * a test order wants its status corrected, a real customer wants their money —
 * and that is a judgement, not a default.
 */
export const metadata = { title: "Refund reconciliation" };
export const dynamic = "force-dynamic";

export default async function RefundReconciliationPage() {
  await requireAdmin("MANAGER");
  const rows = await overstatedOrders();

  const totalClaimed = rows.reduce((sum, r) => sum + (r.state.owed || r.order.total), 0);
  const totalReturned = rows.reduce((sum, r) => sum + r.state.returned, 0);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Refund reconciliation"
        back={{ href: "/admin/orders", label: "Orders" }}
        meta={
          <span className="text-[12.5px] text-ink-500">
            Orders that say refunded while the ledger shows no money moved
          </span>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Orders to look at" value={String(rows.length)} />
        <StatCard label="Claimed as refunded" value={formatINR(totalClaimed)} />
        <StatCard label="Actually returned" value={formatINR(totalReturned)} />
      </div>

      {rows.length > 0 && (
        <div className="mb-5 flex items-start gap-2.5 bg-gold-50 px-4 py-3 text-[13px] leading-[1.6] text-ink-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-gold-700" />
          <p>
            Nothing on this page has been changed for you. Each row is either an old test order
            whose status needs correcting, or a real customer still owed money — and only you can
            tell which. Open the order to raise a real refund, or to record one you sent by hand.
          </p>
        </div>
      )}

      <Card title="Orders" padded={false}>
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Placed</Th>
              <Th>Says</Th>
              <Th align="right">Claimed</Th>
              <Th align="right">Returned</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={7}
                title="Everything lines up"
                body="No order claims a refund the ledger cannot account for."
              />
            ) : (
              rows.map(({ order, state }) => (
                <Tr key={order.id}>
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium tabular-nums text-ink-950 hover:text-brand-700"
                    >
                      {order.number}
                    </Link>
                    <span className="block text-[11.5px] text-ink-400">
                      {order.paymentMethod}
                    </span>
                  </Td>
                  <Td>
                    <span className="block truncate text-[13px] text-ink-800">
                      {order.contactName}
                    </span>
                    <span className="block truncate text-[11.5px] text-ink-400">
                      {order.contactEmail}
                    </span>
                  </Td>
                  <Td>
                    <DateCell value={order.placedAt} />
                  </Td>
                  <Td>
                    <Pill tone="gold">{order.paymentStatus.replace(/_/g, " ").toLowerCase()}</Pill>
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums">{formatINR(state.owed || order.total)}</span>
                  </Td>
                  <Td align="right">
                    <span
                      className={
                        state.returned === 0
                          ? "font-semibold tabular-nums text-red-700"
                          : "tabular-nums"
                      }
                    >
                      {formatINR(state.returned)}
                    </span>
                  </Td>
                  <Td align="right">
                    <Link href={`/admin/orders/${order.id}`} className={buttonClasses("outline", "sm")}>
                      Open
                    </Link>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
