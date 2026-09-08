"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import type { OfferType } from "@/generated/prisma/client";
import type { FormState } from "./form-state";
import { bool, dateOrNull, num, revalidateAdmin, revalidateStorefront, str } from "./shared";

/**
 * Coupons & offers. Codes are stored upper-case and unique; shoppers see an
 * offer only while it is active and inside its validity window, so every
 * write here revalidates the storefront (home + /offers + checkout read it).
 */

const TYPES: readonly OfferType[] = ["PERCENT", "FLAT", "SHIPPING", "BANK"];
const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,19}$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;

const flash = (text: string, tone?: "error") =>
  `/admin/offers?flash=${encodeURIComponent(text)}${tone ? `&tone=${tone}` : ""}`;

function optionalInt(formData: FormData, key: string): number | null | "invalid" {
  const raw = str(formData, key);
  if (raw === "") return null;
  const n = num(formData, key, NaN);
  return Number.isInteger(n) ? n : "invalid";
}

async function validate(formData: FormData, existing?: { usedCount: number; startsAt: Date }) {
  const code = str(formData, "code").toUpperCase().replace(/\s+/g, "");
  const title = str(formData, "title");
  const description = str(formData, "description");
  const typeRaw = str(formData, "type");
  const value = num(formData, "value", NaN);
  const minSpend = num(formData, "minSpend", 0);
  const maxDiscount = optionalInt(formData, "maxDiscount");
  const usageLimit = optionalInt(formData, "usageLimit");
  const categoryId = str(formData, "categoryId") || null;
  const accent = str(formData, "accent") || "#2c837c";
  const startsAt = dateOrNull(formData, "startsAt") ?? existing?.startsAt ?? new Date();
  const expiresAt = dateOrNull(formData, "expiresAt");
  const isActive = bool(formData, "isActive");

  if (!code) return { error: "A coupon code is required.", field: "code" } as const;
  if (!CODE_RE.test(code))
    return { error: "Codes are 3–20 characters: letters, numbers, hyphens or underscores.", field: "code" } as const;
  if (title.length < 3) return { error: "Give the offer a short, customer-facing title.", field: "title" } as const;
  if (description.length < 10)
    return { error: "Describe what the offer does in plain language (at least 10 characters).", field: "description" } as const;
  if (!TYPES.includes(typeRaw as OfferType)) return { error: "Choose an offer type.", field: "type" } as const;
  const type = typeRaw as OfferType;

  if (!Number.isInteger(value) || value < 0) return { error: "Enter a whole-number value.", field: "value" } as const;
  if ((type === "PERCENT" || type === "BANK") && (value < 1 || value > 100))
    return { error: "Percentage offers must be between 1% and 100%.", field: "value" } as const;
  if (type === "FLAT" && value < 1) return { error: "A flat discount must be at least ₹1.", field: "value" } as const;
  if (type === "SHIPPING" && value < 1)
    return { error: "Enter the shipping charge this code waives (e.g. 99).", field: "value" } as const;

  if (!Number.isInteger(minSpend) || minSpend < 0)
    return { error: "Minimum spend must be a whole rupee amount (0 for none).", field: "minSpend" } as const;
  if (maxDiscount === "invalid" || (maxDiscount !== null && maxDiscount < 1))
    return { error: "Maximum discount must be a whole rupee amount, or left blank.", field: "maxDiscount" } as const;
  if (type === "FLAT" && maxDiscount !== null && maxDiscount < value)
    return { error: "Maximum discount cannot be lower than the flat discount itself.", field: "maxDiscount" } as const;

  if (!HEX_RE.test(accent)) return { error: "Accent must be a hex colour like #2c837c.", field: "accent" } as const;

  if (!expiresAt) return { error: "Set an expiry date — offers never run indefinitely.", field: "expiresAt" } as const;
  if (expiresAt <= startsAt) return { error: "Expiry must be after the start date.", field: "expiresAt" } as const;

  if (usageLimit === "invalid" || (usageLimit !== null && usageLimit < 1))
    return { error: "Usage limit must be a whole number of redemptions, or left blank.", field: "usageLimit" } as const;
  if (usageLimit !== null && existing && usageLimit < existing.usedCount)
    return {
      error: `This code has already been used ${existing.usedCount} times; the limit cannot be lower than that.`,
      field: "usageLimit",
    } as const;

  if (categoryId) {
    const category = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!category) return { error: "That category no longer exists.", field: "categoryId" } as const;
  }

  return {
    data: {
      code,
      title,
      description,
      type,
      value,
      minSpend,
      maxDiscount,
      categoryId,
      accent: accent.toLowerCase(),
      startsAt,
      expiresAt,
      usageLimit,
      isActive,
    },
  } as const;
}

export async function createOffer(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const result = await validate(formData);
  if ("error" in result) return result;

  const clash = await db.offer.findUnique({ where: { code: result.data.code }, select: { title: true } });
  if (clash) return { error: `The code ${result.data.code} is already used by “${clash.title}”.`, field: "code" };

  const offer = await db.offer.create({ data: result.data });

  await logActivity(session, {
    action: "offer.create",
    entity: "Offer",
    entityId: offer.id,
    summary: `Created offer ${offer.code} (${offer.title})`,
    metadata: { type: offer.type, value: offer.value, expiresAt: offer.expiresAt },
  });
  revalidateStorefront(["/offers"]);
  revalidateAdmin("offers");
  redirect(flash(`${offer.code} created`));
}

export async function updateOffer(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const existing = await db.offer.findUnique({ where: { id }, select: { usedCount: true, startsAt: true } });
  if (!existing) return { error: "This offer no longer exists." };

  const result = await validate(formData, existing);
  if ("error" in result) return result;

  const clash = await db.offer.findFirst({ where: { code: result.data.code, NOT: { id } }, select: { title: true } });
  if (clash) return { error: `The code ${result.data.code} is already used by “${clash.title}”.`, field: "code" };

  const offer = await db.offer.update({ where: { id }, data: result.data });

  await logActivity(session, {
    action: "offer.update",
    entity: "Offer",
    entityId: offer.id,
    summary: `Updated offer ${offer.code}`,
    metadata: { type: offer.type, value: offer.value, isActive: offer.isActive, expiresAt: offer.expiresAt },
  });
  revalidateStorefront(["/offers"]);
  revalidateAdmin("offers");
  return { ok: true, message: "Saved." };
}

export async function toggleOfferActive(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const offer = await db.offer.findUnique({ where: { id } });
  if (!offer) redirect(flash("Offer not found", "error"));

  const updated = await db.offer.update({ where: { id }, data: { isActive: !offer.isActive } });
  await logActivity(session, {
    action: updated.isActive ? "offer.activate" : "offer.deactivate",
    entity: "Offer",
    entityId: id,
    summary: `${updated.isActive ? "Activated" : "Deactivated"} offer ${updated.code}`,
  });
  revalidateStorefront(["/offers"]);
  revalidateAdmin("offers");
}

export async function deleteOffer(formData: FormData) {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");
  const offer = await db.offer.findUnique({ where: { id } });
  if (!offer) redirect(flash("Offer not found", "error"));

  // Orders reference the code as text; keep the record so past discounts stay explainable.
  if (offer.usedCount > 0) {
    redirect(
      flash(
        `${offer.code} has been redeemed ${offer.usedCount} ${offer.usedCount === 1 ? "time" : "times"} and cannot be deleted. Deactivate it instead.`,
        "error",
      ),
    );
  }

  await db.offer.delete({ where: { id } });
  await logActivity(session, {
    action: "offer.delete",
    entity: "Offer",
    entityId: id,
    summary: `Deleted offer ${offer.code}`,
  });
  revalidateStorefront(["/offers"]);
  revalidateAdmin("offers");
  redirect(flash(`${offer.code} deleted`));
}
