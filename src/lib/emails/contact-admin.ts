import { BUSINESS } from "@/config/business";
import {
  C,
  SANS,
  SITE,
  button,
  esc,
  escLines,
  eyebrow,
  formatDateTime,
  panel,
  row,
  shell,
} from "./layout";

/**
 * The copy of a contact message that lands in the shop's own inbox.
 *
 * Written for the owner, not the customer: it front-loads the facts needed to
 * decide whether this is urgent — who, about what, which order, and whether the
 * sender was signed in — and puts the message itself in full underneath, so the
 * question can usually be answered without opening the admin panel at all.
 *
 * Its Reply-To is the customer's address. Hitting reply in Gmail therefore
 * writes to them rather than to the shop, which is the whole point: the fastest
 * possible path from "a customer wrote" to "a person answered".
 *
 * Only sent for a message that was actually stored. A rate-limited, honeypotted
 * or blocked submission never reaches this — otherwise the notification becomes
 * the spam the contact form exists to stop.
 */

export interface ContactAdminEmail {
  subject: string;
  html: string;
  text: string;
  replyTo: string;
}

export interface ContactAdminInput {
  id: string;
  name: string;
  email: string;
  topic: string;
  orderNumber: string | null;
  message: string;
  createdAt: Date;
  /** As nginx saw it. Null on a message stored before the column existed. */
  ip: string | null;
  /** Set when the sender was signed in. */
  customerId: string | null;
  /** Set when the order number matched a real order. */
  orderId: string | null;
}

export function buildContactAdminEmail(input: ContactAdminInput): ContactAdminEmail {
  const adminUrl = `${SITE}/admin/messages/${input.id}`;
  const orderUrl = input.orderId ? `${SITE}/admin/orders/${input.orderId}` : null;

  const facts: [string, string][] = [
    ["From", `${input.name} <${input.email}>`],
    ["Topic", input.topic],
  ];
  if (input.orderNumber) facts.push(["Order", input.orderNumber]);
  facts.push(["Sender", input.customerId ? "Signed in to an account" : "Guest — not signed in"]);
  facts.push(["IP", input.ip ?? "not recorded"]);
  facts.push(["Received", formatDateTime(input.createdAt)]);

  const body = `
${eyebrow("New contact message")}
<h1 style="margin:0;font-family:${SANS};font-size:22px;line-height:29px;font-weight:700;color:${C.ink};">${esc(input.topic)}</h1>
<p style="margin:10px 0 0;font-family:${SANS};font-size:14px;line-height:22px;color:${C.body};">
  ${esc(input.name)} wrote in through the contact form. Reply to this email and it goes straight back to them.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;border-collapse:collapse;">
  ${facts.map(([label, value]) => row(label, value)).join("")}
</table>

<div style="margin-top:20px;">
  ${eyebrow("What they wrote")}
  ${panel(
    `<p style="margin:0;font-family:${SANS};font-size:14px;line-height:22px;color:${C.ink};word-break:break-word;">${escLines(input.message)}</p>`,
  )}
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-collapse:collapse;">
  <tr>
    <td>${button(adminUrl, "Open in admin")}</td>
    ${
      orderUrl
        ? `<td style="padding-left:16px;"><a href="${esc(orderUrl)}" style="font-family:${SANS};font-size:14px;font-weight:600;color:${C.brandDeep};text-decoration:underline;">Open order ${esc(input.orderNumber ?? "")}</a></td>`
        : ""
    }
  </tr>
</table>`;

  const text = [
    `New contact message — ${input.topic}`,
    ``,
    ...facts.map(([label, value]) => `${label.padEnd(10)} ${value}`),
    ``,
    `WHAT THEY WROTE`,
    input.message,
    ``,
    `Open in admin: ${adminUrl}`,
    ...(orderUrl ? [`Open order:    ${orderUrl}`] : []),
    ``,
    `Reply to this email and it goes to ${input.email}.`,
  ].join("\n");

  return {
    // The topic and the name in the subject, so the inbox list is triageable
    // without opening anything.
    subject: `${input.topic} — ${input.name}${input.orderNumber ? ` (${input.orderNumber})` : ""}`,
    html: shell({
      kicker: "Contact form",
      preheader: `${input.name} · ${input.topic}${input.orderNumber ? ` · ${input.orderNumber}` : ""}`,
      body,
    }),
    text,
    replyTo: `${input.name} <${input.email}>`,
  };
}

/** The mailbox these go to: the shop's own support address. */
export const CONTACT_NOTIFY_TO = BUSINESS.supportEmail;
