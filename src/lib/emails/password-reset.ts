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
  /**
   * "set" for an account that has only ever signed in with Google and so has
   * no password yet. Telling that person to "reset your password" invites them
   * to remember one they never made, and makes the email look like a phishing
   * attempt for a credential they know they do not have.
   */
  mode: "set" | "reset";
}

export function buildPasswordResetEmail(input: PasswordResetEmailInput): OrderEmail {
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const expiry = formatDateTime(input.expiresAt);
  const setting = input.mode === "set";

  const heading = setting ? "Set a password for your account" : "Set a new password";
  const intro = setting
    ? `${first}, you asked to add a password to your ${BUSINESS.brandName} account. At the moment you sign in with Google — once you have set a password you can use either, and the Google button keeps working exactly as it does now.`
    : `${first}, someone asked to reset the password on your ${BUSINESS.brandName} account. Use the button below to choose a new one.`;
  const action = setting ? "Set a password" : "Choose a new password";
  const denial = setting
    ? "<strong>Did not ask for this?</strong> Ignore this email. No password has been added, your account is unchanged, and you can carry on signing in with Google. If you keep getting these, reply and tell us."
    : "<strong>Did not ask for this?</strong> Ignore this email. Your password has not changed and nobody can change it without this link. If you keep getting these, reply and tell us — it means somebody is typing your address into our sign-in page.";

  const body = `
${eyebrow(setting ? "Add a password" : "Password reset")}
<h1 style="margin:0;font-family:${SANS};font-size:23px;line-height:30px;font-weight:700;color:${C.ink};">${esc(heading)}</h1>
<p style="margin:12px 0 0;font-family:${SANS};font-size:15px;line-height:23px;color:${C.body};">${esc(intro)}</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-collapse:collapse;">
  <tr><td>${button(input.resetUrl, action)}</td></tr>
</table>

<p style="margin:18px 0 0;font-family:${SANS};font-size:13px;line-height:21px;color:${C.muted};">
  This link works once and stops working at <strong style="color:${C.ink};">${esc(expiry)}</strong>.
</p>

<div style="margin-top:22px;">
  ${panel(
    `<p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.ink};">${denial}</p>`,
    "caution",
  )}
</div>

<p style="margin:22px 0 0;font-family:${SANS};font-size:12.5px;line-height:20px;color:${C.muted};word-break:break-all;">
  If the button does not work, paste this into your browser:<br>${esc(input.resetUrl)}
</p>`;

  const text = [
    heading,
    ``,
    intro,
    ``,
    setting ? `Open this link to set one:` : `Open this link to choose a new one:`,
    ``,
    input.resetUrl,
    ``,
    `This link works once and stops working at ${expiry}.`,
    ``,
    `DID NOT ASK FOR THIS?`,
    setting
      ? `Ignore this email. No password has been added and your account is unchanged.`
      : `Ignore this email. Your password has not changed and nobody can change it without this link.`,
    `If you keep getting these, reply and tell us.`,
    ``,
    signatureText(),
  ].join("\n");

  return {
    subject: setting ? `Set a password for your ${BUSINESS.brandName} account` : `Reset your ${BUSINESS.brandName} password`,
    html: shell({
      kicker: setting ? "Add a password" : "Password reset",
      preheader: setting
        ? `A link to add a password to your account. It expires at ${expiry}.`
        : `A link to set a new password. It expires at ${expiry}.`,
      body,
    }),
    text,
  };
}

/** Where the reset link points. */
export function resetUrl(token: string): string {
  return `${SITE}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Sent when a password appears on an account that never had one.
 *
 * This is the safety net behind the whole "set a password" flow. A Google-only
 * account gaining a password is indistinguishable, from the outside, from
 * somebody who has got into the mailbox doing exactly that — so the address is
 * told, in the plainest words available, with a way to reach a person.
 *
 * It deliberately carries no link and no button. A security notice whose
 * remedy is a link trains people to click links in security notices, which is
 * the habit that loses the account in the first place.
 */
export function buildPasswordSetNotice(input: { name: string }): OrderEmail {
  const first = input.name.trim().split(/\s+/)[0] || "there";

  const body = `
${eyebrow("Security notice")}
<h1 style="margin:0;font-family:${SANS};font-size:23px;line-height:30px;font-weight:700;color:${C.ink};">A password was added to your account</h1>
<p style="margin:12px 0 0;font-family:${SANS};font-size:15px;line-height:23px;color:${C.body};">
  ${esc(first)}, a password has just been set on your ${esc(BUSINESS.brandName)} account. You can now sign in either with Google, as before, or with your email address and this new password.
</p>

<div style="margin-top:22px;">
  ${panel(
    `<p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.ink};"><strong>Was this not you?</strong> Somebody else may have access to this mailbox. Reply to this email or call ${esc(BUSINESS.supportPhone)} straight away and we will lock the account while we sort it out. Do not use a link in any email to do it — reach us the way you know is real.</p>`,
    "caution",
  )}
</div>

<p style="margin:22px 0 0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.body};">
  If it was you, there is nothing to do. Your Google sign-in still works exactly as it did.
</p>`;

  const text = [
    `A password was added to your account`,
    ``,
    `${first}, a password has just been set on your ${BUSINESS.brandName} account.`,
    `You can now sign in either with Google, as before, or with your email`,
    `address and this new password.`,
    ``,
    `WAS THIS NOT YOU?`,
    `Somebody else may have access to this mailbox. Reply to this email or call`,
    `${BUSINESS.supportPhone} straight away and we will lock the account while we`,
    `sort it out. Do not use a link in any email to do it — reach us the way you`,
    `know is real.`,
    ``,
    `If it was you, there is nothing to do. Your Google sign-in still works.`,
    ``,
    signatureText(),
  ].join("\n");

  return {
    subject: `A password was added to your ${BUSINESS.brandName} account`,
    html: shell({
      kicker: "Security notice",
      preheader: "You can now sign in with email and password as well as Google.",
      body,
    }),
    text,
  };
}
