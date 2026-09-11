/**
 * Signed session tokens.
 *
 * Deliberately free of `server-only` and Node APIs: `proxy.ts` runs at the edge
 * and needs to verify a cookie without touching the database. Anything that
 * needs a DB lookup (is the user still active? was the token revoked?) lives in
 * `admin.ts` / `customer.ts`, which run in the Node runtime.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const ADMIN_COOKIE = "weekendcart_admin";
export const CUSTOMER_COOKIE = "weekendcart_customer";
export const GUEST_ORDERS_COOKIE = "weekendcart_guest_orders";
export const PHONE_TICKET_COOKIE = "weekendcart_phone_ticket";

const ADMIN_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const CUSTOMER_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const GUEST_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days
const PHONE_TICKET_TTL_SECONDS = 60 * 15; // 15 minutes

export interface AdminClaims extends JWTPayload {
  kind: "admin";
  sub: string;
  email: string;
  name: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  /** Matches AdminUser.tokenVersion; bumping that column logs every device out. */
  v: number;
}

export interface CustomerClaims extends JWTPayload {
  kind: "customer";
  sub: string;
  email: string;
  name: string;
}

export interface GuestOrderClaims extends JWTPayload {
  kind: "guest";
  /** Order ids placed from this browser without an account. */
  orders: string[];
}

/**
 * A number that has just been proved by SMS but has no account yet, carried
 * from the code step to the "your name and email" step.
 */
export interface PhoneTicketClaims extends JWTPayload {
  kind: "phone";
  /** E.164. */
  phone: string;
}

function secret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 24) {
    throw new Error("AUTH_SECRET must be set to at least 24 characters.");
  }
  return new TextEncoder().encode(raw);
}

async function sign(payload: JWTPayload, ttlSeconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret());
}

async function verify<T extends JWTPayload>(token: string | undefined, kind: string): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (payload.kind !== kind) return null;
    return payload as T;
  } catch {
    return null;
  }
}

export const adminToken = {
  ttl: ADMIN_TTL_SECONDS,
  sign: (claims: Omit<AdminClaims, "kind" | "iat" | "exp">) =>
    sign({ ...claims, kind: "admin" }, ADMIN_TTL_SECONDS),
  verify: (token?: string) => verify<AdminClaims>(token, "admin"),
};

export const customerToken = {
  ttl: CUSTOMER_TTL_SECONDS,
  sign: (claims: Omit<CustomerClaims, "kind" | "iat" | "exp">) =>
    sign({ ...claims, kind: "customer" }, CUSTOMER_TTL_SECONDS),
  verify: (token?: string) => verify<CustomerClaims>(token, "customer"),
};

export const guestOrdersToken = {
  ttl: GUEST_TTL_SECONDS,
  sign: (orders: string[]) => sign({ kind: "guest", orders }, GUEST_TTL_SECONDS),
  verify: (token?: string) => verify<GuestOrderClaims>(token, "guest"),
};

export const phoneTicketToken = {
  ttl: PHONE_TICKET_TTL_SECONDS,
  sign: (phone: string) => sign({ kind: "phone", phone }, PHONE_TICKET_TTL_SECONDS),
  verify: (token?: string) => verify<PhoneTicketClaims>(token, "phone"),
};

/** Cookie attributes shared by every session cookie. */
export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
