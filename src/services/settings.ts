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

/**
 * The settings every storefront page needs, held in the process.
 *
 * `cache()` alone was not enough. React's cache is per REQUEST, so the store
 * settings — a handful of rows that change when the owner clicks Save, perhaps
 * weekly — were fetched from Postgres on every single page view. That is one
 * round trip per visitor for data that is effectively constant, and worse: the
 * read sits in the layout wrapping the whole shop, so the moment the database
 * hiccuped, every page on the site answered 500 at once. That is the honest
 * answer to "why does the site sometimes go down".
 *
 * Two changes fix it, and both matter under load:
 *
 *   a short TTL      one query every 30 seconds instead of one per visitor.
 *                    At a hundred views a second that is 3,000 queries saved
 *                    per window, and the connection pool (10) stops being the
 *                    ceiling on how many people can look at the shop.
 *   last-known-good  if the query fails, the previous value is served rather
 *                    than thrown. A database blip becomes invisible instead of
 *                    a site-wide outage; the shop keeps selling on settings
 *                    that are at most seconds stale.
 *
 * Saving in the admin panel calls `invalidateSettings()`, so the owner still
 * sees their change immediately rather than up to 30 seconds later.
 *
 * Safe because this process is a single PM2 fork (`instances: 1`): there is one
 * cache and one writer. Running more than one instance would need this moved
 * to a shared cache, or the TTL accepted as per-instance skew.
 */
const SETTINGS_TTL_MS = 30_000;

let settingsCache: { value: StoreSettings; at: number } | null = null;
let settingsInFlight: Promise<StoreSettings> | null = null;

/** Drop the cached copy so the next read goes to the database. */
export function invalidateSettings() {
  settingsCache = null;
}

async function readSettings(): Promise<StoreSettings> {
  const rows = await db.storeSetting.findMany();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value as object]));

  return {
    store: { ...DEFAULT_SETTINGS.store, ...(stored.store as object) },
    shipping: { ...DEFAULT_SETTINGS.shipping, ...(stored.shipping as object) },
    payments: normalisePayments(stored.payments),
    tax: { ...DEFAULT_SETTINGS.tax, ...(stored.tax as object) },
    inventory: { ...DEFAULT_SETTINGS.inventory, ...(stored.inventory as object) },
  };
}

export const getSettings = cache(async (): Promise<StoreSettings> => {
  const fresh = settingsCache && Date.now() - settingsCache.at < SETTINGS_TTL_MS;
  if (fresh) return settingsCache!.value;

  // One query at a time. Without this, the first request after the TTL expires
  // lets every concurrent request through to the database at once — the
  // stampede that turns a slow query into an exhausted connection pool.
  if (!settingsInFlight) {
    settingsInFlight = readSettings()
      .then((value) => {
        settingsCache = { value, at: Date.now() };
        return value;
      })
      .finally(() => {
        settingsInFlight = null;
      });
  }

  try {
    return await settingsInFlight;
  } catch (error) {
    // Serve what we had. Stale settings are a far smaller problem than a shop
    // that will not load, and the defaults are a last resort rather than a
    // silent change of prices: they are the same values a fresh install runs
    // on, and the failure is logged loudly enough to act on.
    if (settingsCache) {
      console.error("[settings] read failed; serving the last known good copy:", error);
      return settingsCache.value;
    }
    console.error("[settings] read failed and nothing is cached; using defaults:", error);
    return DEFAULT_SETTINGS;
  }
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
  // The owner has just changed something and expects to see it. Without this
  // the change would sit behind the TTL for up to half a minute and read as
  // "the save did not work".
  invalidateSettings();
}
