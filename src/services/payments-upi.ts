"use server";

import { revalidatePath } from "next/cache";
import { BUSINESS } from "@/config/business";
import { db } from "@/lib/db";
import { canViewOrder } from "@/lib/auth/customer";
import { sendMail } from "@/lib/mail";
import { normaliseUtr, upiConfig } from "@/lib/payments/upi";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formatINR } from "@/lib/utils";

/**
 * The customer's half of a UPI payment: they pay from their own app, then tell
 * us the reference number their app gave them.
 *
 * Saying so does not make the order paid. It moves the order to VERIFYING and
 * tells the owner to look at the bank. Twelve digits typed into a form are a
 * claim, not money, and this module never treats them as more than that — the
 * only place an order becomes PAID is the admin panel, after a human has seen
 * the credit.
 */

export interface UpiFormState {
  ok?: boolean;
  error?: string;
}

export async function submitUpiReference(
  _prev: UpiFormState,
  formData: FormData,
): Promise<UpiFormState> {
  const orderId = String(formData.get("orderId") ?? "");
  const utr = normaliseUtr(String(formData.get("utr") ?? ""));

  if (!utr) {
    return {
      error:
        "That does not look like a UPI reference. It is exactly 12 digits — look for “UTR”, “UPI transaction ID” or “Reference no.” in your payment app.",
    };
  }

  if (!rateLimit("upi:submit", await clientIp(), 20, 10 * 60_000)) {
    return { error: "Too many attempts just now. Wait a few minutes and try again." };
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      total: true,
      customerId: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      shipCity: true,
    },
  });
  if (!order) return { error: "We could not find that order." };
  if (!(await canViewOrder(order))) return { error: "We could not find that order." };
  if (order.paymentMethod !== "UPI") return { error: "This order is not being paid by UPI." };
  if (order.paymentStatus === "PAID") return { ok: true };
  if (order.status === "CANCELLED") {
    return { error: "This order was cancelled. If you have already paid, contact us and we will refund it." };
  }

  // The same reference on a different order means one of the two is wrong, and
  // confirming either would be confirming a payment that was never made twice.
  const reused = await db.order.findFirst({
    where: { paymentRef: utr, id: { not: order.id } },
    select: { number: true },
  });
  if (reused) {
    return {
      error: `That reference is already on order ${reused.number}. Check the number in your payment app, or contact us on ${BUSINESS.supportPhone}.`,
    };
  }

  await db.$transaction([
    db.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "VERIFYING",
        paymentRef: utr,
        paymentDetail: "UPI · awaiting confirmation",
      },
    }),
    db.orderEvent.create({
      data: {
        orderId: order.id,
        status: "PENDING",
        title: "Payment reported",
        description: `UPI reference ${utr}. We are checking it against our bank — you will get an email the moment it is confirmed.`,
        location: order.shipCity,
      },
    }),
  ]);

  // The owner has to act on this, so it goes out immediately rather than
  // waiting for them to open the admin panel. A mail that cannot be sent does
  // not fail the submission — the order is already in the verify queue.
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/orders/${order.id}`;
  void sendMail({
    to: BUSINESS.supportEmail,
    subject: `Payment to confirm — ${order.number} · ${formatINR(order.total)}`,
    text: `${order.contactName} says they have paid ${formatINR(order.total)} for ${order.number}.

UPI reference (UTR): ${utr}
Phone: ${order.contactPhone}
Email: ${order.contactEmail}

Check ${utr} for ${formatINR(order.total)} in your bank or UPI app, then confirm or reject it here:
${url}

Nothing is dispatched until you confirm.`,
    html: `<p><strong>${order.contactName}</strong> says they have paid <strong>${formatINR(order.total)}</strong> for <strong>${order.number}</strong>.</p>
<p>UPI reference (UTR): <strong style="font-family:monospace;font-size:16px">${utr}</strong><br>
Phone: ${order.contactPhone}<br>Email: ${order.contactEmail}</p>
<p>Check <strong>${utr}</strong> for <strong>${formatINR(order.total)}</strong> in your bank or UPI app, then confirm or reject it:</p>
<p><a href="${url}" style="background:#0a0c0b;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px">Open the order</a></p>
<p style="color:#676d69">Nothing is dispatched until you confirm.</p>`,
  }).catch(() => {});

  revalidatePath(`/order/${order.id}`);
  revalidatePath("/account/orders");
  return { ok: true };
}

/** Where the payment has reached, for the page to poll while the owner checks. */
export async function upiPaymentStatus(
  orderId: string,
): Promise<"pending" | "verifying" | "paid" | "cancelled" | "unknown"> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, customerId: true, paymentStatus: true, status: true },
  });
  if (!order || !(await canViewOrder(order))) return "unknown";
  if (order.paymentStatus === "PAID") return "paid";
  if (order.status === "CANCELLED") return "cancelled";
  if (order.paymentStatus === "VERIFYING") return "verifying";
  return "pending";
}

/** True when the shop can take UPI at all — the page says so plainly if not. */
export async function upiAvailable(): Promise<boolean> {
  return upiConfig() !== null;
}
