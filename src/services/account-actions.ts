"use server";

import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/customer";

/**
 * The writes behind /account/settings. Each one reads the session again rather
 * than trusting the form, and scopes every query to that customer, so a forged
 * id in a hidden field still cannot reach somebody else's row.
 */

export interface AccountFormState {
  ok?: boolean;
  message?: string;
  error?: string;
  field?: string;
  /** React resets a form after its action runs; this puts the values back. */
  values?: Record<string, string>;
}

const PHONE = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const UPI_ID = /^[a-z0-9._-]{2,64}@[a-z]{2,32}$/i;
const METHODS: readonly PaymentMethod[] = ["ONLINE", "COD"];

const EXPIRED = "Your session has ended. Sign in again to save this.";

export async function updateCustomerProfile(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await getCustomerSession();
  if (!session) return { error: EXPIRED };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const values = { name, phone };

  if (name.length < 2) return { error: "Tell us your name.", field: "name", values };
  if (!PHONE.test(phone.replace(/\s/g, "")))
    return { error: "Enter a 10-digit Indian mobile number.", field: "phone", values };

  await db.customer.update({ where: { id: session.id }, data: { name, phone } });

  revalidatePath("/account", "layout");
  return { ok: true, message: "Your details are saved." };
}

/**
 * A plain form action rather than a `useActionState` one: the re-rendered list,
 * with the default marked on it, is the feedback. It stops quietly on an id
 * that is not this customer's or a session that has ended, neither of which the
 * rendered form can reach without the account gate turning them away first.
 */
export async function setDefaultAddress(formData: FormData): Promise<void> {
  const session = await getCustomerSession();
  if (!session) return;

  const id = String(formData.get("addressId") ?? "");
  const owned = await db.address.findFirst({
    where: { id, customerId: session.id },
    select: { id: true },
  });
  if (!owned) return;

  await db.$transaction(async (tx) => {
    await tx.address.updateMany({ where: { customerId: session.id }, data: { isDefault: false } });
    await tx.address.update({ where: { id: owned.id }, data: { isDefault: true } });
  });

  revalidatePath("/account", "layout");
  revalidatePath("/checkout/address");
}

export async function savePaymentPreferences(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await getCustomerSession();
  if (!session) return { error: EXPIRED };

  const method = String(formData.get("method") ?? "").trim().toUpperCase();
  const upiId = String(formData.get("upiId") ?? "").trim();

  // The form holds both fields in React state, so there is nothing to echo back.
  if (method && !METHODS.includes(method as PaymentMethod))
    return { error: "Choose one of the methods listed.", field: "method" };
  if (upiId && !UPI_ID.test(upiId))
    return { error: "A UPI ID looks like yourname@okhdfcbank.", field: "upiId" };

  await db.customer.update({
    where: { id: session.id },
    data: { preferredPayment: method ? (method as PaymentMethod) : null, upiId: upiId || null },
  });

  revalidatePath("/account/settings");
  return { ok: true, message: "Payment preferences saved." };
}
