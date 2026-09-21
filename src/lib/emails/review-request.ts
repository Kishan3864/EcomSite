import {
  C,
  SANS,
  button,
  emailImage,
  esc,
  escLines,
  eyebrow,
  formatDate,
  panel,
  shell,
  signatureText,
} from "./layout";
import type { OrderEmail } from "./order";

/**
 * "How is it working out?" — the email that asks a customer to review what
 * they bought, and its one reminder.
 *
 * Built on the shared shell like every other mail. The copy follows three
 * rules, and a change that breaks one of them is a wrong change:
 *
 *   - It asks for an HONEST review. Nothing hints at the score we would like,
 *     nothing is offered in return, and the shop's own promise that negative
 *     reviews are never edited or removed is repeated where the button is.
 *   - It asks about the thing, not the shop, one card per product, each with
 *     its own button straight to that product's form — no hunting.
 *   - It says how many times we will ask, and keeps to it: once, then one
 *     reminder at most for what is still unreviewed, then never again.
 *
 * Sending, timing and every rule about WHO is asked live in
 * src/services/order-reviews.ts. This file only turns facts into words.
 */

export type ReviewEmailKind = "review-request" | "review-reminder";

export interface ReviewEmailItem {
  title: string;
  variantLabel?: string | null;
  image?: string | null;
  /** The review form for this product, token included. */
  url: string;
}

export interface ReviewEmailInput {
  kind: ReviewEmailKind;
  number: string;
  contactName: string;
  deliveredAt: Date;
  /** The products being asked about — never empty; the caller does not send then. */
  items: ReviewEmailItem[];
  /** How many of the order's products this customer has already reviewed. */
  alreadyReviewed: number;
  /** Request only: whether a reminder may follow, so the footer can say so truthfully. */
  reminderFollows: boolean;
  /** Reminder only: days since the request went out, so "last week" is never a guess. */
  askedDaysAgo?: number | null;
}

/** A title short enough for a subject line, cut at a word. */
function shortTitle(title: string, max = 42): string {
  const clean = title.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > 20 ? cut.slice(0, space) : cut).replace(/[,;:\-–—\s]+$/, "")}…`;
}

function thumbnail(item: ReviewEmailItem): string {
  if (item.image) {
    return `<img src="${esc(emailImage(item.image))}" width="88" height="88" alt="${esc(item.title)}" style="display:block;width:88px;height:88px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;object-fit:cover;background-color:${C.surface};">`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td width="88" height="88" bgcolor="${C.surface}" style="width:88px;height:88px;background-color:${C.surface};">&nbsp;</td></tr></table>`;
}

/** One product: its picture, its name, and a button to its own review form. */
function card(item: ReviewEmailItem): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;border-collapse:collapse;background-color:${C.canvas};">
  <tr>
    <td width="88" valign="top" style="padding:14px 0 14px 14px;">${thumbnail(item)}</td>
    <td valign="top" style="padding:14px 16px;font-family:${SANS};">
      <p style="margin:0;font-size:14.5px;line-height:21px;font-weight:600;color:${C.ink};">${esc(item.title)}</p>
      ${item.variantLabel ? `<p style="margin:3px 0 0;font-size:12.5px;line-height:18px;color:${C.muted};">${esc(item.variantLabel)}</p>` : ""}
      <div style="margin-top:12px;">${button(item.url, "Rate this product")}</div>
    </td>
  </tr>
</table>`;
}

export function buildReviewEmail(o: ReviewEmailInput): OrderEmail {
  const first = o.contactName.trim().split(/\s+/)[0] || "there";
  const single = o.items.length === 1;
  const it = single ? "it" : "them";
  const reminder = o.kind === "review-reminder";
  const whenAsked =
    o.askedDaysAgo != null && o.askedDaysAgo >= 6 && o.askedDaysAgo <= 13 ? "last week" : "recently";

  const subject = reminder
    ? single
      ? `Would you review the ${shortTitle(o.items[0].title)}?`
      : `Would you review your order ${o.number}?`
    : single
      ? `How is the ${shortTitle(o.items[0].title)} working out?`
      : `How is your order ${o.number} working out?`;

  const headline = reminder ? "A last word about your order" : "How is it working out?";

  const opening = reminder
    ? o.alreadyReviewed > 0
      ? `${first}, thank you for the review you have already written for order ${o.number}. If you have a minute for the rest, your honest opinion would help the next person deciding — and this is the last time we will ask.`
      : `${first}, ${whenAsked} we asked what you thought of your order ${o.number}. If you have a minute, your honest opinion would help the next person deciding — and this is the last time we will ask.`
    : `${first}, your order ${o.number} was delivered on ${formatDate(o.deliveredAt)}. Now that you have had a few days with ${it}, would you tell other shoppers what you honestly think? Good, bad or somewhere in between — a few words, or just the stars, is plenty.`;

  const how =
    "Each button opens the review for that product with your order already checked, so there is no need to sign in. Your review is marked as a verified purchase and checked before it appears. We never edit or remove a review for being negative.";

  const help = `If something is not right with ${it}, reply to this email and we will help — whether or not you leave a review.`;

  const footerNote = reminder
    ? `This is the last email we will send about reviewing order ${o.number}.`
    : o.reminderFollows
      ? `We ask for a review once after each delivery, with one reminder at most if you have not had the chance. This one is about order ${o.number}.`
      : `We ask for a review once after each delivery and will not email you about order ${o.number} again.`;

  const preheader = reminder
    ? `The last time we will ask about order ${o.number}`
    : single
      ? `A minute to say what you honestly think`
      : `${o.items.length} products · a minute each to say what you honestly think`;

  const body = `
${eyebrow("Your review")}
<h1 style="margin:0;font-family:${SANS};font-size:23px;line-height:30px;font-weight:700;color:${C.ink};">${esc(headline)}</h1>
<p style="margin:12px 0 0;font-family:${SANS};font-size:15px;line-height:23px;color:${C.body};">${escLines(opening)}</p>

<div style="margin-top:18px;">
  ${o.items.map(card).join("")}
</div>

<div style="margin-top:20px;">${panel(`<p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.ink};">${esc(how)}</p>`)}</div>

<p style="margin:20px 0 0;font-family:${SANS};font-size:13.5px;line-height:21px;color:${C.body};">${esc(help)}</p>`;

  const text = [
    headline,
    ``,
    opening,
    ``,
    single ? "RATE THIS PRODUCT" : "RATE EACH PRODUCT",
    ...o.items.flatMap((item) => [
      `  ${item.title}${item.variantLabel ? ` (${item.variantLabel})` : ""}`,
      `  ${item.url}`,
      ``,
    ]),
    how,
    ``,
    help,
    ``,
    footerNote,
    ``,
    signatureText(),
  ].join("\n");

  return {
    subject,
    html: shell({ kicker: "Your review", preheader, body, footerNote }),
    text,
  };
}
