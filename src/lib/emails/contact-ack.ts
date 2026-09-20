import { BUSINESS, formatAddress, isFilled } from "@/config/business";

/**
 * The automatic acknowledgement a customer gets the moment their message lands
 * in the inbox.
 *
 * Its whole job is to remove the doubt that follows pressing Send on a contact
 * form: did that go anywhere, and did they get what I actually wrote? So it
 * quotes their message back to them verbatim, and it comes from the address a
 * human would reply from, not from a no-reply. That also gives them somewhere
 * to add the thing they forgot — a reply to this email reaches the same inbox
 * their message is already sitting in.
 *
 * It is sent only after the message has been stored. A refused submission —
 * rate-limited, honeypotted, blocked — never produces one, because an
 * acknowledgement for a message nobody will answer is worse than silence, and
 * because an auto-reply that fires on unvalidated input is itself a way to send
 * mail to strangers.
 *
 * Built for email clients: one table, inline styles, no external CSS, and
 * nothing that has to load for the text to make sense.
 */

export interface ContactAckEmail {
  subject: string;
  html: string;
  text: string;
}

export interface ContactAckInput {
  name: string;
  topic: string;
  message: string;
  orderNumber: string | null;
  /** Shown so the customer can quote it if they follow up. */
  reference: string;
}

const SITE = (isFilled(BUSINESS.url) ? BUSINESS.url : "http://localhost:3000").replace(/\/+$/, "");

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

const SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * Every value below is quoted back from what the sender typed, so this is the
 * one function in the file that matters: `<`, `>`, `&` and quotes become
 * entities, and the message can never close a tag or open an attribute.
 */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escaped first, then line breaks become <br> — never the other way round. */
function escMultiline(value: string): string {
  return esc(value).replace(/\r?\n/g, "<br>");
}

export function buildContactAck(input: ContactAckInput): ContactAckEmail {
  const firstName = input.name.trim().split(/\s+/)[0] || "there";
  const subject = `We have your message — ${BUSINESS.brandName}`;

  const detailRows: [string, string][] = [["Topic", input.topic]];
  if (input.orderNumber) detailRows.push(["Order", input.orderNumber]);
  detailRows.push(["Reference", input.reference]);

  const rowsHtml = detailRows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:4px 12px 4px 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};white-space:nowrap;">${esc(label)}</td>
          <td style="padding:4px 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.ink};font-weight:600;">${esc(value)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background-color:${C.canvas};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Thanks ${esc(firstName)} — your message reached us, and here is what you sent.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.canvas};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:${C.surface};">
          <tr>
            <td style="padding:28px 28px 0;">
              <p style="margin:0;font-family:${SANS};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${C.muted};">${esc(BUSINESS.brandName)}</p>
              <h1 style="margin:10px 0 0;font-family:${SANS};font-size:22px;line-height:29px;color:${C.ink};font-weight:600;">We have your message</h1>
              <p style="margin:12px 0 0;font-family:${SANS};font-size:14px;line-height:22px;color:${C.body};">
                Thanks ${esc(firstName)} — this is an automatic note to confirm it arrived. A person reads every message; we answer during ${esc(BUSINESS.supportHours)}.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 0;">
              <p style="margin:0 0 8px;font-family:${SANS};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">What you wrote</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:14px 16px;background-color:${C.canvas};border-left:3px solid ${C.brandTint};font-family:${SANS};font-size:14px;line-height:22px;color:${C.body};word-break:break-word;">${escMultiline(input.message)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 0;">
              <p style="margin:0;font-family:${SANS};font-size:14px;line-height:22px;color:${C.body};">
                Forgotten something? Reply to this email and it joins the same conversation — no need to send the form again.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 28px;">
              <p style="margin:0;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};border-top:1px solid ${C.hairline};padding-top:14px;">
                ${esc(BUSINESS.brandName)} · <a href="${esc(SITE)}" style="color:${C.brandDeep};">${esc(BUSINESS.domain)}</a><br>
                ${esc(formatAddress())}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `We have your message`,
    ``,
    `Thanks ${firstName} — this is an automatic note to confirm it arrived.`,
    `A person reads every message; we answer during ${BUSINESS.supportHours}.`,
    ``,
    ...detailRows.map(([label, value]) => `${label}: ${value}`),
    ``,
    `What you wrote:`,
    input.message,
    ``,
    `Forgotten something? Reply to this email and it joins the same conversation.`,
    ``,
    `${BUSINESS.brandName} — ${SITE}`,
    formatAddress(),
  ].join("\n");

  return { subject, html, text };
}
