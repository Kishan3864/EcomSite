import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Password reset tickets.
 *
 * The token is 32 random bytes, base64url. Only its SHA-256 hash is stored, so
 * a copy of the database hands over nothing redeemable — the value that can
 * actually reset a password exists solely in the email that was sent.
 *
 * A hash is enough here, unsalted and unstretched, precisely because the input
 * is 256 bits of randomness rather than a human-chosen secret: there is no
 * dictionary to run against it and no reason for bcrypt's cost.
 *
 * Single use is enforced by `usedAt`, which is why this is a table and not a
 * signed stateless token. A signed token cannot be retired once issued, so a
 * reset link would keep working after the password had been changed — a way
 * back in for whoever read the mailbox first, which is exactly the case a reset
 * flow exists to shut.
 */

/** An hour is long enough for a slow inbox and short enough to be worth little. */
export const RESET_TTL_MS = 60 * 60 * 1000;

const TOKEN_BYTES = 32;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface IssuedReset {
  /** The raw token. Goes in the email and is never stored or logged. */
  token: string;
  expiresAt: Date;
}

/**
 * Issues a ticket for a customer.
 *
 * Any ticket they already hold is retired first: asking for a second link must
 * invalidate the first, or a forwarded or intercepted earlier email stays live
 * alongside the one the customer is actually using.
 */
export async function issueResetToken(customerId: string, requestIp: string | null): Promise<IssuedReset> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { customerId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.create({
      data: { customerId, tokenHash: hash(token), expiresAt, requestIp },
    });
  });

  return { token, expiresAt };
}

export type ResetLookup =
  | {
      ok: true;
      tokenId: string;
      customerId: string;
      /**
       * False when the account has only ever signed in with Google. The page
       * and the email both say "set a password" rather than "reset" in that
       * case — telling somebody to reset a password they never had reads like
       * a phishing attempt for a credential they know does not exist.
       */
      hasPassword: boolean;
    }
  | { ok: false; reason: "unknown" | "used" | "expired" };

/**
 * Looks a token up without spending it.
 *
 * The reasons are distinguished so the page can say something useful — an
 * expired link and a link that was already used need different advice — and
 * none of them reveal whether any address exists.
 */
export async function findResetToken(token: string): Promise<ResetLookup> {
  if (!token || token.length > 128) return { ok: false, reason: "unknown" };

  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: hash(token) },
    select: {
      id: true,
      customerId: true,
      usedAt: true,
      expiresAt: true,
      customer: { select: { passwordHash: true } },
    },
  });
  if (!row) return { ok: false, reason: "unknown" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "expired" };

  return {
    ok: true,
    tokenId: row.id,
    customerId: row.customerId,
    hasPassword: row.customer.passwordHash !== null,
  };
}

/**
 * Spends a ticket and sets the new password, in one transaction.
 *
 * The update is conditional on the ticket still being unused, so two requests
 * racing with the same link cannot both succeed: the second finds zero rows
 * updated and is refused. Every other live ticket for that customer is retired
 * at the same time.
 */
export async function redeemResetToken(
  tokenId: string,
  customerId: string,
  passwordHash: string,
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const spent = await tx.passwordResetToken.updateMany({
      where: { id: tokenId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (spent.count === 0) return false;

    await tx.customer.update({ where: { id: customerId }, data: { passwordHash } });

    // Any other outstanding link for this account dies with the password it
    // was issued against.
    await tx.passwordResetToken.updateMany({
      where: { customerId, usedAt: null },
      data: { usedAt: new Date() },
    });
    return true;
  });
}

/**
 * Constant-time compare, for callers that need to check a token they already
 * hold against a stored hash without another database read.
 */
export function tokenMatchesHash(token: string, storedHash: string): boolean {
  const a = Buffer.from(hash(token), "utf8");
  const b = Buffer.from(storedHash, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
