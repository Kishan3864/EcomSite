"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createPhoneCustomer,
  getCustomerSession,
  linkPhoneToCustomer,
  signInWithPhone,
} from "@/lib/auth/customer";
import { formatIndianMobile, issueOtp, normalizeIndianMobile, verifyOtp } from "@/lib/auth/phone-otp";
import { PHONE_TICKET_COOKIE, cookieOptions, phoneTicketToken } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/oauth";
import { smsConfigured } from "@/lib/sms";
import { clientIp, rateLimit, TOO_MANY } from "@/lib/rate-limit";

/**
 * Mobile-number sign-in and number verification.
 *
 * Every export here is a public endpoint, so each one validates its own input
 * and is rate limited on top of the per-number limits in phone-otp.ts.
 */

export type OtpRequestState =
  | { ok: true; phone: string; resendIn: number }
  | { ok: false; error: string; retryIn?: number };

export type OtpVerifyState = { ok: true; status: "profile" } | { ok: false; error: string };

const NOT_AVAILABLE = "Mobile sign-in is not available right now. Please use your email.";
const BAD_NUMBER = "Enter a valid 10-digit Indian mobile number.";

const next = (raw: unknown) => safeNextPath(typeof raw === "string" ? raw : null, "/account");

/* ------------------------------------------------------------- sign in */

export async function requestLoginOtp(rawPhone: string): Promise<OtpRequestState> {
  if (!smsConfigured()) return { ok: false, error: NOT_AVAILABLE };
  const ip = await clientIp();
  if (!rateLimit("otp-send:ip", ip, 10, 10 * 60_000)) return { ok: false, error: TOO_MANY };

  const phone = normalizeIndianMobile(String(rawPhone ?? "").slice(0, 20));
  if (!phone) return { ok: false, error: BAD_NUMBER };

  // The same answer whether or not the number has an account, so the form
  // cannot be used to find out who shops here.
  const result = await issueOtp({ phone, purpose: "LOGIN", ip });
  return result.ok ? { ok: true, phone: formatIndianMobile(phone), resendIn: result.resendIn } : result;
}

/**
 * Checks the code. A known number is signed in and sent on; a new one gets a
 * short-lived ticket and is asked for a name and email to open the account.
 */
export async function verifyLoginOtp(rawPhone: string, code: string, nextPath?: string): Promise<OtpVerifyState> {
  if (!smsConfigured()) return { ok: false, error: NOT_AVAILABLE };
  if (!rateLimit("otp-verify:ip", await clientIp(), 30, 10 * 60_000)) return { ok: false, error: TOO_MANY };

  const phone = normalizeIndianMobile(String(rawPhone ?? "").slice(0, 20));
  if (!phone) return { ok: false, error: BAD_NUMBER };

  const checked = await verifyOtp({ phone, purpose: "LOGIN", code: String(code ?? "").slice(0, 12) });
  if (!checked.ok) return checked;

  const signedIn = await signInWithPhone(phone);
  if (signedIn.ok) redirect(next(nextPath));
  if (signedIn.reason === "disabled") {
    return { ok: false, error: "This account is no longer active. Get in touch and we will look into it." };
  }

  (await cookies()).set(PHONE_TICKET_COOKIE, await phoneTicketToken.sign(phone), cookieOptions(phoneTicketToken.ttl));
  return { ok: true, status: "profile" };
}

export type PhoneSignupState = { error?: string; field?: "name" | "email" };

/** Opens the account for a number proved a moment ago. */
export async function completePhoneSignup(
  input: { name: string; email: string },
  nextPath?: string,
): Promise<PhoneSignupState> {
  if (!rateLimit("otp-signup:ip", await clientIp(), 10, 10 * 60_000)) return { error: TOO_MANY };

  const jar = await cookies();
  const ticket = await phoneTicketToken.verify(jar.get(PHONE_TICKET_COOKIE)?.value);
  if (!ticket) return { error: "That verification has expired. Please enter your number again." };

  const name = String(input?.name ?? "").trim();
  const email = String(input?.email ?? "").trim();
  if (name.length < 2 || name.length > 80) return { error: "Tell us your full name.", field: "name" };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { error: "Enter a valid email address.", field: "email" };
  }

  const created = await createPhoneCustomer({
    phone: ticket.phone,
    displayPhone: formatIndianMobile(ticket.phone),
    name,
    email,
  });
  if (!created.ok) return { error: created.reason, field: created.field };

  jar.delete(PHONE_TICKET_COOKIE);
  redirect(next(nextPath));
}

/* ------------------------------------------------- add to an account */

export async function requestLinkOtp(rawPhone: string): Promise<OtpRequestState> {
  if (!smsConfigured()) return { ok: false, error: "SMS verification is not available right now." };
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Sign in first." };
  const ip = await clientIp();
  if (!rateLimit("otp-send:ip", ip, 10, 10 * 60_000)) return { ok: false, error: TOO_MANY };

  const phone = normalizeIndianMobile(String(rawPhone ?? "").slice(0, 20));
  if (!phone) return { ok: false, error: BAD_NUMBER };

  const result = await issueOtp({ phone, purpose: "LINK", customerId: session.id, ip });
  return result.ok ? { ok: true, phone: formatIndianMobile(phone), resendIn: result.resendIn } : result;
}

export async function verifyLinkOtp(
  rawPhone: string,
  code: string,
): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Sign in first." };
  if (!rateLimit("otp-verify:ip", await clientIp(), 30, 10 * 60_000)) return { ok: false, error: TOO_MANY };

  const phone = normalizeIndianMobile(String(rawPhone ?? "").slice(0, 20));
  if (!phone) return { ok: false, error: BAD_NUMBER };

  const checked = await verifyOtp({
    phone,
    purpose: "LINK",
    code: String(code ?? "").slice(0, 12),
    customerId: session.id,
  });
  if (!checked.ok) return checked;

  const display = formatIndianMobile(phone);
  const linked = await linkPhoneToCustomer(session.id, phone, display);
  if (!linked.ok) return { ok: false, error: linked.reason };

  revalidatePath("/account", "layout");
  return { ok: true, phone: display };
}
