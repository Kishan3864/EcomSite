import { BUSINESS } from "@/config/business";
import { C, SANS, SITE, button, esc, eyebrow, formatDateTime, panel, shell, signatureText } from "./layout";
import type { OrderEmail } from "./order";

/**
 * The email carrying a password reset link.
 *
 * It states plainly that it expires, that it works once, and — the part that
 * matters most — what to do if the reader did not ask for it. Somebody who
 * receives an unrequested reset email is being told that someone typed their
 * address into a login page, and the honest response is "ignore this, your
 * password has not changed", not silence.
 *
 * The link is the only secret. It is never logged, and the server stores only
 * its hash, so this email is the one and only copy.
 */

export interface PasswordResetEmailInput {
  name: string;
  /** The full URL including the raw token. */
  resetUrl: string;
  expiresAt: Date;
}

export function buildPasswordResetEmail(input: PasswordResetEmailInput): OrderEmail {
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const expiry = formatDateTime(input.expiresAt);

  const body = `
${eyebrow("Password reset")}
<h1 style="margin:0;font-family:${SANS};font-size:23px;line-height:30px;font-weight:700;color:${C.ink};">Set a new password</h1>
<p style="margin:12px 0 0;font-family:${SANS};font-size:15px;line-height:23px;color:${C.body};">
  ${esc(first)}, someone asked to reset the password on your ${esc(BUSINESS.brandName)} account. Use the button below to choose a new one.
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-collapse:collapse;">
  <tr><td>${button(input.resetUrl, "Choose a new password")}</td></tr>
</table>

<p style="margin:18px 0 0;font-family:${SANS};font-size:13px;line-height:21px;color:${C.muted};">
  This link works once and stops working at <strong style="color:${C.ink};">${esc(expiry)}</strong>.
</p>

<div style="margin-top:22px;">
  ${panel(
    `<p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.ink};"><strong>Did not ask for this?</strong> Ignore this email. Your password has not changed and nobody can change it without this link. If you keep getting these, reply and tell us — it means somebody is typing your address into our sign-in page.</p>`,
    "caution",
  )}
</div>

<p style="margin:22px 0 0;font-family:${SANS};font-size:12.5px;line-height:20px;color:${C.muted};word-break:break-all;">
  If the button does not work, paste this into your browser:<br>${esc(input.resetUrl)}
</p>`;

  const text = [
    `Set a new password`,
    ``,
    `${first}, someone asked to reset the password on your ${BUSINESS.brandName} account.`,
    `Open this link to choose a new one:`,
    ``,
    input.resetUrl,
    ``,
    `This link works once and stops working at ${expiry}.`,
    ``,
    `DID NOT ASK FOR THIS?`,
    `Ignore this email. Your password has not changed and nobody can change it`,
    `without this link. If you keep getting these, reply and tell us.`,
    ``,
    signatureText(),
  ].join("\n");

  return {
    subject: `Reset your ${BUSINESS.brandName} password`,
    html: shell({
      kicker: "Password reset",
      preheader: `A link to set a new password. It expires at ${expiry}.`,
      body,
    }),
    text,
  };
}

/** Where the reset link points. */
export function resetUrl(token: string): string {
  return `${SITE}/reset-password?token=${encodeURIComponent(token)}`;
}
