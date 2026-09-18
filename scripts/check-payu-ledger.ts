/**
 * Checks the refund and settlement half of the PayU integration.
 *
 *   npx tsx --conditions=react-server scripts/check-payu-ledger.ts
 *   npx tsx --conditions=react-server scripts/check-payu-ledger.ts --live
 *
 * Without --live nothing leaves this machine: it signs the three new commands
 * the way they will really be signed, and runs PayU's own sample answers back
 * through the parsers that read them — the error_code 102 trap and the
 * double-nested refund status among them.
 *
 * With --live it makes exactly ONE call, get_Transaction_Details for the last
 * seven days, which is a read. It prints the fees and settlement PayU reports
 * for those days.
 *
 * It never initiates a refund. There is no flag that makes it initiate a
 * refund. cancel_refund_transaction is not called from this file at all —
 * refunds go out from the admin panel, once, behind a confirmation, with a row
 * written before the call.
 */
import "dotenv/config";
import { setDefaultAutoSelectFamily, setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import { setDefaultResultOrder } from "node:dns";
import { createHash } from "node:crypto";
import {
  PAYU_COMMANDS,
  PAYU_REFUND_TOKEN_MAX,
  describeRefundEta,
  fetchPayuTransactionDetails,
  newRefundToken,
  parsePayuActionStatus,
  parsePayuRefundAck,
  parsePayuTransactionDetails,
  payuAmount,
  payuCommandHash,
  payuConfig,
  payuRowIsRefund,
  payuSettlementRowKey,
  refundStateFromPayu,
  REFUND_STATES,
} from "../src/lib/payments/payu";

setDefaultResultOrder("ipv6first");
setDefaultAutoSelectFamily(true);
setDefaultAutoSelectFamilyAttemptTimeout(500);

const ok = (s: string) => `\x1b[32m✓\x1b[0m ${s}`;
const bad = (s: string) => `\x1b[31m✗\x1b[0m ${s}`;
const warn = (s: string) => `\x1b[33m!\x1b[0m ${s}`;
const head = (s: string) => `\n\x1b[1m${s}\x1b[0m`;

let failures = 0;
function expect(condition: boolean, good: string, ill: string) {
  if (condition) console.log(ok(good));
  else {
    console.log(bad(ill));
    failures += 1;
  }
}

/** The last seven days, PayU's way round. */
function lastSevenDays(): { from: string; to: string } {
  const day = (offset: number) =>
    new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
  return { from: day(7), to: day(0) };
}

async function main() {
  const live = process.argv.includes("--live");

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
  console.log(
    ok(
      `endpoint  ${config.mode === "live" ? "https://info.payu.in" : "https://test.payu.in"}/merchant/postservice.php?form=2`,
    ),
  );
  console.log("  PAYU_CLIENT_ID and PAYU_CLIENT_SECRET are not used by any of these — they");
  console.log("  belong to a different PayU product. Everything here signs with the salt.");

  /* ------------------------------------------------------------------ */
  console.log(head("Signing the three commands"));

  // The formula, written out here independently of the module, so this is a
  // check and not the same code agreeing with itself.
  const byHand = (command: string, var1: string) =>
    createHash("sha512")
      .update([config.key, command, var1, config.salt].join("|"), "utf8")
      .digest("hex");

  const samples: { label: string; command: string; var1: string; extra: string }[] = [
    {
      label: "refund        ",
      command: PAYU_COMMANDS.refund,
      var1: "403993715524231129",
      extra: `var2 <token>  var3 ${payuAmount(1499)}`,
    },
    {
      label: "refund status ",
      command: PAYU_COMMANDS.refundStatus,
      var1: "9988776655",
      extra: "(var1 is the request_id PayU gave us)",
    },
    {
      label: "settlement    ",
      command: PAYU_COMMANDS.transactionDetails,
      var1: lastSevenDays().from,
      extra: `var2 ${lastSevenDays().to}`,
    },
  ];

  for (const s of samples) {
    const mine = payuCommandHash(config, s.command, s.var1);
    expect(
      mine === byHand(s.command, s.var1),
      `${s.label}${s.command}  hash ${mine.slice(0, 24)}…`,
      `${s.label}${s.command}  HASH DOES NOT MATCH sha512(key|command|var1|salt)`,
    );
    console.log(`                var1 ${s.var1}  ${s.extra}`);
  }

  expect(
    PAYU_COMMANDS.transactionDetails === "get_Transaction_Details",
    "the settlement command keeps PayU's own odd capitalisation",
    `the settlement command reads "${PAYU_COMMANDS.transactionDetails}" — PayU wants get_Transaction_Details`,
  );

  const hashes = new Set(samples.map((s) => payuCommandHash(config, s.command, s.var1)));
  expect(
    hashes.size === samples.length,
    "each command signs differently — the command really is inside the hash",
    "two commands produced the same hash",
  );
  expect(
    ![...hashes].some((h) => h.includes(config.salt)),
    "the salt does not appear in anything that is sent",
    "THE SALT LEAKED into a hash — do not go live",
  );

  /* ------------------------------------------------------------------ */
  console.log(head("Refund tokens (PayU's var2)"));
  const token = newRefundToken("WKC-2026-005001");
  console.log(ok(`sample    ${token}  (${token.length} chars)`));
  expect(
    token.length <= PAYU_REFUND_TOKEN_MAX,
    `within PayU's ${PAYU_REFUND_TOKEN_MAX}-character limit`,
    `${token.length} characters — PayU rejects anything over ${PAYU_REFUND_TOKEN_MAX}`,
  );
  expect(
    /^[A-Za-z0-9]+$/.test(token),
    "letters and digits only",
    "the token has characters PayU may not accept",
  );
  const many = new Set(Array.from({ length: 5000 }, () => newRefundToken("WKC-2026-005001")));
  expect(
    many.size === 5000,
    "5000 tokens for the same order, no collisions",
    `${5000 - many.size} collisions in 5000 tokens — two refunds could share a token`,
  );

  /* ------------------------------------------------------------------ */
  console.log(head("Reading a refund acknowledgement"));
  // PayU's sample answers, as their documentation gives them.
  const queued = parsePayuRefundAck({
    status: 1,
    msg: "Refund Request Queued",
    request_id: "9988776655",
    bank_ref_num: "902412",
    mihpayid: "403993715524231129",
    error_code: "102",
  });
  expect(
    queued.ok && queued.requestId === "9988776655",
    "error_code 102 is read as SUCCESS, and the request_id is kept",
    "error_code 102 was read as a FAILURE — real refunds would look like they never happened",
  );

  expect(
    parsePayuRefundAck({ status: 1, msg: "Refund Request Queued", request_id: "77", error_code: "" }).ok,
    "status 1 with no error code is a success",
    "status 1 with no error code was rejected",
  );
  expect(
    !parsePayuRefundAck({ status: 0, msg: "Invalid amount", error_code: "103" }).ok,
    "any other error_code is a failure",
    "error_code 103 was read as a SUCCESS — money could be sent twice",
  );
  expect(
    !parsePayuRefundAck({ status: 1, msg: "Already refunded", error_code: "106" }).ok,
    "a non-102 error code beats status 1",
    "a non-102 error code was ignored because status said 1",
  );
  expect(!parsePayuRefundAck("<html>gateway error</html>").ok, "rubbish is a failure", "rubbish parsed as a success");

  /* ------------------------------------------------------------------ */
  console.log(head("Reading a refund's status"));
  const requestId = "9988776655";
  const nested = {
    status: 1,
    msg: "1 out of 1 Transactions Fetched Successfully",
    transaction_details: {
      [requestId]: {
        [requestId]: {
          mihpayid: "403993715524231129",
          bank_ref_num: "902412",
          request_id: requestId,
          amt: "1499.00",
          mode: "UPI",
          action: "cancel_refund_transaction",
          token: token,
          status: "REQUESTED",
          bank_arn: "74332512",
          settlement_id: "SET-9911",
          amount_settled: "1470.42",
          UTR_no: "HDFCN52026091",
          value_date: "2026-09-14",
          refund_mode: "NEFT",
        },
      },
    },
  };
  const read = parsePayuActionStatus(requestId, nested);
  expect(
    read !== null && read.status === "REQUESTED" && read.utr === "HDFCN52026091",
    `the double nesting is read: status ${read?.status}, UTR ${read?.utr}, settled ₹${read?.amountSettled}`,
    "the double-nested answer was not read — every refund would look unknown for ever",
  );

  const single = { transaction_details: { [requestId]: { status: "SUCCESS", mihpayid: "4039937" } } };
  expect(
    parsePayuActionStatus(requestId, single)?.status === "SUCCESS",
    "an answer nested only once is still read",
    "an answer nested only once was dropped",
  );
  expect(
    parsePayuActionStatus(requestId, { transaction_details: null }) === null,
    "an empty answer is null, not a crash",
    "an empty answer did not come back as null",
  );
  expect(
    parsePayuActionStatus(requestId, "not json at all") === null,
    "a shape we did not expect is null, not a crash",
    "an unexpected shape was not handled",
  );

  /* ------------------------------------------------------------------ */
  console.log(head("Reading the settlement picture"));
  const sample = {
    status: 1,
    transaction_details: {
      WKC005001a1b2: {
        txnid: "WKC005001a1b2",
        mihpayupid: "403993715524231129",
        bank_ref_num: "902412",
        amt: "1499.00",
        mer_service_fee: "23.60",
        mer_service_tax: "4.25",
        status: "captured",
        mode: "UPI",
        bank_name: "HDFC",
        card_no: "512345XXXXXX2346",
        settlement_id: "SET-9911",
        amount_settled: "1471.15",
        UTR_no: "HDFCN52026091",
        value_date: "2026-09-14",
        addedon: "2026-09-11 14:04:09",
      },
    },
  };
  const parsed = parsePayuTransactionDetails(sample);
  expect(
    parsed.length === 1 && parsed[0].txnid === "WKC005001a1b2",
    "an object keyed by transaction id reads as one row",
    "the object form was not read",
  );
  expect(
    parsePayuTransactionDetails({ transaction_details: [sample.transaction_details.WKC005001a1b2] })
      .length === 1,
    "an array reads the same way",
    "the array form was not read",
  );
  if (parsed[0]) {
    const r = parsed[0];
    console.log(
      `                fee ₹${r.merchantServiceFee} + GST ₹${r.merchantServiceTax} → settled ₹${r.amountSettled}`,
    );
    console.log(`                UTR ${r.utr}  value date ${r.valueDate}  batch ${r.settlementId}`);
  }
  expect(
    parsePayuTransactionDetails({}).length === 0,
    "an answer with no transactions is an empty list",
    "an empty answer did not come back as an empty list",
  );

  /* ------------------------------------------------------------------ */
  console.log(head("Telling a refund apart from the sale it came out of"));
  // The same feed, with the refund PayU returns alongside the payment. It
  // carries the SAME txnid — which is what made this worth checking: written
  // onto the payment, its figures become the payout the owner reconciles his
  // bank statement against.
  const withRefund = {
    status: 1,
    transaction_details: [
      sample.transaction_details.WKC005001a1b2,
      {
        txnid: "WKC005001a1b2",
        mihpayupid: "403993715524231129",
        request_id: "9988776655",
        action: "cancel_refund_transaction",
        refund_mode: "NEFT",
        bank_arn: "74332512",
        amt: "300.00",
        status: "refunded",
        amount_settled: "300.00",
        UTR_no: "HDFCN52026099",
        value_date: "2026-09-16",
      },
    ],
  };
  const both = parsePayuTransactionDetails(withRefund);
  expect(
    both.length === 2,
    "the payment and its refund both read out of one feed",
    `${both.length} row(s) read where the feed held a payment and a refund`,
  );
  expect(
    both.filter((r) => payuRowIsRefund(r)).length === 1 && !payuRowIsRefund(both[0]),
    "exactly one of them is a refund artefact, and it is not the payment",
    "the refund artefact was not recognised — its UTR and amount would be written onto the payment",
  );
  expect(
    both[0].txnid === both[1].txnid,
    "they share a txnid, which is why the pagination guard keys on more than the txnid",
    "the sample no longer shares a txnid, so it is not testing the thing it was written for",
  );
  expect(
    payuRowIsRefund(parsePayuTransactionDetails({
      transaction_details: [{ txnid: "T1", request_id: "", action: "", refund_mode: "NEFT" }],
    })[0]),
    "refund_mode alone is enough to mark a row a refund",
    "a row carrying only refund_mode was taken for a payment",
  );

  // PayU writes "NA", "0" and "-" where it means nothing at all — this module's
  // own date and amount parsers already special-case them. Read literally on a
  // capture row, any one of them made every payment look like a refund
  // artefact, and the settlement half of the feature wrote nothing, ever, with
  // no error anywhere to say so.
  const sentinels = parsePayuTransactionDetails({
    transaction_details: [
      { txnid: "T2", request_id: "NA", action: "capture", refund_mode: "NA", amt: "1499.00" },
      { txnid: "T3", request_id: "0", action: "", refund_mode: "-", amt: "1499.00" },
      { txnid: "T4", request_id: "na", action: "", refund_mode: "", amt: "1499.00" },
    ],
  });
  expect(
    sentinels.length === 3 && sentinels.every((r) => !payuRowIsRefund(r)),
    `PayU's own placeholders — "NA", "0", "-" — are not mistaken for a refund marker`,
    `a capture carrying a placeholder was skipped as a refund: ` +
      `${sentinels.filter((r) => payuRowIsRefund(r)).map((r) => r.txnid).join(", ")}`,
  );
  expect(
    payuRowIsRefund(
      parsePayuTransactionDetails({
        transaction_details: [{ txnid: "T5", request_id: "9988776655", amt: "300.00" }],
      })[0],
    ),
    "and a real request id still marks one",
    "a refund carrying a real request id was taken for a payment",
  );

  /* ------------------------------------------------------------------ */
  console.log(head("Telling two rows of one transaction apart, across pages"));
  // `syncSettlementForAttempts` walks PayU's pages and stops when a page
  // repeats one it has already seen. Two rows of one transaction must therefore
  // key differently, or a refund arriving on page one makes its own payment row
  // on page two look like a repeat — and that payment's settlement is dropped,
  // along with any page after it.
  const paired = parsePayuTransactionDetails({
    transaction_details: [
      { txnid: "WKC777", amt: "1499.00", status: "captured", mer_service_fee: "17.99" },
      { txnid: "WKC777", amt: "300.00", status: "refunded", refund_mode: "NEFT" },
    ],
  });
  expect(
    paired.length === 2 && payuSettlementRowKey(paired[0]) !== payuSettlementRowKey(paired[1]),
    "a refund artefact carrying refund_mode and NO request id keys apart from its own payment row",
    `both rows keyed the same (${payuSettlementRowKey(paired[0])}), so the payment would be dropped ` +
      `as a page already seen`,
  );
  expect(
    payuSettlementRowKey(paired[0]) === payuSettlementRowKey({ ...paired[0] }),
    "and the same row always keys the same, so a repeated page still ends the walk",
    "one row keyed two different ways — the pagination guard would never fire",
  );

  /* ------------------------------------------------------------------ */
  console.log(head("The waits we quote a customer"));
  for (const state of REFUND_STATES) {
    console.log(`  ${state.padEnd(12)} ${describeRefundEta(state)}`);
  }
  expect(
    refundStateFromPayu("IN PROGRESS") === "IN_PROGRESS" &&
      refundStateFromPayu("od_hit") === "OD_HIT" &&
      refundStateFromPayu("Success") === "SUCCESS",
    "PayU's spacing and casing all map onto our six states",
    "PayU's own status strings did not map",
  );
  expect(
    refundStateFromPayu("something new") === null,
    "a status we have never seen is null, so nothing is written on a guess",
    "an unknown status mapped onto a real state",
  );

  /* ------------------------------------------------------------------ */
  if (!live) {
    console.log(head("Next"));
    console.log("  Nothing above touched the network. To ask PayU for the last seven days:");
    console.log("    npx tsx --conditions=react-server scripts/check-payu-ledger.ts --live");
    console.log("  That is a read. No refund is sent by this script, with or without the flag.");
    console.log();
    if (failures > 0) console.log(bad(`${failures} check(s) failed.`));
    return;
  }

  const { from, to } = lastSevenDays();
  console.log(head(`Asking PayU for ${from} to ${to}  (one read-only call)`));
  let rows;
  try {
    rows = await fetchPayuTransactionDetails(config, { from, to });
  } catch (error) {
    console.log(bad(error instanceof Error ? error.message : String(error)));
    console.log("    Either PayU refused the signature, or this server could not reach it — the");
    console.log("    same outbound network the Google sign-in notes describe. Try once more; if");
    console.log("    it keeps failing, say so.");
    failures += 1;
    console.log();
    return;
  }

  if (rows.length === 0) {
    console.log(warn("PayU returned no transactions for those seven days."));
    console.log("    On a test account that usually just means nobody has paid recently.");
  } else {
    console.log(ok(`${rows.length} transaction(s)`));
    console.log();
    console.log(
      "  txnid            status      mode    amount     fee+GST    settled    UTR              value date",
    );
    for (const r of rows.slice(0, 25)) {
      const fee =
        r.merchantServiceFee || r.merchantServiceTax
          ? `${r.merchantServiceFee || "0"}+${r.merchantServiceTax || "0"}`
          : "—";
      console.log(
        `  ${r.txnid.padEnd(16).slice(0, 16)} ${r.status.padEnd(11).slice(0, 11)} ${r.mode.padEnd(7).slice(0, 7)} ` +
          `${r.amount.padStart(9)} ${fee.padStart(10)} ${(r.amountSettled || "—").padStart(10)} ` +
          `${(r.utr || "—").padEnd(16).slice(0, 16)} ${r.valueDate || "—"}`,
      );
    }
    if (rows.length > 25) console.log(`  … and ${rows.length - 25} more`);
    const unsettled = rows.filter((r) => r.status.toLowerCase() === "captured" && !r.settlementId);
    if (unsettled.length > 0) {
      console.log();
      console.log(
        warn(`${unsettled.length} captured payment(s) have no settlement id yet — not paid out.`),
      );
    }
  }

  console.log(head("Next"));
  console.log("  Those columns are what syncSettlementForAttempts writes onto PaymentAttempt:");
  console.log("  bankName, cardMasked, gatewayFee, gatewayFeeTax, settlementId, settledAmount,");
  console.log("  utrNumber and valueDate — fees and amounts converted to paise on the way in.");
  console.log();
  if (failures > 0) console.log(bad(`${failures} check(s) failed.`));
}

main();
