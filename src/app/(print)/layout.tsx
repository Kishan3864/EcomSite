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
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff; }
          /* A table row split across two sheets is unreadable on paper. */
          tr { break-inside: avoid; }
          thead { display: table-header-group; }
          /* Column heads should repeat on every sheet, but a totals row must
             not: a full grand total printed twice reads as two of them. */
          tfoot { display: table-row-group; }
        }
      `}</style>
      {children}
    </main>
  );
}
