/**
 * Two admins, one payment, the same moment.
 *
 *   npx tsx --conditions=react-server scripts/check-refund-race.ts
 *
 * The refund ceiling used to be a read in one query and a write in another,
 * with nothing between them: two admins, two tabs or two renders each passed
 * it and PayU was asked for both refunds. This is the check that it cannot
 * happen any more. It seeds a captured 999 rupee payment in the LOCAL database
 * and calls initiateRefund twice CONCURRENTLY against it.
 *
 * What it counts is not what PayU did afterwards. It is how many Refund rows
 * got PAST the ceiling, because every row created is one
 * cancel_refund_transaction sent with that amount on it. The seeded payment id
 * is synthetic, so PayU refuses every one of them and no money can move here
 * whatever happens.
 *
 *   A  both admins refund the FULL amount.
 *   B  both refund 600 of 999 — each inside the ceiling, together over it.
 *   C  one form submitted twice, carrying the SAME token.
 *   D  a refund PayU never acknowledged: it shuts the payment at once, the way
 *      out is withheld until it cannot still be in flight, and then it opens
 *      the payment again.
 *   E  the ceiling arithmetic, against a refund PayU has acknowledged.
 *   F  the idempotency token follows the ledger rather than the render.
 *   G  the resolve-while-in-flight road — the remedy offered inside PayU's own
 *      answering time, the second refund it lets out, and the acknowledgement
 *      landing afterwards on a row a person has settled.
 *   H  one reference, two different amounts — the second answered with a green
 *      success for money that never went out.
 *
 * G and H are the second round's two money findings. Both run the BEFORE as
 * well as the after: the pre-fix decision is written out verbatim below, next
 * to the call that replaced it, and run against the same real rows — so the
 * numbers printed are measured rather than argued.
 *
 * It WRITES to the database — seeded orders, deleted again at the end — so it
 * refuses to run against anything but a local database in PayU test mode.
 */
import "dotenv/config";
import { db } from "@/lib/db";
import type { Refund } from "@/generated/prisma/client";
import {
  REFUND_STRAND_AFTER_MS,
  initiateRefund,
  refundableForAttempt,
  resolveUnacknowledgedRefund,
} from "@/services/payu-ledger";

/**
 * This script creates orders and asks PayU for refunds. Neither belongs
 * anywhere near the live shop, so it checks where it is before it does either.
 */
const dbUrl = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl)) {
  console.log("Refusing to run: DATABASE_URL is not a local database.");
  process.exit(1);
}
if ((process.env.PAYU_MODE ?? "test").trim() !== "test") {
  console.log("Refusing to run: PAYU_MODE is not test.");
  process.exit(1);
}

const CAPTURED = 99_900; // ₹999.00
const rupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

let failures = 0;
let skipped = 0;
const ok = (s: string) => console.log(`  \x1b[32mPASS\x1b[0m ${s}`);
const bad = (s: string) => {
  failures += 1;
  console.log(`  \x1b[31mFAIL\x1b[0m ${s}`);
};
const expect = (cond: boolean, good: string, ill: string) => (cond ? ok(good) : bad(ill));
/** Said out loud rather than counted as a pass. A proof not run is not a proof. */
const skip = (s: string) => {
  skipped += 1;
  console.log(`  \x1b[33mSKIP\x1b[0m ${s}`);
};
const note = (s: string) => console.log(`       \x1b[2m${s}\x1b[0m`);

/**
 * Two minutes and a bit, as the ledger counts it.
 *
 * `REFUND_STRAND_AFTER_MS` is the line between "PayU may still be answering"
 * and "a person must go and look". Back-dating a row across it is how this
 * script produces a genuinely stranded refund without waiting out the clock —
 * the same staging by hand the scenarios below already do for the row SHAPE a
 * timeout leaves behind.
 */
const STRANDED_AGO = REFUND_STRAND_AFTER_MS * 5;

/** Move a refund's clock back, so the ledger reads it as stranded. */
async function backdate(refundId: string, ms = STRANDED_AGO) {
  await db.refund.update({
    where: { id: refundId },
    data: { initiatedAt: new Date(Date.now() - ms) },
  });
}

/**
 * The row shape a fifteen-second PayU timeout leaves behind: QUEUED, no request
 * id. PayU refuses the synthetic payment ids this script seeds, so it cannot be
 * produced by asking, and every scenario that needs one stages it here.
 */
async function stageStranded(refundId: string, aged: boolean) {
  await db.refund.update({
    where: { id: refundId },
    data: { status: "QUEUED", requestId: null, failureReason: "PayU did not answer — staged" },
  });
  if (aged) await backdate(refundId);
}

/** The newest refund row on a payment, or null while there is none yet. */
async function waitForRow(attemptId: string, timeoutMs = 8_000): Promise<Refund | null> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const row = await db.refund.findFirst({
      where: { paymentAttemptId: attemptId },
      orderBy: { initiatedAt: "desc" },
    });
    if (row) return row;
    if (Date.now() >= until) return null;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const seeded: string[] = [];

async function seedCapturedPayment() {
  const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`.toUpperCase().slice(-11);
  const order = await db.order.create({
    data: {
      number: `RACE-${tag}`,
      contactName: "Race Test",
      contactEmail: "race@example.invalid",
      contactPhone: "9000000000",
      paymentMethod: "ONLINE",
      paymentStatus: "PAID",
      deliveryName: "Standard",
      shipName: "Race Test",
      shipPhone: "9000000000",
      shipLine1: "1 Test Street",
      shipCity: "Surat",
      shipState: "Gujarat",
      shipPincode: "395007",
      itemsTotal: 999,
      mrpTotal: 999,
      total: 999,
      estimatedDelivery: new Date(),
    },
    select: { id: true, number: true },
  });
  seeded.push(order.id);

  const attempt = await db.paymentAttempt.create({
    data: {
      orderId: order.id,
      gatewayOrderId: `TXN${tag}`,
      gatewayPaymentId: `MIH${tag}`,
      amount: CAPTURED,
      status: "CAPTURED",
      method: "upi",
    },
    select: { id: true },
  });

  return { attemptId: attempt.id, tag };
}

/** Every rupee that got past the ceiling, whatever PayU said to it after. */
async function askedOfPayu(attemptId: string) {
  const rows = await db.refund.findMany({
    where: { paymentAttemptId: attemptId },
    select: { token: true, amount: true, status: true, requestId: true },
    orderBy: { initiatedAt: "asc" },
  });
  return { rows, total: rows.reduce((sum, r) => sum + r.amount, 0) };
}

/**
 * `settledAnswerFor`, verbatim as it stood before this round.
 *
 * The amount is not looked at anywhere in it — which is the whole of finding
 * two. Kept here so the BEFORE in scenario H is run against a real row rather
 * than described in a comment.
 */
function settledAnswerForAsItStood(existing: Refund): { ok: boolean; says: string } {
  if (existing.status === "FAILURE") {
    return { ok: false, says: `${existing.failureReason || "PayU refused this refund."} …raise it again` };
  }
  if (existing.requestId) {
    return {
      ok: true,
      says: `PayU has accepted a refund of ${rupees(existing.amount)} … It is queued, not paid yet`,
    };
  }
  return { ok: false, says: "already sent to PayU and PayU never acknowledged it" };
}

function report(rows: { token: string; amount: number; status: string; requestId: string | null }[]) {
  for (const r of rows) {
    console.log(
      `       row ${r.token}  ${rupees(r.amount)}  ${r.status}  requestId ${r.requestId ?? "—"}`,
    );
  }
}

async function twoAtOnce(amountPaise: number, sameToken: boolean) {
  const { attemptId, tag } = await seedCapturedPayment();
  const a = `RA${tag}A`;
  const b = sameToken ? a : `RB${tag}B`;

  const [first, second] = await Promise.all([
    initiateRefund({ attemptId, amountPaise, actor: { id: null, name: "Admin A" }, token: a }),
    initiateRefund({ attemptId, amountPaise, actor: { id: null, name: "Admin B" }, token: b }),
  ]);

  const { rows, total } = await askedOfPayu(attemptId);
  console.log(`       A: ${first.ok ? "accepted" : "refused"} — ${first.ok ? first.refund.token : first.error}`);
  console.log(`       B: ${second.ok ? "accepted" : "refused"} — ${second.ok ? second.refund.token : second.error}`);
  report(rows);
  return { attemptId, rows, total };
}

async function main() {
  console.log(`\n\x1b[1mA. Two admins, the full ${rupees(CAPTURED)}, at the same moment\x1b[0m`);
  for (let round = 1; round <= 3; round++) {
    const { rows, total } = await twoAtOnce(CAPTURED, false);
    expect(
      rows.length === 1 && total <= CAPTURED,
      `round ${round}: one row past the ceiling, ${rupees(total)} asked of PayU against a ${rupees(CAPTURED)} capture`,
      `round ${round}: ${rows.length} rows past the ceiling, ${rupees(total)} asked of PayU against a ${rupees(CAPTURED)} capture`,
    );
  }

  console.log(`\n\x1b[1mB. Two admins, ${rupees(60_000)} each — each inside the ceiling, together over it\x1b[0m`);
  for (let round = 1; round <= 3; round++) {
    const { rows, total } = await twoAtOnce(60_000, false);
    expect(
      total <= CAPTURED,
      `round ${round}: ${rupees(total)} asked of PayU against a ${rupees(CAPTURED)} capture (${rows.length} row)`,
      `round ${round}: ${rupees(total)} asked of PayU against a ${rupees(CAPTURED)} capture (${rows.length} rows) — OVER`,
    );
  }

  console.log(`\n\x1b[1mC. One form, submitted twice, same token\x1b[0m`);
  {
    const { rows, total } = await twoAtOnce(30_000, true);
    expect(
      rows.length === 1 && total === 30_000,
      `the token deduplicated: one row, ${rupees(total)} asked of PayU`,
      `${rows.length} rows for one token, ${rupees(total)} asked of PayU`,
    );
  }

  console.log(`\n\x1b[1mD. A refund PayU never acknowledged, and the way out of it\x1b[0m`);
  {
    const { attemptId, tag } = await seedCapturedPayment();
    const first = await initiateRefund({
      attemptId,
      amountPaise: 30_000,
      actor: { id: null, name: "Admin A" },
      token: `RD${tag}`,
    });
    const refundId = first.refund?.id ?? "";

    // The row shape a fifteen-second PayU timeout leaves behind, still young.
    await stageStranded(refundId, false);

    const young = await refundableForAttempt(attemptId);
    expect(
      !!young?.blocked && young.unacknowledged.length === 0,
      `while PayU could still be answering the payment is blocked but the remedy is withheld: "${young?.blocked}"`,
      `the remedy was offered on a refund raised seconds ago: blocked=${young?.blocked} offered=${young?.unacknowledged.length}`,
    );

    const tooSoon = await resolveUnacknowledgedRefund({
      refundId,
      resolution: { kind: "not-sent" },
      actor: { id: null, name: "Kishan" },
    });
    expect(
      !tooSoon.ok,
      `and the service refuses it even if the form is posted anyway: "${tooSoon.ok ? "" : tooSoon.error.slice(0, 80)}…"`,
      "a refund still inside PayU's answering time was marked as never sent",
    );

    // Now old enough that PayU cannot still be thinking about it.
    await backdate(refundId);

    const blockedState = await refundableForAttempt(attemptId);
    expect(
      !!blockedState?.blocked && blockedState.unacknowledged.length === 1,
      `once it is genuinely stranded the payment is blocked and names it, raised ${blockedState?.unacknowledged[0]?.raisedAgo}`,
      "an unacknowledged refund did not block the payment, or the remedy was not offered",
    );

    const second = await initiateRefund({
      attemptId,
      amountPaise: 10_000,
      actor: { id: null, name: "Admin B" },
      token: `RE${tag}`,
    });
    expect(
      !second.ok,
      "a further refund on that payment is refused while it is unresolved",
      "a further refund went out on a payment with an unacknowledged refund",
    );

    // A hand-typed request id is checked with PayU before it is believed. This
    // one is invented, so PayU either says it knows nothing about it or cannot
    // be reached — and both of those are a refusal, never a freed ceiling.
    const invented = await resolveUnacknowledgedRefund({
      refundId,
      resolution: { kind: "sent", requestId: `9988${tag.replace(/[^0-9]/g, "") || "776655"}` },
      actor: { id: null, name: "Kishan" },
    });
    const stillNoId = await db.refund.findUnique({ where: { id: refundId } });
    expect(
      !invented.ok && !stillNoId?.requestId,
      `an invented request id is refused rather than written: "${invented.ok ? "" : invented.error.slice(0, 90)}…"`,
      "a request id PayU never confirmed was written onto the row and unfroze the payment",
    );

    const resolved = await resolveUnacknowledgedRefund({
      refundId,
      resolution: { kind: "not-sent" },
      actor: { id: null, name: "Kishan" },
    });
    expect(
      resolved.ok,
      `resolved: ${resolved.ok ? resolved.message : ""}`,
      `resolve refused: ${resolved.ok ? "" : resolved.error}`,
    );

    const after = await refundableForAttempt(attemptId);
    expect(
      after?.blocked === null && after?.refundablePaise === CAPTURED,
      `the payment is open again with ${rupees(after?.refundablePaise ?? 0)} refundable`,
      `still blocked, or the ceiling did not come back: blocked=${after?.blocked} refundable=${after?.refundablePaise}`,
    );

    const again = await resolveUnacknowledgedRefund({
      refundId,
      resolution: { kind: "not-sent" },
      actor: { id: null, name: "Kishan" },
    });
    expect(!again.ok, "settling the same row twice is refused", "the same row was settled twice");
  }

  console.log(`\n\x1b[1mE. The ceiling arithmetic itself, re-read under the lock\x1b[0m`);
  {
    const { attemptId, tag } = await seedCapturedPayment();
    const first = await initiateRefund({
      attemptId,
      amountPaise: 60_000,
      actor: { id: null, name: "Admin A" },
      token: `RF${tag}`,
    });
    // Stage PayU's acknowledgement: this is what a first refund looks like once
    // it has been accepted — QUEUED, with a request id, counting against the
    // ceiling. The synthetic payment id cannot be acknowledged for real.
    await db.refund.update({
      where: { id: first.refund?.id ?? "" },
      data: { status: "QUEUED", requestId: `REQ${tag}`, failureReason: null },
    });

    const state = await refundableForAttempt(attemptId);
    expect(
      state?.committedPaise === 60_000 && state?.refundablePaise === 39_900 && !state?.blocked,
      `committed ${rupees(state?.committedPaise ?? 0)}, refundable ${rupees(state?.refundablePaise ?? 0)}, not blocked`,
      `the ceiling after one acknowledged refund reads wrong: committed ${state?.committedPaise}, refundable ${state?.refundablePaise}, blocked ${state?.blocked}`,
    );

    const over = await initiateRefund({
      attemptId,
      amountPaise: 50_000,
      actor: { id: null, name: "Admin B" },
      token: `RG${tag}`,
    });
    expect(
      !over.ok && over.error.includes("399.00"),
      `a refund over what is left is refused: "${over.ok ? "" : over.error}"`,
      `a refund over the ceiling was not refused on the arithmetic: ${over.ok ? "it was accepted" : over.error}`,
    );

    const within = await initiateRefund({
      attemptId,
      amountPaise: 39_900,
      actor: { id: null, name: "Admin B" },
      token: `RH${tag}`,
    });
    const { total } = await askedOfPayu(attemptId);
    expect(
      !!within.refund && total === CAPTURED,
      `the rest of it goes through: ${rupees(total)} asked of PayU in all, exactly the capture`,
      `the remaining ${rupees(39_900)} did not go through, or the total is wrong: ${rupees(total)}`,
    );
  }

  console.log(`\n\x1b[1mF. The idempotency token follows the ledger, not the render\x1b[0m`);
  {
    const { attemptId } = await seedCapturedPayment();
    const a = await refundableForAttempt(attemptId);
    const b = await refundableForAttempt(attemptId);
    expect(
      !!a?.nextToken && a.nextToken === b?.nextToken,
      `two renders of an unchanged ledger hand out the same token (${a?.nextToken})`,
      "two renders of the same ledger handed out different tokens",
    );
    expect(
      !!a && a.nextToken.length <= 23 && /^[A-Za-z0-9]+$/.test(a.nextToken),
      "the token is within PayU's 23 characters, letters and digits only",
      `the token is not one PayU will take: ${a?.nextToken}`,
    );
    await initiateRefund({
      attemptId,
      amountPaise: 10_000,
      actor: { id: null, name: "Admin A" },
      token: a?.nextToken,
    });
    const c = await refundableForAttempt(attemptId);
    expect(
      !!c && c.nextToken !== a?.nextToken,
      `once a refund is written the next token is a different one (${c?.nextToken})`,
      "the token did not move after a refund was written — a second refund could never be raised",
    );
  }

  console.log(`\n\x1b[1mG. The way out, offered while PayU is still answering\x1b[0m`);
  {
    /*
     * BEFORE, run for real.
     *
     * `ceilingFor` called a refund stranded on shape alone — QUEUED with no
     * request id — which is exactly what the claim transaction commits, three
     * lines before PayU is called. The admin order page refreshes every twelve
     * seconds, so a second manager saw the block AND the resolve control inside
     * that window. He searched PayU for the reference, found nothing (PayU had
     * not indexed it yet), honestly pressed "PayU has no record", and the
     * ceiling came back for money that was already on its way.
     */
    const { attemptId, tag } = await seedCapturedPayment();
    const first = await initiateRefund({
      attemptId,
      amountPaise: CAPTURED,
      actor: { id: null, name: "Admin A" },
      token: `RGA${tag}`,
    });
    const strandedId = first.refund?.id ?? "";
    // The row as it stands the instant the claim commits: written, PayU not yet
    // answered. Staged, because PayU refuses this script's synthetic payment id
    // rather than leaving the call open.
    await stageStranded(strandedId, false);

    // The pre-fix test, verbatim: status and request id, no clock anywhere.
    const held = await db.refund.findMany({ where: { paymentAttemptId: attemptId } });
    const offeredThen = held.filter((r) => r.status === "QUEUED" && !r.requestId);
    note(
      `before: the old shape test offered the remedy on ${offeredThen.length} refund raised ` +
        `${Math.round((Date.now() - (offeredThen[0]?.initiatedAt.getTime() ?? 0)) / 1000)} seconds ago`,
    );

    // The pre-fix resolver: straight to the write, with nothing asking how old
    // the row was.
    await db.refund.updateMany({
      where: { id: strandedId, status: "QUEUED", requestId: null },
      data: { status: "FAILURE", failureReason: "PayU has no record — marked failed by hand" },
    });

    const secondRefund = await initiateRefund({
      attemptId,
      amountPaise: CAPTURED,
      actor: { id: null, name: "Manager B" },
      token: `RGB${tag}`,
    });
    const beforeTotals = await askedOfPayu(attemptId);

    // And now the first call's acknowledgement lands. This is the write the old
    // recordAck made — `update` by id, with no predicate on it at all.
    await db.refund.update({
      where: { id: strandedId },
      data: { status: "QUEUED", requestId: `REQB${tag}`, failureReason: null, lastCheckedAt: new Date() },
    });
    const erased = await db.refund.findUnique({ where: { id: strandedId } });

    report(beforeTotals.rows);
    expect(
      beforeTotals.total > CAPTURED && erased?.status === "QUEUED" && !erased.failureReason,
      `before: the old code asked PayU for ${rupees(beforeTotals.total)} against a ${rupees(CAPTURED)} ` +
        `capture, and the late acknowledgement put the row back to ${erased?.status} with the ` +
        `manager's verdict gone`,
      `before: the pre-fix trace did not reproduce — ${rupees(beforeTotals.total)} asked, row ${erased?.status}`,
    );
    void secondRefund;
  }

  {
    /*
     * AFTER, staged — the same trace, step for step, and deterministic.
     *
     * The row is put back into the shape it holds the instant the claim commits
     * and PayU has not answered: QUEUED, no request id, seconds old. PayU
     * refuses this script's synthetic payment id in about a second rather than
     * hanging, so this is how that moment is held still long enough to walk
     * through it. The arm below does the same thing against a call that really
     * is open, and skips itself if PayU is too quick.
     */
    const { attemptId, tag } = await seedCapturedPayment();
    const first = await initiateRefund({
      attemptId,
      amountPaise: CAPTURED,
      actor: { id: null, name: "Admin A" },
      token: `RHA${tag}`,
    });
    await stageStranded(first.refund?.id ?? "", false);

    const seenByB = await refundableForAttempt(attemptId);
    expect(
      !!seenByB?.blocked && seenByB.unacknowledged.length === 0,
      `after: the payment is shut and no remedy is offered: "${seenByB?.blocked}"`,
      `the remedy was offered while PayU could still be answering: offered=${seenByB?.unacknowledged.length}`,
    );

    const tooSoon = await resolveUnacknowledgedRefund({
      refundId: first.refund?.id ?? "",
      resolution: { kind: "not-sent" },
      actor: { id: null, name: "Manager B" },
    });
    expect(
      !tooSoon.ok,
      "the service refuses to mark it never-sent, so the ceiling is never freed",
      "a refund PayU could still be answering was marked as never sent",
    );

    const secondRefund = await initiateRefund({
      attemptId,
      amountPaise: CAPTURED,
      actor: { id: null, name: "Manager B" },
      token: `RHB${tag}`,
    });
    const afterTotals = await askedOfPayu(attemptId);
    report(afterTotals.rows);
    expect(
      !secondRefund.refund && afterTotals.total <= CAPTURED,
      `and no second row gets past the ceiling: ${rupees(afterTotals.total)} asked of PayU against a ` +
        `${rupees(CAPTURED)} capture`,
      `${rupees(afterTotals.total)} asked of PayU against a ${rupees(CAPTURED)} capture — OVER`,
    );
  }

  {
    /*
     * AFTER, unstaged — the same moves against a PayU call that really is open.
     *
     * The window is short: PayU refuses this script's synthetic payment id in
     * about two hundred milliseconds, and the row appears about ninety
     * milliseconds in. So the second refund goes first, which is the move that
     * has to land inside it. If PayU answers before it does, the ceiling
     * reopens honestly — a refund PayU refused frees its amount, as it always
     * has — and there is nothing left to prove here. That is a skip, not a
     * pass; the staged arm above covers the same ground either way.
     */
    const { attemptId, tag } = await seedCapturedPayment();
    let answered = false;
    const inflight = initiateRefund({
      attemptId,
      amountPaise: CAPTURED,
      actor: { id: null, name: "Admin A" },
      token: `RJA${tag}`,
    }).then((answer) => {
      answered = true;
      return answer;
    });

    const row = await waitForRow(attemptId);
    if (!row || answered) {
      skip("PayU answered before the row could even be read — the open window was not staged");
      await inflight;
    } else {
      const seenByB = await refundableForAttempt(attemptId);
      const secondRefund = await initiateRefund({
        attemptId,
        amountPaise: CAPTURED,
        actor: { id: null, name: "Manager B" },
        token: `RJB${tag}`,
      });
      const tooSoon = await resolveUnacknowledgedRefund({
        refundId: row.id,
        resolution: { kind: "not-sent" },
        actor: { id: null, name: "Manager B" },
      });
      await inflight;
      const totals = await askedOfPayu(attemptId);

      if (answered && secondRefund.refund) {
        report(totals.rows);
        skip(
          `PayU refused the first refund partway through, which frees the ceiling honestly — the ` +
            `in-flight window closed before the second submit could be tested (${rupees(totals.total)} asked)`,
        );
      } else {
        report(totals.rows);
        expect(
          !!seenByB?.blocked &&
            seenByB.unacknowledged.length === 0 &&
            !tooSoon.ok &&
            !secondRefund.refund &&
            totals.total <= CAPTURED,
          `with PayU's call genuinely open: shut with no remedy offered, the not-sent verdict refused, ` +
            `and ${rupees(totals.total)} asked of PayU against a ${rupees(CAPTURED)} capture`,
          `in flight: blocked=${seenByB?.blocked} offered=${seenByB?.unacknowledged.length} ` +
            `resolve=${tooSoon.ok ? "ACCEPTED" : "refused"} secondRow=${secondRefund.refund ? "written" : "none"} ` +
            `total=${rupees(totals.total)}`,
        );
      }
    }
  }

  {
    /*
     * AFTER, the other half: a resolve that IS legitimate, with the
     * acknowledgement landing on it afterwards.
     *
     * The age gate above means a real PayU call — fifteen seconds at the
     * outside — cannot still be open when the remedy becomes available two
     * minutes later. The row's clock is moved here to force the one situation
     * the conditional write exists for, and nothing else is faked: the resolve,
     * the second refund and the acknowledgement are all the real thing.
     */
    const { attemptId, tag } = await seedCapturedPayment();
    let answered = false;
    const inflight = initiateRefund({
      attemptId,
      amountPaise: CAPTURED,
      actor: { id: null, name: "Admin A" },
      token: `RIA${tag}`,
    }).then((answer) => {
      answered = true;
      return answer;
    });

    const row = await waitForRow(attemptId);
    await backdate(row?.id ?? "");
    const verdict = row
      ? await resolveUnacknowledgedRefund({
          refundId: row.id,
          resolution: { kind: "not-sent" },
          actor: { id: null, name: "Manager B" },
        })
      : { ok: false as const, error: "no row" };

    if (!row || answered || !verdict.ok) {
      skip(
        `PayU answered before the verdict could be recorded, so there was no acknowledgement left ` +
          `to land afterwards (${row ? (verdict.ok ? "resolved" : verdict.error.slice(0, 60)) : "no row"})`,
      );
      await inflight;
    } else {
      ok("a refund old enough to be stranded can still be settled by hand");

      const secondRefund = await initiateRefund({
        attemptId,
        amountPaise: CAPTURED,
        actor: { id: null, name: "Manager B" },
        token: `RIB${tag}`,
      });
      note(
        `the manager's verdict frees the ceiling, so his second refund is raised: ` +
          `${secondRefund.ok || secondRefund.refund ? "written" : "refused"}. That is his decision ` +
          `taking effect, and the check above is what keeps it out of PayU's answering time.`,
      );

      const late = await inflight;
      const settled = await db.refund.findUnique({ where: { id: row.id } });
      expect(
        !late.ok && settled?.status === "FAILURE" && settled.requestId === null,
        "the late acknowledgement is refused and the manager's verdict stands untouched",
        `the late acknowledgement wrote over the verdict: ok=${late.ok} row=${settled?.status} ` +
          `requestId=${settled?.requestId ?? "—"}`,
      );
      expect(
        !!settled?.failureReason &&
          settled.failureReason.includes("no money moved") &&
          /PayU/.test(settled.failureReason),
        "PayU's own account of it was kept on the row, next to the verdict rather than over it",
        `PayU's answer was lost: ${settled?.failureReason ?? "—"}`,
      );
      note(`the refusal read: "${late.ok ? "" : late.error.slice(0, 140)}…"`);
    }
  }

  console.log(`\n\x1b[1mH. One reference, two different amounts\x1b[0m`);
  {
    const { attemptId, tag } = await seedCapturedPayment();
    const drawn = await refundableForAttempt(attemptId);
    // The token both managers' screens hold: derived from the ledger state, and
    // the amount is no part of that seed.
    const shared = drawn?.nextToken ?? "";

    await initiateRefund({
      attemptId,
      amountPaise: 30_000,
      actor: { id: null, name: "Admin A" },
      token: shared,
    });
    const r1 = await db.refund.findUniqueOrThrow({ where: { token: shared } });
    // PayU's acknowledgement of the ₹300, staged — the synthetic payment id
    // cannot be acknowledged for real.
    await db.refund.update({
      where: { id: r1.id },
      data: { status: "QUEUED", requestId: `REQH${tag}`, failureReason: null },
    });
    const acked = await db.refund.findUniqueOrThrow({ where: { id: r1.id } });

    const then = settledAnswerForAsItStood(acked);
    note(
      `before: the same reference carrying ${rupees(69_900)} was answered ` +
        `${then.ok ? "\x1b[31mok:true\x1b[0m" : "ok:false"} — "${then.says}" — with nothing sent and ` +
        `nothing logged`,
    );

    const second = await initiateRefund({
      attemptId,
      amountPaise: 69_900,
      actor: { id: null, name: "Manager B" },
      token: shared,
    });
    const { rows, total } = await askedOfPayu(attemptId);
    expect(
      !second.ok && second.error.includes("300.00") && second.error.includes("699.00"),
      `after: it is refused, naming both figures: "${second.ok ? "" : second.error.slice(0, 120)}…"`,
      `after: a reference spent on ${rupees(30_000)} answered a ${rupees(69_900)} submit with ` +
        `${second.ok ? "a success" : `the wrong sentence: ${second.error}`}`,
    );
    expect(
      rows.length === 1 && total === 30_000,
      `and nothing went out on it: one row, ${rupees(total)} asked of PayU`,
      `${rows.length} rows, ${rupees(total)} asked of PayU`,
    );

    // The same thing genuinely concurrent, where neither submit can see the
    // other's row when it starts.
    const race = await seedCapturedPayment();
    const raceState = await refundableForAttempt(race.attemptId);
    const raceToken = raceState?.nextToken ?? "";
    const [low, high] = await Promise.all([
      initiateRefund({
        attemptId: race.attemptId,
        amountPaise: 30_000,
        actor: { id: null, name: "Admin A" },
        token: raceToken,
      }),
      initiateRefund({
        attemptId: race.attemptId,
        amountPaise: 69_900,
        actor: { id: null, name: "Manager B" },
        token: raceToken,
      }),
    ]);
    const raced = await askedOfPayu(race.attemptId);
    report(raced.rows);
    const green = [low, high].filter((answer) => answer.ok);
    expect(
      raced.rows.length === 1 &&
        green.length <= 1 &&
        (green.length === 0 || green[0].refund.amount === raced.rows[0].amount),
      `two concurrent submits on one reference for ${rupees(30_000)} and ${rupees(69_900)}: one row of ` +
        `${rupees(raced.rows[0]?.amount ?? 0)}, and no success reported for an amount that never went out`,
      `${raced.rows.length} row(s), and ${green.length} of the two were told their refund was sent`,
    );
  }

  console.log();
  console.log(
    failures === 0
      ? `\x1b[32mEvery check passed.\x1b[0m${skipped > 0 ? ` \x1b[33m(${skipped} not run — see SKIP above.)\x1b[0m` : ""}`
      : `\x1b[31m${failures} check(s) failed.\x1b[0m`,
  );

  if (!process.env.KEEP) {
    await db.order.deleteMany({ where: { id: { in: seeded } } });
    console.log(`cleaned up ${seeded.length} seeded order(s).`);
  }
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main();
