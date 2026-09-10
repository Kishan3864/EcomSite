import "server-only";

import { cache } from "react";
import { db } from "@/lib/db";
import { BUSINESS, formatAddress, isGstRegistered } from "@/config/business";

/**
 * Store settings the owner edits from the admin panel, merged over defaults so
 * a missing key never breaks a page.
 */

export interface StoreSettings {
  store: {
    name: string;
    legalName: string;
    tagline: string;
    supportEmail: string;
    supportPhone: string;
    address: string;
    gstin: string;
    currency: string;
  };
  shipping: {
    freeThreshold: number;
    standardFee: number;
    expressFee: number;
    scheduledFee: number;
    standardDays: [number, number];
    expressDays: [number, number];
  };
  payments: {
    upi: boolean;
    card: boolean;
    netbanking: boolean;
    wallet: boolean;
    cod: boolean;
    codLimit: number;
  };
  tax: { gstRate: number; pricesIncludeTax: boolean };
  inventory: { lowStockThreshold: number; allowBackorders: boolean };
}

export const DEFAULT_SETTINGS: StoreSettings = {
  store: {
    name: BUSINESS.brandName,
    legalName: BUSINESS.legalName,
    tagline: BUSINESS.tagline,
    supportEmail: BUSINESS.supportEmail,
    supportPhone: BUSINESS.supportPhone,
    address: formatAddress(),
    gstin: isGstRegistered ? BUSINESS.gstin : "",
    currency: "INR",
  },
  shipping: {
    freeThreshold: BUSINESS.ops.freeShippingThreshold,
    standardFee: BUSINESS.ops.shippingFee,
    expressFee: 99,
    scheduledFee: 49,
    standardDays: [BUSINESS.ops.deliveryDaysMin, BUSINESS.ops.deliveryDaysMax],
    expressDays: [1, 2],
  },
  payments: {
    upi: true,
    card: true,
    netbanking: true,
    wallet: true,
    cod: BUSINESS.ops.codEnabled,
    codLimit: BUSINESS.ops.codLimit,
  },
  tax: { gstRate: 18, pricesIncludeTax: true },
  inventory: { lowStockThreshold: 12, allowBackorders: false },
};

export const getSettings = cache(async (): Promise<StoreSettings> => {
  const rows = await db.storeSetting.findMany();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value as object]));

  return {
    store: { ...DEFAULT_SETTINGS.store, ...(stored.store as object) },
    shipping: { ...DEFAULT_SETTINGS.shipping, ...(stored.shipping as object) },
    payments: { ...DEFAULT_SETTINGS.payments, ...(stored.payments as object) },
    tax: { ...DEFAULT_SETTINGS.tax, ...(stored.tax as object) },
    inventory: { ...DEFAULT_SETTINGS.inventory, ...(stored.inventory as object) },
  };
});

export async function saveSetting<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
  await db.storeSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
