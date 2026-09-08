"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import {
  ANONYMISED_DOMAIN,
  ANONYMISED_NAME,
  LOYALTY_POINTS_MAX,
  isAnonymised,
  isTier,
} from "@/app/admin/(dashboard)/customers/customer-meta";
import type { FormState } from "./form-state";
import { bool, num, revalidateAdmin, revalidateStorefront, str } from "./shared";

/**
 * Customers module actions. Customers create themselves (sign-up or guest
 * checkout), so there is no create action; admins edit, deactivate and — for
 * erasure requests — anonymise.
 */

/* ------------------------------ Helpers ----------------------------- */

function flashUrl(base: string, message: string, tone?: "error") {
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}flash=${encodeURIComponent(message)}${tone ? `&tone=${tone}` : ""}`;
}

/** Only ever bounce back inside this module — never to a caller-supplied host. */
function safeReturn(candidate: string, fallback: string) {
  if (candidate.startsWith("/admin/customers") && !candidate.startsWith("//") && !/[\r\n]/.test(candidate)) {
    return candidate;
  }
  return fallback;
}

/**
 * Accepts the ways people type Indian mobile numbers ("98450 12345",
 * "+91-9845012345", "09845012345") and stores one canonical form.
 */
function normalisePhone(raw: string): { phone: string | null } | { error: string } {
  if (!raw) return { phone: null };
  const digits = raw.replace(/\D/g, "");
  const local =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  if (local.length !== 10 || !/^[6-9]/.test(local)) {
    return { error: "Enter a 10-digit Indian mobile number, optionally with +91." };
  }
  return { phone: `+91 ${local.slice(0, 5)} ${local.slice(5)}` };
}

/* ------------------------------ Update ------------------------------ */

export async function updateCustomer(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");

  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing) return { error: "This customer no longer exists." };
  if (isAnonymised(existing)) return { error: "This customer has been anonymised; the record is frozen." };

  const name = str(formData, "name");
  const tier = str(formData, "tier");
  const loyaltyPoints = num(formData, "loyaltyPoints", -1);
  const notes = str(formData, "notes") || null;
  const isActive = bool(formData, "isActive");

  if (name.length < 2) return { error: "Name is required.", field: "name" };
  if (name.length > 80) return { error: "Keep the name under 80 characters.", field: "name" };
  const phoneResult = normalisePhone(str(formData, "phone"));
  if ("error" in phoneResult) return { error: phoneResult.error, field: "phone" };
  if (!isTier(tier)) return { error: "Choose a loyalty tier.", field: "tier" };
  if (!Number.isInteger(loyaltyPoints) || loyaltyPoints < 0 || loyaltyPoints > LOYALTY_POINTS_MAX) {
    return {
      error: `Loyalty points must be a whole number between 0 and ${LOYALTY_POINTS_MAX.toLocaleString("en-IN")}.`,
      field: "loyaltyPoints",
    };
  }
  if (notes && notes.length > 2000) return { error: "Keep internal notes under 2,000 characters.", field: "notes" };

  const data = { name, phone: phoneResult.phone, tier, loyaltyPoints, notes, isActive };
  const changed = (Object.keys(data) as (keyof typeof data)[]).filter((k) => existing[k] !== data[k]);
  if (changed.length === 0) return { ok: true, message: "Nothing changed." };

  const updated = await db.customer.update({ where: { id }, data });

  await logActivity(session, {
    action: "customer.update",
    entity: "Customer",
    entityId: id,
    summary: `Updated customer ${updated.name}`,
    metadata: {
      changed,
      tier: updated.tier,
      loyaltyPoints: updated.loyaltyPoints,
      isActive: updated.isActive,
      ...(existing.tier !== updated.tier ? { previousTier: existing.tier } : {}),
      ...(existing.loyaltyPoints !== updated.loyaltyPoints ? { previousPoints: existing.loyaltyPoints } : {}),
    },
  });
  // Tier, points and the active flag all surface on the shopper's account page.
  revalidateStorefront();
  revalidateAdmin("customers");
  return { ok: true, message: "Saved." };
}

/* ---------------------------- Activate ------------------------------ */

/**
 * Deactivating a customer blocks sign-in immediately: the customer session
 * check re-reads `isActive` on every request, so existing cookies stop
 * working too. Orders and history are untouched.
 */
export async function setCustomerActive(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const active = bool(formData, "active");
  const returnTo = safeReturn(str(formData, "returnTo"), `/admin/customers/${id}`);

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) redirect(flashUrl("/admin/customers", "Customer not found", "error"));
  if (active && isAnonymised(customer)) {
    redirect(flashUrl(returnTo, "An anonymised customer cannot be reactivated.", "error"));
  }
  if (customer.isActive === active) {
    redirect(flashUrl(returnTo, `${customer.name} is already ${active ? "active" : "deactivated"}.`));
  }

  await db.customer.update({ where: { id }, data: { isActive: active } });
  await logActivity(session, {
    action: active ? "customer.activate" : "customer.deactivate",
    entity: "Customer",
    entityId: id,
    summary: `${active ? "Reactivated" : "Deactivated"} customer ${customer.name}`,
  });
  revalidateStorefront();
  revalidateAdmin("customers");
  redirect(
    flashUrl(
      returnTo,
      active ? `${customer.name} can sign in again` : `${customer.name} has been deactivated and can no longer sign in`,
    ),
  );
}

/* ---------------------------- Anonymise ----------------------------- */

const OPEN_ORDER_STATUSES = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY"] as const;
const OPEN_RETURN_STATUSES = ["REQUESTED", "APPROVED", "PICKED_UP"] as const;

/**
 * GDPR-style erasure. Personal data is replaced everywhere it was copied —
 * the customer row, saved addresses, the contact/shipping snapshot on their
 * orders, review author names and this module's own activity entries — while
 * order lines, totals, payments and returns stay intact for the books.
 *
 * Refused while anything is still in flight: a courier needs the name and
 * phone on a parcel that has not been delivered yet.
 */
export async function anonymiseCustomer(formData: FormData) {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");
  const detail = `/admin/customers/${id}`;

  const customer = await db.customer.findUnique({
    where: { id },
    include: { _count: { select: { addresses: true, orders: true, reviews: true } } },
  });
  if (!customer) redirect(flashUrl("/admin/customers", "Customer not found", "error"));
  if (isAnonymised(customer)) redirect(flashUrl(detail, "This customer is already anonymised.", "error"));

  const [openOrders, openReturns] = await Promise.all([
    db.order.count({ where: { customerId: id, status: { in: [...OPEN_ORDER_STATUSES] } } }),
    db.returnRequest.count({ where: { customerId: id, status: { in: [...OPEN_RETURN_STATUSES] } } }),
  ]);
  if (openOrders > 0 || openReturns > 0) {
    const parts = [
      openOrders > 0 ? `${openOrders} order${openOrders === 1 ? "" : "s"} still in progress` : "",
      openReturns > 0 ? `${openReturns} open return${openReturns === 1 ? "" : "s"}` : "",
    ].filter(Boolean);
    redirect(
      flashUrl(
        detail,
        `Cannot anonymise ${customer.name} yet: ${parts.join(" and ")}. Complete or cancel them first.`,
        "error",
      ),
    );
  }

  const redactedEmail = `deleted-${id}@${ANONYMISED_DOMAIN}`;
  const stamp = `Anonymised on ${new Date().toISOString().slice(0, 10)} by ${session.name} following an erasure request. Personal details were removed; orders were retained for accounting.`;

  await db.$transaction([
    db.customer.update({
      where: { id },
      data: {
        name: ANONYMISED_NAME,
        email: redactedEmail,
        phone: null,
        passwordHash: null,
        // The provider link is a way back in: leaving it would let the same
        // Google account sign straight back into the record we just erased.
        authProvider: "PASSWORD",
        providerId: null,
        avatarUrl: null,
        emailVerified: false,
        preferredPayment: null,
        upiId: null,
        isActive: false,
        loyaltyPoints: 0,
        notes: stamp,
      },
    }),
    db.address.deleteMany({ where: { customerId: id } }),
    db.order.updateMany({
      where: { customerId: id },
      data: {
        contactName: ANONYMISED_NAME,
        contactEmail: redactedEmail,
        contactPhone: "",
        shipName: ANONYMISED_NAME,
        shipPhone: "",
        shipLine1: "Redacted",
        shipLine2: null,
        shipLandmark: null,
        customerNote: null,
      },
    }),
    db.review.updateMany({ where: { customerId: id }, data: { author: "Anonymous" } }),
    db.activityLog.updateMany({
      where: { entity: "Customer", entityId: id },
      data: { summary: "Customer record edited (details removed on anonymisation)", metadata: Prisma.DbNull },
    }),
  ]);

  // Logged after the scrub above, and deliberately free of the old name/e-mail.
  await logActivity(session, {
    action: "customer.anonymise",
    entity: "Customer",
    entityId: id,
    summary: `Anonymised customer record ${id}`,
    metadata: {
      addressesRemoved: customer._count.addresses,
      ordersRedacted: customer._count.orders,
      reviewsRedacted: customer._count.reviews,
    },
  });
  revalidateStorefront();
  revalidateAdmin("customers");
  redirect(flashUrl(detail, "Customer anonymised. Personal details were removed; orders were kept for accounting."));
}
