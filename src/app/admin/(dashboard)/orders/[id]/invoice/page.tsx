import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPaise } from "@/lib/gst";
import { formatDate } from "@/lib/utils";
import { getInvoice } from "@/services/invoice";
import { PrintButton } from "./print-button";

export const metadata = { title: "Invoice" };

/**
 * Printable tax invoice. Deliberately plain: white background, no admin chrome,
 * and the shell hides its own sidebar and topbar when printing, so Ctrl+P gives
 * a clean page. The figures come from the same builder as the customer's copy —
 * the two must never disagree about what tax was charged.
 */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const { seller, billTo, shipTo, totals } = invoice;
  const heading = invoice.isBillOfSupply ? "Bill of supply" : "Tax invoice";
  const showDiscount = totals.discount > 0;

  return (
    <div className="mx-auto max-w-[880px] bg-white p-8 text-ink-900 print:max-w-none print:p-0">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          /* The admin canvas sits behind this sheet and would print with it. */
          html, body { background: #fff; }
          /* A table row split across two sheets, or a second sheet whose
             columns have lost their headings, is unreadable on paper. */
          tr { break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <a
          href={`/admin/orders/${invoice.orderId}`}
          className="text-[13px] font-medium text-brand-700 hover:underline"
        >
          ← Back to order
        </a>
        <PrintButton />
      </div>

      {invoice.isBillOfSupply && (
        <p className="mb-6 rounded-lg border border-sale-200 bg-sale-50 px-3.5 py-2.5 text-[13px] text-sale-700 print:hidden">
          There is no seller GSTIN on file, so this prints as a bill of supply rather than a tax
          invoice. Add the GSTIN under Settings → Tax before issuing it.
        </p>
      )}

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink-300 pb-5">
        <div className="max-w-sm">
          <p className="font-display text-[22px] font-semibold tracking-[-0.02em]">
            {seller.legalName}
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-600">{seller.address}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11.5px] text-ink-600">
            {!invoice.isBillOfSupply && <Meta label="GSTIN" value={seller.gstin} mono />}
            {seller.pan && <Meta label="PAN" value={seller.pan} mono />}
            <Meta label="State" value={`${seller.stateName} (${seller.stateCode})`} />
            <Meta label="Contact" value={`${seller.email} · ${seller.phone}`} />
          </dl>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            {heading}
          </p>
          <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Invoice no.
          </p>
          <p className="font-mono text-[15px] font-bold">{invoice.invoiceNumber}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Original for recipient
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] justify-items-end gap-x-3 gap-y-0.5 text-[11.5px] text-ink-600">
            <Meta label="Invoice date" value={formatDate(invoice.invoiceDate, "short")} />
            <Meta label="Order" value={invoice.orderNumber} mono />
            <Meta label="Order date" value={formatDate(invoice.orderDate, "short")} />
            <Meta
              label="Place of supply"
              value={`${invoice.placeOfSupply} (${invoice.placeOfSupplyCode})`}
            />
            <Meta label="Reverse charge" value="No" />
            {invoice.buyerGstin && <Meta label="Buyer GSTIN" value={invoice.buyerGstin} mono />}
          </dl>
        </div>
      </header>

      <section className="grid gap-6 border-b border-ink-200 py-5 sm:grid-cols-2">
        <Party title="Billed to" name={billTo.name} lines={billTo.lines}>
          {billTo.phone} · {billTo.email}
          <br />
          State: {billTo.state} ({billTo.stateCode})
        </Party>
        <Party title="Shipped to" name={shipTo.name} lines={shipTo.lines}>
          {shipTo.phone}
          <br />
          State: {shipTo.state} ({shipTo.stateCode})
        </Party>
      </section>

      <div className="mt-5 overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[720px] border-collapse text-[11px] print:min-w-0">
          <thead>
            <tr className="bg-ink-50 text-left align-bottom">
              <Th className="w-8">#</Th>
              <Th>Description</Th>
              <Th className="w-20">HSN / SAC</Th>
              <Th className="w-10 text-right">Qty</Th>
              <Th className="text-right">Rate (₹)</Th>
              {showDiscount && <Th className="text-right">Discount (₹)</Th>}
              <Th className="text-right">Taxable value (₹)</Th>
              {invoice.interState ? (
                <Th className="text-right">IGST (₹)</Th>
              ) : (
                <>
                  <Th className="text-right">CGST (₹)</Th>
                  <Th className="text-right">SGST (₹)</Th>
                </>
              )}
              <Th className="text-right">Total (₹)</Th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.serial} className="align-top">
                <Td className="text-ink-500">{line.serial}</Td>
                <Td>
                  {line.title}
                  {line.variantLabel && (
                    <span className="block text-[10px] text-ink-500">{line.variantLabel}</span>
                  )}
                </Td>
                <Td className="font-mono">{line.hsnCode}</Td>
                <Td className="text-right tabular-nums">
                  {line.quantity} {line.uqc}
                </Td>
                <Td className="text-right tabular-nums">{formatPaise(line.unitPaise)}</Td>
                {showDiscount && (
                  <Td className="text-right tabular-nums">
                    {line.discountPaise > 0 ? `− ${formatPaise(line.discountPaise)}` : "—"}
                  </Td>
                )}
                <Td className="text-right tabular-nums">{formatPaise(line.tax.taxable)}</Td>
                {invoice.interState ? (
                  <TaxCell amount={line.tax.igst} rate={line.taxRate} />
                ) : (
                  <>
                    <TaxCell amount={line.tax.cgst} rate={line.taxRate / 2} />
                    <TaxCell amount={line.tax.sgst} rate={line.taxRate / 2} />
                  </>
                )}
                <Td className="text-right font-semibold tabular-nums">
                  {formatPaise(line.totalPaise)}
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-ink-50 font-semibold">
              <Td colSpan={5} className="text-right">
                Total
              </Td>
              {showDiscount && (
                <Td className="text-right tabular-nums">− {formatPaise(totals.discount)}</Td>
              )}
              <Td className="text-right tabular-nums">{formatPaise(totals.taxable)}</Td>
              {invoice.interState ? (
                <Td className="text-right tabular-nums">{formatPaise(totals.igst)}</Td>
              ) : (
                <>
                  <Td className="text-right tabular-nums">{formatPaise(totals.cgst)}</Td>
                  <Td className="text-right tabular-nums">{formatPaise(totals.sgst)}</Td>
                </>
              )}
              <Td className="text-right tabular-nums">
                {formatPaise(totals.taxable + totals.tax)}
              </Td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-6 break-inside-avoid">
        <div className="max-w-sm text-[11.5px] leading-relaxed">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Amount in words
          </p>
          <p className="mt-1 font-medium">{invoice.amountInWords}</p>
          <p className="mt-3 text-ink-600">
            Payment: {invoice.payment.method} — {invoice.payment.status}
            {invoice.payment.reference && (
              <>
                <br />
                Reference: <span className="font-mono">{invoice.payment.reference}</span>
              </>
            )}
            {invoice.couponCode && (
              <>
                <br />
                Coupon applied: <span className="font-mono">{invoice.couponCode}</span>
              </>
            )}
          </p>
        </div>

        <dl className="w-full max-w-xs text-[12px]">
          {/* Gross and discount are context, not addends — the sum starts below the rule. */}
          <div className="space-y-1.5 border-b border-ink-200 pb-2">
            <Row
              label="Item total (incl. tax)"
              value={formatPaise(totals.itemsInclusiveBeforeDiscount)}
            />
            {showDiscount && <Row label="Discount" value={`− ${formatPaise(totals.discount)}`} />}
          </div>
          <div className="space-y-1.5 py-2">
            <Row label="Taxable value" value={formatPaise(totals.taxable)} />
            {invoice.interState ? (
              <Row label="IGST" value={formatPaise(totals.igst)} />
            ) : (
              <>
                <Row label="CGST" value={formatPaise(totals.cgst)} />
                <Row label="SGST" value={formatPaise(totals.sgst)} />
              </>
            )}
            {totals.roundOff !== 0 && (
              <Row
                label="Round off"
                value={`${totals.roundOff < 0 ? "− " : "+ "}${formatPaise(Math.abs(totals.roundOff))}`}
              />
            )}
          </div>
          <div className="flex justify-between border-t border-ink-300 pt-2 text-[14px] font-bold">
            <dt>Total payable</dt>
            <dd className="tabular-nums">₹ {formatPaise(totals.payable)}</dd>
          </div>
        </dl>
      </div>

      <section className="mt-6 break-inside-avoid">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          Tax summary by HSN / SAC
        </p>
        <div className="mt-2 overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[480px] border-collapse text-[11px] print:min-w-0">
            <thead>
              <tr className="bg-ink-50 text-left">
                <Th>HSN / SAC</Th>
                <Th className="w-16 text-right">Rate</Th>
                <Th className="text-right">Taxable value (₹)</Th>
                {invoice.interState ? (
                  <Th className="text-right">IGST (₹)</Th>
                ) : (
                  <>
                    <Th className="text-right">CGST (₹)</Th>
                    <Th className="text-right">SGST (₹)</Th>
                  </>
                )}
                <Th className="text-right">Total tax (₹)</Th>
              </tr>
            </thead>
            <tbody>
              {invoice.hsnSummary.map((row) => (
                <tr key={`${row.hsnCode}@${row.taxRate}`}>
                  <Td className="font-mono">{row.hsnCode}</Td>
                  <Td className="text-right tabular-nums">{row.taxRate}%</Td>
                  <Td className="text-right tabular-nums">{formatPaise(row.taxable)}</Td>
                  {invoice.interState ? (
                    <Td className="text-right tabular-nums">{formatPaise(row.igst)}</Td>
                  ) : (
                    <>
                      <Td className="text-right tabular-nums">{formatPaise(row.cgst)}</Td>
                      <Td className="text-right tabular-nums">{formatPaise(row.sgst)}</Td>
                    </>
                  )}
                  <Td className="text-right tabular-nums">
                    {formatPaise(row.cgst + row.sgst + row.igst)}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-ink-50 font-semibold">
                <Td colSpan={2} className="text-right">
                  Total
                </Td>
                <Td className="text-right tabular-nums">{formatPaise(totals.taxable)}</Td>
                {invoice.interState ? (
                  <Td className="text-right tabular-nums">{formatPaise(totals.igst)}</Td>
                ) : (
                  <>
                    <Td className="text-right tabular-nums">{formatPaise(totals.cgst)}</Td>
                    <Td className="text-right tabular-nums">{formatPaise(totals.sgst)}</Td>
                  </>
                )}
                <Td className="text-right tabular-nums">{formatPaise(totals.tax)}</Td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <footer className="mt-8 flex flex-wrap items-end justify-between gap-6 break-inside-avoid border-t border-ink-200 pt-4">
        <p className="max-w-md text-[10.5px] leading-relaxed text-ink-500">
          Whether tax is payable on reverse charge: No. We declare that this invoice shows the
          actual price of the goods described and that all particulars are true and correct. This is
          a computer-generated invoice and does not require a signature.
        </p>
        <div className="text-right text-[11px] leading-relaxed">
          <p className="font-medium text-ink-800">For {seller.legalName}</p>
          <p className="mt-6 text-[10.5px] uppercase tracking-[0.12em] text-ink-500">
            Authorised signatory
          </p>
        </div>
      </footer>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-ink-400">{label}</dt>
      <dd className={mono ? "font-mono" : undefined}>{value}</dd>
    </>
  );
}

function Party({
  title,
  name,
  lines,
  children,
}: {
  title: string;
  name: string;
  lines: string[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">{title}</p>
      <p className="mt-1.5 text-[12.5px] font-medium">{name}</p>
      <p className="text-[12px] leading-relaxed text-ink-700">
        {lines.map((l) => (
          <span key={l} className="block">
            {l}
          </span>
        ))}
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">{children}</p>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-ink-200 px-2 py-1.5 font-semibold ${className ?? ""}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`border border-ink-200 px-2 py-1.5 ${className ?? ""}`}>
      {children}
    </td>
  );
}

/** Tax cells carry the rate under the amount — a GST invoice has to show both. */
function TaxCell({ amount, rate }: { amount: number; rate: number }) {
  return (
    <Td className="text-right">
      <span className="block tabular-nums">{formatPaise(amount)}</span>
      <span className="block text-[9.5px] text-ink-500">{rate}%</span>
    </Td>
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
