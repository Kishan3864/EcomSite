"use server";

import { logActivity, requireAdmin } from "@/lib/auth/admin";
import { DEFAULT_SETTINGS, getSettings, saveSetting, type StoreSettings } from "@/services/settings";
import type { FormState } from "./form-state";
import { bool, num, revalidateAdmin, revalidateStorefront, str } from "./shared";

/**
 * Store settings. Each tab saves one key, so a bad value in one section can
 * never corrupt another, and every save is written through `saveSetting` which
 * merges over the defaults.
 */

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

async function persist<K extends keyof StoreSettings>(
  key: K,
  value: StoreSettings[K],
  summary: string,
) {
  const session = await requireAdmin("OWNER");
  await saveSetting(key, value);
  await logActivity(session, {
    action: "settings.update",
    entity: "StoreSetting",
    entityId: key,
    summary,
    metadata: value as object,
  });
  revalidateStorefront();
  revalidateAdmin("settings");
  return { ok: true, message: "Saved." } as FormState;
}

export async function saveStoreSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin("OWNER");
  const name = str(formData, "name");
  const legalName = str(formData, "legalName");
  const supportEmail = str(formData, "supportEmail");
  const supportPhone = str(formData, "supportPhone");
  const address = str(formData, "address");
  const gstin = str(formData, "gstin");

  if (name.length < 2) return { error: "The store needs a name.", field: "name" };
  if (legalName.length < 2) return { error: "Enter the registered company name.", field: "legalName" };
  if (!EMAIL.test(supportEmail)) return { error: "Enter a valid support email.", field: "supportEmail" };
  if (supportPhone.length < 6) return { error: "Enter a support phone number.", field: "supportPhone" };
  if (address.length < 10) return { error: "Enter the registered address.", field: "address" };
  if (gstin && !/^[0-9A-Z]{15}$/.test(gstin))
    return { error: "A GSTIN is 15 characters, digits and capitals only.", field: "gstin" };

  return persist(
    "store",
    {
      ...DEFAULT_SETTINGS.store,
      name,
      legalName,
      tagline: str(formData, "tagline"),
      supportEmail,
      supportPhone,
      address,
      gstin,
      currency: "INR",
    },
    `Updated store details (${name})`,
  );
}

export async function saveShippingSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin("OWNER");
  const freeThreshold = num(formData, "freeThreshold", -1);
  const standardFee = num(formData, "standardFee", -1);
  const expressFee = num(formData, "expressFee", -1);
  const scheduledFee = num(formData, "scheduledFee", -1);
  const stdMin = num(formData, "standardMin", -1);
  const stdMax = num(formData, "standardMax", -1);
  const expMin = num(formData, "expressMin", -1);
  const expMax = num(formData, "expressMax", -1);

  const fees = [
    ["freeThreshold", freeThreshold],
    ["standardFee", standardFee],
    ["expressFee", expressFee],
    ["scheduledFee", scheduledFee],
  ] as const;
  for (const [field, v] of fees) {
    if (!Number.isInteger(v) || v < 0)
      return { error: "Amounts must be whole rupees, zero or more.", field };
  }

  const days = [
    ["standardMin", stdMin],
    ["standardMax", stdMax],
    ["expressMin", expMin],
    ["expressMax", expMax],
  ] as const;
  for (const [field, v] of days) {
    if (!Number.isInteger(v) || v < 1) return { error: "Days must be 1 or more.", field };
  }
  if (stdMax < stdMin) return { error: "The longest standard time cannot be shorter than the fastest.", field: "standardMax" };
  if (expMax < expMin) return { error: "The longest express time cannot be shorter than the fastest.", field: "expressMax" };

  return persist(
    "shipping",
    {
      freeThreshold,
      standardFee,
      expressFee,
      scheduledFee,
      standardDays: [stdMin, stdMax],
      expressDays: [expMin, expMax],
    },
    `Updated shipping rates (free over ₹${freeThreshold})`,
  );
}

export async function savePaymentSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin("OWNER");
  const codLimit = num(formData, "codLimit", -1);
  if (!Number.isInteger(codLimit) || codLimit < 0)
    return { error: "The COD limit must be a whole rupee amount.", field: "codLimit" };

  const value = {
    upi: bool(formData, "upi"),
    card: bool(formData, "card"),
    netbanking: bool(formData, "netbanking"),
    wallet: bool(formData, "wallet"),
    cod: bool(formData, "cod"),
    codLimit,
  };
  // A storefront with no way to pay is a broken storefront.
  if (!value.upi && !value.card && !value.netbanking && !value.wallet && !value.cod)
    return { error: "Leave at least one payment method switched on." };

  return persist("payments", value, "Updated payment methods");
}

export async function saveTaxSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin("OWNER");
  const gstRate = num(formData, "gstRate", -1);
  if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 28)
    return { error: "GST is between 0 and 28 percent.", field: "gstRate" };

  return persist(
    "tax",
    { gstRate, pricesIncludeTax: bool(formData, "pricesIncludeTax") },
    `Set GST to ${gstRate}%`,
  );
}

export async function saveInventorySettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin("OWNER");
  const lowStockThreshold = num(formData, "lowStockThreshold", -1);
  if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0)
    return { error: "The alert level must be a whole number.", field: "lowStockThreshold" };

  return persist(
    "inventory",
    { lowStockThreshold, allowBackorders: bool(formData, "allowBackorders") },
    `Set the default low-stock alert to ${lowStockThreshold}`,
  );
}

/** Re-exported so pages can read current values without a second import. */
export async function readSettings() {
  return getSettings();
}
