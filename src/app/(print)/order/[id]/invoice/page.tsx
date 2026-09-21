import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { formatPaise } from "@/lib/gst";
import { cn, formatDate } from "@/lib/utils";
import { getInvoiceForViewer } from "@/services/invoice";
import { tokenFromParams } from "@/lib/order-token";
import { PrintToolbar } from "./print-toolbar";

// generateMetadata and the page both need the invoice; one request, one read.
const invoiceForViewer = cache(getInvoiceForViewer);

/** A rate as an invoice prints it: 9, not 9.00; 2.5, not 2.50. */
const percent = (rate: number) => `${Number(rate.toFixed(2))}%`;

type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}): Promise<Metadata> {
  const { id } = await params;
  const invoice = await invoiceForViewer(id, tokenFromParams(await searchParams));
  return {
    title: invoice
      ? `${invoice.isBillOfSupply ? "Bill of supply" : "Tax invoice"} ${invoice.invoiceNumber}`
      : "Invoice",
    robots: { index: false, follow: false },
  };
}

/** The label every block and card wears. */
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500 print:text-[8.5px]";

/**
 * How the payment status is marked. Green only for money actually received;
 * everything else is stated, not celebrated.
 */
function statusTone(status: string): string {
  if (status === "Paid") return "bg-[#def3e4] text-[#1c6636]";
  if (status === "Refunded" || status === "Partially refunded") return "bg-ink-100 text-ink-800";
  return "bg-gold-100 text-gold-900";
}

/**
 * The customer's copy of the invoice, on a page of its own so that printing it
 * yields the document and not the shop around it. Every figure comes from the
 * invoice builder: nothing is recomputed here and nothing is rounded again.
 *
 * Laid out for A4 first — ruled tables with a tinted head, figures right-set,
 * the grand total banded — and for a phone second: the blocks stack and the
 * wide line table scrolls sideways rather than squashing its figures. The
 * colours print because the (print) layout asks the browser to keep them, so
 * "Save as PDF" looks like the screen.
 */
export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  const { id } = await params;
  // The signed token from the order email, for a reader with no session.
  const invoice = await invoiceForViewer(id, tokenFromParams(await searchParams));
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

      {/* Header: who issued it, on the left; what it is and its number, on the right. */}
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5 border-b-2 border-brand-700 pb-5 print:pb-3">
        <div className="max-w-sm min-w-0">
          <Logo href={null} size="lg" />
          <p className="mt-3 text-[13px] font-semibold text-ink-950 print:mt-2 print:text-[11px]">
            {seller.legalName}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-700 print:text-[9.5px]">{seller.address}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11.5px] print:text-[9.5px]">
            {seller.gstin && <Field label="GSTIN" value={seller.gstin} mono />}
            {seller.pan && <Field label="PAN" value={seller.pan} mono />}
            <Field label="State" value={`${seller.stateName} (${seller.stateCode})`} />
            <Field label="Contact" value={`${seller.email} · ${seller.phone}`} />
          </dl>
        </div>

        <div className="w-full sm:w-auto sm:text-right">
          <p className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink-950 print:text-[18px]">
            {heading}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
            Original for recipient
          </p>
          <div className="mt-3 inline-block border border-ink-200 bg-brand-50 px-3 py-2 text-left sm:text-right print:mt-2">
            <p className={LABEL}>Invoice no.</p>
            <p className="font-mono text-[14px] font-bold text-ink-950 print:text-[12px]">{invoice.invoiceNumber}</p>
          </div>
        </div>
      </header>

      {/* The facts of the supply, ruled into cells. */}
      <dl className="mt-5 grid grid-cols-2 border-t border-l border-ink-200 text-[11.5px] sm:grid-cols-3 print:mt-3 print:grid-cols-3 print:text-[9.5px]">
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

      <section className="mt-4 grid gap-3 sm:grid-cols-2 print:mt-3 print:grid-cols-2 print:gap-2.5">
        <Party title="Billed to" name={billTo.name} lines={billTo.lines}>
          {billTo.state} ({billTo.stateCode})
          <br />
          {billTo.phone} · {billTo.email}
        </Party>
        <Party title="Shipped to" name={shipTo.name} lines={shipTo.lines}>
          {shipTo.state} ({shipTo.stateCode})
          <br />
          {shipTo.phone}
        </Party>
      </section>

      <div className="mt-5 overflow-x-auto print:mt-3 print:overflow-visible">
        <table className="w-full min-w-[720px] border-collapse text-[11px] print:min-w-0 print:text-[9px]">
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
              <tr key={line.serial} className="align-top even:bg-ink-50">
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
            <tr className="bg-brand-50 font-semibold">
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

      {/* Words on the left, figures on the right; stacked on a phone. */}
      <div className="mt-4 grid gap-3 break-inside-avoid sm:grid-cols-[1fr_300px] sm:items-start print:mt-2.5 print:grid-cols-[1fr_260px]">
        <p className="order-2 border border-ink-200 bg-ink-50 px-3 py-2.5 text-[11.5px] leading-relaxed sm:order-1 print:text-[9.5px]">
          <span className="text-ink-600">Amount chargeable in words: </span>
          <span className="font-semibold text-ink-950">{invoice.amountInWords}</span>
        </p>

        <dl className="order-1 border border-ink-200 text-[11.5px] sm:order-2 print:text-[9.5px]">
          {totals.discount > 0 && (
            <>
              <Total
                label="Item total (incl. tax)"
                value={formatPaise(totals.itemsInclusiveBeforeDiscount)}
              />
              <Total label="Discount" value={`− ${formatPaise(totals.discount)}`} />
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
          <div className="flex items-baseline justify-between gap-4 bg-brand-700 px-3 py-2.5 text-[14px] font-bold text-white print:py-2 print:text-[12px]">
            <dt>Grand total</dt>
            <dd className="tabular-nums">₹ {formatPaise(totals.payable)}</dd>
          </div>
        </dl>
      </div>

      <section className="mt-6 break-inside-avoid print:mt-3.5">
        <h2 className={LABEL}>Tax summary by HSN / SAC</h2>
        <div className="mt-2 overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[520px] border-collapse text-[11px] print:min-w-0 print:text-[9px]">
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
                <tr key={`${row.hsnCode}@${row.taxRate}`} className="even:bg-ink-50">
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
              <tr className="bg-brand-50 font-semibold">
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
        </div>
      </section>

      <section className="mt-6 grid gap-3 break-inside-avoid text-[11.5px] sm:grid-cols-2 print:mt-3.5 print:grid-cols-2 print:gap-2.5 print:text-[9.5px]">
        <div className="border border-ink-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className={LABEL}>Payment</h2>
            <span
              className={cn(
                "px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] print:text-[8.5px]",
                statusTone(invoice.payment.status),
              )}
            >
              {invoice.payment.status}
            </span>
          </div>
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
        <div className="border border-ink-200 p-3 sm:text-right">
          <p className="font-medium text-ink-900">For {seller.legalName}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500 sm:ml-auto sm:max-w-[16rem] print:text-[9px]">
            Issued electronically. No signature or stamp is required on this
            document.
          </p>
        </div>
      </section>

      <footer className="mt-6 break-inside-avoid border-t border-ink-200 pt-3 text-[10.5px] leading-relaxed text-ink-600 print:mt-3.5 print:pt-2 print:text-[8.5px]">
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

/** One ruled cell of the meta block, label above value. */
function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 border-r border-b border-ink-200 px-3 py-2 print:py-1.5">
      <dt className={LABEL}>{label}</dt>
      <dd className={cn("mt-0.5 text-ink-900 wrap-break-word", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

/** Billed to / Shipped to: a card with a tinted head. */
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
    <div className="border border-ink-200">
      <h2 className={cn(LABEL, "border-b border-ink-200 bg-brand-50 px-3 py-1.5 text-ink-700")}>{title}</h2>
      <div className="px-3 py-2.5 print:py-2">
        <p className="text-[12px] leading-relaxed text-ink-900 print:text-[10px]">
          <span className="font-semibold">{name}</span>
          {lines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-600 print:text-[9.5px]">{children}</p>
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-200 px-3 py-1.5 print:py-1">
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
        "border border-ink-200 bg-brand-50 px-2 py-1.5 text-left align-bottom font-semibold text-ink-900",
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
    <td colSpan={colSpan} className={cn("border border-ink-200 px-2 py-1.5", className)}>
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
