/**
 * The single source of truth for every real-world fact about this business.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  READ THIS BEFORE GOING LIVE
 * ─────────────────────────────────────────────────────────────────────────────
 * Every value marked TODO_ must be replaced with a real, verifiable value before
 * you apply for online payment acceptance. Payment aggregators (Razorpay,
 * Cashfree, PhonePe PG) and Google cross-check these against your KYC documents,
 * your bank account and your GST record. A mismatch is the single most common
 * reason a merchant application is rejected.
 *
 * Rules that are not negotiable:
 *
 *  1. `legalName` must match your bank account name and your PAN exactly.
 *  2. Do NOT append "Private Limited", "Pvt Ltd", "LLP" or "Limited" unless the
 *     entity is actually incorporated and you hold the CIN/LLPIN to prove it.
 *     Using those suffixes without incorporation is an offence under the
 *     Companies Act, 2013 and gets applications rejected outright.
 *  3. `address` must be a real, reachable postal address — not a PO box, not a
 *     placeholder. It must match the address on your GST / Udyam registration.
 *  4. `supportPhone` must be a working number that a human answers. Reviewers
 *     do call it.
 *  5. Leave `gstin` as an empty string if you are genuinely not GST-registered.
 *     Never invent one — GSTINs are verified against a public government API.
 *
 * Everything on the site — policy pages, footer, contact page, structured data,
 * invoices, sitemap — reads from this file. Change a value here and it changes
 * everywhere, which is exactly what keeps the site internally consistent.
 */

export const BUSINESS = {
  // ── Identity ────────────────────────────────────────────────────────────────
  /** Customer-facing brand name. Appears in the logo, page titles and copy. */
  brandName: "Mayura",

  /**
   * Legal name of the entity, exactly as on your PAN and bank account.
   * For a sole proprietorship this is usually the trade name you registered on
   * Udyam — e.g. "Mayura Commerce" — NOT your personal name, and NOT a
   * "Private Limited" suffix.
   */
  legalName: "TODO_LEGAL_NAME",

  /** One of: "Proprietorship" | "Partnership" | "LLP" | "Private Limited". */
  entityType: "Proprietorship" as const,

  /** Full name of the proprietor, as on PAN. Required on some invoices. */
  proprietorName: "TODO_PROPRIETOR_FULL_NAME",

  /** Udyam / MSME registration number, e.g. "UDYAM-GJ-00-0000000". */
  udyamNumber: "TODO_UDYAM_NUMBER",

  /**
   * 15-character GSTIN. Leave as an empty string ("") if you are below the
   * registration threshold and genuinely not registered — the site then stops
   * claiming it issues GST invoices.
   */
  gstin: "TODO_GSTIN",

  // ── Contact ─────────────────────────────────────────────────────────────────
  /** General support inbox. Must be monitored. */
  supportEmail: "TODO_SUPPORT_EMAIL",

  /** Where privacy and data-deletion requests go. May be the same as support. */
  privacyEmail: "TODO_PRIVACY_EMAIL",

  /** Where formal complaints go, published on the grievance section. */
  grievanceEmail: "TODO_GRIEVANCE_EMAIL",

  /** Display format, e.g. "+91 98765 43210". A human must answer this. */
  supportPhone: "TODO_SUPPORT_PHONE",

  /** Same number, digits only with country code, for tel: and wa.me links. */
  supportPhoneDigits: "TODO_SUPPORT_PHONE_DIGITS",

  /** Set to false if you do not actually offer WhatsApp support. */
  whatsappEnabled: true,

  /** Support hours, stated honestly. Do not promise hours you cannot staff. */
  supportHours: "Monday to Saturday, 10:00am to 7:00pm IST",

  // ── Registered / operating address ──────────────────────────────────────────
  address: {
    line1: "TODO_ADDRESS_LINE_1",
    line2: "TODO_ADDRESS_LINE_2",
    city: "TODO_CITY",
    state: "TODO_STATE",
    postalCode: "TODO_PINCODE",
    country: "India",
    countryCode: "IN",
  },

  // ── Grievance officer ───────────────────────────────────────────────────────
  /**
   * Required by the Consumer Protection (E-Commerce) Rules, 2020 and by the
   * Digital Personal Data Protection Act, 2023. For a proprietorship this is
   * normally the proprietor. The name, email and phone must be published.
   */
  grievanceOfficer: {
    name: "TODO_GRIEVANCE_OFFICER_NAME",
    designation: "Proprietor and Grievance Officer",
  },

  // ── Web ─────────────────────────────────────────────────────────────────────
  /**
   * Live HTTPS origin, no trailing slash. Used for canonicals, the sitemap and
   * robots.txt. This is the domain the deploy runbook targets — change it here
   * if you move to your own domain, and set NEXT_PUBLIC_SITE_URL to match.
   */
  url: "https://ecom.flexypdf.com",

  /** Bare domain for display. */
  domain: "ecom.flexypdf.com",

  // ── Positioning ─────────────────────────────────────────────────────────────
  tagline: "Everyday things, honestly priced.",

  description:
    "An Indian online store for electronics, home appliances, kitchen and home essentials, fashion and gadgets — stocked in-house and shipped across India.",

  /** Categories you actually sell. Keep this truthful; policies key off it. */
  categoriesSold: [
    "Electronics",
    "Home appliances",
    "Kitchen and home",
    "Fashion",
    "Gadgets and accessories",
  ],

  social: {
    // Delete any you do not actually run — a dead social link is a trust signal
    // reviewers notice.
    instagram: "",
    facebook: "",
    youtube: "",
  },

  // ── Operations (these drive the shipping and returns policies) ──────────────
  ops: {
    /** Business days to hand a paid order to the courier. Be conservative. */
    dispatchDays: 2,

    /** Typical delivery window in business days, after dispatch. */
    deliveryDaysMin: 3,
    deliveryDaysMax: 7,

    /** Return window in days from delivery. You chose 7–14. */
    returnWindowDays: 7,

    /** Longer window for the categories you allow it on. */
    returnWindowExtendedDays: 14,

    /** Business days to inspect a returned item once it reaches you. */
    inspectionDays: 2,

    /** Business days to initiate the refund after inspection passes. */
    refundInitiationDays: 2,

    /** Bank-side settlement window you quote to customers. */
    refundSettlementDaysMin: 5,
    refundSettlementDaysMax: 7,

    /** Order value above which shipping is free. Set to 0 to always charge. */
    freeShippingThreshold: 999,

    /** Flat shipping fee below the threshold, in rupees. */
    shippingFee: 79,

    /** Set to false until you actually offer Cash on Delivery. */
    codEnabled: false,

    /** Maximum order value eligible for COD, in rupees. */
    codLimit: 5000,

    /** Courier partners you have actually signed up with. Keep truthful. */
    courierPartners: ["TODO_COURIER_PARTNER"],

    /** Payment aggregator you are onboarding with, e.g. "Razorpay". */
    paymentAggregator: "TODO_PAYMENT_AGGREGATOR",
  },

  // ── Jurisdiction ────────────────────────────────────────────────────────────
  /** City whose courts have jurisdiction. Normally where you operate from. */
  jurisdictionCity: "TODO_CITY",
  jurisdictionState: "TODO_STATE",

  /** Date the current policy text took effect. Update when you change policies. */
  policiesEffectiveFrom: "2026-09-10T00:00:00.000Z",
} as const;

/** True once a value has actually been filled in. */
export function isFilled(value: string): boolean {
  return value.length > 0 && !value.startsWith("TODO_");
}

/** Single-line postal address, skipping any part that is not yet filled in. */
export function formatAddress(separator = ", "): string {
  const a = BUSINESS.address;
  return [a.line1, a.line2, a.city, a.state, a.postalCode, a.country]
    .filter(isFilled)
    .join(separator);
}

/** Multi-line postal address parts, for rendering with <br /> between them. */
export function addressLines(): string[] {
  const a = BUSINESS.address;
  return [
    a.line1,
    a.line2,
    [a.city, a.state].filter(isFilled).join(", "),
    a.postalCode,
    a.country,
  ].filter((line) => line.length > 0 && !line.startsWith("TODO_"));
}

/** Whether the store can honestly claim it issues GST invoices. */
export const isGstRegistered = isFilled(BUSINESS.gstin);

/** Whether every legally required field has been supplied. */
export function missingRequiredFields(): string[] {
  const required: [string, string][] = [
    ["legalName", BUSINESS.legalName],
    ["supportEmail", BUSINESS.supportEmail],
    ["grievanceEmail", BUSINESS.grievanceEmail],
    ["supportPhone", BUSINESS.supportPhone],
    ["address.line1", BUSINESS.address.line1],
    ["address.city", BUSINESS.address.city],
    ["address.state", BUSINESS.address.state],
    ["address.postalCode", BUSINESS.address.postalCode],
    ["grievanceOfficer.name", BUSINESS.grievanceOfficer.name],
    ["url", BUSINESS.url],
  ];
  return required.filter(([, value]) => !isFilled(value)).map(([key]) => key);
}
