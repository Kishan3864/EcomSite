import "server-only";

import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/rate-limit";
import { DEVICE_COOKIE } from "@/lib/auth/session";
import type { ContactAbuseReason } from "@/generated/prisma/client";

/**
 * Everything that decides whether a contact submission is allowed to become a
 * row, and everything that records the ones that are not.
 *
 * The rate limiter here is deliberately not the in-memory one in
 * `@/lib/rate-limit`. That map lives in the PM2 process and is emptied by every
 * deploy, which is fine for "slow down password guessing" and useless for a
 * two-hour cooldown — a deploy would quietly forgive everybody. Instead the
 * stored ContactMessage *is* the counter: if a message from this sender exists
 * inside the window, the window has not passed. That cannot drift from reality,
 * survives restarts, and needs nothing swept.
 *
 * `clientIp()` is still the right source for the address: nginx overwrites
 * X-Real-IP with $remote_addr on the location that serves this form, so the
 * client cannot choose its own key.
 */

/** The shop, its customers and its support hours are all in one timezone. */
const IST = "Asia/Kolkata";

/** One message, then two hours. Applies equally to guests and signed-in customers. */
export const COOLDOWN_MS = 2 * 60 * 60 * 1000;

/** A hard ceiling per identity per day, so a patient bot cannot fill the table. */
export const DAILY_CAP = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Anything faster than this was not typed by a person. */
export const MIN_FILL_MS = 3_000;

/**
 * The form token is only minutes old in normal use. An hour is generous enough
 * for someone who opened the page and wandered off, and short enough that a
 * scraped token is not reusable for long.
 */
const MAX_FORM_AGE_MS = 60 * 60 * 1000;

// The name lives in auth/session so the edge proxy, which issues the cookie,
// and this module, which reads it, cannot drift apart.
export { DEVICE_COOKIE } from "@/lib/auth/session";

/** Field length ceilings. Anything longer is a paste bomb, not a question. */
export const LIMITS = {
  name: 80,
  email: 254,
  topic: 120,
  orderNumber: 40,
  message: 4_000,
} as const;

export interface Sender {
  ip: string;
  deviceId: string | null;
  customerId: string | null;
  email: string;
  userAgent: string | null;
}

/**
 * The device marker.
 *
 * An httpOnly cookie holding a random id — nothing derived from the browser
 * itself. It catches the same person opening a second tab or coming back
 * tomorrow; it does not catch a private window, a cleared cookie jar or a
 * different browser, and it is not meant to. The alternative, a canvas or font
 * fingerprint, would be processing the visitor's device characteristics without
 * their knowledge, which is exactly the kind of collection the site's own
 * privacy policy says it does not do. The IP and email limits are what actually
 * hold; this is a helpful extra, honestly labelled.
 */
export async function readDeviceId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(DEVICE_COOKIE)?.value?.trim();
  // Only ever our own format, so a hand-written cookie cannot widen the key
  // space or smuggle anything into a query.
  return raw && /^[0-9a-f-]{36}$/i.test(raw) ? raw : null;
}

/**
 * Everything the server knows about who is submitting, gathered from headers
 * and cookies rather than from the form. The email is the one field the sender
 * supplies — and for a signed-in customer the caller overrides even that with
 * the address on the account.
 */
export async function describeSender(email: string, customerId: string | null): Promise<Sender> {
  return {
    ip: await clientIp(),
    deviceId: await readDeviceId(),
    customerId,
    email: email.toLowerCase().trim(),
    userAgent: await readUserAgent(),
  };
}

export async function readUserAgent(): Promise<string | null> {
  const h = await headers();
  const ua = h.get("user-agent")?.trim();
  // Stored for triage only, so a long one is cut rather than kept whole.
  return ua ? ua.slice(0, 255) : null;
}

/* ------------------------------------------------------------- blocklist */

/**
 * The manual blocklist. A blocked sender is given the ordinary cooldown wording
 * rather than "you are blocked": telling someone they are on a list only tells
 * them to change address.
 */
export async function isBlocked(ip: string, email: string): Promise<boolean> {
  const hit = await db.contactBlock.findFirst({
    where: {
      OR: [
        { kind: "IP", value: ip },
        { kind: "EMAIL", value: email.toLowerCase() },
      ],
    },
    select: { id: true },
  });
  return hit !== null;
}

/* ------------------------------------------------------------ abuse log */

/**
 * Records a refused submission.
 *
 * Never stores what the sender typed into the message field. A refused
 * submission is unvetted text from someone the form has just decided not to
 * trust, and keeping it would turn this table into the dumping ground the form
 * exists to prevent. `detail` is written by us, not by them.
 */
export async function logAbuse(
  reason: ContactAbuseReason,
  sender: Partial<Sender>,
  detail?: string,
): Promise<void> {
  try {
    await db.contactAbuse.create({
      data: {
        reason,
        ip: sender.ip ?? null,
        email: sender.email?.toLowerCase().slice(0, LIMITS.email) ?? null,
        deviceId: sender.deviceId ?? null,
        customerId: sender.customerId ?? null,
        userAgent: sender.userAgent ?? null,
        detail: detail?.slice(0, 200) ?? null,
      },
    });
  } catch {
    // The log is for the owner's benefit; failing to write it must never turn
    // a refused submission into a server error the sender sees.
  }
}

/* ------------------------------------------------------------- cooldown */

export interface CooldownHit {
  /** When the sender may try again. */
  retryAt: Date;
}

/**
 * The first cooldown any of the sender's identities trips, or null if they are
 * clear. One query covers all four keys: whichever matching message is newest
 * decides when the window ends, so the answer is the same no matter which
 * identity matched.
 */
export async function cooldownFor(sender: Sender): Promise<CooldownHit | null> {
  const since = new Date(Date.now() - COOLDOWN_MS);

  const keys: Array<Record<string, string>> = [{ email: sender.email.toLowerCase() }];
  if (sender.ip && sender.ip !== "unknown") keys.push({ ip: sender.ip });
  if (sender.deviceId) keys.push({ deviceId: sender.deviceId });
  if (sender.customerId) keys.push({ customerId: sender.customerId });

  const last = await db.contactMessage.findFirst({
    where: { createdAt: { gte: since }, OR: keys },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!last) return null;

  return { retryAt: new Date(last.createdAt.getTime() + COOLDOWN_MS) };
}

/**
 * Whether this sender has already stored the most rows a day allows. Separate
 * from the cooldown: the cooldown stops a burst, this stops a bot patient
 * enough to wait out the cooldown and keep going all day.
 */
export async function overDailyCap(sender: Sender): Promise<boolean> {
  const since = new Date(Date.now() - DAY_MS);

  const keys: Array<Record<string, string>> = [{ email: sender.email.toLowerCase() }];
  if (sender.ip && sender.ip !== "unknown") keys.push({ ip: sender.ip });

  const count = await db.contactMessage.count({
    where: { createdAt: { gte: since }, OR: keys },
  });
  return count >= DAILY_CAP;
}

/* ----------------------------------------------------------- the message */

/**
 * The time formatted the way the shop's customers read it, in the shop's own
 * timezone rather than the server's. A cooldown that ends "after 15:45" on a
 * server running UTC would be an hour and a half wrong for everyone reading it.
 */
export function formatRetryTime(at: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  })
    .format(at)
    // en-IN renders "3:45 pm" with a non-breaking space in some runtimes and
    // "PM" in others; one spelling, so the sentence reads the same everywhere.
    .replace(/ | /g, " ")
    .toLowerCase();
}

/** What a rate-limited sender is told. Honest about what happened and what to do. */
export function cooldownMessage(retryAt: Date): string {
  return (
    `You've already sent us a message. You can send another after ${formatRetryTime(retryAt)}` +
    ` — or reply to the email we sent you.`
  );
}

/* ---------------------------------------------------------- content rules */

/** Collapses the tricks used to pad a link-only message into something checkable. */
function linkCount(text: string): number {
  return (text.match(/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|ru|cn|xyz|top|info|biz|link|click)\b/gi) ?? [])
    .length;
}

/**
 * Whether a message is links wearing a sentence.
 *
 * Not a spam score — just the one shape that is never a real support question:
 * a message that is mostly URLs, or one whose few words exist to carry them. A
 * customer pasting a single product link alongside a real question passes.
 */
export function isLinkSpam(message: string): boolean {
  const links = linkCount(message);
  if (links === 0) return false;

  const words = message.trim().split(/\s+/).length;
  if (links >= 4) return true;
  // Under roughly eight words per link there is no question being asked.
  return words / links < 8;
}

/* ------------------------------------------------------------ form token */

/**
 * The form's opened-at stamp, signed so the browser cannot backdate it.
 *
 * A plain hidden timestamp would let a bot claim the form was opened an hour
 * ago and walk straight past the minimum-fill rule. This is the same HMAC the
 * rest of the site's short-lived tokens use, over the issue time alone.
 */
function tokenSecret(): string {
  // The app's own secret, checked the same way every other signer here checks
  // it. No development fallback: a fallback secret is a signature anybody who
  // has read the source can forge.
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 24) {
    throw new Error("AUTH_SECRET must be set to at least 24 characters.");
  }
  return raw;
}

export function issueFormToken(now = Date.now()): string {
  const payload = String(now);
  const mac = createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export type FormTokenVerdict = "ok" | "too-fast" | "invalid";

export function verifyFormToken(token: string | undefined, now = Date.now()): FormTokenVerdict {
  if (!token || !token.includes(".")) return "invalid";

  const [payload, mac] = token.split(".", 2);
  const expected = createHmac("sha256", tokenSecret()).update(payload).digest("base64url");

  const given = Buffer.from(mac ?? "", "utf8");
  const want = Buffer.from(expected, "utf8");
  if (given.length !== want.length || !timingSafeEqual(given, want)) return "invalid";

  const issued = Number(payload);
  if (!Number.isFinite(issued)) return "invalid";
  // A token from the future, or one older than the page could plausibly be,
  // is a replay rather than a slow typist.
  if (issued > now + 60_000 || now - issued > MAX_FORM_AGE_MS) return "invalid";

  return now - issued < MIN_FILL_MS ? "too-fast" : "ok";
}
