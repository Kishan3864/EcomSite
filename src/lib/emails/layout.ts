import { existsSync } from "node:fs";
import { join } from "node:path";

import { BUSINESS, formatAddress, isFilled } from "@/config/business";

/**
 * The one shell every WeekendCart email is built in.
 *
 * Before this existed each email carried its own copy of the table scaffolding,
 * its own palette and its own footer, which is how a shop ends up with four
 * mails that look like four shops. Everything here is shared: the header, the
 * card, the signature block, the buttons, the rows. A template supplies the
 * middle and nothing else.
 *
 * Written for email clients, not browsers, and the constraints are not
 * negotiable:
 *   - tables for layout, because Outlook's engine is Word's and it has no flex
 *     or grid
 *   - every style inline, because Gmail strips <style> in forwarded mail
 *   - no external stylesheet, no webfont, no background image carrying meaning
 *   - absolute https URLs on every image and link, since there is no page to be
 *     relative to
 *   - alt text on every image, because Outlook blocks images by default and the
 *     mail must still read
 *   - a plain-text alternative always, which each template builds itself
 */

export const SITE = (isFilled(BUSINESS.url) ? BUSINESS.url : "http://localhost:3000").replace(/\/+$/, "");

/**
 * The brand palette from globals.css, repeated as literals: no email client
 * resolves CSS custom properties, and a token that collapses to nothing leaves
 * dark text on an unpainted background in exactly the clients that matter.
 */
export const C = {
  canvas: "#f4f3f0",
  surface: "#ffffff",
  brandDeep: "#1c333f",
  brandSoft: "#2f5265",
  brandTint: "#dbe7ed",
  accent: "#26988f",
  accentDeep: "#1a6a68",
  ink: "#1f262b",
  body: "#414c54",
  muted: "#627079",
  hairline: "#d4dae1",
  positive: "#1a6a68",
  caution: "#8a6a1f",
  cautionBg: "#fbf4e2",
};

export const SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Escapes anything that came from a customer, an order or the database. */
export function esc(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escaped first, then newlines become <br> — never the other way round. */
export function escLines(value: string): string {
  return esc(value).replace(/\r?\n/g, "<br>");
}

export const rupees = (paise: number) => `₹${Math.round(paise).toLocaleString("en-IN")}`;

export function formatDate(at: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(at);
}

export function formatDateTime(at: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  })
    .format(at)
    .replace(/ | /g, " ");
}

/** An image URL made absolute, since a relative one resolves to nothing in mail. */
export function absolute(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE}/${String(url).replace(/^\/+/, "")}`;
}

/**
 * The URL an email should use for a product image.
 *
 * Outlook on Windows cannot decode WebP, and most of the catalogue is WebP, so
 * a plain <img> pointing at the site's own image shows alt text there. A JPEG
 * twin is written beside each source by scripts/email-image-twins.mjs; this
 * prefers that twin when it exists on disk and falls back to the original when
 * it does not, so a product added since the script last ran still shows an
 * image in every client that can read WebP rather than showing nothing.
 *
 * The site itself is untouched: pages keep serving WebP through the image
 * optimiser. This rewrite happens only while building an email.
 */
export function emailImage(url: string): string {
  // Anything already absolute is somebody else's host; leave it alone.
  if (/^https?:\/\//i.test(url)) return absolute(url);

  const path = String(url).replace(/^\/+/, "");
  if (!path.startsWith("products/")) return absolute(url);

  const twin = path.replace(/\.(webp|png|jpe?g)$/i, ".email.jpg");
  if (twin === path) return absolute(url);

  return existsSync(join(process.cwd(), "public", twin)) ? absolute(twin) : absolute(url);
}

/* --------------------------------------------------------------- pieces */

/**
 * The primary action. VML for Outlook on Windows, a padded anchor everywhere
 * else — Outlook ignores padding on an <a>, so without the VML the button
 * collapses to bare underlined text.
 */
export function button(href: string, label: string): string {
  const url = esc(href);
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr><td align="center" bgcolor="${C.brandDeep}" style="background-color:${C.brandDeep};">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="0%" stroke="f" fillcolor="${C.brandDeep}"><w:anchorlock/><center style="color:#ffffff;font-family:${SANS};font-size:15px;font-weight:600;"><![endif]-->
    <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${esc(label)}</a>
    <!--[if mso]></center></v:roundrect><![endif]-->
  </td></tr>
</table>`;
}

/** A quieter second action, set beside the button. */
export function link(href: string, label: string): string {
  return `<a href="${esc(href)}" style="font-family:${SANS};font-size:14px;font-weight:600;color:${C.brandDeep};text-decoration:underline;">${esc(label)}</a>`;
}

/** One label/value line in a totals or details block. */
export function row(label: string, value: string, opts: { strong?: boolean; rule?: boolean } = {}): string {
  const weight = opts.strong ? "700" : "400";
  const size = opts.strong ? "15px" : "14px";
  const border = opts.rule ? `border-top:1px solid ${C.hairline};` : "";
  return `
  <tr>
    <td style="${border}padding:${opts.rule ? "12px" : "6px"} 0 6px;font-family:${SANS};font-size:${size};color:${opts.strong ? C.ink : C.muted};">${esc(label)}</td>
    <td align="right" style="${border}padding:${opts.rule ? "12px" : "6px"} 0 6px;font-family:${SANS};font-size:${size};font-weight:${weight};color:${C.ink};white-space:nowrap;">${esc(value)}</td>
  </tr>`;
}

/** A small caps heading above a block. */
export function eyebrow(text: string): string {
  return `<p style="margin:0 0 8px;font-family:${SANS};font-size:11.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">${esc(text)}</p>`;
}

/** A tinted panel — the address block, the what-happens-next note. */
export function panel(inner: string, tone: "canvas" | "caution" = "canvas"): string {
  const bg = tone === "caution" ? C.cautionBg : C.canvas;
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:${bg};">
  <tr><td style="padding:16px 18px;">${inner}</td></tr>
</table>`;
}

/**
 * The signature. One block, every mail, so the shop signs its name the same way
 * whatever it is writing about — and so the legal footer is impossible to
 * forget on a new template.
 */
export function signature(): string {
  const bits: string[] = [];
  bits.push(
    `<p style="margin:0;font-family:${SANS};font-size:14px;font-weight:700;color:${C.ink};">${esc(BUSINESS.brandName)}</p>`,
  );
  bits.push(
    `<p style="margin:6px 0 0;font-family:${SANS};font-size:13px;line-height:21px;color:${C.body};">` +
      `<a href="mailto:${esc(BUSINESS.supportEmail)}" style="color:${C.brandDeep};text-decoration:none;">${esc(BUSINESS.supportEmail)}</a><br>` +
      `<a href="tel:${esc(BUSINESS.supportPhoneTel)}" style="color:${C.brandDeep};text-decoration:none;">${esc(BUSINESS.supportPhone)}</a>` +
      `${BUSINESS.whatsappEnabled ? ` · <a href="https://wa.me/${esc(BUSINESS.supportPhoneDigits)}" style="color:${C.brandDeep};text-decoration:none;">WhatsApp</a>` : ""}<br>` +
      `<a href="${esc(SITE)}" style="color:${C.brandDeep};text-decoration:none;">${esc(BUSINESS.domain)}</a>` +
      `</p>`,
  );
  bits.push(
    `<p style="margin:10px 0 0;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};">${escLines(formatAddress())}</p>`,
  );
  bits.push(
    `<p style="margin:8px 0 0;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};">${esc(BUSINESS.supportHours)}</p>`,
  );

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td width="56" valign="top" style="padding:0 14px 0 0;">
      <img src="${esc(absolute("/brand/png/weekendcart-icon-192.png"))}" width="48" height="48" alt="${esc(BUSINESS.brandName)}" style="display:block;width:48px;height:48px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;">
    </td>
    <td valign="top">${bits.join("")}</td>
  </tr>
</table>`;
}

export interface ShellOptions {
  /** The line under the brand name in the header — what this email is about. */
  kicker: string;
  /** The hidden line email clients show beside the subject in the inbox list. */
  preheader: string;
  /** The body, already built from the pieces above. */
  body: string;
  /**
   * Set only on marketing mail. Transactional mail about an order the customer
   * placed needs no unsubscribe and must not offer one — a receipt someone can
   * opt out of is a receipt that goes missing.
   */
  unsubscribeUrl?: string;
  /**
   * Replaces the standard service-email line under the card, for a mail that
   * needs to say something more exact about why it came and whether another
   * will follow — the review request says it asks once and reminds once at
   * most. Plain text; escaped here.
   */
  footerNote?: string;
}

/** Wraps a body in the shared shell and returns the complete HTML document. */
export function shell({ kicker, preheader, body, unsubscribeUrl, footerNote }: ShellOptions): string {
  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(kicker)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;background-color:${C.canvas};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.canvas};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;border-collapse:collapse;">

        <tr>
          <td style="padding:0 0 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <a href="${esc(SITE)}" style="text-decoration:none;">
                    <img src="${esc(absolute("/brand/png/weekendcart-logo-email.png"))}" width="150" alt="${esc(BUSINESS.brandName)}" style="display:block;width:150px;max-width:150px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;">
                  </a>
                </td>
                <td align="right" style="font-family:${SANS};font-size:12px;color:${C.muted};">${esc(kicker)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td bgcolor="${C.surface}" style="background-color:${C.surface};padding:28px 28px 24px;">
            ${body}
          </td>
        </tr>

        <tr>
          <td bgcolor="${C.surface}" style="background-color:${C.surface};padding:0 28px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="border-top:1px solid ${C.hairline};padding-top:20px;">${signature()}</td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 8px 0;font-family:${SANS};font-size:11.5px;line-height:18px;color:${C.muted};">
            ${
              unsubscribeUrl
                ? `You are receiving this because you subscribed to ${esc(BUSINESS.brandName)} updates. <a href="${esc(unsubscribeUrl)}" style="color:${C.muted};">Unsubscribe</a>.`
                : footerNote
                  ? esc(footerNote)
                  : `This is a service email about your order, sent to the address on it. You will get these whether or not you subscribe to anything.`
            }
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** The plain-text signature, for the text alternative of every mail. */
export function signatureText(): string {
  return [
    BUSINESS.brandName,
    BUSINESS.supportEmail,
    `${BUSINESS.supportPhone}${BUSINESS.whatsappEnabled ? ` (also WhatsApp)` : ""}`,
    SITE,
    formatAddress(),
    BUSINESS.supportHours,
  ].join("\n");
}
