"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logActivity, requireAdmin, type AdminSession } from "@/lib/auth/admin";
import { formatINR } from "@/lib/utils";
import { sendOrderMail } from "@/services/order-mail";
import { raiseGatewayRefund, refundToken } from "@/services/refunds";
import { statusLabelOf } from "@/components/admin/ui";
import type { ReturnStatus } from "@/generated/prisma/client";
import {
  canTransition,
  isRefundAmountEditable,
  shortReturnId,
} from "@/app/admin/(dashboard)/returns/return-helpers";
import type { FormState } from "./form-state";
import { num, revalidateAdmin, revalidateStorefront, str } from "./shared";

/**
 * Returns & refunds workflow. Status changes are validated against
 * RETURN_TRANSITIONS; the refund step is the only one with side effects
 * (restock + order payment status), so it runs in a transaction.
 */

const RETURNS_BASE = "/admin/returns";

function detailPath(id: string) {
  return `${RETURNS_BASE}/${id}`;
}

/** Everything a return touches: its own pages, the parent order, the customer's account. */
function revalidateReturn(orderId: string) {
  revalidateAdmin("returns");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidateStorefront(["/account/returns"]);
}

/** Row actions carry a `next` field; only admin returns URLs are honoured. */
function safeNext(formData: FormData, id: string) {
  const raw = str(formData, "next");
  return raw.startsWith(RETURNS_BASE) && !raw.includes("//") ? raw : detailPath(id);
}

function withFlash(path: string, message: string, tone: "ok" | "error" = "ok") {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}flash=${encodeURIComponent(message)}${tone === "error" ? "&tone=error" : ""}`;
}

async function loadReturn(id: string) {
  return db.returnRequest.findUnique({
    where: { id },
    include: {
      orderLine: { select: { id: true, title: true, price: true, quantity: true, productId: true } },
      order: { select: { id: true, number: true } },
    },
  });
}

type LoadedReturn = NonNullable<Awaited<ReturnType<typeof loadReturn>>>;

function describe(row: LoadedReturn) {
  return `${row.orderLine.title} (order ${row.order.number}, return ${shortReturnId(row.id)})`;
}

function assertTransition(row: LoadedReturn, to: ReturnStatus): string | null {
  if (canTransition(row.status, to)) return null;
  return `This return is ${statusLabelOf(row.status).toLowerCase()} and cannot be moved to ${statusLabelOf(to).toLowerCase()}. Reload to see the latest state.`;
}

/* ------------------------------ Details ----------------------------- */

/** Refund amount (while still editable) and the internal admin note. */
export async function updateReturnDetails(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const row = await loadReturn(id);
  if (!row) return { error: "This return request no longer exists." };

  const adminNote = str(formData, "adminNote") || null;
  if (adminNote && adminNote.length > 1000) {
    return { error: "Keep the note under 1,000 characters.", field: "adminNote" };
  }

  let refundAmount = row.refundAmount;
  const lineTotal = row.orderLine.price * row.orderLine.quantity;
  if (isRefundAmountEditable(row.status)) {
    if (str(formData, "refundAmount") === "") return { error: "Enter the refund amount.", field: "refundAmount" };
    const amount = num(formData, "refundAmount", Number.NaN);
    if (!Number.isInteger(amount)) return { error: "Refund amount must be a whole rupee value.", field: "refundAmount" };
    if (amount < 1) return { error: "Refund at least ₹1, or reject the return instead.", field: "refundAmount" };
    if (amount > lineTotal) {
      return { error: `Refund cannot exceed the line total of ${formatINR(lineTotal)}.`, field: "refundAmount" };
    }
    refundAmount = amount;
  } else if (formData.has("refundAmount") && num(formData, "refundAmount", row.refundAmount) !== row.refundAmount) {
    return {
      error: `The refund amount is locked once a return is ${statusLabelOf(row.status).toLowerCase()}.`,
      field: "refundAmount",
    };
  }

  if (refundAmount === row.refundAmount && adminNote === (row.adminNote ?? null)) {
    return { ok: true, message: "Nothing to save." };
  }

  await db.returnRequest.update({ where: { id }, data: { refundAmount, adminNote } });
  await logActivity(session, {
    action: "return.update",
    entity: "ReturnRequest",
    entityId: id,
    summary: `Updated return for ${describe(row)}`,
    metadata: { refundAmount, previousRefundAmount: row.refundAmount, noteChanged: adminNote !== (row.adminNote ?? null) },
  });
  revalidateReturn(row.orderId);
  return { ok: true, message: "Saved." };
}

/* ------------------------------ Decision ---------------------------- */

/** Approve or reject a REQUESTED return. The submit button sets `decision`. */
export async function decideReturn(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const decision = str(formData, "decision");
  const note = str(formData, "note");
  if (decision !== "approve" && decision !== "reject") return { error: "Choose whether to approve or reject." };

  const row = await loadReturn(id);
  if (!row) return { error: "This return request no longer exists." };

  const next: ReturnStatus = decision === "approve" ? "APPROVED" : "REJECTED";
  const blocked = assertTransition(row, next);
  if (blocked) return { error: blocked };

  if (next === "REJECTED" && note.length < 5) {
    return { error: "Add a note explaining why the return is being rejected.", field: "note" };
  }
  if (note.length > 1000) return { error: "Keep the note under 1,000 characters.", field: "note" };

  await db.returnRequest.update({
    where: { id },
    data: {
      status: next,
      adminNote: note || row.adminNote,
      resolvedAt: next === "REJECTED" ? new Date() : null,
    },
  });
  await logActivity(session, {
    action: next === "APPROVED" ? "return.approve" : "return.reject",
    entity: "ReturnRequest",
    entityId: id,
    summary: `${next === "APPROVED" ? "Approved" : "Rejected"} return for ${describe(row)}`,
    metadata: { orderId: row.orderId, note: note || null },
  });
  sendOrderMail(row.orderId, next === "APPROVED" ? "return-approved" : "return-rejected");

  revalidateReturn(row.orderId);
  redirect(withFlash(detailPath(id), next === "APPROVED" ? "Return approved — arrange the pickup." : "Return rejected."));
}

/* ---------------------------- Row actions --------------------------- */

/** One-click approve from the list (no note). */
export async function approveReturn(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const next = safeNext(formData, id);

  const row = await loadReturn(id);
  if (!row) redirect(withFlash(RETURNS_BASE, "Return request not found.", "error"));
  const blocked = assertTransition(row, "APPROVED");
  if (blocked) redirect(withFlash(next, blocked, "error"));

  await db.returnRequest.update({ where: { id }, data: { status: "APPROVED" } });
  await logActivity(session, {
    action: "return.approve",
    entity: "ReturnRequest",
    entityId: id,
    summary: `Approved return for ${describe(row)}`,
    metadata: { orderId: row.orderId },
  });
  sendOrderMail(row.orderId, "return-approved");

  revalidateReturn(row.orderId);
  redirect(withFlash(next, `Return for ${row.orderLine.title} approved.`));
}

export async function markReturnPickedUp(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const next = safeNext(formData, id);

  const row = await loadReturn(id);
  if (!row) redirect(withFlash(RETURNS_BASE, "Return request not found.", "error"));
  const blocked = assertTransition(row, "PICKED_UP");
  if (blocked) redirect(withFlash(next, blocked, "error"));

  await db.returnRequest.update({ where: { id }, data: { status: "PICKED_UP" } });
  await logActivity(session, {
    action: "return.picked_up",
    entity: "ReturnRequest",
    entityId: id,
    summary: `Marked return picked up for ${describe(row)}`,
    metadata: { orderId: row.orderId },
  });
  // One email, not two. "Collected" and "back with us" were being sent from
  // the same click, and the second was not yet true at the moment of pickup.
  sendOrderMail(row.orderId, "return-picked-up");

  revalidateReturn(row.orderId);
  redirect(withFlash(next, `${row.orderLine.title} marked as picked up.`));
}

/**
 * PICKED_UP → REFUNDED: raises the real refund, then records it.
 *
 * It used to do only the second half — restock, flip the order to REFUNDED and
 * write a timeline event saying "the refund has been issued" — while no money
 * moved and no Refund row existed. RULE ONE now governs the order: the gateway
 * is asked FIRST, and the database only records what the gateway accepted.
 *
 * The refund goes through `raiseGatewayRefund`, the same door the order page
 * uses, so the row lock inside `initiateRefund` covers both paths and the same
 * money cannot be sent twice. The token is derived from the return's id, so a
 * double-clicked button is one refund rather than two.
 */
export async function refundReturn(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const next = safeNext(formData, id);

  const row = await loadReturn(id);
  if (!row) redirect(withFlash(RETURNS_BASE, "Return request not found.", "error"));
  const blocked = assertTransition(row, "REFUNDED");
  if (blocked) redirect(withFlash(next, blocked, "error"));

  // The money first. Nothing below may claim a refund this did not produce.
  const raised = await raiseGatewayRefund({
    orderId: row.orderId,
    amountRupees: row.refundAmount,
    actor: { id: session.id, name: session.name },
    token: refundToken("return", row.id),
  });

  if (!raised.ok && raised.reason === "refused") {
    // The gateway would not take it. Nothing is recorded, because recording a
    // refund the gateway refused is exactly the lie this rewrite removes.
    redirect(withFlash(next, raised.message, "error"));
  }

  if (!raised.ok) {
    // No gateway capture to reverse — cash on delivery, or a UPI credit taken
    // by hand. The return is marked as owed, not as refunded, and the owner
    // records the transfer themselves from the order page.
    await db.returnRequest.update({ where: { id }, data: { status: "PICKED_UP" } });
    await db.order.update({
      where: { id: row.orderId },
      data: { paymentStatus: "REFUND_DUE" },
    });
    revalidateReturn(row.orderId);
    redirect(
      withFlash(
        next,
        `${raised.message} The order is marked as refund due — send the money and record it on the order.`,
        "error",
      ),
    );
  }

  let outcome: Awaited<ReturnType<typeof settleRefund>>;
  try {
    outcome = await settleRefund(row, session, raised.refundId);
  } catch (error) {
    redirect(withFlash(next, error instanceof Error ? error.message : "The refund could not be completed.", "error"));
  }

  sendOrderMail(row.orderId, "refund-raised");

  await logActivity(session, {
    action: "return.refund",
    entity: "ReturnRequest",
    entityId: id,
    summary: `Refunded ${formatINR(row.refundAmount)} for ${describe(row)}`,
    metadata: {
      orderId: row.orderId,
      refundAmount: row.refundAmount,
      refundMode: row.refundMode,
      restocked: outcome.restocked ? row.orderLine.quantity : 0,
      orderPaymentStatus: outcome.paymentStatus,
      orderReturned: outcome.allRefunded,
    },
  });
  revalidateReturn(row.orderId);

  const parts = [`Refunded ${formatINR(row.refundAmount)} via ${row.refundMode}.`];
  parts.push(
    outcome.restocked
      ? `${row.orderLine.quantity} × ${row.orderLine.title} back in stock.`
      : `${row.orderLine.title} is no longer in the catalogue, so nothing was restocked.`,
  );
  parts.push(
    outcome.allRefunded
      ? `Order ${row.order.number} is now fully refunded and marked returned.`
      : `Order ${row.order.number} marked partially refunded.`,
  );
  redirect(withFlash(next, parts.join(" ")));
}

async function settleRefund(row: LoadedReturn, session: AdminSession, refundId: string) {
  return db.$transaction(async (tx) => {
    const now = new Date();

    // Guard against a double submit racing us to the same row.
    const fresh = await tx.returnRequest.findUnique({ where: { id: row.id }, select: { status: true } });
    if (!fresh || fresh.status !== "PICKED_UP") throw new Error("Return is no longer awaiting a refund.");

    // The return now points at the actual money, which is what stops the order
    // page refunding the same line again.
    await tx.returnRequest.update({
      where: { id: row.id },
      data: { status: "REFUNDED", resolvedAt: now, refundId },
    });

    let restocked = false;
    if (row.orderLine.productId) {
      const product = await tx.product.findUnique({ where: { id: row.orderLine.productId }, select: { id: true } });
      if (product) {
        await tx.product.update({ where: { id: product.id }, data: { stock: { increment: row.orderLine.quantity } } });
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            delta: row.orderLine.quantity,
            reason: "Return refunded",
            reference: row.order.number,
            actorName: session.name,
          },
        });
        restocked = true;
      }
    }

    const order = await tx.order.findUniqueOrThrow({
      where: { id: row.orderId },
      select: {
        id: true,
        lines: { select: { id: true } },
        returns: { select: { orderLineId: true, status: true } },
      },
    });
    const refundedLines = new Set(order.returns.filter((r) => r.status === "REFUNDED").map((r) => r.orderLineId));
    const allRefunded = order.lines.length > 0 && order.lines.every((l) => refundedLines.has(l.id));
    /**
     * RULE ONE. A refund has been RAISED, not completed — PayU has accepted the
     * request and will answer later. `recomputeRefundTotals` moves the order to
     * REFUNDED when the gateway confirms SUCCESS, and only then.
     */
    const paymentStatus = "REFUND_DUE" as const;

    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        ...(allRefunded
          ? {
              status: "RETURNED",
              events: {
                create: {
                  status: "RETURNED",
                  title: "Order returned",
                  description:
                    "Every item was returned and the refund has been raised with the payment gateway. It is confirmed here once the money has actually moved.",
                  location: "WeekendCart returns desk",
                  actorName: session.name,
                  at: now,
                },
              },
            }
          : {}),
      },
    });

    return { restocked, allRefunded, paymentStatus } as const;
  });
}
