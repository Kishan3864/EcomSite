/**
 * Documents that exist to be printed rather than browsed: no storefront chrome,
 * no navigation, and an A4 page box so the browser's print dialogue needs no
 * adjusting. The group name never reaches the URL, so an invoice still sits at
 * /order/[id]/invoice, beside the order page it belongs to.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-dvh bg-white text-ink-900">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          html, body { background: #fff; }
          /* A table row split across two sheets is unreadable on paper. */
          tr { break-inside: avoid; }
          thead { display: table-header-group; }
          /* Column heads should repeat on every sheet, but a totals row must
             not: a full grand total printed twice reads as two of them. */
          tfoot { display: table-row-group; }
          /* One order, one sheet, whenever the lines allow it. The document is
             laid out for screen at 860px; on A4 the printable width is about
             190mm, so releasing the max-width lets it use the paper instead of
             being scaled down and turning 9pt type into 7pt. */
          #invoice-sheet { max-width: none; width: 100%; }
          /* Widows and orphans read as mistakes on a printed invoice. */
          h1, h2, h3, table, tfoot, section { break-inside: avoid; }
          a[href]::after { content: none; }
        }
      `}</style>
      {children}
    </main>
  );
}
