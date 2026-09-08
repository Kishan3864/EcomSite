import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { getSettings } from "@/services/settings";
import { formatDate, formatINR } from "@/lib/utils";
import { PAYMENT_METHOD_LABEL, addressLines } from "../../workflow";
import { PrintButton } from "./print-button";

export const metadata = { title: "Invoice" };

/**
 * Printable tax invoice. Deliberately plain: white background, no admin chrome,
 * and a print stylesheet that hides the toolbar so Ctrl+P gives a clean page.
 */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { id }, include: { lines: true } }),
    getSettings(),
  ]);
  if (!order) notFound();

  const gstRate = settings.tax.gstRate;
  // Prices include GST, so the taxable value is backed out of each line.
  const lines = order.lines.map((l) => {
    const gross = l.price * l.quantity;
    const taxable = Math.round(gross / (1 + gstRate / 100));
    return { ...l, gross, taxable, tax: gross - taxable };
  });
  const taxableTotal = lines.reduce((s, l) => s + l.taxable, 0);
  const taxTotal = lines.reduce((s, l) => s + l.tax, 0);

  return (
    <div className="mx-auto max-w-[820px] bg-white p-8 text-ink-900 print:p-0">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>

      <div className="no-print mb-6 flex items-center justify-between gap-4">
        <a href={`/admin/orders/${order.id}`} className="text-[13px] font-medium text-brand-700 hover:underline">
          ← Back to order
        </a>
        <PrintButton />
      </div>

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink-200 pb-6">
        <div>
          <p className="font-display text-[24px] font-semibold tracking-[-0.02em]">
            {settings.store.name}
          </p>
          <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-ink-600">
            {settings.store.legalName}
            <br />
            {settings.store.address}
            <br />
            GSTIN {settings.store.gstin}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Tax invoice
          </p>
          <p className="mt-1 font-mono text-[15px] font-bold">{order.number}</p>
          <p className="mt-1 text-[12px] text-ink-600">
            Dated {formatDate(order.placedAt)}
            <br />
            Payment: {PAYMENT_METHOD_LABEL[order.paymentMethod]}
            {order.paymentStatus === "PAID" ? " (paid)" : " (pending)"}
          </p>
        </div>
      </header>

      <section className="grid gap-6 border-b border-ink-200 py-6 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Billed to
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed">
            {addressLines(order).map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
          <p className="mt-1 text-[12px] text-ink-600">
            {order.contactEmail}
            <br />
            {order.contactPhone}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Shipment
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed">
            {order.deliveryName}
            <br />
            {order.courier ?? "Courier not assigned"}
            {order.awb ? ` · AWB ${order.awb}` : ""}
            <br />
            Expected {formatDate(order.estimatedDelivery)}
          </p>
        </div>
      </section>

      <table className="mt-6 w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-ink-300">
            <th className="py-2 text-left font-semibold">Item</th>
            <th className="py-2 text-right font-semibold">Qty</th>
            <th className="py-2 text-right font-semibold">Taxable</th>
            <th className="py-2 text-right font-semibold">GST {gstRate}%</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-ink-100">
              <td className="py-2.5 pr-3">
                {l.title}
                {l.variantLabel && <span className="block text-[11px] text-ink-500">{l.variantLabel}</span>}
              </td>
              <td className="py-2.5 text-right tabular-nums">{l.quantity}</td>
              <td className="py-2.5 text-right tabular-nums">{formatINR(l.taxable)}</td>
              <td className="py-2.5 text-right tabular-nums">{formatINR(l.tax)}</td>
              <td className="py-2.5 text-right font-semibold tabular-nums">{formatINR(l.gross)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <dl className="w-full max-w-xs space-y-1.5 text-[12.5px]">
          <Row label="Taxable value" value={formatINR(taxableTotal)} />
          <Row label={`GST @ ${gstRate}%`} value={formatINR(taxTotal)} />
          {order.couponDiscount > 0 && (
            <Row label={`Coupon ${order.couponCode ?? ""}`} value={`− ${formatINR(order.couponDiscount)}`} />
          )}
          <Row
            label="Delivery"
            value={order.shipping === 0 ? "Free" : formatINR(order.shipping)}
          />
          <div className="flex justify-between border-t border-ink-300 pt-2 text-[14px] font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatINR(order.total)}</dd>
          </div>
        </dl>
      </div>

      <footer className="mt-10 border-t border-ink-200 pt-4 text-[11px] leading-relaxed text-ink-500">
        <p>
          All prices are inclusive of GST. This is a computer-generated invoice and does not require
          a signature.
        </p>
        <p className="mt-1">
          Questions? {settings.store.supportEmail} · {settings.store.supportPhone}
        </p>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-600">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
