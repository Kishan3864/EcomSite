import { BUSINESS } from "@/config/business";
import {
  C,
  SANS,
  SITE,
  emailImage,
  esc,
  escLines,
  eyebrow,
  formatDate,
  formatDateTime,
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
  /** Unit MRP, whole rupees. Absent in older previews; treated as the price. */
  mrp?: number;
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
  /**
   * The signed order-view token. Without it both links below are dead for a
   * reader with no session cookie, which is nearly every reader of an email.
   */
  viewToken: string;
  /** Printed when the invoice has been raised; omitted rather than invented. */
  invoiceNumber?: string | null;
}

/** A 64px thumbnail cell, or a tinted placeholder when the product has no image. */
function thumbnail(line: OrderEmailLine): string {
  if (line.image) {
    return `<img src="${esc(emailImage(line.image))}" width="64" height="64" alt="${esc(line.title)}" style="display:block;width:64px;height:64px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;object-fit:cover;background-color:${C.canvas};">`;
  }
  // No image is not a broken image: an empty tinted square reads as deliberate,
  // and the title beside it carries the meaning anyway.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td width="64" height="64" bgcolor="${C.canvas}" style="width:64px;height:64px;background-color:${C.canvas};">&nbsp;</td></tr></table>`;
}

/** Green for money the customer keeps. Local to the receipt. */
const SAVE = "#1f7a4d";
const BRAND = "#1b4f74";
const BRAND_TINT = "#eef5fb";
const BRAND_LINE = "#d3e4f1";
const SAVE_BG = "#e8f5ee";

function priceRow(
  label: string,
  value: string,
  opts: { strong?: boolean; rule?: boolean; color?: string; small?: boolean } = {},
): string {
  const border = opts.rule ? `border-top:1px dashed ${C.hairline};` : "";
  const pad = opts.rule ? "12px 0 6px" : opts.small ? "0 0 2px" : "5px 0";
  const size = opts.strong ? "17px" : opts.small ? "12px" : "14px";
  const labelColor = opts.strong ? C.ink : C.muted;
  const valueColor = opts.color ?? (opts.small ? C.muted : C.ink);
  return `
  <tr>
    <td style="${border}padding:${pad};font-family:${SANS};font-size:${size};line-height:22px;font-weight:${opts.strong ? 700 : 400};color:${labelColor};">${esc(label)}</td>
    <td align="right" style="${border}padding:${pad};font-family:${SANS};font-size:${size};line-height:22px;font-weight:${opts.strong ? 800 : 600};color:${valueColor};white-space:nowrap;">${esc(value)}</td>
  </tr>`;
}

function lineRow(line: OrderEmailLine): string {
  const lineTotal = line.price * line.quantity;
  const mrpTotal = Math.max(line.mrp ?? line.price, line.price) * line.quantity;
  const off = mrpTotal > lineTotal ? Math.round(((mrpTotal - lineTotal) / mrpTotal) * 100) : 0;
  return `
  <tr>
    <td width="64" valign="top" style="padding:14px 14px 14px 0;">${thumbnail(line)}</td>
    <td valign="top" style="padding:14px 0;font-family:${SANS};">
      <p style="margin:0;font-size:14px;line-height:20px;font-weight:600;color:${C.ink};">${esc(line.title)}</p>
      ${line.variantLabel ? `<p style="margin:3px 0 0;font-size:12.5px;line-height:18px;color:${C.muted};">${esc(line.variantLabel)}</p>` : ""}
      <p style="margin:4px 0 0;font-size:12.5px;line-height:18px;color:${C.muted};">Qty ${line.quantity} · ${esc(rupees(line.price))} each</p>
      ${off > 0 ? `<p style="margin:6px 0 0;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background-color:${SAVE_BG};font-size:11.5px;line-height:16px;font-weight:700;color:${SAVE};">${off}% off</span></p>` : ""}
    </td>
    <td valign="top" align="right" style="padding:14px 0 14px 10px;font-family:${SANS};white-space:nowrap;">
      <p style="margin:0;font-size:14px;line-height:20px;font-weight:700;color:${C.ink};">${esc(rupees(lineTotal))}</p>
      ${off > 0 ? `<p style="margin:2px 0 0;font-size:12px;line-height:18px;color:${C.muted};text-decoration:line-through;">${esc(rupees(mrpTotal))}</p>` : ""}
    </td>
  </tr>`;
}

export function buildOrderConfirmation(order: OrderEmailInput): OrderEmail {
  const firstName = order.contactName.trim().split(/\s+/)[0] || "there";
  const auth = `?t=${encodeURIComponent(order.viewToken)}`;
  const track = `${SITE}/track/${order.orderId}${auth}`;
  const invoiceUrl = `${SITE}/order/${order.orderId}/invoice${auth}`;

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

  // The bill, top to bottom, so every line adds up to the one below it:
  // MRP − discount = subtotal, + delivery = total. itemsTotal is already the
  // selling-price sum; productDiscount is MRP − selling price.
  const itemCount = order.lines.reduce((n, l) => n + l.quantity, 0);
  const mrpTotal = order.itemsTotal + order.productDiscount;
  const totals = [
    priceRow(`Total MRP (${itemCount} item${itemCount === 1 ? "" : "s"})`, rupees(mrpTotal)),
    order.productDiscount > 0 ? priceRow("Discount on MRP", `− ${rupees(order.productDiscount)}`, { color: SAVE }) : "",
    order.productDiscount > 0 ? priceRow("Subtotal", rupees(order.itemsTotal), { rule: true }) : "",
    priceRow("Delivery", order.shipping === 0 ? "FREE" : `+ ${rupees(order.shipping)}`, order.shipping === 0 ? { color: SAVE } : {}),
    priceRow(order.cod ? "To pay on delivery" : "Total amount", rupees(order.total), { strong: true, rule: true }),
    order.tax > 0 ? priceRow("Inclusive of GST", rupees(order.tax), { small: true }) : "",
  ].join("");
  const savedBanner =
    order.productDiscount > 0
      ? `<tr><td colspan="2" style="padding:12px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td style="padding:10px 14px;border-radius:10px;background-color:${SAVE_BG};font-family:${SANS};font-size:13px;line-height:19px;font-weight:700;color:${SAVE};">You saved ${esc(rupees(order.productDiscount))} on this order</td></tr></table></td></tr>`
      : "";

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

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;border-collapse:separate;border:1px solid ${C.hairline};border-radius:14px;background-color:#fafbfc;">
  <tr><td style="padding:16px 18px 18px;">
    ${eyebrow("Price details")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${totals}
      ${savedBanner}
    </table>
  </td></tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-collapse:collapse;">
  <tr>
    <td class="stack" width="50%" valign="top" style="padding-right:8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border:1px solid ${C.hairline};border-radius:14px;background-color:#ffffff;">
        <tr><td style="padding:16px 18px;">
          <p style="margin:0 0 10px;font-family:${SANS};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND};">&#9679;&nbsp; Delivering to</p>
          <p style="margin:0;font-family:${SANS};font-size:14px;line-height:20px;font-weight:700;color:${C.ink};">${esc(order.shipName)}</p>
          <p style="margin:4px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.body};">${escLines([order.shipLine1, order.shipLine2, `${order.shipCity}, ${order.shipState}`].filter(Boolean).join(String.fromCharCode(10)))}</p>
          <p style="margin:8px 0 0;"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background-color:${C.canvas};font-family:${SANS};font-size:12px;line-height:16px;font-weight:600;color:${C.ink};">PIN ${esc(order.shipPincode)}</span></p>
        </td></tr>
      </table>
    </td>
    <td class="stack" width="50%" valign="top" style="padding-left:8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border:1px solid ${BRAND_LINE};border-radius:14px;background-color:${BRAND_TINT};">
        <tr><td style="padding:16px 18px;">
          <p style="margin:0 0 10px;font-family:${SANS};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND};">&#9679;&nbsp; Expected by</p>
          <p style="margin:0;font-family:${SANS};font-size:19px;line-height:25px;font-weight:800;color:${C.ink};">${esc(eta)}</p>
          <p style="margin:8px 0 0;font-family:${SANS};font-size:12.5px;line-height:19px;color:${C.body};">We will email the tracking number the moment the courier collects it.</p>
        </td></tr>
      </table>
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-collapse:collapse;">
  <tr>
    <td class="stack" style="padding:0 6px 0 0;" width="50%">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>
        <td align="center" bgcolor="${BRAND}" style="border-radius:999px;background-color:${BRAND};">
          <a href="${esc(track)}" style="display:block;padding:14px 22px;font-family:${SANS};font-size:14px;line-height:18px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">Track this order &rarr;</a>
        </td>
      </tr></table>
    </td>
    <td class="stack" style="padding:0 0 0 6px;" width="50%">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>
        <td align="center" style="border-radius:999px;border:1px solid ${C.hairline};background-color:#ffffff;">
          <a href="${esc(invoiceUrl)}" style="display:block;padding:13px 22px;font-family:${SANS};font-size:14px;line-height:18px;font-weight:700;color:${C.ink};text-decoration:none;border-radius:999px;">View invoice</a>
        </td>
      </tr></table>
    </td>
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
    `PRICE DETAILS`,
    `  Total MRP          ${rupees(order.itemsTotal + order.productDiscount)}`,
    order.productDiscount > 0 ? `  Discount on MRP    − ${rupees(order.productDiscount)}` : "",
    order.productDiscount > 0 ? `  Subtotal           ${rupees(order.itemsTotal)}` : "",
    `  Delivery           ${order.shipping === 0 ? "FREE" : `+ ${rupees(order.shipping)}`}`,
    `  ${order.cod ? "To pay on delivery" : "Total amount"}       ${rupees(order.total)}`,
    order.tax > 0 ? `  (Inclusive of GST ${rupees(order.tax)})` : "",
    order.productDiscount > 0 ? `  You saved ${rupees(order.productDiscount)} on this order` : "",
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
