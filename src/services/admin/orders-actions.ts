"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import type { OrderStatus } from "@/generated/prisma/client";
import {
  ADVANCE_LABEL,
  canCancel,
  fromDateInput,
  isOrderStatus,
  nextStatus,
} from "@/app/admin/(dashboard)/orders/workflow";
import type { FormState } from "./form-state";
import { revalidateAdmin, str } from "./shared";

/**
 * Order operations. Every status move is validated against the workflow rules
 * rather than trusting the button that was clicked, because a stale tab could
 * post a transition that is no longer legal.
 */

const flash = (id: string, text: string, tone?: "error") =>
  `/admin/orders/${id}?flash=${encodeURIComponent(text)}${tone ? `&tone=${tone}` : ""}`;

/** Storefront surfaces that show this order to the customer. */
function revalidateOrder(orderId: string) {
  revalidateAdmin("orders");
  revalidatePath(`/order/${orderId}`);
  revalidatePath(`/track/${orderId}`);
  revalidatePath("/account/orders");
}

const EVENT_COPY: Record<string, { title: string; description: string }> = {
  CONFIRMED: { title: "Order confirmed", description: "We have received your order." },
  PACKED: { title: "Packed and ready", description: "Your items are packed and handed to the courier." },
  SHIPPED: { title: "Shipped", description: "In transit to your delivery city." },
  OUT_FOR_DELIVERY: { title: "Out for delivery", description: "Arriving today between 10am and 6pm." },
  DELIVERED: { title: "Delivered", description: "Handed over at the door. Thank you for shopping with us." },
};

export async function advanceOrderStatus(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const target = str(formData, "status");

  const order = await db.order.findUnique({ where: { id }, select: { id: true, number: true, status: true, shipCity: true } });
  if (!order) redirect(`/admin/orders?flash=${encodeURIComponent("Order not found")}&tone=error`);

  const allowed = nextStatus(order.status);
  if (!isOrderStatus(target) || target !== allowed) {
    redirect(
      flash(
        id,
        `This order is ${order.status.replace(/_/g, " ").toLowerCase()} and cannot move to ${target.replace(/_/g, " ").toLowerCase()}. Reload and try again.`,
        "error",
      ),
    );
  }

  const copy = EVENT_COPY[target] ?? { title: ADVANCE_LABEL[target] ?? target, description: "" };

  await db.$transaction(async (tx) => {
    // Re-read inside the transaction so two admins cannot double-advance.
    const fresh = await tx.order.findUnique({ where: { id }, select: { status: true } });
    if (!fresh || fresh.status !== order.status) throw new Error("stale");

    await tx.order.update({
      where: { id },
      data: {
        status: target,
        ...(target === "DELIVERED"
          ? { deliveredAt: new Date(), paymentStatus: "PAID" as const }
          : {}),
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: id,
        status: target,
        title: copy.title,
        description: copy.description,
        location: order.shipCity,
        actorName: session.name,
      },
    });
  });

  await logActivity(session, {
    action: `order.${target.toLowerCase()}`,
    entity: "Order",
    entityId: id,
    summary: `Moved order ${order.number} to ${target.replace(/_/g, " ").toLowerCase()}`,
  });
  revalidateOrder(id);
  redirect(flash(id, `${order.number} is now ${target.replace(/_/g, " ").toLowerCase()}`));
}

export async function cancelOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const reason = str(formData, "reason");

  if (reason.length < 4) return { error: "Give a short reason — the customer sees this.", field: "reason" };

  const order = await db.order.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!order) return { error: "Order not found." };
  if (!canCancel(order.status))
    return { error: `A ${order.status.replace(/_/g, " ").toLowerCase()} order cannot be cancelled.` };

  await db.$transaction(async (tx) => {
    const fresh = await tx.order.findUnique({ where: { id }, select: { status: true } });
    if (!fresh || !canCancel(fresh.status)) throw new Error("stale");

    await tx.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
        // A paid order owes a refund; an unpaid COD order simply never collects.
        paymentStatus: order.paymentStatus === "PAID" ? "REFUNDED" : "FAILED",
      },
    });

    // Put every unit back on the shelf.
    for (const line of order.lines) {
      if (!line.productId) continue;
      await tx.product.update({
        where: { id: line.productId },
        data: {
          stock: { increment: line.quantity },
          soldCount: { decrement: line.quantity },
        },
      });
      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          delta: line.quantity,
          reason: "Order cancelled",
          reference: order.number,
          actorName: session.name,
        },
      });
    }

    await tx.orderEvent.create({
      data: {
        orderId: id,
        status: "CANCELLED",
        title: "Order cancelled",
        description: reason,
        location: order.shipCity,
        actorName: session.name,
      },
    });
  });

  await logActivity(session, {
    action: "order.cancel",
    entity: "Order",
    entityId: id,
    summary: `Cancelled order ${order.number}`,
    metadata: { reason, restocked: order.lines.length },
  });
  revalidateOrder(id);
  redirect(flash(id, `${order.number} cancelled and stock returned`));
}

export async function setShipment(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const courier = str(formData, "courier");
  const awb = str(formData, "awb");
  const etaRaw = str(formData, "estimatedDelivery");
  const eta = fromDateInput(etaRaw);

  if (etaRaw && !eta) return { error: "That delivery date is not valid.", field: "estimatedDelivery" };
  if (awb && awb.length < 4) return { error: "An AWB should be at least 4 characters.", field: "awb" };

  const order = await db.order.findUnique({ where: { id }, select: { number: true } });
  if (!order) return { error: "Order not found." };

  await db.order.update({
    where: { id },
    data: {
      courier: courier || null,
      awb: awb || null,
      ...(eta ? { estimatedDelivery: eta } : {}),
    },
  });

  await logActivity(session, {
    action: "order.shipment",
    entity: "Order",
    entityId: id,
    summary: `Updated shipment details on ${order.number}`,
    metadata: { courier, awb },
  });
  revalidateOrder(id);
  return { ok: true, message: "Shipment updated." };
}

export async function addOrderEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const title = str(formData, "title");
  const description = str(formData, "description");
  const location = str(formData, "location");

  if (title.length < 3) return { error: "Give the update a short title.", field: "title" };

  const order = await db.order.findUnique({ where: { id }, select: { number: true, status: true, shipCity: true } });
  if (!order) return { error: "Order not found." };

  await db.orderEvent.create({
    data: {
      orderId: id,
      status: order.status,
      title,
      description,
      location: location || order.shipCity,
      actorName: session.name,
    },
  });

  await logActivity(session, {
    action: "order.event",
    entity: "Order",
    entityId: id,
    summary: `Added tracking update “${title}” to ${order.number}`,
  });
  revalidateOrder(id);
  return { ok: true, message: "Update added to the timeline." };
}

export async function setAdminNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("STAFF");
  const id = str(formData, "id");
  const note = str(formData, "adminNote");

  const order = await db.order.findUnique({ where: { id }, select: { number: true } });
  if (!order) return { error: "Order not found." };

  await db.order.update({ where: { id }, data: { adminNote: note || null } });
  await logActivity(session, {
    action: "order.note",
    entity: "Order",
    entityId: id,
    summary: `Updated the internal note on ${order.number}`,
  });
  revalidateAdmin("orders");
  return { ok: true, message: "Note saved." };
}

export async function markCodPaid(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");

  const order = await db.order.findUnique({
    where: { id },
    select: { number: true, paymentMethod: true, paymentStatus: true },
  });
  if (!order) redirect(`/admin/orders?flash=${encodeURIComponent("Order not found")}&tone=error`);
  if (order.paymentMethod !== "COD" || order.paymentStatus === "PAID") {
    redirect(flash(id, "This order is not an unpaid Cash on Delivery order.", "error"));
  }

  await db.order.update({ where: { id }, data: { paymentStatus: "PAID" } });
  await logActivity(session, {
    action: "order.cod_paid",
    entity: "Order",
    entityId: id,
    summary: `Marked ${order.number} as cash collected`,
  });
  revalidateOrder(id);
  redirect(flash(id, `Cash collected for ${order.number}`));
}

export type { OrderStatus };
