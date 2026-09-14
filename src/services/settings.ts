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
  /**
   * The three ways this shop can take money, each switched on or off here.
   *
   * There used to be one per card network and wallet, which was a list of
   * things the gateway decides for itself — a customer picking "card" here and
   * wanting UPI there. What actually differs is who holds the money on the way:
   * nobody (UPI straight to the bank), the gateway, or the courier.
   */
  payments: {
    /** UPI paid into the shop's own account, confirmed by the owner. */
    upi: boolean;
    /** PayU: card, UPI, net banking and wallets on their checkout. */
    gateway: boolean;
    /**
     * While PAYU_MODE is not "live", show the gateway to every visitor rather
     * than only to a signed-in admin. For demonstrating the checkout; off by
     * default, because PayU's test page has a "Simulate Success" button and an
     * order marked paid with no money behind it is worse than a missing option.
     */
    gatewayDemo: boolean;
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
    gateway: true,
    gatewayDemo: false,
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
    payments: normalisePayments(stored.payments),
    tax: { ...DEFAULT_SETTINGS.tax, ...(stored.tax as object) },
    inventory: { ...DEFAULT_SETTINGS.inventory, ...(stored.inventory as object) },
  };
});

/**
 * Reads the payment switches, including any saved under the older per-method
 * shape. A shop that had card, net banking or wallets switched on wanted the
 * gateway; this says so rather than quietly turning it off on upgrade.
 */
function normalisePayments(stored: unknown): StoreSettings["payments"] {
  const saved = (stored ?? {}) as Partial<StoreSettings["payments"]> &
    Partial<{ card: boolean; netbanking: boolean; wallet: boolean }>;
  const gateway =
    saved.gateway ??
    (saved.card !== undefined || saved.netbanking !== undefined || saved.wallet !== undefined
      ? Boolean(saved.card || saved.netbanking || saved.wallet)
      : DEFAULT_SETTINGS.payments.gateway);

  return { ...DEFAULT_SETTINGS.payments, ...saved, gateway };
}

export async function saveSetting<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
  await db.storeSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
