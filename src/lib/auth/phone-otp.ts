import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { sendOtpSms } from "@/lib/sms";
import type { OtpPurpose } from "@/generated/prisma/client";

/**
 * One-time SMS codes: issue, and check.
 *
 * Only a keyed hash of each code is stored, so a database copy is no use for
 * signing in. Every text costs money and an open "send me a code" form is a
 * favourite target for SMS-pumping fraud, so sending is capped per number, per
 * IP address and for the whole site per day — all counted in the database, so a
 * restart does not reset them.
 */

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 30;
const PER_PHONE_HOUR = 5;
const PER_PHONE_DAY = 10;
const PER_IP_HOUR = 10;
const DEFAULT_DAILY_CAP = 300;

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

/* ------------------------------------------------------------- numbers */

/**
 * An Indian mobile number as E.164 (+91 and ten digits starting 6–9), or null.
 * Accepts the ways people actually type it: spaces, dashes, 0 or +91 in front.
 */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^(\+91|0091|91(?=\d{10}$)|0(?=\d{10}$))/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

/** +919876543210 → "+91 98765 43210". */
export function formatIndianMobile(e164: string): string {
  const d = e164.replace(/^\+91/, "");
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

/* --------------------------------------------------------------- codes */

function hashCode(purpose: OtpPurpose, phone: string, code: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 24) throw new Error("AUTH_SECRET must be set to at least 24 characters.");
  return createHmac("sha256", secret).update(`${purpose}:${phone}:${code}`).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export type IssueResult =
  | { ok: true; resendIn: number }
  | { ok: false; error: string; retryIn?: number };

/** Sends a fresh code, retiring any earlier one for the same number and purpose. */
export async function issueOtp(input: {
  phone: string;
  purpose: OtpPurpose;
  customerId?: string;
  ip: string;
}): Promise<IssueResult> {
  const now = Date.now();
  const { phone, purpose, customerId, ip } = input;

  // Housekeeping on the way through: codes are useless after ten minutes and
  // the send limits look back a day at most.
  await db.phoneOtp.deleteMany({ where: { createdAt: { lt: new Date(now - 2 * DAY) } } });

  const [last, phoneHour, phoneDay, ipHour, siteDay] = await Promise.all([
    db.phoneOtp.findFirst({ where: { phone }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.phoneOtp.count({ where: { phone, createdAt: { gte: new Date(now - HOUR) } } }),
    db.phoneOtp.count({ where: { phone, createdAt: { gte: new Date(now - DAY) } } }),
    db.phoneOtp.count({ where: { ip, createdAt: { gte: new Date(now - HOUR) } } }),
    db.phoneOtp.count({ where: { createdAt: { gte: new Date(now - DAY) } } }),
  ]);

  const sinceLast = last ? (now - last.createdAt.getTime()) / 1000 : Infinity;
  if (sinceLast < RESEND_SECONDS) {
    const retryIn = Math.ceil(RESEND_SECONDS - sinceLast);
    return { ok: false, error: `Please wait ${retryIn} seconds before asking for another code.`, retryIn };
  }
  if (phoneHour >= PER_PHONE_HOUR || phoneDay >= PER_PHONE_DAY) {
    return { ok: false, error: "Too many codes have been sent to this number. Please try again later." };
  }
  if (ipHour >= PER_IP_HOUR) {
    return { ok: false, error: "Too many codes requested from this connection. Please try again later." };
  }
  const cap = Number(process.env.OTP_DAILY_LIMIT) || DEFAULT_DAILY_CAP;
  if (siteDay >= cap) {
    console.error(`[otp] daily SMS cap of ${cap} reached`);
    return { ok: false, error: "We cannot send codes right now. Please sign in with your email instead." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  await db.phoneOtp.updateMany({
    where: { phone, purpose, consumedAt: null },
    data: { consumedAt: new Date(now) },
  });
  const row = await db.phoneOtp.create({
    data: {
      phone,
      purpose,
      customerId: customerId ?? null,
      codeHash: hashCode(purpose, phone, code),
      expiresAt: new Date(now + CODE_TTL_MINUTES * 60_000),
      ip,
    },
  });

  if (!(await sendOtpSms(phone, code))) {
    // Still counts towards the limits, but can never be used.
    await db.phoneOtp.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
    return { ok: false, error: "We could not send the SMS just now. Please try again in a minute." };
  }
  return { ok: true, resendIn: RESEND_SECONDS };
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

/** Checks a code. A correct code is spent; so is one guessed at too often. */
export async function verifyOtp(input: {
  phone: string;
  purpose: OtpPurpose;
  code: string;
  customerId?: string;
}): Promise<VerifyResult> {
  const { phone, purpose, customerId } = input;
  const code = input.code.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Enter the 6-digit code from the SMS." };

  const row = await db.phoneOtp.findFirst({
    where: { phone, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  const expired = { ok: false as const, error: "That code has expired. Please ask for a new one." };
  if (!row) return expired;
  // A LINK code proves the number to the account that asked for it, no other.
  if (purpose === "LINK" && row.customerId !== (customerId ?? null)) return expired;

  if (!sameHash(row.codeHash, hashCode(purpose, phone, code))) {
    const attempts = row.attempts + 1;
    const spent = attempts >= MAX_ATTEMPTS;
    await db.phoneOtp.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 }, ...(spent ? { consumedAt: new Date() } : {}) },
    });
    return spent
      ? { ok: false, error: "Too many wrong attempts. Please ask for a new code." }
      : { ok: false, error: `That code is not right. ${MAX_ATTEMPTS - attempts} attempts left.` };
  }

  // Spend it exactly once, even if the same code is submitted twice at once.
  const spent = await db.phoneOtp.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return spent.count === 1 ? { ok: true } : expired;
}
