import { BUSINESS } from "@/config/business";
import {
  C,
  SANS,
  SITE,
  actions,
  esc,
  escLines,
  eyebrow,
  formatDate,
  formatDateTime,
  nextSteps,
  panel,
  row,
  rupees,
  shell,
  signatureText,
} from "./layout";
import type { OrderEmail } from "./order";

/**
 * Every email an order sends after it is confirmed.
 *
 * One builder, ten kinds. They differ in a headline, a sentence and which facts
 * are worth repeating — not in layout — so making each a separate template
 * would be ten copies of the same table drifting apart. The kind decides the
 * copy; the shell decides everything else.
 *
 * RULE ONE, and it governs the wording of all of them: an email may not claim
 * something that has not happened. "Shipped" is sent when a courier has an AWB,
 * not when someone in admin thinks it is about to go. "Refund completed" is
 * sent when the gateway has confirmed the money moved, never when a refund was
 * merely raised — those are two different emails here precisely so that the
 * hopeful one cannot be sent by accident.
 */

export type OrderEmailKind =
  /**
   * The order confirmation, which is built by ./order.ts rather than here. It
   * appears in this union so that it takes a slot in Order.emailsSent and
   * cannot be sent twice — a UPI approval and a PayU callback for the same
   * order used to produce two.
   */
  | "placed"
  | "packed"
  | "return-requested"
  | "return-rejected"
  | "payment-received"
  | "payment-failed"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  /** Split in two: being cancelled and asking to cancel read nothing alike. */
  | "cancelled-by-shop"
  | "cancelled-by-you"
  | "refund-raised"
  | "refund-completed"
  | "refund-failed"
  | "return-approved"
  | "return-picked-up";

export interface OrderUpdateInput {
  kind: OrderEmailKind;
  number: string;
  orderId: string;
  contactName: string;
  total: number;
  /** Signed, so the links work for a reader with no session. */
  viewToken: string;

  /** Courier details. Only ever set once a real AWB exists. */
  courier?: string | null;
  awb?: string | null;
  trackingUrl?: string | null;

  estimatedDelivery?: Date | null;
  deliveredAt?: Date | null;
  cancelledAt?: Date | null;
  cancelReason?: string | null;

  /** The amount actually being refunded, which need not be the order total. */
  refundAmount?: number | null;
  /** Where the money goes back to, in the customer's words ("your UPI app"). */
  refundDestination?: string | null;
  /** The gateway's own reference, printed only when there is one. */
  refundRef?: string | null;

  /** Why a payment failed, in plain words. Never the gateway's raw error. */
  failureReason?: string | null;

  /** Why a return was turned down, in the owner's words. */
  rejectReason?: string | null;
  /** The window the shop publishes for money to land, from BUSINESS.ops. */
  refundWindow?: string | null;

  /** What is being returned, for the return emails. */
  returnItems?: string[] | null;
}

interface Copy {
  /** The line under the brand in the header, and the inbox kicker. */
  kicker: string;
  subject: string;
  eyebrow: string;
  headline: string;
  /** The opening paragraph. Plain text; escaped by the builder. */
  opening: string;
  /** The hidden inbox preview line. */
  preheader: string;
  /** Primary action. Defaults to tracking the order. */
  cta?: { label: string; href: string };
  /** Optional steps, shown as a numbered list. */
  next?: string[];
  /** Shown in a caution-toned panel when something needs the customer to act. */
  caution?: string;
}

const money = (n: number | null | undefined) => rupees(n ?? 0);

function copyFor(o: OrderUpdateInput, track: string): Copy {
  const first = o.contactName.trim().split(/\s+/)[0] || "there";

  switch (o.kind) {
    case "placed":
      // The confirmation is built by ./order.ts, which has the lines, the
      // totals and the address. "placed" lives in the union only so that it
      // occupies a slot in Order.emailsSent and cannot be sent twice.
      throw new Error("The order confirmation is built by buildOrderConfirmation, not here.");

    case "packed":
      return {
        kicker: "Packed",
        subject: `Order ${o.number} is packed and ready to go`,
        eyebrow: "Packed",
        headline: "Your order is packed",
        // The quiet gap customers feel most: they pay, then hear nothing until
        // a courier scans it, which can be a day or two later. This says the
        // order is real and moving without claiming it has shipped.
        opening: `${first}, order ${o.number} is packed and waiting for the courier to collect it. Nothing more is needed from you — we will send the tracking number the moment it is on its way.`,
        preheader: `Order ${o.number} is packed and waiting for collection`,
        next: [
          "The courier collects from us, usually the next working day.",
          "You get an email with the tracking number as soon as they do.",
        ],
      };

    case "refund-failed":
      return {
        kicker: "Refund needs a second try",
        subject: `We are sorting out your refund — order ${o.number}`,
        eyebrow: "Refund needs a second try",
        headline: "Your refund needs another attempt",
        /**
         * Never the bare word "failed" to a customer.
         *
         * A refund the gateway refused is almost always a detail at the bank's
         * end — a closed card, an account that has moved — and the money is not
         * lost. Saying "your refund failed" reads as "your money is gone" and
         * produces a frightened phone call about something the shop is already
         * fixing.
         */
        opening: `${first}, the refund of ${money(o.refundAmount ?? o.total)} for order ${o.number} did not go through at the bank's end. Your money is not lost — it never left our side, so there is nothing missing from your account. We are arranging it again.`,
        preheader: `Your refund needs another attempt — nothing is lost`,
        caution:
          "You do not need to do anything. If the card or account you paid from has since been closed, reply to this email and tell us where to send it instead.",
      };

    case "cancelled-by-shop":
      return {
        kicker: "Cancelled",
        subject: `We have had to cancel order ${o.number}`,
        eyebrow: "Cancelled by us",
        headline: "We have had to cancel your order",
        // An apology, because this one is the shop's doing.
        opening: `${first}, we are sorry — we have had to cancel order ${o.number}${o.cancelReason ? `: ${o.cancelReason.replace(/[.\s]+$/, "")}.` : "."} This was our doing, not anything you did.`,
        preheader: `Order ${o.number} cancelled by us`,
        caution: o.refundAmount
          ? undefined
          : "Nothing was charged for this order, so there is nothing to refund.",
      };

    case "cancelled-by-you":
      return {
        kicker: "Cancelled",
        subject: `Order ${o.number} is cancelled, as you asked`,
        eyebrow: "Cancelled",
        headline: "Your order is cancelled",
        // No apology: they asked. Just confirm it is done and what follows.
        opening: `${first}, order ${o.number} is cancelled as you asked${o.cancelledAt ? ` on ${formatDate(o.cancelledAt)}` : ""}. The items have gone back on the shelf and nothing further will be sent.`,
        preheader: `Order ${o.number} cancelled at your request`,
      };

    case "return-requested":
      return {
        kicker: "Return requested",
        subject: `We have your return request — order ${o.number}`,
        eyebrow: "Return requested",
        headline: "We have your return request",
        opening: `${first}, we have your request to return an item from order ${o.number}. Someone will look at it and come back to you — you do not need to send anything yet.`,
        preheader: `Return requested on order ${o.number}`,
        next: [
          "We check the request and approve it, usually within a working day.",
          "If it is approved we arrange a pickup — you do not post it yourself.",
          "Your refund is raised once the item is back with us and checked.",
        ],
        caution: "Please keep the item and its packing as they are until you hear from us.",
      };

    case "return-rejected":
      return {
        kicker: "Return not approved",
        subject: `About your return request — order ${o.number}`,
        eyebrow: "Return not approved",
        headline: "We could not approve this return",
        opening: `${first}, we have looked at the return request on order ${o.number} and we are not able to approve it${o.rejectReason ? `: ${o.rejectReason.replace(/[.\s]+$/, "")}.` : "."} If that does not seem right, reply to this email — a person reads every reply and we would rather sort it out than leave it.`,
        preheader: `Return not approved on order ${o.number}`,
        caution:
          "If you think this is a mistake, tell us. We will look again, and nothing about your order changes in the meantime.",
      };

    case "payment-received":
      return {
        kicker: "Payment received",
        subject: `Payment received for order ${o.number}`,
        eyebrow: "Payment received",
        headline: "We have your payment",
        opening: `Thank you ${first} — ${money(o.total)} has reached us and order ${o.number} is confirmed. We are getting it packed.`,
        preheader: `${money(o.total)} received · order ${o.number} confirmed`,
        next: [
          "We pack your order and hand it to the courier.",
          "You get an email with the tracking number.",
          "It arrives by the date on your order.",
        ],
      };

    case "payment-failed":
      return {
        kicker: "Payment not completed",
        subject: `Payment did not go through — order ${o.number}`,
        eyebrow: "Payment not completed",
        headline: "That payment did not go through",
        // Deliberately not "your payment failed": most of the time the money
        // never left, and telling someone their payment failed sends them
        // looking for a debit that is not there.
        opening: `${first}, the payment for order ${o.number} was not completed${o.failureReason ? `: ${o.failureReason.replace(/[.\s]+$/, "")}.` : "."} Nothing has been charged. Your order is held and the items are still reserved — you can pay again from the order page.`,
        preheader: `Nothing was charged · order ${o.number} is still held`,
        cta: { label: "Complete the payment", href: track },
        caution:
          "If your bank shows money taken for this order, do not pay again — reply to this email and we will trace it first.",
      };

    case "shipped":
      return {
        kicker: "On its way",
        subject: `Order ${o.number} has shipped`,
        eyebrow: "On its way",
        headline: "Your order is on its way",
        opening: `Good news ${first} — order ${o.number} has left us${o.courier ? ` with ${o.courier}` : ""}.${o.awb ? ` The tracking number is ${o.awb}.` : ""}`,
        preheader: o.awb ? `${o.courier ?? "Courier"} · ${o.awb}` : `Order ${o.number} has left us`,
        cta: o.trackingUrl
          ? { label: `Track with ${o.courier ?? "the courier"}`, href: o.trackingUrl }
          : { label: "Track this order", href: track },
        next: [
          "The courier scans it along the way; tracking updates as it moves.",
          "You will hear from us again when it is out for delivery.",
        ],
      };

    case "out-for-delivery":
      return {
        kicker: "Out for delivery",
        subject: `Order ${o.number} is out for delivery today`,
        eyebrow: "Out for delivery",
        headline: "It is out for delivery",
        opening: `${first}, order ${o.number} is with the delivery agent and should reach you today.`,
        preheader: `Arriving today · order ${o.number}`,
        cta: o.trackingUrl
          ? { label: "See where it is", href: o.trackingUrl }
          : { label: "See where it is", href: track },
        caution:
          "Please keep your phone reachable — the agent will call if they cannot find the address.",
      };

    case "delivered":
      return {
        kicker: "Delivered",
        subject: `Order ${o.number} delivered`,
        eyebrow: "Delivered",
        headline: "Your order has arrived",
        opening: `${first}, order ${o.number} was delivered${o.deliveredAt ? ` on ${formatDate(o.deliveredAt)}` : ""}. We hope it is everything you wanted.`,
        preheader: `Order ${o.number} was delivered`,
        cta: { label: "View your order", href: track },
        next: [
          `Something not right? Tell us within ${BUSINESS.ops.returnWindowDays} days and we will sort it out.`,
          "If it is all good, we would love to hear what you think.",
        ],
      };

    case "refund-raised":
      return {
        kicker: "Refund raised",
        subject: `Refund raised for order ${o.number}`,
        eyebrow: "Refund raised",
        headline: "Your refund has been raised",
        // "Raised", not "issued" or "processed". The money has not moved yet
        // and this email must not suggest that it has.
        opening: `${first}, we have raised a refund of ${money(o.refundAmount ?? o.total)} for order ${o.number}. It is with ${o.refundDestination ?? "your bank"} now — they usually take ${o.refundWindow ?? "a few business days"} to put it back${o.refundDestination ? "" : " into the account you paid from"}. We will email you again the moment it is confirmed.`,
        preheader: `${money(o.refundAmount ?? o.total)} refund raised · 3–7 working days`,
        cta: { label: "View your order", href: track },
        caution: `Until your bank confirms it, the money has not moved yet. If it has not appeared after ${o.refundWindow ?? "a few business days"}, reply to this email and we will chase it.`,
      };

    case "refund-completed":
      return {
        kicker: "Refund completed",
        subject: `Refund completed for order ${o.number}`,
        eyebrow: "Refund completed",
        headline: "Your refund is done",
        opening: `${first}, the refund of ${money(o.refundAmount ?? o.total)} for order ${o.number} has been completed${o.refundDestination ? ` to ${o.refundDestination}` : ""}.${o.refundRef ? ` Reference ${o.refundRef}.` : ""} It may take a day or two more to show on your statement depending on your bank.`,
        preheader: `${money(o.refundAmount ?? o.total)} refunded · order ${o.number}`,
        cta: { label: "View your order", href: track },
      };

    case "return-approved":
      return {
        kicker: "Return approved",
        subject: `Return approved for order ${o.number}`,
        eyebrow: "Return approved",
        headline: "Your return is approved",
        opening: `${first}, we have approved the return on order ${o.number}. We will arrange a pickup — you do not need to post anything yourself.`,
        preheader: `Return approved · order ${o.number}`,
        cta: { label: "View your order", href: track },
        next: [
          "Keep the item in its original packing if you still have it.",
          "The courier will collect it; you will get an email when they do.",
          "Your refund is raised after we have checked the item back in.",
        ],
      };

    case "return-picked-up":
      return {
        kicker: "Return collected",
        subject: `We have collected your return — order ${o.number}`,
        eyebrow: "Return collected",
        headline: "Your return has been collected",
        opening: `${first}, the courier has collected the return from order ${o.number}. Once it reaches us and we have checked it, we will raise your refund and email you.`,
        preheader: `Return collected · order ${o.number}`,
        cta: { label: "View your order", href: track },
        caution:
          "No refund has been raised yet — that happens once the item is back with us and checked.",
      };
  }
}

/** The facts worth repeating in the body, per kind. */
function facts(o: OrderUpdateInput): [string, string][] {
  const list: [string, string][] = [["Order", o.number]];

  if (o.kind === "shipped" || o.kind === "out-for-delivery") {
    if (o.courier) list.push(["Courier", o.courier]);
    if (o.awb) list.push(["Tracking number", o.awb]);
    if (o.estimatedDelivery) list.push(["Expected by", formatDate(o.estimatedDelivery)]);
  }
  if (o.kind === "delivered" && o.deliveredAt) list.push(["Delivered", formatDateTime(o.deliveredAt)]);
  if ((o.kind === "cancelled-by-shop" || o.kind === "cancelled-by-you") && o.cancelledAt) {
    list.push(["Cancelled", formatDateTime(o.cancelledAt)]);
  }
  if (o.kind === "refund-raised" || o.kind === "refund-completed" || o.kind === "refund-failed") {
    list.push(["Refund amount", money(o.refundAmount ?? o.total)]);
    if (o.refundDestination) list.push(["Back to", o.refundDestination]);
    if (o.refundRef) list.push(["Reference", o.refundRef]);
  }
  if (o.kind === "payment-received" || o.kind === "payment-failed") {
    list.push(["Order total", money(o.total)]);
  }
  return list;
}

export function buildOrderUpdate(o: OrderUpdateInput): OrderEmail {
  const auth = `?t=${encodeURIComponent(o.viewToken)}`;
  const track = `${SITE}/track/${o.orderId}${auth}`;
  /**
   * The invoice, on every order email.
   *
   * Carries the same signed token as the tracking link, so it opens for
   * somebody reading their mail on a phone they have never signed in on. It
   * used to appear only on the confirmation, which is the one email people do
   * not go looking for when they need the invoice months later.
   */
  const invoiceUrl = `${SITE}/order/${o.orderId}/invoice${auth}`;
  const copy = copyFor(o, track);
  const cta = copy.cta ?? { label: "Track this order", href: track };

  const factRows = facts(o)
    .map(([label, value]) => row(label, value))
    .join("");

  const returned =
    o.returnItems && o.returnItems.length > 0
      ? `<div style="margin-top:20px;">${eyebrow("Items being returned")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${o.returnItems
          .map(
            (item) =>
              `<tr><td style="padding:3px 0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.body};">${esc(item)}</td></tr>`,
          )
          .join("")}</table></div>`
      : "";

  const body = `
${eyebrow(copy.eyebrow)}
<h1 style="margin:0;font-family:${SANS};font-size:23px;line-height:30px;font-weight:700;color:${C.ink};">${esc(copy.headline)}</h1>
<p style="margin:12px 0 0;font-family:${SANS};font-size:15px;line-height:23px;color:${C.body};">${escLines(copy.opening)}</p>

<div style="margin-top:18px;">${panel(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${factRows}</table>`, "plain")}</div>

${returned}

${copy.caution ? `<div style="margin-top:20px;">${panel(`<p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.ink};">${escLines(copy.caution)}</p>`, "caution")}</div>` : ""}

${actions(cta, [
  ...(cta.href !== track ? [{ href: track, label: "Track this order" }] : []),
  { href: invoiceUrl, label: "View invoice" },
])}

${nextSteps((copy.next ?? []).map((step) => esc(step)))}

<p style="margin:22px 0 0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.body};">
  Reply to this email and a person will read it, or call
  <a href="tel:${esc(BUSINESS.supportPhoneTel)}" style="color:${C.brandDeep};">${esc(BUSINESS.supportPhone)}</a>.
</p>`;

  const text = [
    copy.headline,
    ``,
    copy.opening,
    ``,
    ...facts(o).map(([label, value]) => `${label.padEnd(16)} ${value}`),
    ...(o.returnItems && o.returnItems.length
      ? ["", "ITEMS BEING RETURNED", ...o.returnItems.map((i) => `  ${i}`)]
      : []),
    ...(copy.caution ? ["", copy.caution] : []),
    ``,
    `${cta.label}: ${cta.href}`,
    ...(cta.href !== track ? [`Your order page: ${track}`] : []),
    `Your invoice:     ${invoiceUrl}`,
    ...(copy.next && copy.next.length
      ? ["", "WHAT HAPPENS NEXT", ...copy.next.map((step, i) => `  ${i + 1}. ${step}`)]
      : []),
    ``,
    `Reply to this email and a person will read it, or call ${BUSINESS.supportPhone}.`,
    ``,
    signatureText(),
  ].join("\n");

  return {
    subject: copy.subject,
    html: shell({ kicker: copy.kicker, preheader: copy.preheader, body }),
    text,
  };
}
