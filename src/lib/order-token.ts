import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed links that let a customer open their own order from an email.
 *
 * Why this has to exist: `canViewOrder` grants access to a signed-in owner, or
 * to a browser whose guest-order cookie holds the id. An email is read in
 * neither. A customer opening the receipt in their phone's mail app is, as far
 * as the site is concerned, a stranger — so a bare /track/<id> link showed them
 * nothing and /order/<id>/invoice returned a flat 404. Both links were
 * therefore useless in exactly the place they were printed.
 *
 * A token is an HMAC of the order id keyed with AUTH_SECRET, so it is
 * unguessable without the secret and needs no database row to be trusted. It
 * grants read-only sight of one order: tracking and the invoice. It cannot
 * cancel, return, pay or change anything, and it carries no session — a
 * forwarded email never signs anybody in.
 *
 * It does not expire, deliberately. An order link has to keep working in an
 * email opened a year later, the same reasoning as the unsubscribe token; an
 * expiring receipt is a receipt that becomes a support ticket. The thing it
 * protects is one order's contents, already known to whoever holds the email.
 */

const PURPOSE = "order-view:";

/** A SHA-256 digest is 32 bytes: 43 base64url characters. */
const TOKEN_LENGTH = 43;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** The query parameter the token travels in. */
export const ORDER_TOKEN_PARAM = "t";

function secret(): string {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 24) throw new Error("AUTH_SECRET must be set to at least 24 characters.");
  return raw;
}

export function orderToken(orderId: string): string {
  return createHmac("sha256", secret()).update(PURPOSE + orderId).digest("base64url");
}

/**
 * Whether this token was issued for this order. Compared in constant time, and
 * length-checked first because timingSafeEqual throws on a length mismatch —
 * which would otherwise turn a malformed token into a 500.
 */
export function orderTokenValid(orderId: string, token: string | undefined | null): boolean {
  if (!token || token.length !== TOKEN_LENGTH || !BASE64URL.test(token)) return false;

  const given = Buffer.from(token, "utf8");
  const want = Buffer.from(orderToken(orderId), "utf8");
  if (given.length !== want.length) return false;
  return timingSafeEqual(given, want);
}

/**
 * Reads the token from a page's searchParams.
 *
 * Next hands repeated parameters through as an array; only a single value is
 * ever a real token, so an array is treated as absent rather than having its
 * first entry trusted.
 */
export function tokenFromParams(params: Record<string, string | string[] | undefined>): string | null {
  const raw = params[ORDER_TOKEN_PARAM];
  return typeof raw === "string" ? raw : null;
}
