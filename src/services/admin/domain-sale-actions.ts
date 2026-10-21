"use server";

import { revalidatePath } from "next/cache";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import { DOMAIN_SALE_DEFAULT, normaliseDomainSale, saveDomainSale } from "@/lib/domain-sale";
import type { FormState } from "./form-state";
import { str } from "./shared";

/**
 * Flip domain-sale mode, or change what the sale page says.
 *
 * OWNER only: switched on, the whole shop is gone for every visitor, admin
 * included, and selling the domain is the owner's decision. Audited either way.
 *
 * "Offer ends" arrives as a datetime-local string with no zone and is read as
 * IST, like maintenance's "back by".
 */
export async function setDomainSale(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("OWNER");

  const on = str(formData, "on") === "true";

  const price = (field: string, label: string) => {
    const raw = str(formData, field).replace(/[₹,\s]/g, "");
    if (!raw) return { value: null };
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0 || n > 100_000_000) return { error: `${label} must be a whole number of rupees.`, field };
    return { value: n };
  };
  const offer = price("offerPrice", "Offer price");
  if ("error" in offer) return offer;
  const regular = price("regularPrice", "Regular price");
  if ("error" in regular) return regular;
  if (offer.value !== null && regular.value !== null && offer.value >= regular.value) {
    return { error: "The offer price should be below the regular price.", field: "offerPrice" };
  }

  const endsRaw = str(formData, "offerEndsAt").trim();
  let offerEndsAt: string | null = null;
  if (endsRaw) {
    const parsed = Date.parse(`${endsRaw}${endsRaw.length === 16 ? ":00" : ""}+05:30`);
    if (Number.isNaN(parsed)) return { error: "That is not a date and time.", field: "offerEndsAt" };
    if (on && parsed < Date.now()) return { error: "“Offer ends” is already in the past.", field: "offerEndsAt" };
    offerEndsAt = new Date(parsed).toISOString();
  }

  let whatsapp = str(formData, "whatsapp").replace(/\D/g, "");
  if (whatsapp.length === 10) whatsapp = `91${whatsapp}`;
  if (whatsapp.length < 11 || whatsapp.length > 15) {
    return { error: "Enter the WhatsApp number with country code, e.g. +91 76009 08865.", field: "whatsapp" };
  }

  const pitch = str(formData, "pitch").trim();
  if (pitch.length > 400) return { error: "Keep the text under 400 characters.", field: "pitch" };

  const highlights = str(formData, "highlights")
    .split(/\r?\n/)
    .map((h) => h.trim())
    .filter(Boolean);
  if (highlights.length > 6) return { error: "Six selling points at most.", field: "highlights" };
  if (highlights.some((h) => h.length > 120)) return { error: "Keep each selling point under 120 characters.", field: "highlights" };

  const state = normaliseDomainSale({
    on,
    offerPrice: offer.value,
    regularPrice: regular.value,
    offerEndsAt,
    whatsapp,
    pitch: pitch || DOMAIN_SALE_DEFAULT.pitch,
    highlights,
  });
  await saveDomainSale(state);

  await logActivity(session, {
    action: on ? "store.domain-sale.on" : "store.domain-sale.off",
    entity: "StoreSetting",
    entityId: "domain-sale",
    summary: on
      ? `Switched domain-sale mode ON — every storefront page shows the sale page${offerEndsAt ? `, offer ends ${offerEndsAt}` : ""}`
      : "Switched domain-sale mode OFF — the storefront is back",
    metadata: { on, offerPrice: state.offerPrice, regularPrice: state.regularPrice, offerEndsAt, whatsapp },
  });

  revalidatePath("/", "layout");

  return {
    ok: true,
    message: on
      ? "Domain-sale mode is ON. Every page of the site now shows the sale page. The admin stays open."
      : "Domain-sale mode is OFF. The storefront is back.",
  };
}
