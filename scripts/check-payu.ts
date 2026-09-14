/**
 * Checks the PayU setup without taking a payment.
 *
 *   npx tsx --conditions=react-server scripts/check-payu.ts
 *
 * Reads the key, salt and mode from .env, signs a sample transaction exactly
 * as the checkout would, then verifies a reply built from that same salt. If
 * the round trip passes, the two hashes agree and a real payment will be
 * accepted; if it fails, every payment would have been rejected as tampered.
 *
 * Nothing leaves this machine — PayU is not contacted, because the hand-off
 * happens in the customer's browser, not from this server.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import {
  newTxnId,
  payuAmount,
  payuConfig,
  payuEndpoint,
  payuFormFields,
  payuResponseIsAuthentic,
} from "../src/lib/payments/payu";

const ok = (s: string) => `\x1b[32m✓\x1b[0m ${s}`;
const bad = (s: string) => `\x1b[31m✗\x1b[0m ${s}`;
const warn = (s: string) => `\x1b[33m!\x1b[0m ${s}`;
const head = (s: string) => `\n\x1b[1m${s}\x1b[0m`;

function main() {
  console.log(head("Configuration"));
  const config = payuConfig();
  if (!config) {
    console.log(bad("not configured. Set these in .env and reload PM2:"));
    console.log("    PAYU_MODE=test           # or live");
    console.log("    PAYU_KEY=<PayU dashboard → Developers → API Keys>");
    console.log("    PAYU_SALT=<the Salt on that same page>");
    console.log("    NEXT_PUBLIC_SITE_URL=https://weekendcart.com");
    return;
  }

  console.log(
    ok(
      `mode      ${config.mode}${config.mode === "test" ? "  (test — no real money moves)" : "  (LIVE — real money)"}`,
    ),
  );
  console.log(ok(`key       ${config.key}`));
  console.log(ok(`salt      …${config.salt.slice(-6)}  (${config.salt.length} chars)`));
  console.log(ok(`endpoint  ${payuEndpoint(config)}`));
  console.log(ok(`return    ${config.siteUrl}/api/payments/payu/return`));

  console.log(head("Signing a sample payment"));
  const txnid = newTxnId("WKC-2026-005001");
  const fields = payuFormFields(config, {
    txnid,
    amountRupees: 1499,
    productInfo: "Order WKC-2026-005001",
    firstName: "Test Customer",
    email: "test@example.in",
    phone: "9876543210",
  });
  console.log(ok(`txnid     ${fields.txnid}`));
  console.log(ok(`amount    ${fields.amount}`));
  console.log(ok(`hash      ${fields.hash.slice(0, 32)}…  (${fields.hash.length} chars)`));
  if (Object.values(fields).some((v) => v.includes("|"))) {
    console.log(bad("a field contains a pipe — that would break the hash"));
  }
  if (fields.hash.includes(config.salt)) console.log(bad("the salt leaked into the form"));
  else console.log(ok("the salt is not in anything the browser receives"));

  console.log(head("Verifying a reply"));
  // Built exactly as PayU builds it, from the same salt.
  const reply: Record<string, string> = {
    mihpayid: "1234567890",
    status: "success",
    txnid: fields.txnid,
    amount: fields.amount,
    productinfo: fields.productinfo,
    firstname: fields.firstname,
    email: fields.email,
    mode: "UPI",
    udf1: "",
    udf2: "",
    udf3: "",
    udf4: "",
    udf5: "",
  };
  reply.hash = createHash("sha512")
    .update(
      [
        config.salt,
        reply.status,
        "",
        "",
        "",
        "",
        "",
        reply.udf5,
        reply.udf4,
        reply.udf3,
        reply.udf2,
        reply.udf1,
        reply.email,
        reply.firstname,
        reply.productinfo,
        reply.amount,
        reply.txnid,
        config.key,
      ].join("|"),
      "utf8",
    )
    .digest("hex");

  console.log(
    payuResponseIsAuthentic(config, reply)
      ? ok("a genuine reply is accepted")
      : bad("a genuine reply was REJECTED — payments would all fail"),
  );

  console.log(
    payuResponseIsAuthentic(config, { ...reply, amount: payuAmount(1) })
      ? bad("a TAMPERED reply was accepted — do not go live")
      : ok("a tampered reply is rejected"),
  );
  console.log(
    payuResponseIsAuthentic(config, { ...reply, hash: "0".repeat(128) })
      ? bad("a forged hash was accepted — do not go live")
      : ok("a forged hash is rejected"),
  );

  console.log(head("Next"));
  if (config.mode === "test") {
    console.log("  Place a test order on the site and pay with PayU's test details:");
    console.log("    UPI     anything@payu  (or 999999999@payu)");
    console.log("    Netbank user payu / password payu / OTP 123456");
    console.log("  Then switch PAYU_MODE to live and swap in the live key and salt.");
  } else {
    console.log(warn("LIVE mode. The next payment on this site is real money."));
  }
  console.log();
}

main();
