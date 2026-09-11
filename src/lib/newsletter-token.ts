import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { BUSINESS, isFilled } from "@/config/business";

/**
 * Signed unsubscribe links for newsletter email.
 *
 * A link carries the subscriber's address (base64url, so it survives every
 * mail client's URL handling) and an HMAC of it keyed with AUTH_SECRET. Only
 * someone holding an email we sent can produce a valid pair, so the links
 * need no sign-in and no database lookup to trust, and nobody can unsubscribe
 * an address they merely know.
 *
 * The tokens do not expire: an unsubscribe link has to keep working in an
 * email that is opened a year later.
 */

const PURPOSE = "newsletter-unsubscribe:";

const SITE = (isFilled(BUSINESS.url) ? BUSINESS.url : "http://localhost:3000").replace(/\/+$/, "");

/** base64url, as produced by Node, with no padding. */
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** A SHA-256 digest is 32 bytes: 43 base64url characters. */
const TOKEN_LENGTH = 43;

/** 254 characters is the longest address SMTP will carry; 340 encodes it. */
const MAX_ENCODED_EMAIL = 340;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function secret(): string {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 24) throw new Error("AUTH_SECRET must be set to at least 24 characters.");
  return raw;
}

function sign(email: string): Buffer {
  return createHmac("sha256", secret()).update(PURPOSE + normaliseEmail(email)).digest();
}

function query(email: string): string {
  const e = Buffer.from(normaliseEmail(email), "utf8").toString("base64url");
  const t = sign(email).toString("base64url");
  // Both halves are base64url already, so neither needs percent-encoding.
  return `e=${e}&t=${t}`;
}

/** The page a person opens from the email, where they confirm with a button. */
export function unsubscribeUrl(email: string): string {
  return `${SITE}/newsletter/unsubscribe?${query(email)}`;
}

/** RFC 8058 one-click endpoint for the List-Unsubscribe header. POST only. */
export function oneClickUnsubscribeUrl(email: string): string {
  return `${SITE}/api/newsletter/unsubscribe?${query(email)}`;
}

/**
 * The normalised email address a link was issued for, or null when the pair
 * is missing, malformed or was not signed by us.
 */
export function verifyUnsubscribe(emailParam: unknown, tokenParam: unknown): string | null {
  if (typeof emailParam !== "string" || typeof tokenParam !== "string") return null;
  if (!emailParam || emailParam.length > MAX_ENCODED_EMAIL || !BASE64URL.test(emailParam)) return null;
  if (tokenParam.length !== TOKEN_LENGTH || !BASE64URL.test(tokenParam)) return null;

  const email = normaliseEmail(Buffer.from(emailParam, "base64url").toString("utf8"));
  if (!email.includes("@") || email.length > 254) return null;

  const expected = sign(email);
  const given = Buffer.from(tokenParam, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return email;
}
