import "server-only";

/**
 * SMS delivery for one-time sign-in codes, through MSG91.
 *
 * Indian SMS law (TRAI's DLT rules) means a message is delivered only if its
 * sender id and exact wording were registered in advance, so nothing here
 * writes the message. The text lives in the DLT-approved template, which
 * MSG91 holds; we send only the code, as the template's `otp` variable. The
 * recipient sees it arrive from the registered sender, e.g. JD-WKCART-S.
 *
 *   MSG91_AUTH_KEY           MSG91 → Authkey
 *   MSG91_OTP_TEMPLATE_ID    MSG91 → SMS → Templates, the id of the template
 *                            whose DLT text has {#var#} mapped to ##otp##
 *
 * Until both are set, OTP sign-in is not offered on the site at all. In local
 * development the code is printed to the server console instead of being sent.
 */

const FLOW_URL = "https://control.msg91.com/api/v5/flow";

function config() {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID?.trim();
  return authKey && templateId ? { authKey, templateId } : null;
}

const devConsole = process.env.NODE_ENV !== "production";

/** Is OTP sign-in available? */
export function smsConfigured(): boolean {
  return config() !== null || devConsole;
}

/** Sends a sign-in code to an E.164 Indian number. True once MSG91 accepts it. */
export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  const settings = config();
  if (!settings) {
    if (!devConsole) return false;
    console.info(`[sms:dev] OTP for ${phone}: ${code}`);
    return true;
  }

  try {
    const response = await fetch(FLOW_URL, {
      method: "POST",
      headers: {
        authkey: settings.authKey,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        template_id: settings.templateId,
        short_url: "0",
        recipients: [{ mobiles: phone.replace(/^\+/, ""), otp: code }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => null)) as { type?: string; message?: string } | null;
    if (response.ok && body?.type === "success") return true;
    // Never log the code itself; the provider's message is enough to act on.
    console.error("[sms] MSG91 rejected the OTP message", response.status, body?.message);
    return false;
  } catch (error) {
    console.error("[sms] MSG91 request failed", error instanceof Error ? error.message : error);
    return false;
  }
}
