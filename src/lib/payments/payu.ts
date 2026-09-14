import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { httpsFetch } from "@/lib/net/outbound";

/**
 * PayU — the payment gateway.
 *
 * Chosen over a server-to-server gateway for one reason that matters here: a
 * payment starts as a form the *browser* posts to PayU, and finishes as a form
 * PayU posts back. This server never has to reach PayU for a customer to pay,
 * and never has to be reached for the answer to be trusted — the answer proves
 * itself with a SHA-512 hash computed from the salt, which only the two of us
 * know. On a box whose outbound connections have been unreliable for months,
 * that is the difference between payments that work and payments that
 * sometimes work.
 *
 * The salt is the whole of the security here. It is never sent to the browser,
 * never put in a form field, and never logged.
 */

const HOSTS = {
  test: "https://test.payu.in/_payment",
  live: "https://secure.payu.in/_payment",
} as const;

export type PayuMode = keyof typeof HOSTS;

export interface PayuConfig {
  key: string;
  salt: string;
  mode: PayuMode;
  /** Where PayU posts the customer back to. Absolute and https, PayU insists. */
  siteUrl: string;
}

export function payuConfig(): PayuConfig | null {
  const key = process.env.PAYU_KEY?.trim();
  const salt = process.env.PAYU_SALT?.trim();
  const mode = (process.env.PAYU_MODE?.trim() || "test") as PayuMode;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!key || !salt || !(mode in HOSTS) || !siteUrl) return null;
  return { key, salt, mode, siteUrl };
}

export const payuConfigured = () => payuConfig() !== null;

export const payuEndpoint = (config: PayuConfig) => HOSTS[config.mode];

const sha512 = (input: string) => createHash("sha512").update(input, "utf8").digest("hex");

/**
 * A pipe is the field separator in every PayU hash, so a pipe inside a value
 * would let a crafted name or product description move the boundaries and forge
 * a hash. Stripped, along with the control characters PayU rejects outright.
 */
const clean = (value: string, max = 100) =>
  value
    .replace(/[|\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** PayU compares strings, not numbers: 1499 and 1499.00 are different hashes. */
export const payuAmount = (rupees: number) => rupees.toFixed(2);

/**
 * A transaction id PayU will accept: letters and digits, comfortably inside
 * their 25-character limit, and unique per attempt so a retry is a new
 * transaction rather than a rejected duplicate.
 */
export function newTxnId(orderNumber: string): string {
  const base = orderNumber.replace(/[^A-Za-z0-9]/g, "").slice(-14);
  return `${base}${randomBytes(4).toString("hex")}`.slice(0, 25);
}

export interface PayuRequest {
  txnid: string;
  amountRupees: number;
  productInfo: string;
  firstName: string;
  email: string;
  phone: string;
}

/**
 * The fields the browser's form carries to PayU, hash included.
 *
 * Everything returned here is public — it all travels through the customer's
 * browser. The salt never appears; only its fingerprint does, in `hash`.
 */
export function payuFormFields(config: PayuConfig, input: PayuRequest): Record<string, string> {
  const amount = payuAmount(input.amountRupees);
  const productinfo = clean(input.productInfo);
  const firstname = clean(input.firstName, 60);
  const email = clean(input.email, 120);

  // sha512(key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||salt)
  // The five empty pipes after udf5 stand for udf6-udf10, which PayU reserves.
  // Every udf is left empty: the transaction id already identifies the order,
  // and an unused field is one fewer thing to keep identical on both sides of
  // the hash.
  const hash = sha512(
    [config.key, input.txnid, amount, productinfo, firstname, email, "", "", "", "", "", "", "", "", "", "", config.salt].join("|"),
  );

  return {
    key: config.key,
    txnid: input.txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone: input.phone.replace(/\D/g, "").slice(-10),
    surl: `${config.siteUrl}/api/payments/payu/return`,
    furl: `${config.siteUrl}/api/payments/payu/return`,
    hash,
  };
}

/** What PayU posts back, as far as we rely on it. */
export interface PayuResponse {
  mihpayid: string;
  status: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  mode: string;
  hash: string;
  bank_ref_num?: string;
  error_Message?: string;
  field9?: string;
  unmappedstatus?: string;
  PG_TYPE?: string;
  bankcode?: string;
}

/**
 * Whether PayU really sent this, and it has not been edited on the way.
 *
 * The reverse hash: sha512(salt|status||||||udf5..udf1|email|firstname|
 * productinfo|amount|txnid|key). When PayU adds `additionalCharges` it is
 * prepended to the whole string — a case worth handling, because the day it
 * appears is the day every payment would otherwise stop verifying.
 *
 * Compared without short-circuiting, so the comparison itself leaks nothing
 * about how much of a forged hash was right.
 */
export function payuResponseIsAuthentic(config: PayuConfig, body: Record<string, string>): boolean {
  const given = (body.hash ?? "").toLowerCase();
  if (given.length !== 128) return false;

  const base = [
    config.salt,
    body.status ?? "",
    "",
    "",
    "",
    "",
    "",
    body.udf5 ?? "",
    body.udf4 ?? "",
    body.udf3 ?? "",
    body.udf2 ?? "",
    body.udf1 ?? "",
    body.email ?? "",
    body.firstname ?? "",
    body.productinfo ?? "",
    body.amount ?? "",
    body.txnid ?? "",
    config.key,
  ].join("|");

  const additional = body.additionalCharges?.trim();
  const expected = sha512(additional ? `${additional}|${base}` : base);
  return timingSafeEqual(expected, given);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ----------------------------- Asking PayU --------------------------- */

const VERIFY_HOSTS = {
  test: "https://test.payu.in/merchant/postservice.php?form=2",
  live: "https://info.payu.in/merchant/postservice.php?form=2",
} as const;

export interface PayuVerification {
  /** PayU's own word: success, failure, pending, … */
  status: string;
  mihpayid: string;
  amount: string;
  mode: string;
  bankRef: string;
  errorMessage: string;
}

interface VerifyResponse {
  status?: number;
  msg?: string;
  transaction_details?: Record<
    string,
    {
      status?: string;
      mihpayid?: string;
      amt?: string | number;
      amount?: string | number;
      mode?: string;
      bank_ref_num?: string;
      error_Message?: string;
      field9?: string;
    } | null
  >;
}

/**
 * Ask PayU what became of one transaction.
 *
 * This is the answer to a customer whose browser never came back and a webhook
 * that never arrived — the two ways an order can be paid for and not know it.
 * Unlike the checkout itself this *is* a server-to-server call, so it depends
 * on this box reaching PayU; that is acceptable because nothing a customer is
 * waiting on depends on it. It runs afterwards, to catch what fell through.
 *
 * Authenticated the same way as everything else here: a SHA-512 over the salt,
 * which is what makes the reply worth believing without a second signature on
 * it.
 *
 * Returns null when PayU has never heard of the transaction — a customer who
 * reached the payment page and closed it — which is not a failure to record,
 * just an order nobody paid for.
 */
export async function verifyPayuTransaction(
  config: PayuConfig,
  txnid: string,
): Promise<PayuVerification | null> {
  const command = "verify_payment";
  const body = new URLSearchParams({
    key: config.key,
    command,
    var1: txnid,
    hash: sha512([config.key, command, txnid, config.salt].join("|")),
  }).toString();

  const response = await httpsFetch(VERIFY_HOSTS[config.mode === "live" ? "live" : "test"], {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    timeoutMs: 15_000,
  });

  if (response.status !== 200) {
    throw new Error(`PayU verify answered HTTP ${response.status}`);
  }

  let parsed: VerifyResponse;
  try {
    parsed = JSON.parse(response.body) as VerifyResponse;
  } catch {
    throw new Error(`PayU verify answered something other than JSON: ${response.body.slice(0, 120)}`);
  }

  const row = parsed.transaction_details?.[txnid];
  if (!row || !row.status) return null;
  // PayU answers a transaction it has never seen with the literal status
  // "Not Found" rather than an empty row. That is not a verdict about a
  // payment — it means nobody ever started one — so it reads as nothing.
  if (String(row.status).trim().toLowerCase() === "not found") return null;

  return {
    status: String(row.status),
    mihpayid: String(row.mihpayid ?? ""),
    amount: String(row.amt ?? row.amount ?? ""),
    mode: String(row.mode ?? ""),
    bankRef: String(row.bank_ref_num ?? ""),
    errorMessage: String(row.error_Message ?? row.field9 ?? ""),
  };
}

/** PayU's own words for how it went. Anything else is neither yet. */
export const payuSucceeded = (status: string) => status.toLowerCase() === "success";
export const payuFailed = (status: string) =>
  ["failure", "failed", "cancel", "cancelled", "usercancelled"].includes(status.toLowerCase());

/** "UPI · Google Pay", "Card", "Net banking" — for the order page and invoice. */
export function describePayu(body: { mode?: string; bankcode?: string }): string {
  const mode = (body.mode ?? "").toUpperCase();
  const raw = body.bankcode?.trim();
  // PayU repeats the mode in bankcode for UPI, which would read "UPI · UPI".
  const bank = raw && raw.toUpperCase() !== mode ? raw : "";
  if (mode === "UPI") return bank ? `UPI · ${bank}` : "UPI";
  if (mode === "CC") return "Credit card";
  if (mode === "DC") return "Debit card";
  if (mode === "NB") return bank ? `Net banking · ${bank}` : "Net banking";
  if (mode === "CASH" || mode === "WALLET") return bank ? `Wallet · ${bank}` : "Wallet";
  if (mode === "EMI") return "EMI";
  return "Online";
}

/** Which column the order's paymentMethod should end up in. */
export function payuMethod(body: { mode?: string }): "UPI" | "CARD" | "NETBANKING" | "WALLET" | "ONLINE" {
  const mode = (body.mode ?? "").toUpperCase();
  if (mode === "UPI") return "UPI";
  if (mode === "CC" || mode === "DC" || mode === "EMI") return "CARD";
  if (mode === "NB") return "NETBANKING";
  if (mode === "CASH" || mode === "WALLET") return "WALLET";
  return "ONLINE";
}
