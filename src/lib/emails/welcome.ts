import { BUSINESS, formatAddress, isFilled, operatorDescription } from "@/config/business";
import { oneClickUnsubscribeUrl, unsubscribeUrl } from "@/lib/newsletter-token";

/**
 * The welcome email a new newsletter subscriber receives.
 *
 * Every fact in it is read from `@/config/business` — the same source the
 * policy pages use — so the email cannot promise a return window, a COD limit
 * or a support channel the site does not also publish. What subscribers can
 * expect is worded as what we may send, never as a schedule or an offer.
 *
 * Built for email clients, not browsers: nested tables, inline styles only,
 * explicit background colours on every surface, and images with fixed
 * dimensions and alt text. The only markup aimed at a particular client is
 * Outlook's, inside conditional comments no other client reads. Columns stack
 * on narrow screens without media queries (they are inline-blocks with a
 * max-width), so the layout does not depend on a client honouring <style>.
 */

export interface WelcomeEmail {
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

const SITE = (isFilled(BUSINESS.url) ? BUSINESS.url : "http://localhost:3000").replace(/\/+$/, "");
const O = BUSINESS.ops;

const LINKS = {
  shop: SITE,
  privacy: `${SITE}/legal/privacy`,
  terms: `${SITE}/legal/terms`,
  contact: `${SITE}/contact`,
  whatsapp: `https://wa.me/${BUSINESS.supportPhoneDigits}`,
  phone: `tel:+${BUSINESS.supportPhoneDigits}`,
  logo: `${SITE}/brand/png/weekendcart-logo-email.png`,
  mark: `${SITE}/brand/png/weekendcart-icon-192.png`,
};

/** Brand palette, from globals.css. */
const C = {
  canvas: "#f7f5f1",
  surface: "#ffffff",
  evergreen: "#16261f",
  evergreenSoft: "#274337",
  mist: "#dfe8e3",
  brass: "#b8832f",
  brassLight: "#d0a04b",
  brassDeep: "#7b5122",
  ink: "#191714",
  body: "#403c37",
  soft: "#55504a",
  muted: "#736d63",
  hairline: "#e2ded6",
  rule: "#c7c2b9",
};

const SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',Times,serif";

/* ------------------------------------------------------------- helpers */

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Every character outside ASCII as a numeric entity, so no client can mis-decode ₹ or —. */
function asciiSafe(html: string): string {
  return html.replace(/[^\x00-\x7f]/g, (ch) => `&#${ch.codePointAt(0)};`);
}

const inr = (amount: number) => new Intl.NumberFormat("en-IN").format(amount);

function instagramHandle(url: string): string {
  const match = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  return match ? `@${match[1]}` : url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
}

function currentYear(): string {
  return new Intl.DateTimeFormat("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date());
}

/* --------------------------------------------------------------- copy */

interface Point {
  title: string;
  body: string;
}

/** The kind of thing a subscriber may hear about. Possibilities, not promises. */
const EXPECT: Point[] = [
  {
    title: "New arrivals",
    body: "A look at fresh finds as they land in the store.",
  },
  {
    title: "Genuine offers",
    body: "When we have a real offer worth sharing, you may hear about it here.",
  },
  {
    title: "Early word on sales",
    body: "If we plan a sale, we would love for our subscribers to hear about it early.",
  },
];

/** Built only from facts the policy pages also publish. */
function reasons(): Point[] {
  const list: Point[] = [];
  if (O.codEnabled) {
    list.push({
      title: "Cash on Delivery",
      body: `Pay in cash when your order arrives, on orders up to ₹${inr(O.codLimit)} where your pincode supports it.`,
    });
  }
  list.push({
    title: "Secure payments",
    body: `UPI, cards and net banking through ${O.paymentAggregator}. We never see your card details.`,
  });
  list.push({
    title: "Easy returns",
    body: `Return eligible items within ${O.returnWindowDays} days of delivery, or ${O.returnWindowExtendedDays} days on fashion. No restocking fee.`,
  });
  list.push(
    BUSINESS.whatsappEnabled
      ? {
          title: "WhatsApp support",
          body: `Chat with a real person on ${BUSINESS.supportPhone}, ${BUSINESS.supportHours}.`,
        }
      : {
          title: "A person answers",
          body: `Call us on ${BUSINESS.supportPhone}, ${BUSINESS.supportHours}.`,
        },
  );
  if (!O.codEnabled) {
    list.push({
      title: "No hidden charges",
      body: "No convenience fee or surcharge on any payment method. The total you see is the total you pay.",
    });
  }
  return list;
}

interface ContactLine {
  label: string;
  /** What the HTML shows, linked to `href`. */
  value: string;
  href: string;
  /** What the plain-text part shows, where nothing is clickable. */
  plain: string;
}

function contactLines(): ContactLine[] {
  const lines: ContactLine[] = [
    {
      label: "Email",
      value: BUSINESS.supportEmail,
      href: `mailto:${BUSINESS.supportEmail}`,
      plain: BUSINESS.supportEmail,
    },
    BUSINESS.whatsappEnabled
      ? {
          label: "WhatsApp",
          value: BUSINESS.supportPhone,
          href: LINKS.whatsapp,
          plain: `${BUSINESS.supportPhone} (${LINKS.whatsapp})`,
        }
      : { label: "Phone", value: BUSINESS.supportPhone, href: LINKS.phone, plain: BUSINESS.supportPhone },
    { label: "Web", value: BUSINESS.domain, href: SITE, plain: SITE },
  ];
  if (isFilled(BUSINESS.social.instagram)) {
    lines.push({
      label: "Instagram",
      value: instagramHandle(BUSINESS.social.instagram),
      href: BUSINESS.social.instagram,
      plain: BUSINESS.social.instagram,
    });
  }
  return lines;
}

/* ---------------------------------------------------------- html parts */

/** A solid rule drawn with a table cell: the only line every client renders alike. */
function ruleCell(width: number, height: number, colour: string, align: "left" | "center" = "left"): string {
  // Only centred rules get an align attribute: align="left" floats a table in
  // some clients and lets the next paragraph wrap up beside it.
  const placement = align === "center" ? ` align="center" style="border-collapse:collapse;margin:0 auto;"` : ` style="border-collapse:collapse;"`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"${placement}><tr><td width="${width}" height="${height}" bgcolor="${colour}" style="width:${width}px;height:${height}px;background-color:${colour};font-size:${height}px;line-height:${height}px;mso-line-height-rule:exactly;">&nbsp;</td></tr></table>`;
}

/**
 * Bulletproof button: VML for Outlook on Windows, a padded link everywhere
 * else. Square, like the storefront's buttons.
 */
function button(href: string, label: string): string {
  const url = esc(href);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="border-collapse:collapse;margin:0 auto;">
<tr>
<td align="center" bgcolor="${C.evergreen}" style="background-color:${C.evergreen};">
<!--[if mso]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:54px;v-text-anchor:middle;width:260px;" stroke="f" fillcolor="${C.evergreen}">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:2px;">${esc(label.toUpperCase())}</center>
</v:rect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${url}" target="_blank" style="display:inline-block;padding:18px 44px;border:1px solid ${C.evergreen};background-color:${C.evergreen};color:#ffffff;font-family:${SANS};font-size:13px;font-weight:700;line-height:18px;letter-spacing:2.5px;text-transform:uppercase;text-decoration:none;-webkit-text-size-adjust:none;">${esc(label)}</a>
<!--<![endif]-->
</td>
</tr>
</table>`;
}

function expectRows(): string {
  return EXPECT.map(
    (point, i) => `<tr>
<td width="44" valign="top" class="serif" style="padding:16px 0;border-top:1px solid ${C.hairline};font-family:${SERIF};font-size:15px;line-height:22px;color:${C.brass};mso-line-height-rule:exactly;">${String(i + 1).padStart(2, "0")}</td>
<td valign="top" style="padding:16px 0;border-top:1px solid ${C.hairline};">
<p style="margin:0;font-family:${SANS};font-size:15px;line-height:22px;font-weight:700;color:${C.ink};mso-line-height-rule:exactly;">${esc(point.title)}</p>
<p style="margin:4px 0 0;font-family:${SANS};font-size:14px;line-height:22px;color:${C.soft};mso-line-height-rule:exactly;">${esc(point.body)}</p>
</td>
</tr>`,
  ).join("\n");
}

/** Width of the panel's content: 600 card − 2×32 padding − 2×1 border − 2×8 padding. */
const PANEL_INNER = 518;
const TILE = PANEL_INNER / 2;

/** A phone number that never breaks across lines. */
const PHONE_NOWRAP = esc(BUSINESS.supportPhone).replace(/ /g, "&nbsp;");

function tile(point: Point): string {
  const body = esc(point.body).split(esc(BUSINESS.supportPhone)).join(PHONE_NOWRAP);
  return `<div style="display:inline-block;width:100%;max-width:${TILE}px;vertical-align:top;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
<tr>
<td style="padding:16px 16px 14px;text-align:left;">
${ruleCell(28, 2, C.brass)}
<p class="serif" style="margin:0;padding-top:12px;font-family:${SERIF};font-size:17px;line-height:24px;color:${C.evergreen};mso-line-height-rule:exactly;">${esc(point.title)}</p>
<p style="margin:6px 0 0;font-family:${SANS};font-size:14px;line-height:22px;color:${C.soft};mso-line-height-rule:exactly;">${body}</p>
</td>
</tr>
</table>
</div>`;
}

/** Two tiles side by side on wide screens, stacked on phones. */
function tileRows(points: Point[]): string {
  const rows: string[] = [];
  for (let i = 0; i < points.length; i += 2) {
    const pair = points.slice(i, i + 2);
    rows.push(`<!--[if mso]><table role="presentation" width="${PANEL_INNER}" cellpadding="0" cellspacing="0" border="0"><tr><td width="${TILE}" valign="top"><![endif]-->
${tile(pair[0])}
${pair[1] ? `<!--[if mso]></td><td width="${TILE}" valign="top"><![endif]-->\n${tile(pair[1])}` : ""}
<!--[if mso]></td></tr></table><![endif]-->`);
  }
  return rows.join("\n");
}

function signatureContacts(): string {
  return contactLines()
    .map(
      (line) => `<tr>
<td width="96" valign="top" style="padding:10px 0 0;font-family:${SANS};font-size:11px;line-height:20px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};mso-line-height-rule:exactly;">${esc(line.label)}</td>
<td valign="top" style="padding:10px 0 0;font-family:${SANS};font-size:14px;line-height:20px;mso-line-height-rule:exactly;"><a href="${esc(line.href)}" target="_blank" style="color:${C.evergreenSoft};text-decoration:none;">${esc(line.value)}</a></td>
</tr>`,
    )
    .join("\n");
}

/* ------------------------------------------------------------- builder */

export function buildWelcomeEmail(email: string): WelcomeEmail {
  const address = email.trim().toLowerCase();
  const unsubscribe = unsubscribeUrl(address);
  const oneClick = oneClickUnsubscribeUrl(address);
  const mailbox = process.env.GMAIL_USER?.trim() || BUSINESS.supportEmail;
  const year = currentYear();
  const brand = BUSINESS.brandName;
  const points = reasons();
  const helpChannel = BUSINESS.whatsappEnabled ? "on WhatsApp" : `by phone on ${BUSINESS.supportPhone}`;
  const helpHref = BUSINESS.whatsappEnabled ? LINKS.whatsapp : LINKS.phone;

  const subject = `Welcome to ${brand} — thank you for joining us`;
  const preheader = "Thank you for subscribing. Here is a little about us, and what you can look forward to.";

  const intro = [
    `Thank you for subscribing to ${brand}. We are a small, new shop, and every person who chooses to hear from us genuinely means a lot. So before anything else: thank you.`,
    `${BUSINESS.description} Our hope is simple: that every order brings you a good find, and every weekend feels a little better for it.`,
  ];
  const expectLead = "There is no fixed schedule. We will write when we have something we think is worth your time, such as:";
  const signOff = "Here's to good finds and great weekends. Thank you, once again, for being here.";
  const received = `You are receiving this because ${address} subscribed to ${brand} updates at ${BUSINESS.domain}.`;
  const noReply = `This is an automated email — please do not reply. For help, reach us through the contact page or ${helpChannel}.`;

  const p = (text: string, last = false) =>
    `<p style="margin:0 0 ${last ? 0 : 18}px;font-family:${SANS};font-size:16px;line-height:26px;color:${C.body};mso-line-height-rule:exactly;">${esc(text)}</p>`;

  const footerLink = (href: string, label: string) =>
    `<a href="${esc(href)}" target="_blank" style="color:${C.evergreenSoft};text-decoration:underline;">${esc(label)}</a>`;
  const dot = `<span style="color:${C.rule};">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>`;

  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<style>
table, td, div, p, a, span { font-family: 'Segoe UI', Arial, sans-serif !important; }
.serif { font-family: Georgia, 'Times New Roman', serif !important; }
</style>
<![endif]-->
</head>
<body bgcolor="${C.canvas}" style="margin:0;padding:0;width:100%;background-color:${C.canvas};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div role="article" aria-roledescription="email" aria-label="${esc(subject)}" lang="en" dir="ltr" style="background-color:${C.canvas};">

<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.canvas};">${esc(preheader)}</div>
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;">${"&zwnj;&nbsp;".repeat(90)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.canvas}" style="border-collapse:collapse;background-color:${C.canvas};">
<tr>
<td align="center" style="padding:24px 10px 40px;">
<!--[if mso]><table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:600px;margin:0 auto;">

<!-- Brass edge -->
<tr><td height="4" bgcolor="${C.brass}" style="height:4px;background-color:${C.brass};font-size:4px;line-height:4px;mso-line-height-rule:exactly;">&nbsp;</td></tr>

<!-- Logo -->
<tr>
<td align="center" bgcolor="${C.surface}" style="padding:32px 32px 28px;background-color:${C.surface};">
<a href="${esc(LINKS.shop)}" target="_blank" style="text-decoration:none;"><img src="${esc(LINKS.logo)}" width="200" height="54" alt="${esc(brand)}" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;color:${C.evergreen};font-family:${SERIF};font-size:26px;line-height:54px;font-weight:bold;"></a>
</td>
</tr>

<!-- Thank you -->
<tr>
<td align="center" bgcolor="${C.evergreen}" style="padding:46px 32px 44px;background-color:${C.evergreen};text-align:center;">
<p style="margin:0 0 16px;font-family:${SANS};font-size:11px;line-height:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${C.brassLight};mso-line-height-rule:exactly;">Welcome to ${esc(brand)}</p>
<h1 class="serif" style="margin:0;font-family:${SERIF};font-size:36px;line-height:44px;font-weight:normal;letter-spacing:-0.5px;color:${C.canvas};mso-line-height-rule:exactly;">Thank you for joining&nbsp;us.</h1>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="border-collapse:collapse;margin:0 auto;"><tr><td style="padding:22px 0;">${ruleCell(48, 2, C.brass, "center")}</td></tr></table>
<p style="margin:0 auto;max-width:440px;font-family:${SANS};font-size:16px;line-height:26px;color:${C.mist};mso-line-height-rule:exactly;">We are so glad you are here, and truly grateful that you chose to hear from us.</p>
</td>
</tr>

<!-- Note -->
<tr>
<td bgcolor="${C.surface}" style="padding:40px 32px 12px;background-color:${C.surface};">
<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:26px;color:${C.ink};mso-line-height-rule:exactly;">Hello,</p>
${p(intro[0])}
${p(intro[1], true)}
</td>
</tr>

<!-- What to expect -->
<tr>
<td bgcolor="${C.surface}" style="padding:28px 32px 8px;background-color:${C.surface};">
<h2 class="serif" style="margin:0 0 8px;font-family:${SERIF};font-size:22px;line-height:30px;font-weight:normal;color:${C.evergreen};mso-line-height-rule:exactly;">What to expect from us</h2>
<p style="margin:0 0 16px;font-family:${SANS};font-size:14px;line-height:22px;color:${C.muted};mso-line-height-rule:exactly;">${esc(expectLead)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-bottom:1px solid ${C.hairline};">
${expectRows()}
</table>
</td>
</tr>

<!-- Why shop with us -->
<tr>
<td bgcolor="${C.surface}" style="padding:28px 32px 8px;background-color:${C.surface};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.canvas}" style="border-collapse:collapse;background-color:${C.canvas};border:1px solid ${C.hairline};">
<tr>
<td align="center" style="padding:28px 24px 4px;text-align:center;">
<p style="margin:0 0 6px;font-family:${SANS};font-size:11px;line-height:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${C.brassDeep};mso-line-height-rule:exactly;">Good to know</p>
<h2 class="serif" style="margin:0;font-family:${SERIF};font-size:22px;line-height:30px;font-weight:normal;color:${C.evergreen};mso-line-height-rule:exactly;">Why shop with us</h2>
</td>
</tr>
<tr>
<td align="center" style="padding:8px 8px 18px;font-size:0;line-height:0;text-align:center;">
${tileRows(points)}
</td>
</tr>
</table>
</td>
</tr>

<!-- Start shopping -->
<tr>
<td align="center" bgcolor="${C.surface}" style="padding:36px 32px 8px;background-color:${C.surface};text-align:center;">
${button(LINKS.shop, "Start shopping")}
<p style="margin:14px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};mso-line-height-rule:exactly;">or visit <a href="${esc(LINKS.shop)}" target="_blank" style="color:${C.evergreenSoft};text-decoration:underline;">${esc(BUSINESS.domain)}</a></p>
</td>
</tr>

<!-- Sign-off and signature -->
<tr>
<td bgcolor="${C.surface}" style="padding:36px 32px 40px;background-color:${C.surface};">
${p(signOff)}
<p class="serif" style="margin:6px 0 18px;font-family:${SERIF};font-size:18px;line-height:26px;font-style:italic;color:${C.ink};mso-line-height-rule:exactly;">Warm regards,</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
<tr>
<td width="52" valign="top" style="padding:0 16px 0 0;"><img src="${esc(LINKS.mark)}" width="52" height="52" alt="${esc(brand)}" style="display:block;width:52px;height:52px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;"></td>
<td valign="middle" style="padding:2px 0 2px 16px;border-left:2px solid ${C.brass};">
<p class="serif" style="margin:0;font-family:${SERIF};font-size:19px;line-height:26px;color:${C.evergreen};mso-line-height-rule:exactly;">${esc(BUSINESS.proprietorName)}</p>
<p style="margin:4px 0 0;font-family:${SANS};font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.brassDeep};mso-line-height-rule:exactly;">Founder, ${esc(brand)}</p>
</td>
</tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
<tr><td colspan="2" style="padding:22px 0 4px;">${ruleCell(64, 1, C.hairline)}</td></tr>
${signatureContacts()}
</table>
</td>
</tr>

<!-- Legal -->
<tr>
<td align="center" style="padding:30px 20px 0;text-align:center;">
<p style="margin:0 0 16px;font-family:${SANS};font-size:12px;line-height:18px;color:${C.muted};mso-line-height-rule:exactly;">${footerLink(LINKS.privacy, "Privacy Policy")}${dot}${footerLink(LINKS.terms, "Terms of Use")}${dot}${footerLink(LINKS.contact, "Contact")}</p>
<p style="margin:0 0 12px;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};mso-line-height-rule:exactly;">You are receiving this because <span style="color:${C.body};font-weight:600;">${esc(address)}</span> subscribed to ${esc(brand)} updates at ${esc(BUSINESS.domain)}.<br>No longer want these emails? ${footerLink(unsubscribe, "Unsubscribe")}.</p>
<p style="margin:0 0 12px;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};mso-line-height-rule:exactly;">This is an automated email &mdash; please do not reply. For help, reach us through the ${footerLink(LINKS.contact, "contact page")} or ${BUSINESS.whatsappEnabled ? footerLink(helpHref, "on WhatsApp") : `by phone on ${footerLink(helpHref, BUSINESS.supportPhone)}`}.</p>
<p style="margin:0 0 12px;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};mso-line-height-rule:exactly;">${esc(brand)} is operated by ${esc(operatorDescription())}.<br>${esc(formatAddress())}</p>
<p style="margin:0;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};mso-line-height-rule:exactly;">&copy; ${esc(year)} ${esc(brand)}</p>
</td>
</tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td>
</tr>
</table>
</div>
</body>
</html>`;

  const rule = "────────────────────────────────────────";
  const text = [
    `WELCOME TO ${brand.toUpperCase()}`,
    "",
    "Thank you for joining us.",
    "We are so glad you are here, and truly grateful that you chose to hear from us.",
    "",
    "Hello,",
    "",
    intro[0],
    "",
    intro[1],
    "",
    rule,
    "WHAT TO EXPECT FROM US",
    rule,
    expectLead,
    "",
    ...EXPECT.map((point, i) => `${String(i + 1).padStart(2, "0")}  ${point.title}\n    ${point.body}`),
    "",
    rule,
    "WHY SHOP WITH US",
    rule,
    ...points.map((point) => `* ${point.title}: ${point.body}`),
    "",
    `Start shopping: ${LINKS.shop}`,
    "",
    signOff,
    "",
    "Warm regards,",
    "",
    BUSINESS.proprietorName,
    `Founder, ${brand}`,
    ...contactLines().map((line) => `${line.label}: ${line.plain}`),
    "",
    rule,
    `Privacy Policy: ${LINKS.privacy}`,
    `Terms of Use: ${LINKS.terms}`,
    `Contact: ${LINKS.contact}`,
    "",
    received,
    `Unsubscribe: ${unsubscribe}`,
    "",
    noReply,
    BUSINESS.whatsappEnabled ? `WhatsApp: ${LINKS.whatsapp}` : `Phone: ${BUSINESS.supportPhone}`,
    "",
    `${brand} is operated by ${operatorDescription()}.`,
    formatAddress(),
    "",
    `© ${year} ${brand}`,
  ].join("\n");

  return {
    subject,
    html: asciiSafe(html),
    text,
    headers: {
      "List-Unsubscribe": `<${oneClick}>, <mailto:${mailbox}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
