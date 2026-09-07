import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import {
  CUSTOMER_COOKIE,
  GUEST_ORDERS_COOKIE,
  cookieOptions,
  customerToken,
  guestOrdersToken,
} from "./session";

export interface CustomerSession {
  id: string;
  email: string;
  name: string;
}

export const getCustomerSession = cache(async (): Promise<CustomerSession | null> => {
  const store = await cookies();
  const claims = await customerToken.verify(store.get(CUSTOMER_COOKIE)?.value);
  if (!claims) return null;

  const customer = await db.customer.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, isActive: true },
  });
  if (!customer || !customer.isActive) return null;
  return { id: customer.id, email: customer.email, name: customer.name };
});

/** Redirects to sign-in, remembering where the customer was headed. */
export async function requireCustomer(nextPath: string): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return session;
}

async function issueCustomerCookie(customer: { id: string; email: string; name: string }) {
  const token = await customerToken.sign({
    sub: customer.id,
    email: customer.email,
    name: customer.name,
  });
  const store = await cookies();
  store.set(CUSTOMER_COOKIE, token, cookieOptions(customerToken.ttl));
}

export async function signInCustomer(
  email: string,
  password: string,
): Promise<{ ok: true; session: CustomerSession } | { ok: false; reason: string }> {
  const customer = await db.customer.findUnique({ where: { email: email.toLowerCase().trim() } });
  const invalid = { ok: false as const, reason: "That email and password do not match." };
  if (!customer || !customer.isActive || !customer.passwordHash) return invalid;
  if (!(await verifyPassword(password, customer.passwordHash))) return invalid;

  await issueCustomerCookie(customer);
  await db.customer.update({ where: { id: customer.id }, data: { lastLoginAt: new Date() } });
  await claimGuestOrders(customer.id);

  return { ok: true, session: { id: customer.id, email: customer.email, name: customer.name } };
}

export async function registerCustomer(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ ok: true; session: CustomerSession } | { ok: false; reason: string }> {
  const email = input.email.toLowerCase().trim();
  const existing = await db.customer.findUnique({ where: { email } });

  // A guest who checked out earlier already has a row without a password;
  // registering with the same email simply claims it.
  if (existing?.passwordHash) {
    return { ok: false, reason: "An account with that email already exists. Sign in instead." };
  }

  const passwordHash = await hashPassword(input.password);
  const customer = existing
    ? await db.customer.update({
        where: { id: existing.id },
        data: { name: input.name.trim(), phone: input.phone.trim(), passwordHash, lastLoginAt: new Date() },
      })
    : await db.customer.create({
        data: {
          email,
          name: input.name.trim(),
          phone: input.phone.trim(),
          passwordHash,
          lastLoginAt: new Date(),
        },
      });

  await issueCustomerCookie(customer);
  await claimGuestOrders(customer.id);
  return { ok: true, session: { id: customer.id, email: customer.email, name: customer.name } };
}

export async function signOutCustomer() {
  const store = await cookies();
  store.delete(CUSTOMER_COOKIE);
}

/* ------------------------------ Guests ------------------------------ */

/**
 * Guests get a signed cookie listing the orders placed from this browser so
 * the confirmation and tracking pages work without an account.
 */
export async function rememberGuestOrder(orderId: string) {
  const store = await cookies();
  const current = await guestOrdersToken.verify(store.get(GUEST_ORDERS_COOKIE)?.value);
  const orders = [orderId, ...(current?.orders ?? []).filter((id) => id !== orderId)].slice(0, 20);
  store.set(GUEST_ORDERS_COOKIE, await guestOrdersToken.sign(orders), cookieOptions(guestOrdersToken.ttl));
}

export async function getGuestOrderIds(): Promise<string[]> {
  const store = await cookies();
  const claims = await guestOrdersToken.verify(store.get(GUEST_ORDERS_COOKIE)?.value);
  return claims?.orders ?? [];
}

/** When a guest later signs in, attach the orders from this browser to their account. */
async function claimGuestOrders(customerId: string) {
  const ids = await getGuestOrderIds();
  if (ids.length === 0) return;
  await db.order.updateMany({
    where: { id: { in: ids }, customerId: null },
    data: { customerId },
  });
}

/** Can the current visitor see this order? Owner, or guest who placed it here. */
export async function canViewOrder(order: { id: string; customerId: string | null }) {
  const session = await getCustomerSession();
  if (session && order.customerId === session.id) return true;
  const guestIds = await getGuestOrderIds();
  return guestIds.includes(order.id);
}
