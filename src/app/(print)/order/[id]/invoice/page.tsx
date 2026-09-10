import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatPaise } from "@/lib/gst";
import { cn, formatDate } from "@/lib/utils";
import { getInvoiceForViewer } from "@/services/invoice";
import { PrintToolbar } from "./print-toolbar";

// generateMetadata and the page both need the invoice; one request, one read.
const invoiceForViewer = cache(getInvoiceForViewer);

/** A rate as an invoice prints it: 9, not 9.00; 2.5, not 2.50. */
const percent = (rate: number) => `${Number(rate.toFixed(2))}%`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const invoice = await invoiceForViewer(id);
  return {
    title: invoice
      ? `${invoice.isBillOfSupply ? "Bill of supply" : "Tax invoice"} ${invoice.invoiceNumber}`
      : "Invoice",
    robots: { index: false, follow: false },
  };
}

/**
 * The customer's copy of the invoice, on a page of its own so that printing it
 * yields the document and not the shop around it. Every figure comes from the
 * invoice builder: nothing is recomputed here and nothing is rounded again.
 */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await invoiceForViewer(id);
  if (!invoice) notFound();

  const { seller, billTo, shipTo, totals, lines } = invoice;
  const heading = invoice.isBillOfSupply ? "Bill of supply" : "Tax invoice";
  const taxHeads = invoice.interState ? 1 : 2;

  return (
    <div
      id="invoice-sheet"
      className="mx-auto max-w-[860px] px-4 py-6 sm:px-8 sm:py-10 print:max-w-none print:p-0"
    >
      <PrintToolbar backHref={`/order/${invoice.orderId}`} />

      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink-800 pb-4">
        <div className="max-w-sm">
          <p className="font-display text-[21px] leading-tight font-semibold tracking-[-0.02em] text-ink-950">
            {seller.legalName}
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-700">{seller.address}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11.5px]">
            {seller.gstin && <Field label="GSTIN" value={seller.gstin} mono />}
            {seller.pan && <Field label="PAN" value={seller.pan} mono />}
            <Field label="State" value={`${seller.stateName} (${seller.stateCode})`} />
            <Field label="Contact" value={`${seller.email} · ${seller.phone}`} />
          </dl>
        </div>
        <div className="text-right">
          <p className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink-950">
            {heading}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
            Original for recipient
          </p>
          <p className="mt-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Invoice no.
          </p>
          <p className="font-mono text-[14px] font-bold text-ink-950">{invoice.invoiceNumber}</p>
        </div>
      </header>

      <dl className="grid gap-x-6 gap-y-2.5 border-b border-ink-300 py-4 text-[11.5px] sm:grid-cols-3 print:gap-y-1.5 print:py-2.5 print:text-[10px]">
        <MetaField label="Invoice date" value={formatDate(invoice.invoiceDate, "short")} />
        <MetaField label="Order number" value={invoice.orderNumber} mono />
        <MetaField label="Order date" value={formatDate(invoice.orderDate, "short")} />
        <MetaField
          label="Place of supply"
          value={`${invoice.placeOfSupply} (${invoice.placeOfSupplyCode})`}
        />
        <MetaField label="Supply" value={invoice.interState ? "Inter-state" : "Intra-state"} />
        <MetaField label="Reverse charge" value="No" />
        {invoice.buyerGstin && <MetaField label="Buyer GSTIN" value={invoice.buyerGstin} mono />}
      </dl>

      <section className="grid border-b border-ink-300 sm:grid-cols-2">
        <Party title="Billed to" name={billTo.name} lines={billTo.lines}>
          {billTo.state} ({billTo.stateCode})
          <br />
          {billTo.phone} · {billTo.email}
        </Party>
        <Party
          title="Shipped to"
          name={shipTo.name}
          lines={shipTo.lines}
          className="sm:border-l sm:border-ink-300 sm:pl-5"
        >
          {shipTo.state} ({shipTo.stateCode})
          <br />
          {shipTo.phone}
        </Party>
      </section>

      <div className="mt-5 overflow-x-auto print:mt-3 print:overflow-visible">
        <table className="w-full min-w-[720px] border-collapse text-[11px] print:min-w-0 print:text-[9.5px]">
          <thead>
            <tr>
              <Th rowSpan={2} className="w-8">
                Sl
              </Th>
              <Th rowSpan={2}>Description</Th>
              <Th rowSpan={2} className="w-20">
                HSN / SAC
              </Th>
              <Th rowSpan={2} className="w-10 text-right">
                Qty
              </Th>
              <Th rowSpan={2} className="text-right">
                Rate (₹)
              </Th>
              <Th rowSpan={2} className="text-right">
                Taxable value (₹)
              </Th>
              <TaxHeads interState={invoice.interState} />
              <Th rowSpan={2} className="text-right">
                Total (₹)
              </Th>
            </tr>
            <tr>
              {Array.from({ length: taxHeads }, (_, i) => (
                <TaxSubHeads key={i} />
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.serial} className="align-top">
                <Td className="text-ink-500">{line.serial}</Td>
                <Td>
                  {line.title}
                  {line.variantLabel && (
                    <span className="mt-0.5 block text-[10px] text-ink-500">
                      {line.variantLabel}
                    </span>
                  )}
                </Td>
                <Td className="font-mono">{line.hsnCode}</Td>
                <Td className="text-right tabular-nums">
                  {line.quantity} {line.uqc}
                </Td>
                <Td className="text-right tabular-nums">{formatPaise(line.unitPaise)}</Td>
                <Td className="text-right tabular-nums">{formatPaise(line.tax.taxable)}</Td>
                {invoice.interState ? (
                  <TaxCells rate={line.taxRate} amount={line.tax.igst} />
                ) : (
                  <>
                    <TaxCells rate={line.taxRate / 2} amount={line.tax.cgst} />
                    <TaxCells rate={line.taxRate / 2} amount={line.tax.sgst} />
                  </>
                )}
                <Td className="text-right font-semibold tabular-nums">
                  {formatPaise(line.totalPaise)}
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <Td colSpan={5} className="text-right">
                Total
              </Td>
              <Td className="text-right tabular-nums">{formatPaise(totals.taxable)}</Td>
              {invoice.interState ? (
                <TaxCells amount={totals.igst} />
              ) : (
                <>
                  <TaxCells amount={totals.cgst} />
                  <TaxCells amount={totals.sgst} />
                </>
              )}
              <Td className="text-right tabular-nums">
                {formatPaise(totals.taxable + totals.tax)}
              </Td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex justify-end break-inside-avoid print:mt-2.5">
        <dl className="w-full max-w-[300px] border border-ink-400 py-1 text-[11.5px]">
          {totals.discount > 0 && (
            <>
              <Total
                label="Item total (incl. tax)"
                value={formatPaise(totals.itemsInclusiveBeforeDiscount)}
              />
              <Total
                label={invoice.couponCode ? `Discount (${invoice.couponCode})` : "Discount"}
                value={`− ${formatPaise(totals.discount)}`}
              />
            </>
          )}
          <Total label="Taxable value" value={formatPaise(totals.taxable)} />
          {invoice.interState ? (
            <Total label="IGST" value={formatPaise(totals.igst)} />
          ) : (
            <>
              <Total label="CGST" value={formatPaise(totals.cgst)} />
              <Total label="SGST" value={formatPaise(totals.sgst)} />
            </>
          )}
          {totals.roundOff !== 0 && (
            <Total
              label="Round off"
              value={`${totals.roundOff < 0 ? "−" : "+"} ${formatPaise(Math.abs(totals.roundOff))}`}
            />
          )}
          <div className="mt-1 flex items-baseline justify-between gap-4 border-t-2 border-ink-800 px-3 py-2 text-[13px] font-bold text-ink-950">
            <dt>Grand total</dt>
            <dd className="tabular-nums">₹ {formatPaise(totals.payable)}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-4 break-inside-avoid border border-ink-400 px-3 py-2 text-[11.5px] leading-relaxed print:mt-2.5 print:text-[10px]">
        <span className="text-ink-600">Amount chargeable in words: </span>
        <span className="font-semibold text-ink-950">{invoice.amountInWords}</span>
      </p>

      <section className="mt-6 break-inside-avoid print:mt-3.5">
        <h2 className="text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
          Tax summary by HSN / SAC
        </h2>
        <table className="mt-2 w-full border-collapse text-[11px] print:text-[9.5px]">
          <thead>
            <tr>
              <Th rowSpan={2}>HSN / SAC</Th>
              <Th rowSpan={2} className="text-right">
                Taxable value (₹)
              </Th>
              <TaxHeads interState={invoice.interState} />
              <Th rowSpan={2} className="text-right">
                Total tax (₹)
              </Th>
            </tr>
            <tr>
              {Array.from({ length: taxHeads }, (_, i) => (
                <TaxSubHeads key={i} />
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.hsnSummary.map((row) => (
              <tr key={`${row.hsnCode}@${row.taxRate}`}>
                <Td className="font-mono">{row.hsnCode}</Td>
                <Td className="text-right tabular-nums">{formatPaise(row.taxable)}</Td>
                {invoice.interState ? (
                  <TaxCells rate={row.taxRate} amount={row.igst} />
                ) : (
                  <>
                    <TaxCells rate={row.taxRate / 2} amount={row.cgst} />
                    <TaxCells rate={row.taxRate / 2} amount={row.sgst} />
                  </>
                )}
                <Td className="text-right tabular-nums">
                  {formatPaise(row.cgst + row.sgst + row.igst)}
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <Td className="text-right">Total</Td>
              <Td className="text-right tabular-nums">{formatPaise(totals.taxable)}</Td>
              {invoice.interState ? (
                <TaxCells amount={totals.igst} />
              ) : (
                <>
                  <TaxCells amount={totals.cgst} />
                  <TaxCells amount={totals.sgst} />
                </>
              )}
              <Td className="text-right tabular-nums">{formatPaise(totals.tax)}</Td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="mt-6 grid gap-6 break-inside-avoid border-t border-ink-300 pt-4 text-[11.5px] sm:grid-cols-2 print:mt-3.5 print:gap-4 print:pt-2.5 print:text-[10px]">
        <div>
          <h2 className="text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
            Payment
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <Field label="Method" value={invoice.payment.method} />
            <Field label="Status" value={invoice.payment.status} />
            {invoice.payment.reference && (
              <Field label="Reference" value={invoice.payment.reference} mono />
            )}
          </dl>
        </div>
        {/*
          No signature block. Rule 46(q) of the CGST Rules requires a signature
          on a tax invoice, but its proviso exempts invoices issued
          electronically — and an unregistered seller is outside Rule 46
          altogether. Drawing a blank signature line here would also contradict
          the declaration in the footer, which already states the document is
          valid without one. Nor should a scanned signature ever go on a page
          every customer can download: that hands a clean copy of it to anyone
          who buys anything.
        */}
        <div className="sm:text-right">
          <p className="font-medium text-ink-900">For {seller.legalName}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500 sm:ml-auto sm:max-w-[16rem]">
            Issued electronically. No signature or stamp is required on this
            document.
          </p>
        </div>
      </section>

      <footer className="mt-6 break-inside-avoid border-t border-ink-300 pt-3 text-[10.5px] leading-relaxed text-ink-600 print:mt-3.5 print:text-[9px]">
        <p>
          Declaration: the goods sold are intended for end user consumption and are not for resale.
          The particulars given above are true and correct, and the amount shown is the actual price
          charged for the goods described.
        </p>
        <p className="mt-1.5">
          Queries about this invoice go to {seller.email} or {seller.phone}, quoting order{" "}
          {invoice.orderNumber}.
        </p>
      </footer>
    </div>
  );
}

/** A label/value pair for a two-column definition list. */
function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-ink-500">{label}</dt>
      <dd className={mono ? "font-mono text-ink-900" : "text-ink-900"}>{value}</dd>
    </>
  );
}

/** One cell of the meta block, where the label sits above its value. */
function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.1em] text-ink-500 uppercase">{label}</dt>
      <dd className={`mt-0.5 text-ink-900${mono ? " font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function Party({
  title,
  name,
  lines,
  className,
  children,
}: {
  title: string;
  name: string;
  lines: string[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`py-4 print:py-2.5 ${className ?? ""}`}>
      <h2 className="text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
        {title}
      </h2>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-900">
        <span className="font-semibold">{name}</span>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-600">{children}</p>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-1">
      <dt className="text-ink-600">{label}</dt>
      <dd className="tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}

function Th({
  children,
  className,
  colSpan,
  rowSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        "border border-ink-400 px-2 py-1.5 text-left align-bottom font-semibold text-ink-900",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("border border-ink-300 px-2 py-1.5", className)}>
      {children}
    </td>
  );
}

/** Which tax heads a supply carries: one IGST column pair, or CGST and SGST. */
function TaxHeads({ interState }: { interState: boolean }) {
  if (interState) {
    return (
      <Th colSpan={2} className="text-center">
        IGST
      </Th>
    );
  }
  return (
    <>
      <Th colSpan={2} className="text-center">
        CGST
      </Th>
      <Th colSpan={2} className="text-center">
        SGST
      </Th>
    </>
  );
}

function TaxSubHeads() {
  return (
    <>
      <Th className="text-right">%</Th>
      <Th className="text-right">Amount (₹)</Th>
    </>
  );
}

/** Rate and amount for one head; totals rows carry an amount but no rate. */
function TaxCells({ rate, amount }: { rate?: number; amount: number }) {
  return (
    <>
      <Td className="text-right tabular-nums text-ink-600">
        {rate === undefined ? "" : percent(rate)}
      </Td>
      <Td className="text-right tabular-nums">{formatPaise(amount)}</Td>
    </>
  );
}
