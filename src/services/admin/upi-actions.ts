"use server";

import { revalidatePath } from "next/cache";
import { BUSINESS } from "@/config/business";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import { sendMail } from "@/lib/mail";
import { formatINR } from "@/lib/utils";
import type { FormState } from "./form-state";
import { revalidateAdmin, str } from "./shared";

/**
 * The owner's half of a UPI payment: they have looked at the bank, and they
 * say whether the money is there.
 *
 * This is the only place a UPI order becomes paid. The customer's twelve
 * digits move an order into the queue; a human moves it out. Confirming is
 * therefore written to be slow to reach and impossible to do by accident —
 * it needs a manager, and it names the amount it is confirming.
 */

function revalidateOrder(orderId: string) {
  revalidateAdmin("orders");
  revalidatePath(`/admin/payments`);
  revalidatePath(`/order/${orderId}`);
  revalidatePath(`/track/${orderId}`);
  revalidatePath("/account/orders");
}

export async function confirmUpiPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");

  const order = await db.order.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      total: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      paymentRef: true,
      contactName: true,
      contactEmail: true,
      shipCity: true,
      lines: { select: { productId: true, quantity: true } },
    },
  });
  if (!order) return { error: "Order not found." };
  if (order.paymentMethod !== "UPI") return { error: `${order.number} is not a UPI order.` };
  if (order.paymentStatus === "PAID") return { ok: true, message: `${order.number} is already marked paid.` };
  if (!order.paymentRef) return { error: "No UPI reference on this order yet — the customer has not reported a payment." };

  // A cancelled order whose money did arrive is honoured rather than stranded,
  // and the stock it released is taken back — the same rule the gateway path
  // follows in payment-core.ts.
  const revived = order.status === "CANCELLED";

  await db.$transaction(async (tx) => {
    if (revived) {
      for (const line of order.lines) {
        if (!line.productId) continue;
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity }, soldCount: { increment: line.quantity } },
        });
      }
    }

    await tx.order.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentDetail: `UPI · ${order.paymentRef}`,
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: id,
        status: "CONFIRMED",
        title: "Payment confirmed",
        description: revived
          ? `UPI ${order.paymentRef} checked against the bank by ${session.name}. Arrived after the order had lapsed; stock was re-reserved — check availability before dispatch.`
          : `UPI ${order.paymentRef}, checked against the bank by ${session.name}.`,
        location: order.shipCity,
        actorName: session.name,
      },
    });
  });

  await logActivity(session, {
    action: "order.payment.upi.confirm",
    entity: "Order",
    entityId: id,
    summary: `Confirmed UPI payment of ${formatINR(order.total)} on ${order.number} (UTR ${order.paymentRef})`,
    metadata: { utr: order.paymentRef, amount: order.total, revived },
  });

  void sendMail({
    to: order.contactEmail,
    subject: `Payment received — order ${order.number}`,
    text: `Hello ${order.contactName},

We have received your payment of ${formatINR(order.total)} for order ${order.number}. It is confirmed and we are getting it packed.

You can follow it here: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/track/${order.id}

Thank you,
${BUSINESS.brandName}`,
    html: `<p>Hello ${order.contactName},</p>
<p>We have received your payment of <strong>${formatINR(order.total)}</strong> for order <strong>${order.number}</strong>. It is confirmed and we are getting it packed.</p>
<p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/track/${order.id}">Track your order</a></p>
<p>Thank you,<br>${BUSINESS.brandName}</p>`,
  }).catch(() => {});

  revalidateOrder(id);
  return { ok: true, message: `${order.number} marked paid — ${formatINR(order.total)}.` };
}

export async function rejectUpiPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const reason = str(formData, "reason").trim();

  if (reason.length < 4) return { error: "Say why — the customer sees this.", field: "reason" };

  const order = await db.order.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      paymentMethod: true,
      paymentStatus: true,
      paymentRef: true,
      contactName: true,
      contactEmail: true,
      shipCity: true,
    },
  });
  if (!order) return { error: "Order not found." };
  if (order.paymentStatus === "PAID") return { error: `${order.number} is already paid — cancel and refund it instead.` };

  const rejected = order.paymentRef;

  // Back to unpaid, not cancelled: the usual reason is a mistyped reference,
  // and the customer can simply send the right one. The order and its stock
  // stay exactly where they were.
  await db.$transaction([
    db.order.update({
      where: { id },
      data: { paymentStatus: "PENDING", paymentRef: null, paymentDetail: "UPI · not yet received" },
    }),
    db.orderEvent.create({
      data: {
        orderId: id,
        status: "PENDING",
        title: "Payment not found",
        description: `${reason} Please check the reference and send it again, or pay once more — order ${order.number}.`,
        location: order.shipCity,
        actorName: session.name,
      },
    }),
  ]);

  await logActivity(session, {
    action: "order.payment.upi.reject",
    entity: "Order",
    entityId: id,
    summary: `Rejected UPI reference ${rejected ?? "—"} on ${order.number}: ${reason}`,
    metadata: { utr: rejected, reason },
  });

  void sendMail({
    to: order.contactEmail,
    subject: `We could not find your payment — order ${order.number}`,
    text: `Hello ${order.contactName},

We checked our bank for order ${order.number} and could not find the payment.

${reason}

Please open your order and send the correct UPI reference, or pay again:
${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/checkout/upi/${order.id}

If you believe the money has left your account, reply to this email or call ${BUSINESS.supportPhone} and we will trace it.

${BUSINESS.brandName}`,
    html: `<p>Hello ${order.contactName},</p>
<p>We checked our bank for order <strong>${order.number}</strong> and could not find the payment.</p>
<p>${reason}</p>
<p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/checkout/upi/${order.id}">Send the correct reference, or pay again</a></p>
<p>If you believe the money has left your account, reply to this email or call ${BUSINESS.supportPhone} and we will trace it.</p>
<p>${BUSINESS.brandName}</p>`,
  }).catch(() => {});

  revalidateOrder(id);
  return { ok: true, message: `Reference cleared on ${order.number}. The customer has been told.` };
}
