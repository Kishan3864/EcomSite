import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  IndianRupee,
  Inbox,
  RotateCcw,
  ShoppingCart,
  Star,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { BarList, TrendChart, type TrendPoint } from "@/components/admin/charts";
import {
  Card,
  DateCell,
  Money,
  PageHeader,
  StatCard,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/admin/ui";
import { cn, formatDate, formatINR } from "@/lib/utils";

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "365", label: "12 months" },
] as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function pctChange(now: number, before: number) {
  if (before === 0) return now === 0 ? 0 : 100;
  return Math.round(((now - before) / before) * 100);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await requireAdmin();
  const { range } = await searchParams;
  const days = RANGES.some((r) => r.key === range) ? Number(range) : 30;

  const now = new Date();
  const since = startOfDay(new Date(now.getTime() - (days - 1) * 86_400_000));
  const prevSince = new Date(since.getTime() - days * 86_400_000);

  const sold = { status: { not: "CANCELLED" as const } };

  const [
    current,
    previous,
    newCustomers,
    prevCustomers,
    statusCounts,
    recentOrders,
    lowStock,
    pendingReturns,
    pendingReviews,
    newMessages,
    activity,
    lines,
  ] = await Promise.all([
    db.order.findMany({ where: { ...sold, placedAt: { gte: since } }, select: { total: true, placedAt: true, customerId: true } }),
    db.order.findMany({ where: { ...sold, placedAt: { gte: prevSince, lt: since } }, select: { total: true } }),
    db.customer.count({ where: { createdAt: { gte: since } } }),
    db.customer.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 8,
      select: {
        id: true,
        number: true,
        contactName: true,
        contactEmail: true,
        total: true,
        status: true,
        paymentStatus: true,
        placedAt: true,
        _count: { select: { lines: true } },
      },
    }),
    db.product.findMany({
      where: { status: "ACTIVE", stock: { lte: db.product.fields.lowStockThreshold } },
      orderBy: { stock: "asc" },
      take: 6,
      select: { id: true, title: true, sku: true, stock: true, lowStockThreshold: true },
    }),
    db.returnRequest.count({ where: { status: "REQUESTED" } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.orderLine.findMany({
      where: { order: { ...sold, placedAt: { gte: since } } },
      select: { productId: true, title: true, slug: true, categorySlug: true, price: true, quantity: true },
    }),
  ]);

  const revenue = current.reduce((s, o) => s + o.total, 0);
  const prevRevenue = previous.reduce((s, o) => s + o.total, 0);
  const aov = current.length ? Math.round(revenue / current.length) : 0;
  const prevAov = previous.length ? Math.round(prevRevenue / previous.length) : 0;

  // Daily buckets for the trend (weekly when the range is a year).
  const bucketDays = days > 120 ? 7 : 1;
  const bucketCount = Math.ceil(days / bucketDays);
  const buckets: TrendPoint[] = Array.from({ length: bucketCount }, (_, i) => {
    const d = new Date(since.getTime() + i * bucketDays * 86_400_000);
    return {
      // "8 Sep" — short enough that six labels fit across the chart.
      label: formatDate(d, "day").replace(/^\w+,\s*/, ""),
      value: 0,
      count: 0,
    };
  });
  for (const o of current) {
    const idx = Math.min(bucketCount - 1, Math.floor((o.placedAt.getTime() - since.getTime()) / (bucketDays * 86_400_000)));
    if (idx >= 0) {
      buckets[idx].value += o.total;
      buckets[idx].count = (buckets[idx].count ?? 0) + 1;
    }
  }

  // Top products and category share from the period's lines.
  const byProduct = new Map<string, { label: string; value: number; href?: string; units: number }>();
  const byCategory = new Map<string, number>();
  for (const l of lines) {
    const key = l.productId ?? l.slug;
    const entry = byProduct.get(key) ?? { label: l.title, value: 0, href: l.productId ? `/admin/products/${l.productId}` : undefined, units: 0 };
    entry.value += l.price * l.quantity;
    entry.units += l.quantity;
    byProduct.set(key, entry);
    byCategory.set(l.categorySlug, (byCategory.get(l.categorySlug) ?? 0) + l.price * l.quantity);
  }
  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((p) => ({ label: p.label, value: p.value, href: p.href, hint: `${p.units} sold` }));
  const totalLineRevenue = [...byCategory.values()].reduce((a, b) => a + b, 0) || 1;
  const categoryShare = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug, v]) => ({
      label: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: Math.round((v / totalLineRevenue) * 100),
      href: `/admin/orders?category=${slug}`,
    }));

  const statusOrder = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"];
  const statusRows = statusOrder
    .map((s) => ({ status: s, count: statusCounts.find((c) => c.status === s)?._count._all ?? 0 }))
    .filter((r) => r.count > 0);

  const attention = [
    { icon: ShoppingCart, label: "Orders to pack", count: statusRows.find((r) => r.status === "CONFIRMED")?.count ?? 0, href: "/admin/orders?status=CONFIRMED" },
    { icon: RotateCcw, label: "Return requests", count: pendingReturns, href: "/admin/returns?status=REQUESTED" },
    { icon: Star, label: "Reviews to moderate", count: pendingReviews, href: "/admin/reviews?status=PENDING" },
    { icon: Inbox, label: "Unanswered messages", count: newMessages, href: "/admin/messages?status=NEW" },
    { icon: Boxes, label: "Low-stock products", count: lowStock.length, href: "/admin/inventory" },
  ];

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${session.name}`}
        description={`Here is how WeekendCart is doing over the last ${days === 365 ? "12 months" : `${days} days`}.`}
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-hairline bg-surface p-1">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/admin?range=${r.key}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  String(days) === r.key ? "bg-brand-900 text-white" : "text-ink-600 hover:bg-ink-100",
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatINR(revenue)} delta={{ value: pctChange(revenue, prevRevenue), label: "vs previous period" }} icon={<IndianRupee size={16} />} href="/admin/orders" />
        <StatCard label="Orders" value={current.length.toLocaleString("en-IN")} delta={{ value: pctChange(current.length, previous.length), label: "vs previous period" }} icon={<ShoppingCart size={16} />} href="/admin/orders" />
        <StatCard label="Average order" value={formatINR(aov)} delta={{ value: pctChange(aov, prevAov), label: "vs previous period" }} icon={<IndianRupee size={16} />} />
        <StatCard label="New customers" value={newCustomers.toLocaleString("en-IN")} delta={{ value: pctChange(newCustomers, prevCustomers), label: "vs previous period" }} icon={<Users size={16} />} href="/admin/customers" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Revenue" description={`${bucketDays === 1 ? "Daily" : "Weekly"} totals, cancelled orders excluded`}>
          <TrendChart points={buckets} />
        </Card>

        <Card title="Needs attention" padded={false}>
          <ul className="divide-y divide-hairline">
            {attention.map((a) => (
              <li key={a.label}>
                <Link href={a.href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-canvas">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", a.count > 0 ? "bg-gold-100 text-gold-800" : "bg-ink-100 text-ink-400")}>
                    <a.icon size={15} />
                  </span>
                  <span className="flex-1 text-[13.5px] text-ink-800">{a.label}</span>
                  <span className={cn("font-display text-[18px] tabular-nums", a.count > 0 ? "text-ink-950" : "text-ink-300")}>{a.count}</span>
                  <ArrowRight size={14} className="text-ink-300" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Top products" description="By revenue in this period">
          <BarList rows={topProducts} emptyText="No sales in this period yet." />
        </Card>
        <Card title="Category share" description="Of revenue in this period">
          <BarList rows={categoryShare} format="percent" emptyText="No sales in this period yet." />
        </Card>
        <Card title="Orders by status" description="All time">
          <BarList
            rows={statusRows.map((r) => ({ label: r.status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()), value: r.count, href: `/admin/orders?status=${r.status}` }))}
            format="count"
          />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card
          title="Recent orders"
          padded={false}
          actions={
            <Link href="/admin/orders" className="text-[12.5px] font-semibold text-brand-700 hover:underline">
              All orders
            </Link>
          }
        >
          <Table className="rounded-none border-0">
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th align="right">Items</Th>
                <Th align="right">Total</Th>
                <Th>Status</Th>
                <Th>Placed</Th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <Tr key={o.id}>
                  <Td>
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-[12.5px] font-semibold text-ink-950 hover:text-brand-700">
                      {o.number}
                    </Link>
                  </Td>
                  <Td>
                    <span className="block text-ink-900">{o.contactName}</span>
                    <span className="block text-[11.5px] text-ink-400">{o.contactEmail}</span>
                  </Td>
                  <Td align="right">{o._count.lines}</Td>
                  <Td align="right">
                    <Money value={o.total} className="font-semibold text-ink-950" />
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <StatusPill status={o.status} />
                      {o.paymentStatus !== "PAID" && <StatusPill status={o.paymentStatus} />}
                    </div>
                  </Td>
                  <Td>
                    <DateCell value={o.placedAt} time />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <div className="space-y-5">
          <Card
            title="Low stock"
            padded={false}
            actions={
              <Link href="/admin/inventory" className="text-[12.5px] font-semibold text-brand-700 hover:underline">
                Inventory
              </Link>
            }
          >
            {lowStock.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-ink-400">Everything is comfortably stocked.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                    <AlertTriangle size={14} className={p.stock === 0 ? "text-sale-600" : "text-gold-600"} />
                    <Link href={`/admin/products/${p.id}`} className="min-w-0 flex-1 truncate text-[13px] text-ink-900 hover:text-brand-700">
                      {p.title}
                    </Link>
                    <span className={cn("text-[12.5px] font-semibold tabular-nums", p.stock === 0 ? "text-sale-600" : "text-gold-800")}>
                      {p.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Recent activity"
            padded={false}
            actions={
              <Link href="/admin/activity" className="text-[12.5px] font-semibold text-brand-700 hover:underline">
                Full log
              </Link>
            }
          >
            <ul className="divide-y divide-hairline">
              {activity.map((a) => (
                <li key={a.id} className="px-5 py-2.5">
                  <p className="text-[13px] text-ink-900">{a.summary}</p>
                  <p className="text-[11.5px] text-ink-400">
                    {a.actorName} · <DateCell value={a.createdAt} time />
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
