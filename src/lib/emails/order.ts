import { BUSINESS } from "@/config/business";
import {
  C,
  SANS,
  SITE,
  absolute,
  button,
  esc,
  escLines,
  eyebrow,
  formatDate,
  formatDateTime,
  link,
  panel,
  row,
  rupees,
  shell,
  signatureText,
} from "./layout";

/**
 * The email a customer gets when their order is confirmed.
 *
 * Sent at the moment the money is real — the gateway's verified answer, a bank
 * credit the owner has seen, or a cash-on-delivery order at checkout — never at
 * checkout for an online payment. An email that says "confirmed" before the
 * payment has landed is the one a customer will quote back when it later fails,
 * which is why the wording changes with the payment state rather than assuming
 * the happy one.
 *
 * Built on the shared shell in ./layout, so it carries the same header, the
 * same signature and the same legal footer as every other mail the shop sends.
 */

export interface OrderEmail {
  subject: string;
  html: string;
  text: string;
}

export interface OrderEmailLine {
  title: string;
  variantLabel?: string | null;
  quantity: number;
  /** Unit price, whole rupees. */
  price: number;
  /** Product image path or URL; made absolute before it is used. */
  image?: string | null;
}

export interface OrderEmailInput {
  number: string;
  placedAt: Date;
  contactName: string;
  lines: OrderEmailLine[];
  itemsTotal: number;
  productDiscount: number;
  shipping: number;
  tax: number;
  total: number;
  paymentLabel: string;
  paymentRef: string | null;
  /** True once money has actually arrived. COD is false — nothing has been paid yet. */
  paid: boolean;
  /** Set for a cash-on-delivery order, which changes what the customer is told. */
  cod: boolean;
  shipName: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  estimatedDelivery: Date;
  orderId: string;
  /** Printed when the invoice has been raised; omitted rather than invented. */
  invoiceNumber?: string | null;
}

/** A 64px thumbnail cell, or a tinted placeholder when the product has no image. */
function thumbnail(line: OrderEmailLine): string {
  if (line.image) {
    return `<img src="${esc(absolute(line.image))}" width="64" height="64" alt="${esc(line.title)}" style="display:block;width:64px;height:64px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;object-fit:cover;background-color:${C.canvas};">`;
  }
  // No image is not a broken image: an empty tinted square reads as deliberate,
  // and the title beside it carries the meaning anyway.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td width="64" height="64" bgcolor="${C.canvas}" style="width:64px;height:64px;background-color:${C.canvas};">&nbsp;</td></tr></table>`;
}

function lineRow(line: OrderEmailLine): string {
  const lineTotal = line.price * line.quantity;
  return `
  <tr>
    <td width="64" valign="top" style="padding:14px 14px 14px 0;">${thumbnail(line)}</td>
    <td valign="top" style="padding:14px 0;font-family:${SANS};">
      <p style="margin:0;font-size:14px;line-height:20px;font-weight:600;color:${C.ink};">${esc(line.title)}</p>
      ${line.variantLabel ? `<p style="margin:3px 0 0;font-size:12.5px;line-height:18px;color:${C.muted};">${esc(line.variantLabel)}</p>` : ""}
      <p style="margin:4px 0 0;font-size:12.5px;line-height:18px;color:${C.muted};">Qty ${line.quantity} · ${esc(rupees(line.price))} each</p>
    </td>
    <td valign="top" align="right" style="padding:14px 0 14px 10px;font-family:${SANS};font-size:14px;font-weight:600;color:${C.ink};white-space:nowrap;">${esc(rupees(lineTotal))}</td>
  </tr>`;
}

export function buildOrderConfirmation(order: OrderEmailInput): OrderEmail {
  const firstName = order.contactName.trim().split(/\s+/)[0] || "there";
  const track = `${SITE}/track/${order.orderId}`;
  const invoiceUrl = `${SITE}/order/${order.orderId}/invoice`;

  const address = [
    order.shipName,
    order.shipLine1,
    order.shipLine2,
    `${order.shipCity}, ${order.shipState} ${order.shipPincode}`,
  ]
    .filter(Boolean)
    .join("\n");

  const eta = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(order.estimatedDelivery);

  /**
   * What the money has actually done, said plainly. A COD order has been paid
   * for by nobody yet, and calling that "paid" in the receipt is the kind of
   * small lie that costs an hour on the phone later.
   */
  const paymentState = order.cod
    ? `To pay on delivery · ${rupees(order.total)}`
    : order.paid
      ? "Paid"
      : "Payment pending";

  const opening = order.cod
    ? `Thank you ${esc(firstName)} — order <strong style="color:${C.ink};">${esc(order.number)}</strong> is confirmed and we are getting it packed. You pay the courier when it reaches you.`
    : order.paid
      ? `Thank you ${esc(firstName)} — we have your payment and order <strong style="color:${C.ink};">${esc(order.number)}</strong> is confirmed. We are getting it packed.`
      : `Thank you ${esc(firstName)} — order <strong style="color:${C.ink};">${esc(order.number)}</strong> is placed. We will confirm it the moment the payment clears.`;

  const totals = [
    row("Items", rupees(order.itemsTotal)),
    order.productDiscount > 0 ? row("Discount", `− ${rupees(order.productDiscount)}`) : "",
    row("Delivery", order.shipping === 0 ? "Free" : rupees(order.shipping)),
    order.tax > 0 ? row("Taxes (included)", rupees(order.tax)) : "",
    row(order.cod ? "To pay on delivery" : "Total", rupees(order.total), { strong: true, rule: true }),
  ].join("");

  const body = `
${eyebrow(order.cod ? "Order confirmed" : order.paid ? "Order confirmed" : "Order placed")}
<h1 style="margin:0;font-family:${SANS};font-size:23px;line-height:30px;font-weight:700;color:${C.ink};">Thank you for your order</h1>
<p style="margin:12px 0 0;font-family:${SANS};font-size:15px;line-height:23px;color:${C.body};">${opening}</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;border-collapse:collapse;">
  <tr>
    <td style="font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};">
      Order <strong style="color:${C.ink};">${esc(order.number)}</strong><br>
      Placed ${esc(formatDateTime(order.placedAt))}
      ${order.invoiceNumber ? `<br>Invoice ${esc(order.invoiceNumber)}` : ""}
    </td>
    <td align="right" style="font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};">
      ${esc(order.paymentLabel)}<br>
      <span style="color:${order.paid ? C.positive : C.caution};font-weight:700;">${esc(paymentState)}</span>
      ${order.paymentRef ? `<br><span style="font-size:12px;">Ref ${esc(order.paymentRef)}</span>` : ""}
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;border-top:1px solid ${C.hairline};border-collapse:collapse;">
  ${order.lines.map(lineRow).join("")}
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;border-collapse:collapse;">
  ${totals}
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-collapse:collapse;">
  <tr>
    <td width="50%" valign="top" style="padding-right:8px;">
      ${panel(
        `${eyebrow("Delivering to")}<p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.ink};">${escLines(address)}</p>`,
      )}
    </td>
    <td width="50%" valign="top" style="padding-left:8px;">
      ${panel(
        `${eyebrow("Expected by")}<p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.ink};font-weight:600;">${esc(eta)}</p><p style="margin:6px 0 0;font-family:${SANS};font-size:12.5px;line-height:19px;color:${C.muted};">We will email the tracking number the moment the courier collects it.</p>`,
      )}
    </td>
  </tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-collapse:collapse;">
  <tr>
    <td>${button(track, "Track this order")}</td>
    <td style="padding-left:16px;">${link(invoiceUrl, "View invoice")}</td>
  </tr>
</table>

<div style="margin-top:26px;">
  ${eyebrow("What happens next")}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    <tr><td style="padding:3px 0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.body};">1. We pack your order and hand it to the courier.</td></tr>
    <tr><td style="padding:3px 0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.body};">2. You get an email with the tracking number and a link to follow it.</td></tr>
    <tr><td style="padding:3px 0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.body};">3. ${order.cod ? `Pay the courier ${esc(rupees(order.total))} when it arrives.` : "It arrives by the date above."}</td></tr>
  </table>
</div>

<p style="margin:22px 0 0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.body};">
  Something not right? Reply to this email — it reaches a person, not a queue — or call
  <a href="tel:${esc(BUSINESS.supportPhoneTel)}" style="color:${C.brandDeep};">${esc(BUSINESS.supportPhone)}</a>.
</p>`;

  const text = [
    `Thank you for your order`,
    ``,
    order.cod
      ? `Thank you ${firstName} — order ${order.number} is confirmed and we are getting it packed. You pay the courier when it reaches you.`
      : order.paid
        ? `Thank you ${firstName} — we have your payment and order ${order.number} is confirmed. We are getting it packed.`
        : `Thank you ${firstName} — order ${order.number} is placed. We will confirm it the moment the payment clears.`,
    ``,
    `Order      ${order.number}`,
    `Placed     ${formatDateTime(order.placedAt)}`,
    order.invoiceNumber ? `Invoice    ${order.invoiceNumber}` : "",
    `Payment    ${order.paymentLabel} — ${paymentState}${order.paymentRef ? ` (ref ${order.paymentRef})` : ""}`,
    ``,
    `WHAT YOU ORDERED`,
    ...order.lines.map(
      (l) =>
        `  ${l.title}${l.variantLabel ? ` (${l.variantLabel})` : ""} × ${l.quantity} — ${rupees(l.price * l.quantity)}`,
    ),
    ``,
    `  Items        ${rupees(order.itemsTotal)}`,
    order.productDiscount > 0 ? `  Discount     − ${rupees(order.productDiscount)}` : "",
    `  Delivery     ${order.shipping === 0 ? "Free" : rupees(order.shipping)}`,
    order.tax > 0 ? `  Taxes (incl) ${rupees(order.tax)}` : "",
    `  ${order.cod ? "To pay on delivery" : "Total"}        ${rupees(order.total)}`,
    ``,
    `DELIVERING TO`,
    address,
    ``,
    `Expected by ${eta}. We will email the tracking number as soon as the courier collects it.`,
    ``,
    `Track this order: ${track}`,
    `Your invoice:     ${invoiceUrl}`,
    ``,
    `WHAT HAPPENS NEXT`,
    `  1. We pack your order and hand it to the courier.`,
    `  2. You get an email with the tracking number and a link to follow it.`,
    `  3. ${order.cod ? `Pay the courier ${rupees(order.total)} when it arrives.` : "It arrives by the date above."}`,
    ``,
    `Something not right? Reply to this email, or call ${BUSINESS.supportPhone}.`,
    ``,
    signatureText(),
  ]
    .filter((part) => part !== "")
    .join("\n");

  return {
    subject: order.cod
      ? `Order ${order.number} confirmed — ${rupees(order.total)} to pay on delivery`
      : `Order ${order.number} confirmed — ${rupees(order.total)}`,
    html: shell({
      kicker: `Order ${order.number}`,
      preheader: `${order.lines.length} item${order.lines.length === 1 ? "" : "s"} · arriving by ${formatDate(order.estimatedDelivery)}`,
      body,
    }),
    text,
  };
}
