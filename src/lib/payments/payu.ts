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

/* ------------- Refunds, fees and where the money went ----------------- */

/**
 * The three server-to-server commands beyond `verify_payment`.
 *
 * They are all the same shape as the verify call above and deliberately stay in
 * this file rather than a new one: the salt, the hash and the postservice host
 * are here, and a second module would either duplicate them or have to export
 * them, which is exactly how a salt ends up somewhere it should not be.
 *
 * All four commands authenticate identically — sha512(key|command|var1|salt) —
 * and none of them uses PAYU_CLIENT_ID or PAYU_CLIENT_SECRET, which belong to a
 * different PayU product entirely.
 *
 * Nothing here touches the database, and nothing here decides whether a refund
 * *should* happen. These functions ask PayU a question and translate the
 * answer; `src/services/payu-ledger.ts` is what is allowed to act on it.
 */

/**
 * The exact command strings, written once.
 *
 * `get_Transaction_Details` in particular is PayU's own capitalisation — one
 * capital T, one capital D — and the command is part of the hash as well as the
 * request, so a slip here fails the signature rather than politely erroring.
 */
export const PAYU_COMMANDS = {
  verify: "verify_payment",
  refund: "cancel_refund_transaction",
  refundStatus: "check_action_status",
  transactionDetails: "get_Transaction_Details",
} as const;

/**
 * The signature every postservice command carries: sha512(key|command|var1|salt).
 *
 * Exported so the check script can prove the formula without sending anything,
 * and so there is one description of it rather than four.
 */
export const payuCommandHash = (config: PayuConfig, command: string, var1: string) =>
  sha512([config.key, command, var1, config.salt].join("|"));

/** PayU will not accept a refund token longer than this. It is not negotiable. */
export const PAYU_REFUND_TOKEN_MAX = 23;

/**
 * Our own reference for one refund request — PayU's `var2`.
 *
 * It must be unique per request and at most 23 characters, which rules out
 * `cuid()` (25) and so rules out using the Refund row's own id. Built from the
 * order number so a human reading PayU's dashboard can tell at a glance which
 * order a refund belongs to, with enough randomness after it that two refunds
 * on the same order never collide.
 */
export function newRefundToken(orderNumber: string): string {
  const base = orderNumber.replace(/[^A-Za-z0-9]/g, "").slice(-12);
  return `R${base}${randomBytes(5).toString("hex")}`.slice(0, PAYU_REFUND_TOKEN_MAX);
}

/**
 * The same order and the same ledger state, the same token — every time.
 *
 * `newRefundToken` mints a fresh handle, which is right when a refund is
 * raised by something that has no screen behind it. A screen is different. The
 * admin order page re-renders every twelve seconds behind an open refund form,
 * so a token minted during the render changed every twelve seconds, and a
 * reload or a second tab minted another one again — which left the promise
 * written all over the refund path ("a double click, a back-and-resubmit and a
 * reloaded tab all carry the same token") covering only the double click.
 *
 * Derived from the ledger instead of from the render, the promise is the one
 * the comments make: every render of an unchanged ledger yields the same
 * token, so a reload and a second tab both submit the handle the first submit
 * already used and the ledger answers from that row rather than sending a
 * second refund. The moment a refund is actually written the state moves, and
 * the next token is a different one — which is what lets a genuine second
 * refund, or a retry after PayU refused the first, go out at all.
 *
 * `seed` is that state, and it is the caller's business: `refundableForAttempt`
 * builds it from the attempt id, what is already committed against it and how
 * many refund rows it carries.
 */
export function refundTokenFor(orderNumber: string, seed: string): string {
  const base = orderNumber.replace(/[^A-Za-z0-9]/g, "").slice(-12);
  const digest = createHash("sha256").update(`${orderNumber}|${seed}`, "utf8").digest("hex");
  // Same shape as the random one above — R, the order, ten hex characters —
  // so anything that reads a token off PayU's dashboard reads both the same.
  return `R${base}${digest.slice(0, 10)}`.slice(0, PAYU_REFUND_TOKEN_MAX);
}

/**
 * Post one command to the postservice endpoint and hand back the parsed JSON.
 *
 * The same request `verifyPayuTransaction` makes, with the same host, the same
 * hash, the same timeout and the same two failure modes surfaced the same way.
 * Verify is left writing it out longhand on purpose — it is the path every
 * payment depends on, and it is not worth editing for tidiness.
 */
async function postToPayu(
  config: PayuConfig,
  command: string,
  vars: { var1: string; var2?: string; var3?: string },
): Promise<unknown> {
  const params: Record<string, string> = { key: config.key, command, var1: vars.var1 };
  if (vars.var2 !== undefined) params.var2 = vars.var2;
  if (vars.var3 !== undefined) params.var3 = vars.var3;
  // Only var1 is hashed, for every one of these commands. The command string is
  // part of the hash too, so a typo in it fails the signature rather than
  // reaching PayU as an unknown command.
  params.hash = payuCommandHash(config, command, vars.var1);

  const response = await httpsFetch(VERIFY_HOSTS[config.mode === "live" ? "live" : "test"], {
    method: "POST",
    body: new URLSearchParams(params).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    timeoutMs: 15_000,
  });

  if (response.status !== 200) {
    throw new Error(`PayU ${command} answered HTTP ${response.status}`);
  }

  try {
    return JSON.parse(response.body) as unknown;
  } catch {
    throw new Error(
      `PayU ${command} answered something other than JSON: ${response.body.slice(0, 120)}`,
    );
  }
}

/** Anything that is not an object reads as an empty one, so no lookup can throw. */
const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** First of several possible spellings of the same field, as a trimmed string. */
function pick(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

/* ------------------------------ Refunding ----------------------------- */

/** What PayU said when we asked it to refund. */
export interface PayuRefundAck {
  /** Whether PayU accepted the refund. See the error_code note below. */
  ok: boolean;
  /** PayU's handle for the request — the only thing check_action_status knows. */
  requestId: string;
  mihpayid: string;
  bankRefNum: string;
  /** PayU's `error_code`, verbatim. "102" is a success, not an error. */
  errorCode: string;
  /** PayU's `msg`, the sentence worth showing a human when it refused. */
  message: string;
  raw: unknown;
}

/**
 * Ask PayU to give a payment back — `cancel_refund_transaction`.
 *
 * Partial and full refunds are both allowed; the amount is rupees, because that
 * is what PayU counts in, while everything stored here is paise.
 *
 * The trap in this call is `error_code`. PayU answers a perfectly successful
 * refund with error_code 102, which reads like a failure and is not: it means
 * the refund has been accepted and queued. Every *other* non-empty error_code
 * is a real refusal. Getting this backwards either loses a refund that did
 * happen or, worse, sends a second one.
 *
 * A true return here means "PayU has it", never "the customer has the money".
 * That is `check_action_status`, days later.
 */
export async function refundPayuTransaction(
  config: PayuConfig,
  input: { mihpayid: string; token: string; amountRupees: number },
): Promise<PayuRefundAck> {
  const mihpayid = input.mihpayid.trim();
  const token = input.token.trim();
  if (!mihpayid) throw new Error("A refund needs PayU's payment id (mihpayid).");
  if (!token || token.length > PAYU_REFUND_TOKEN_MAX) {
    throw new Error(`A refund token must be 1 to ${PAYU_REFUND_TOKEN_MAX} characters.`);
  }
  if (!Number.isFinite(input.amountRupees) || input.amountRupees <= 0) {
    throw new Error("A refund amount must be a positive number of rupees.");
  }

  const raw = await postToPayu(config, PAYU_COMMANDS.refund, {
    var1: mihpayid,
    var2: token,
    var3: payuAmount(input.amountRupees),
  });

  return parsePayuRefundAck(raw);
}

/**
 * Read PayU's answer to a refund request.
 *
 * Split out from the call itself so the 102 rule can be tested without money
 * or a network: this is the single most consequential `if` in the payment code
 * and it deserves to be exercised offline.
 */
export function parsePayuRefundAck(raw: unknown): PayuRefundAck {
  const row = asRecord(raw);
  const errorCode = pick(row, "error_code");
  // "0" and an absent code both mean PayU raised no error at all.
  const noError = errorCode === "" || errorCode === "0";
  const ok = errorCode === "102" || (noError && Number(row.status) === 1);

  return {
    ok,
    requestId: pick(row, "request_id"),
    mihpayid: pick(row, "mihpayid"),
    bankRefNum: pick(row, "bank_ref_num", "bank_ref_no"),
    errorCode,
    message: pick(row, "msg", "message"),
    raw,
  };
}

/* --------------------- How that refund is getting on ------------------ */

/** One refund, as PayU currently sees it. */
export interface PayuActionStatus {
  requestId: string;
  mihpayid: string;
  bankRefNum: string;
  /** Rupees, as PayU writes them. */
  amount: string;
  mode: string;
  action: string;
  /** Our own token, echoed back. */
  token: string;
  /** PayU's word for the state. Read it with `refundStateFromPayu`. */
  status: string;
  bankArn: string;
  settlementId: string;
  amountSettled: string;
  utr: string;
  valueDate: string;
  refundMode: string;
  raw: unknown;
}

/**
 * Ask what became of one refund — `check_action_status`.
 *
 * PayU nests the answer under the request id *twice*:
 * `transaction_details[requestId][requestId]`. Reading it as if it were nested
 * once, the way `verify_payment` is, yields `undefined` and then a crash one
 * property later, so every step down is taken through `asRecord` and a shape
 * that is not what we expect comes back as null rather than as an exception.
 *
 * Null means "PayU told us nothing useful about this request", which is not the
 * same as the refund having failed — the caller must leave its row alone.
 */
export async function checkPayuActionStatus(
  config: PayuConfig,
  requestId: string,
): Promise<PayuActionStatus | null> {
  const id = requestId.trim();
  if (!id) return null;

  const raw = await postToPayu(config, PAYU_COMMANDS.refundStatus, { var1: id });
  return parsePayuActionStatus(id, raw);
}

/**
 * Pull one refund out of the double-nested answer.
 *
 * Separate from the call so the nesting can be tested against a fixture; it is
 * the shape most likely to be got wrong, and getting it wrong reads as "PayU
 * knows nothing about this refund".
 */
export function parsePayuActionStatus(requestId: string, raw: unknown): PayuActionStatus | null {
  const id = requestId.trim();
  if (!id) return null;

  const details = asRecord(asRecord(raw).transaction_details);
  const outer = asRecord(details[id]);
  const inner = asRecord(outer[id]);
  // Take the inner level when it is there, and tolerate an account that answers
  // with only one. Either way we end up with the row, or with nothing.
  const row = Object.keys(inner).length > 0 ? inner : outer;
  if (!pick(row, "status") && !pick(row, "mihpayid")) return null;

  return {
    requestId: pick(row, "request_id") || id,
    mihpayid: pick(row, "mihpayid", "mihpayupid"),
    bankRefNum: pick(row, "bank_ref_num", "bank_ref_no"),
    amount: pick(row, "amt", "amount"),
    mode: pick(row, "mode"),
    action: pick(row, "action"),
    token: pick(row, "token"),
    status: pick(row, "status"),
    bankArn: pick(row, "bank_arn"),
    settlementId: pick(row, "settlement_id"),
    amountSettled: pick(row, "amount_settled"),
    utr: pick(row, "UTR_no", "utr_no"),
    valueDate: pick(row, "value_date"),
    refundMode: pick(row, "refund_mode"),
    raw,
  };
}

/* ----------------------- Fees and settlement -------------------------- */

/** One transaction as PayU's own dashboard shows it, fees and payout included. */
export interface PayuSettlementRow {
  /** Our transaction id — matches `PaymentAttempt.gatewayOrderId`. */
  txnid: string;
  /** PayU's payment id — matches `PaymentAttempt.gatewayPaymentId`. */
  mihpayid: string;
  bankRefNum: string;
  bankArn: string;
  /**
   * Set only on a REFUND artefact. `get_Transaction_Details` returns the
   * refunds alongside the payments, sharing the payment's own txnid, and these
   * three fields are how a refund row gives itself away: PayU issues a request
   * id when it accepts a refund and never for a capture, `action` names the
   * command that created the row, and `refund_mode` is how the money went
   * back. A caller writing settlement onto a payment must skip these rows —
   * see `syncSettlementForAttempts`.
   */
  requestId: string;
  action: string;
  refundMode: string;
  /** Every amount below is rupees, as PayU writes them. */
  amount: string;
  transactionFee: string;
  discount: string;
  additionalCharges: string;
  /** PayU's commission, and the GST on it. */
  merchantServiceFee: string;
  merchantServiceTax: string;
  status: string;
  mode: string;
  bankName: string;
  paymentGateway: string;
  /** Already masked by PayU. There is never a full card number in here. */
  cardMasked: string;
  cardType: string;
  settlementId: string;
  amountSettled: string;
  utr: string;
  valueDate: string;
  addedOn: string;
  productInfo: string;
  errorCode: string;
  failureReason: string;
  raw: unknown;
}

/**
 * Is this row a refund rather than the sale?
 *
 * `get_Transaction_Details` returns both in one feed, under one txnid, so
 * anything writing a payment's settlement figures has to be able to tell them
 * apart. PayU marks a refund three ways and any one of them is enough: it
 * issues a request id when it accepts a refund and never for a capture,
 * `action` names the command that created the row
 * (`cancel_refund_transaction`), and `refund_mode` says how the money went
 * back.
 *
 * Here rather than in the caller, and pure, so the check script can show what
 * it does to a sample feed without a database or a network.
 */
export const payuRowIsRefund = (row: PayuSettlementRow) =>
  stated(row.requestId) || stated(row.refundMode) || /refund/i.test(row.action);

/**
 * Did PayU actually say something in this field?
 *
 * `pick` empties only an absent or blank value, and this feed writes "NA", "0"
 * and "-" where it means nothing at all — `parsePayuDate` already special-cases
 * "na" and `rupeesToPaise`'s docblock names all three. Read literally, a
 * `request_id` of "NA" on an ordinary capture makes every payment row look like
 * a refund artefact, and the settlement half of the feature writes nothing for
 * ever with no error anywhere.
 */
const stated = (value: string) => {
  const trimmed = value.trim();
  return trimmed !== "" && trimmed !== "0" && trimmed !== "-" && trimmed.toUpperCase() !== "NA";
};

/**
 * One row of `get_Transaction_Details`, identified.
 *
 * The payment and its refunds all carry the same txnid, so the txnid alone
 * cannot name a row — a refund arriving on page one made its own payment row on
 * page two look like a page PayU had already sent, and that payment's
 * settlement was quietly dropped. Nor can the txnid and the request id: PayU
 * marks some refund artefacts with `refund_mode` and no request id at all,
 * which keys identically to the payment they came out of. Everything that can
 * distinguish two rows of one transaction goes in.
 *
 * Here beside `payuRowIsRefund`, and pure, for the same reason: the check
 * script can show what it does to a sample feed with no database and no
 * network.
 */
export const payuSettlementRowKey = (row: PayuSettlementRow) =>
  [row.txnid, row.requestId, row.refundMode, row.action, row.amount].join("|");

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Everything PayU knows about the transactions in a date range —
 * `get_Transaction_Details`.
 *
 * This one call carries nearly the whole of PayU's dashboard: the fee PayU
 * took, the GST on that fee, which settlement batch paid it out, the UTR the
 * bank used and the date it valued it at. It is the answer to "the customer
 * paid 1,499, so why did 1,470.42 reach my account".
 *
 * Note the capitalisation of the command — `get_Transaction_Details`, with that
 * one capital T and capital D. It is part of the hash as well as the request,
 * so getting it wrong fails the signature rather than returning an empty list.
 *
 * It is a query across the whole merchant account for a range of days, not a
 * lookup of one order, so the rows it returns include other customers' names
 * and email addresses. Nothing derived from it may be shown anywhere but the
 * admin panel, and the caller should keep only the columns it actually needs.
 */
export async function fetchPayuTransactionDetails(
  config: PayuConfig,
  input: { from: string; to: string; page?: number },
): Promise<PayuSettlementRow[]> {
  if (!ISO_DATE.test(input.from) || !ISO_DATE.test(input.to)) {
    throw new Error("PayU wants both dates as YYYY-MM-DD.");
  }

  const raw = await postToPayu(config, PAYU_COMMANDS.transactionDetails, {
    var1: input.from,
    var2: input.to,
    ...(input.page && input.page > 1 ? { var3: String(input.page) } : {}),
  });

  return parsePayuTransactionDetails(raw);
}

/**
 * Normalise a `get_Transaction_Details` answer into rows.
 *
 * Pure, so the check script can show what the mapping does to a sample without
 * calling PayU, and so the two answer shapes PayU uses are both covered.
 */
export function parsePayuTransactionDetails(raw: unknown): PayuSettlementRow[] {
  // PayU answers with an object keyed by transaction id on some accounts and a
  // plain array on others. Both read as a list of rows.
  const details = asRecord(raw).transaction_details;
  const rows: unknown[] = Array.isArray(details) ? details : Object.values(asRecord(details));

  return rows
    .map((entry) => ({ entry, row: asRecord(entry) }))
    .filter(({ row }) => pick(row, "txnid") !== "")
    .map(({ entry, row }) => ({
      txnid: pick(row, "txnid"),
      mihpayid: pick(row, "mihpayupid", "mihpayid"),
      bankRefNum: pick(row, "bank_ref_num", "bank_ref_no"),
      bankArn: pick(row, "bank_arn"),
      requestId: pick(row, "request_id"),
      action: pick(row, "action"),
      refundMode: pick(row, "refund_mode"),
      amount: pick(row, "amt", "amount"),
      transactionFee: pick(row, "transaction_fee"),
      discount: pick(row, "discount"),
      additionalCharges: pick(row, "additional_charges"),
      merchantServiceFee: pick(row, "mer_service_fee"),
      merchantServiceTax: pick(row, "mer_service_tax"),
      status: pick(row, "status"),
      mode: pick(row, "mode"),
      bankName: pick(row, "bank_name"),
      paymentGateway: pick(row, "payment_gateway"),
      cardMasked: pick(row, "card_no"),
      cardType: pick(row, "cardtype"),
      settlementId: pick(row, "settlement_id"),
      amountSettled: pick(row, "amount_settled"),
      utr: pick(row, "UTR_no", "utr_no"),
      valueDate: pick(row, "value_date"),
      addedOn: pick(row, "addedon"),
      productInfo: pick(row, "productinfo"),
      errorCode: pick(row, "error_code"),
      failureReason: pick(row, "failure_reason"),
      raw: entry,
    }));
}

/**
 * Re-exported so anything already reaching for the PayU module finds the refund
 * vocabulary here too. The definitions live in `./refund-status`, which imports
 * nothing at all, because a client component needs them and this module is
 * server-only.
 */
export {
  OPEN_REFUND_STATES,
  REFUND_STATES,
  REFUND_STATE_LABEL,
  describeRefundEta,
  refundIsOpen,
  refundStateFromPayu,
  type RefundState,
} from "./refund-status";
