import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { buildOrderConfirmation } from "@/lib/emails/order";
import { renderOrderConfirmation } from "@/services/order-email";
import { buildOrderUpdate, type OrderEmailKind } from "@/lib/emails/order-updates";
import { buildContactAdminEmail } from "@/lib/emails/contact-admin";
import { buildContactAck } from "@/lib/emails/contact-ack";
import { buildPasswordResetEmail, buildPasswordSetNotice } from "@/lib/emails/password-reset";
import { buildReviewEmail } from "@/lib/emails/review-request";
import { renderReviewMail } from "@/services/order-reviews";
import { REVIEW_REQUESTS } from "@/config/review-requests";
import { db } from "@/lib/db";

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

/**
 * The first real sentence of an email, taken from its plain-text part.
 *
 * The text alternative starts with the headline, a blank line, then the
 * opening paragraph — which is the sentence that decides whether the rest gets
 * read, and the one worth comparing across every template side by side.
 */
function firstParagraph(text: string): string {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks[1] ?? blocks[0] ?? "";
}

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

/**
 * The ten lifecycle mails, each with the facts its kind actually carries.
 * Deliberately includes the ones whose wording is load-bearing — refund raised
 * against refund completed, payment failed — because those are the ones where a
 * careless sentence would claim something untrue.
 */
const LIFECYCLE: {
  kind: OrderEmailKind;
  title: string;
  note: string;
  extra: Record<string, unknown>;
}[] = [
  {
    kind: "packed",
    title: "Packed",
    note: "The gap a customer feels most: they pay, then hear nothing until a courier scans it. This says the order is real and moving, without claiming it has shipped.",
    extra: {},
  },
  {
    kind: "payment-received",
    title: "Payment received",
    note: "Sent only when paymentStatus is PAID.",
    extra: {},
  },
  {
    kind: "payment-failed",
    title: "Payment not completed",
    note: "Says nothing was charged, because nothing was. Warns against paying twice if their bank shows a debit.",
    extra: { failureReason: "the bank did not authorise it" },
  },
  {
    kind: "shipped",
    title: "Shipped",
    note: "Sent only when an AWB exists — an AWB is the proof a courier really has it.",
    extra: {
      courier: "Delhivery",
      awb: "28461739005412",
      trackingUrl: "https://www.delhivery.com/track-v2/package/28461739005412",
    },
  },
  {
    kind: "out-for-delivery",
    title: "Out for delivery",
    note: "Sent on the courier's own status, not on a guess.",
    extra: { courier: "Delhivery", awb: "28461739005412" },
  },
  {
    kind: "delivered",
    title: "Delivered",
    note: "Sent when deliveredAt is set. Mentions the return window rather than asking for a review first.",
    extra: { deliveredAt: new Date() },
  },
  {
    kind: "cancelled-by-shop",
    title: "Cancelled by the shop",
    note: "Apologises and gives the reason, because this one is the shop's doing. It does not promise a refund — that is a separate email with its own proof.",
    extra: { cancelledAt: new Date(), cancelReason: "the last one in stock turned out to be damaged" },
  },
  {
    kind: "cancelled-by-you",
    title: "Cancelled by the customer",
    note: "No apology: they asked. Confirms it is done and that the items are back on the shelf.",
    extra: { cancelledAt: new Date() },
  },
  {
    kind: "refund-failed",
    title: "Refund needs another attempt",
    note: "Never says 'failed' as a bare word. The money never left, so the mail says so plainly before anything else — a customer reading 'your refund failed' assumes their money is gone.",
    extra: { refundAmount: 3794 },
  },
  {
    kind: "refund-raised",
    title: "Refund raised",
    note: "RULE ONE: raised, not issued. The money has not moved and the mail says so in the panel.",
    extra: { refundAmount: 3794, refundDestination: "the UPI account you paid from" },
  },
  {
    kind: "refund-completed",
    title: "Refund completed",
    note: "The only mail that asserts money moved. Sent solely when the gateway has confirmed SUCCESS.",
    extra: {
      refundAmount: 3794,
      refundDestination: "the UPI account you paid from",
      refundRef: "PAYU-RFND-88213",
    },
  },
  {
    kind: "return-approved",
    title: "Return approved",
    note: "Approved and a pickup is coming. No refund is promised yet.",
    extra: { returnItems: ["Cotton kitchen towels × 2"] },
  },
  {
    kind: "return-picked-up",
    title: "Return collected",
    note: "Says outright that no refund has been raised yet — that waits for the item to be checked in.",
    extra: { returnItems: ["Cotton kitchen towels × 2"] },
  },
];

/** Two products to rate: a long title with a variant, and one with no image. */
const REVIEW_ITEMS = [
  {
    title: SAMPLE_LINES[0].title,
    variantLabel: SAMPLE_LINES[0].variantLabel,
    image: SAMPLE_LINES[0].image,
    url: "https://weekendcart.com/review/preview-order-id/p1?t=preview-token-not-valid",
  },
  {
    title: SAMPLE_LINES[1].title,
    variantLabel: SAMPLE_LINES[1].variantLabel,
    image: null,
    url: "https://weekendcart.com/review/preview-order-id/p2?t=preview-token-not-valid",
  },
];

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
  ...LIFECYCLE.map(({ kind, title, note, extra }) => ({
    key: kind,
    title,
    note,
    mail: buildOrderUpdate({
      kind,
      number: BASE.number,
      orderId: BASE.orderId,
      contactName: BASE.contactName,
      total: 3794,
      viewToken: BASE.viewToken,
      estimatedDelivery: IN_3_DAYS,
      ...extra,
    }),
  })),
  {
    key: "review-request",
    title:
      REVIEW_REQUESTS.delayDays === 0
        ? "Review request — on delivery"
        : `Review request — ${REVIEW_REQUESTS.delayDays} days after delivery`,
    note: `Sent once, ${REVIEW_REQUESTS.delayDays === 0 ? "straight after the delivered email — so it asks them to come back once they have used it, never claiming days of use" : `${REVIEW_REQUESTS.delayDays} days after delivery`}. One card per product still unreviewed, each button opening that product's form with the order already checked. Not sent for a cancelled, returned or fully refunded order; hidden products are left out. Asks for an honest review and offers nothing for one. The same products are offered in the "How was it?" panel on the track and order pages from the moment of delivery.`,
    mail: buildReviewEmail({
      kind: "review-request",
      number: BASE.number,
      contactName: BASE.contactName,
      deliveredAt: new Date(Date.now() - REVIEW_REQUESTS.delayDays * 24 * 60 * 60 * 1000),
      items: REVIEW_ITEMS,
      alreadyReviewed: 0,
      reminderFollows: REVIEW_REQUESTS.reminderAfterDays !== null,
    }),
  },
  {
    key: "review-reminder",
    title: "Review reminder — the one and only",
    note:
      REVIEW_REQUESTS.reminderAfterDays === null
        ? "Switched OFF in src/config/review-requests.ts — this is what it would look like."
        : `${REVIEW_REQUESTS.reminderAfterDays} days after the request, only for products still not reviewed, and only once. Says it is the last time we will ask. Here the customer has already reviewed one of the two.`,
    mail: buildReviewEmail({
      kind: "review-reminder",
      number: BASE.number,
      contactName: BASE.contactName,
      deliveredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      items: REVIEW_ITEMS.slice(0, 1),
      alreadyReviewed: 1,
      reminderFollows: false,
      askedDaysAgo: REVIEW_REQUESTS.reminderAfterDays ?? 7,
    }),
  },
  {
    key: "contact-admin",
    title: "Contact form — the copy that reaches support@",
    note: "Reply-To is the customer, so hitting reply in the shop's inbox writes to them. Never sent for a refused submission.",
    mail: buildContactAdminEmail({
      id: "preview-message-id",
      name: "Ananya Iyer",
      email: "ananya@example.in",
      topic: "Where is my order?",
      orderNumber: BASE.number,
      message:
        "I ordered on Tuesday and the tracking has not moved since Thursday. Could you check where it has got to? I need it before the weekend.",
      createdAt: PLACED,
      ip: "49.36.120.14",
      customerId: "preview-customer",
      orderId: "preview-order-id",
    }),
  },
  {
    key: "contact-ack",
    title: "Contact form — the customer's acknowledgement",
    note: "Sent only once the message is stored. Quotes back what they wrote so they can see it arrived intact.",
    mail: buildContactAck({
      name: "Ananya Iyer",
      topic: "Where is my order?",
      message:
        "I ordered on Tuesday and the tracking has not moved since Thursday. Could you check where it has got to?",
      orderNumber: BASE.number,
      reference: "A1B2C3D4",
    }),
  },
  {
    key: "password-reset",
    title: "Password reset — account that has a password",
    note: "Says plainly that it expires, works once, and what to do if the reader did not ask for it.",
    mail: buildPasswordResetEmail({
      name: "Ananya Iyer",
      resetUrl: "https://weekendcart.com/reset-password?token=preview-token-not-valid",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      mode: "reset",
    }),
  },
  {
    key: "password-set",
    title: "Password set — Google-only account",
    note: "The same link, different words. Nobody is told to reset a password they never made, and it says outright that Google keeps working.",
    mail: buildPasswordResetEmail({
      name: "Ananya Iyer",
      resetUrl: "https://weekendcart.com/reset-password?token=preview-token-not-valid",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      mode: "set",
    }),
  },
  {
    key: "password-set-notice",
    title: "Security notice — a password was added",
    note: "Sent only when a password appears on an account that never had one. Carries no link on purpose: a security notice whose remedy is a link teaches people to click links in security notices.",
    mail: buildPasswordSetNotice({ name: "Ananya Iyer" }),
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

  /**
   * The review request this real order will get, through the same rules the
   * timer applies — only the timing is ignored, so it can be looked at before
   * it is due. When the rules say no, the reason is shown instead.
   */
  const realOrder = wanted
    ? await db.order.findFirst({
        where: { OR: [{ id: wanted }, { number: wanted.toUpperCase() }] },
        select: { id: true },
      })
    : null;
  const realReview = realOrder ? await renderReviewMail(realOrder.id, "review-request", { ignoreTiming: true }) : null;

  const samples = [
    ...(real
      ? [{ key: "real", title: `Real order — ${wanted}`, note: `Rendered from the database through the same code path that sends it. Recipient: ${real.to}`, mail: real }]
      : []),
    ...(realReview?.ok
      ? [{ key: "real-review", title: `Real order — ${wanted} — review request`, note: `What this order will be sent, through the same rules as the timer (timing ignored so it can be seen early). Recipient: ${realReview.mail.to}`, mail: realReview.mail }]
      : []),
    ...SAMPLES,
  ];

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

      {realReview && !realReview.ok ? (
        <p className="mb-6 bg-gold-50 px-4 py-3 text-[13px] text-ink-800">
          <strong>{wanted}</strong> will not get a review request: {realReview.why}.
        </p>
      ) : null}

      {wanted && !real ? (
        <p className="mb-6 bg-gold-50 px-4 py-3 text-[13px] text-ink-800">
          No order matched <strong>{wanted}</strong>, or it has no email address on it. Showing the samples instead.
        </p>
      ) : null}

      {/* Every email at a glance: the subject line and the first sentence, which
          is all most people read. Reading them in one column is how you catch a
          cancellation that sounds like a delivery. */}
      <section className="mb-10 border-t border-ink-200 pt-6">
        <h2 className="font-display text-[22px] tracking-[-0.02em] text-ink-950">
          Every email, first words
        </h2>
        <p className="mt-1 max-w-[75ch] text-[13.5px] leading-relaxed text-ink-500">
          Subject and opening paragraph for each. The full render of each one is below.
        </p>
        <div className="mt-5 grid gap-4">
          {samples.map((sample) => (
            <div key={`summary-${sample.key}`} className="border-l-2 border-ink-200 pl-4">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                {sample.title}
              </p>
              <p className="mt-1 text-[14px] font-semibold text-ink-950">{sample.mail.subject}</p>
              <p className="mt-1 max-w-[80ch] text-[13.5px] leading-[1.6] text-ink-600">
                {firstParagraph(sample.mail.text)}
              </p>
            </div>
          ))}
        </div>
      </section>

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
