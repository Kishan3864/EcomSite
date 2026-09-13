"use server";

import { BUSINESS } from "@/config/business";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkPincode, delhiveryConfig } from "@/lib/shipping/delhivery";

/**
 * The pincode check a shopper runs on a product page: asks Delhivery whether
 * it delivers there and whether cash on delivery is offered for that pincode.
 */

export interface ServiceabilityResult {
  /** False when no courier is connected; the UI then says so plainly. */
  configured: boolean;
  serviceable: boolean;
  cod: boolean;
  city: string;
  state: string;
  error?: string;
}

const NONE: ServiceabilityResult = { configured: false, serviceable: false, cod: false, city: "", state: "" };

export async function checkServiceability(pincode: string): Promise<ServiceabilityResult> {
  const config = delhiveryConfig();
  if (!config) return NONE;
  if (!/^\d{6}$/.test(pincode)) return { ...NONE, configured: true, error: "Enter a valid 6-digit pincode." };

  if (!rateLimit("pincode:check", await clientIp(), 40, 10 * 60_000)) {
    return { ...NONE, configured: true, error: "Too many checks just now. Try again in a minute." };
  }

  try {
    const result = await checkPincode(config, pincode);
    return {
      configured: true,
      serviceable: result.serviceable,
      cod: result.serviceable && result.cod,
      city: result.city,
      state: result.state,
    };
  } catch (error) {
    console.error("[shipping] pincode check", error instanceof Error ? error.message : error);
    return {
      ...NONE,
      configured: true,
      error: `We could not check that pincode just now. Try again in a moment, or ask us on ${BUSINESS.supportPhone}.`,
    };
  }
}
