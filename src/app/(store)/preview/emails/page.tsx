import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { buildOrderConfirmation } from "@/lib/emails/order";
import { renderOrderConfirmation } from "@/services/order-email";

/**
 * Every email the shop sends, rendered from the real templates with sample
 * data, for the owner only.
 *
 * The point is to approve or reject a design without placing an order or
 * waiting for a courier to move — and to see the awkward cases that never come
 * up in a happy-path test: a cash-on-delivery order that has been paid for by
 * nobody, a long product title, a missing product image.
 *
 * Each mail is shown inside an iframe with its own HTML document, because that
 * is what an email client does; rendering it inline would let the page's own
 * stylesheet make a broken template look fine. The plain-text alternative is
 * shown underneath, since that is what a screen reader or a text client sees.
 *
 * Anyone not signed in to the admin gets a 404, and the page is never indexed.
 */
export const metadata: Metadata = { title: "Email preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const IN_3_DAYS = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
const PLACED = new Date(Date.now() - 20 * 60 * 1000);

/** A deliberately awkward basket: a long title, a variant, and one image missing. */
const SAMPLE_LINES = [
  {
    title: "Copper-bottom stainless steel cookware set, 5 pieces",
    variantLabel: "5 pieces · Mirror finish",
    quantity: 1,
    price: 2499,
    image: "/products/electric-kettle-1.jpg",
  },
  { title: "Cotton kitchen towels", variantLabel: "Pack of 4 · Sage", quantity: 2, price: 349, image: null },
  { title: "Airtight glass storage jar, 1L", variantLabel: null, quantity: 3, price: 299, image: null },
];

const BASE = {
  number: "WKC-2026-005127",
  placedAt: PLACED,
  contactName: "Ananya Iyer",
  lines: SAMPLE_LINES,
  itemsTotal: 4094,
  productDiscount: 300,
  shipping: 0,
  tax: 624,
  shipName: "Ananya Iyer",
  shipLine1: "402, Sunview Apartments, Linking Road",
  shipLine2: "Bandra West",
  shipCity: "Mumbai",
  shipState: "Maharashtra",
  shipPincode: "400050",
  estimatedDelivery: IN_3_DAYS,
  orderId: "preview-order-id",
  viewToken: "preview-token-not-valid",
};

const SAMPLES = [
  {
    key: "order-paid",
    title: "Order confirmation — paid online",
    note: "The ordinary case. Money has arrived, so the mail says Paid and the total is stated as a total.",
    mail: buildOrderConfirmation({
      ...BASE,
      total: 3794,
      paymentLabel: "UPI · HDFC Bank",
      paymentRef: "428913756201",
      paid: true,
      cod: false,
      invoiceNumber: "WKC/2026-27/000412",
    }),
  },
  {
    key: "order-cod",
    title: "Order confirmation — cash on delivery",
    note: "Nobody has paid yet. The mail must not say Paid, the total becomes \"To pay on delivery\", and step 3 tells them what to hand over.",
    mail: buildOrderConfirmation({
      ...BASE,
      total: 3794,
      paymentLabel: "Cash on delivery",
      paymentRef: null,
      paid: false,
      cod: true,
    }),
  },
  {
    key: "order-pending",
    title: "Order confirmation — payment still clearing",
    note: "A UPI reference given but not yet matched in the bank. It says placed, not confirmed, and promises nothing.",
    mail: buildOrderConfirmation({
      ...BASE,
      total: 3794,
      paymentLabel: "UPI",
      paymentRef: "428913756201",
      paid: false,
      cod: false,
    }),
  },
];

export default async function EmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) notFound();

  /**
   * ?order=<id or number> renders the mail a real order would actually send —
   * real product images, real links, real token. Sample data can make a
   * template look fine while the thing customers receive is broken.
   */
  const wanted = (await searchParams).order?.trim();
  const real = wanted ? await renderOrderConfirmation(wanted) : null;
  const samples = real
    ? [{ key: "real", title: `Real order — ${wanted}`, note: `Rendered from the database through the same code path that sends it. Recipient: ${real.to}`, mail: real }, ...SAMPLES]
    : SAMPLES;

  return (
    <div className="container-page py-8">
      <header className="mb-8">
        <span className="eyebrow">Internal</span>
        <h1 className="mt-3 font-display text-[28px] leading-tight tracking-[-0.02em] text-ink-950 sm:text-[36px]">
          Email preview
        </h1>
        <p className="mt-3 max-w-[70ch] text-[14px] leading-[1.65] text-ink-600">
          The real templates with sample data. Each one is rendered in its own frame, exactly as an
          email client would, so nothing on this page can make a broken layout look fine. Resize the
          window to check the phone width.
        </p>
      </header>

      {wanted && !real ? (
        <p className="mb-6 bg-gold-50 px-4 py-3 text-[13px] text-ink-800">
          No order matched <strong>{wanted}</strong>, or it has no email address on it. Showing the samples instead.
        </p>
      ) : null}

      {samples.map((sample) => (
        <section key={sample.key} className="border-t border-ink-200 py-8">
          <h2 className="font-display text-[22px] tracking-[-0.02em] text-ink-950">{sample.title}</h2>
          <p className="mt-1 max-w-[75ch] text-[13.5px] leading-relaxed text-ink-500">{sample.note}</p>

          <p className="mt-4 text-[13px] text-ink-600">
            <span className="font-semibold text-ink-900">Subject:</span> {sample.mail.subject}
          </p>

          <div className="mt-4 bg-ink-100 p-3">
            <iframe
              title={sample.title}
              srcDoc={sample.mail.html}
              className="h-[900px] w-full border-0 bg-white"
            />
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-[13px] font-semibold text-brand-700">
              Plain-text alternative
            </summary>
            <pre className="mt-2 overflow-x-auto bg-canvas p-4 text-[12px] leading-[1.6] text-ink-700">
              {sample.mail.text}
            </pre>
          </details>
        </section>
      ))}
    </div>
  );
}
