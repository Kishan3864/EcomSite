import "server-only";

import { cache } from "react";
import { db } from "@/lib/db";

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
    name: "Mayura",
    legalName: "Mayura Commerce Private Limited",
    tagline: "Made well. Priced honestly.",
    supportEmail: "hello@mayura.in",
    supportPhone: "+91 80 4718 2200",
    address: "4th Floor, Ekam House, 27 Residency Road, Bengaluru 560025",
    gstin: "29AABCM1234K1ZP",
    currency: "INR",
  },
  shipping: {
    freeThreshold: 999,
    standardFee: 79,
    expressFee: 99,
    scheduledFee: 49,
    standardDays: [3, 5],
    expressDays: [1, 2],
  },
  payments: { upi: true, card: true, netbanking: true, wallet: true, cod: true, codLimit: 25000 },
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
