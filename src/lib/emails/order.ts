import { BUSINESS, formatAddress, isFilled } from "@/config/business";
import { formatDateTime } from "@/lib/utils";

/**
 * The email a customer gets when their order is confirmed.
 *
 * Sent at the moment the money is real — the gateway's verified answer, or a
 * bank credit the owner has seen — never at checkout. An email that says
 * "confirmed" before the payment has landed is the one thing a customer will
 * quote back when it later fails.
 *
 * Written for email clients rather than browsers: a table, inline styles, and
 * no image that has to load for the message to make sense. A customer reading
 * it on a train with images blocked still has their order number, what they
 * paid, where it is going and how to reach a person.
 */

export interface OrderEmail {
  subject: string;
  html: string;
  text: string;
}

export interface OrderEmailInput {
  number: string;
  placedAt: Date;
  contactName: string;
  lines: { title: string; quantity: number; price: number }[];
  itemsTotal: number;
  shipping: number;
  total: number;
  paymentLabel: string;
  paymentRef: string | null;
  shipName: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  estimatedDelivery: Date;
  orderId: string;
}

const SITE = (isFilled(BUSINESS.url) ? BUSINESS.url : "http://localhost:3000").replace(/\/+$/, "");
/**
 * The brand palette from globals.css, repeated as literals because no email
 * client resolves CSS custom properties. The keys say what each colour is for
 * rather than what it looks like, so a change of theme does not leave a name
 * describing a colour the file no longer uses.
 */
const C = {
  canvas: "#f4f3f0",
  surface: "#ffffff",
  brandDeep: "#1c333f",
  brandTint: "#bcd3de",
  ink: "#1f262b",
  body: "#414c54",
  muted: "#627079",
  hairline: "#d4dae1",
};

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildOrderConfirmation(order: OrderEmailInput): OrderEmail {
  const track = `${SITE}/track/${order.orderId}`;
  const invoice = `${SITE}/order/${order.orderId}/invoice`;
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

  const text = `Hello ${order.contactName},

Your payment has gone through and order ${order.number} is confirmed. We are getting it packed.

WHAT YOU ORDERED
${order.lines.map((l) => `  ${l.title} × ${l.quantity} — ${rupees(l.price * l.quantity)}`).join("\n")}

  Items      ${rupees(order.itemsTotal)}
  Delivery   ${order.shipping === 0 ? "Free" : rupees(order.shipping)}
  Total paid ${rupees(order.total)}
  Paid by    ${order.paymentLabel}${order.paymentRef ? ` (ref ${order.paymentRef})` : ""}
  Placed     ${formatDateTime(order.placedAt)}

DELIVERING TO
${address}

Expected by ${eta}. We will email you the tracking number as soon as the courier collects it.

Track your order: ${track}
Your invoice:     ${invoice}

Anything at all — reply to this email, call ${BUSINESS.supportPhone}, or WhatsApp us.
${BUSINESS.supportHours}.

${BUSINESS.legalName}
${formatAddress()}`;

  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:6px 0;color:${C.muted};font-size:14px;">${esc(label)}</td>
      <td style="padding:6px 0;text-align:right;font-size:14px;color:${C.ink};${strong ? "font-weight:700;" : ""}">${esc(value)}</td>
    </tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.canvas};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.surface};overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

    <tr><td style="background:${C.brandDeep};padding:22px 24px;">
      <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.2px;">${esc(BUSINESS.brandName)}</div>
      <div style="color:${C.brandTint};font-size:13px;margin-top:2px;">Order confirmed</div>
    </td></tr>

    <tr><td style="padding:24px;">
      <p style="margin:0 0 14px;font-size:15px;color:${C.body};line-height:1.6;">
        Hello ${esc(order.contactName)}, your payment has gone through and order
        <strong style="color:${C.ink};">${esc(order.number)}</strong> is confirmed. We are getting it packed.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};margin-top:6px;">
        ${order.lines
          .map(
            (l) => `<tr>
          <td style="padding:10px 0;font-size:14px;color:${C.ink};line-height:1.5;">${esc(l.title)}<br><span style="color:${C.muted};font-size:13px;">Qty ${l.quantity}</span></td>
          <td style="padding:10px 0;text-align:right;font-size:14px;color:${C.ink};white-space:nowrap;">${rupees(l.price * l.quantity)}</td>
        </tr>`,
          )
          .join("")}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};margin-top:8px;padding-top:8px;">
        ${row("Items", rupees(order.itemsTotal))}
        ${row("Delivery", order.shipping === 0 ? "Free" : rupees(order.shipping))}
        ${row("Total paid", rupees(order.total), true)}
        ${row("Paid by", order.paymentLabel + (order.paymentRef ? ` · ${order.paymentRef}` : ""))}
        ${row("Placed", formatDateTime(order.placedAt))}
      </table>

      <div style="margin-top:20px;padding:14px 16px;background:${C.canvas};">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:${C.muted};">Delivering to</div>
        <div style="margin-top:6px;font-size:14px;color:${C.ink};line-height:1.6;">${esc(address).replace(/\n/g, "<br>")}</div>
        <div style="margin-top:10px;font-size:13.5px;color:${C.body};">Expected by <strong>${esc(eta)}</strong>. We will email the tracking number as soon as the courier collects it.</div>
      </div>

      <div style="margin-top:22px;">
        <a href="${track}" style="display:inline-block;background:${C.brandDeep};color:#ffffff;text-decoration:none;padding:11px 20px;font-size:14px;font-weight:600;">Track your order</a>
        <a href="${invoice}" style="display:inline-block;margin-left:8px;color:${C.brandDeep};text-decoration:none;padding:11px 6px;font-size:14px;font-weight:600;">View invoice</a>
      </div>

      <p style="margin:22px 0 0;font-size:13px;color:${C.muted};line-height:1.6;">
        Anything at all — reply to this email, call
        <a href="tel:+${BUSINESS.supportPhoneDigits}" style="color:${C.brandDeep};">${esc(BUSINESS.supportPhone)}</a>,
        or <a href="https://wa.me/${BUSINESS.supportPhoneDigits}" style="color:${C.brandDeep};">WhatsApp us</a>.
        ${esc(BUSINESS.supportHours)}.
      </p>
    </td></tr>

    <tr><td style="padding:16px 24px;background:${C.canvas};font-size:12px;color:${C.muted};line-height:1.6;">
      ${esc(BUSINESS.legalName)}<br>${esc(formatAddress())}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  return { subject: `Order ${order.number} confirmed — ${rupees(order.total)}`, html, text };
}
