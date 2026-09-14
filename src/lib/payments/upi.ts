import "server-only";

import QRCode from "qrcode";
import { BUSINESS } from "@/config/business";

/**
 * Paying by UPI, without a payment gateway.
 *
 * The shopper scans a QR (or taps through to Google Pay, PhonePe or Paytm),
 * the money lands straight in the shop's bank account, and they type the
 * twelve-digit UTR the app gives them back. Nothing is confirmed by that
 * alone: the owner checks the bank and marks the order paid. That manual step
 * is the whole difference between this and a gateway, and it is why this is a
 * bridge rather than a destination — see docs/upi-payments.md.
 *
 * A UPI id is not a secret. It is printed on the QR every shopper sees. It
 * lives in the environment only so it can be changed without a deploy.
 */

export interface UpiConfig {
  /** The shop's UPI id, e.g. weekendcart@okhdfcbank. */
  vpa: string;
  /** The name UPI apps show the payer. Banks match this against the account. */
  payeeName: string;
}

/** A UPI id: something@handle, the shape NPCI allows. */
const VPA = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,64}$/;

export function upiConfig(): UpiConfig | null {
  const vpa = process.env.UPI_VPA?.trim();
  if (!vpa || !VPA.test(vpa)) return null;
  return {
    vpa,
    // UPI apps show at most a couple of dozen characters, and reject the
    // punctuation a legal name often carries.
    payeeName: (process.env.UPI_PAYEE_NAME?.trim() || BUSINESS.legalName)
      .replace(/[^\w\s.&-]/g, "")
      .slice(0, 40),
  };
}

export const upiConfigured = () => upiConfig() !== null;

/**
 * The `upi://pay` link every Indian UPI app understands.
 *
 * `tr` is the order number: it travels with the payment and comes back on the
 * bank statement, which is what makes a payment matchable to an order without
 * trusting what the customer typed.
 */
export function upiPayUrl(
  config: UpiConfig,
  input: { amountRupees: number; orderNumber: string },
  scheme = "upi",
): string {
  const params = new URLSearchParams({
    pa: config.vpa,
    pn: config.payeeName,
    am: input.amountRupees.toFixed(2),
    cu: "INR",
    tn: `${BUSINESS.brandName} order ${input.orderNumber}`.slice(0, 50),
    tr: input.orderNumber,
  });
  return `${scheme}://pay?${params.toString()}`;
}

/**
 * The same link for one particular app.
 *
 * Android shows a chooser for `upi://`, but iOS opens nothing unless the app's
 * own scheme is used, so each app is offered by name.
 */
export const UPI_APPS = [
  { id: "gpay", name: "Google Pay", scheme: "tez" },
  { id: "phonepe", name: "PhonePe", scheme: "phonepe" },
  { id: "paytm", name: "Paytm", scheme: "paytmmp" },
] as const;

/** The QR, as an inline SVG. Drawn here so the page needs no script and no CDN. */
export async function upiQrSvg(payUrl: string): Promise<string> {
  return QRCode.toString(payUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    // Painted by CSS on the page; "currentColor" would not survive the img
    // element some browsers wrap an SVG data URI in.
    color: { dark: "#0f1115", light: "#ffffff" },
    width: 320,
  });
}

/**
 * A UTR (Unique Transaction Reference) as UPI apps show it: twelve digits.
 *
 * Checked for shape only. Whether the money actually arrived is a question for
 * the bank statement, and the owner answers it in the admin panel — a shopper
 * typing twelve plausible digits proves nothing at all.
 */
export function normaliseUtr(input: string): string | null {
  const utr = input.replace(/\s+/g, "").toUpperCase();
  return /^[0-9]{12}$/.test(utr) ? utr : null;
}
