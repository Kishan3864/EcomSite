"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import { sendOrderMail } from "@/services/order-mail";
import { BUSINESS, formatAddress } from "@/config/business";
import { DelhiveryError, createShipment, delhiveryConfig, requestPickup } from "@/lib/shipping/delhivery";
import { syncTracking } from "@/lib/shipping/tracking";
import type { FormState } from "./form-state";
import { revalidateAdmin, str } from "./shared";

/**
 * The courier, from the admin panel: book a shipment, ask for a pickup, pull
 * the latest tracking.
 *
 * Booking is the one that matters. It turns an order into a waybill, writes
 * the waybill onto the order, records the booking on the customer's timeline,
 * and moves a confirmed order to packed — the same things an owner used to
 * type in by hand after booking on Delhivery's own site.
 */

const NOT_CONFIGURED =
  "Delhivery is not connected. Set DELHIVERY_ENV, DELHIVERY_API_TOKEN and DELHIVERY_PICKUP_LOCATION in .env and reload the app.";

/** Assumed when a product has no weight of its own. */
const DEFAULT_WEIGHT_GRAMS = 1000;
/** One standard carton, in cm. Delhivery bills by the greater of real and volumetric weight. */
const DEFAULT_BOX_CM = { length: 30, width: 25, height: 20 };

function revalidateOrder(orderId: string) {
  revalidateAdmin("orders");
  revalidatePath(`/order/${orderId}`);
  revalidatePath(`/track/${orderId}`);
  revalidatePath("/account/orders");
}

/**
 * Delhivery's refusals in words the owner can act on.
 *
 * Their raw messages are written for whoever wrote their API — long, doubled
 * up, and ending in "contact client.support@delhivery.com" for things the
 * owner can fix in a minute. The common ones are named here; anything else is
 * passed through whole, because a message we do not recognise is more useful
 * than one we have flattened.
 */
const KNOWN_FAILURES: [RegExp, string][] = [
  [
    /insufficient\s+balance|prepaid client manifest charge/i,
    "Your Delhivery wallet is empty, so they would not create the shipment. Add money in Delhivery One → Finances → Wallet, then press Book again. Nothing was charged and the order is unchanged.",
  ],
  [
    /(warehouse|pickup location).*(not|does not) exist|client warehouse/i,
    "Delhivery does not recognise the pickup location name. It must match Delhivery One → Settings → Pickup Locations letter for letter — check DELHIVERY_PICKUP_LOCATION in .env.",
  ],
  [
    /non[- ]?serviceable|not serviceable|pin.*not serviced/i,
    "Delhivery does not deliver to this pincode. The order can still be sent another way — enter that courier and its tracking number below.",
  ],
  [
    /phone|mobile/i,
    "Delhivery rejected the phone number on this order. It needs a plain 10-digit Indian mobile — fix it on the order and book again.",
  ],
  [
    /already exists|duplicate/i,
    "Delhivery already has a shipment against this order number. Check Orders & Pickups on Delhivery One: if a waybill was created, type it into the AWB field below; if not, contact their support.",
  ],
];

const courierMessage = (error: unknown) => {
  if (!(error instanceof DelhiveryError)) {
    return "Delhivery could not be reached. Nothing was booked — try again in a moment.";
  }
  const known = KNOWN_FAILURES.find(([pattern]) => pattern.test(error.message));
  return known ? known[1] : `Delhivery: ${error.message}`;
};

export async function bookShipment(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");

  const config = delhiveryConfig();
  if (!config) return { error: NOT_CONFIGURED };

  const order = await db.order.findUnique({
    where: { id },
    include: { lines: { include: { product: { select: { weightGrams: true } } } } },
  });
  if (!order) return { error: "Order not found." };
  if (order.awb) return { error: `${order.number} already has waybill ${order.awb}.` };
  if (order.status === "CANCELLED" || order.status === "RETURNED") {
    return { error: `${order.number} is ${order.status.toLowerCase()} and cannot be shipped.` };
  }
  if (order.paymentMethod !== "COD" && order.paymentStatus !== "PAID") {
    return { error: `${order.number} is not paid yet. Book the shipment once the payment is in.` };
  }

  const quantity = order.lines.reduce((n, l) => n + l.quantity, 0);
  const weightGrams = Math.max(
    100,
    order.lines.reduce((g, l) => g + l.quantity * (l.product?.weightGrams ?? DEFAULT_WEIGHT_GRAMS), 0),
  );
  const seller = BUSINESS.address;

  let waybill: string;
  try {
    ({ waybill } = await createShipment(config, {
      orderNumber: order.number,
      invoiceNumber: order.invoiceNumber ?? order.number,
      paymentMode: order.paymentMethod === "COD" ? "COD" : "Prepaid",
      codAmountRupees: order.paymentMethod === "COD" ? order.total : 0,
      totalRupees: order.total,
      productsDescription: order.lines.map((l) => `${l.title} x${l.quantity}`).join(", "),
      hsnCode: order.lines[0]?.hsnCode ?? "",
      quantity,
      weightGrams,
      ...DEFAULT_BOX_CM,
      consignee: {
        name: order.shipName || order.contactName,
        phone: order.shipPhone || order.contactPhone,
        address: [order.shipLine1, order.shipLine2, order.shipLandmark].filter(Boolean).join(", "),
        city: order.shipCity,
        state: order.shipState,
        pincode: order.shipPincode,
      },
      seller: {
        name: BUSINESS.legalName,
        phone: BUSINESS.supportPhone,
        address: formatAddress(),
        city: seller.city,
        state: seller.state,
        pincode: seller.postalCode,
      },
    }));
  } catch (error) {
    console.error("[shipping] book", order.number, error instanceof Error ? error.message : error);
    return { error: courierMessage(error) };
  }

  await db.$transaction([
    db.order.update({
      where: { id },
      data: {
        courier: "Delhivery",
        awb: waybill,
        ...(order.status === "CONFIRMED" ? { status: "PACKED" } : {}),
      },
    }),
    db.orderEvent.create({
      data: {
        orderId: id,
        status: "PACKED",
        title: "Packed and booked with Delhivery",
        description: `Waybill ${waybill}. Waiting for the courier to collect it.`,
        location: seller.city,
        actorName: session.name,
      },
    }),
  ]);

  await logActivity(session, {
    action: "order.shipment.book",
    entity: "Order",
    entityId: id,
    summary: `Booked ${order.number} with Delhivery (${config.env}) — waybill ${waybill}`,
    metadata: { waybill, env: config.env, weightGrams },
  });
  // The waybill exists now, so "shipped" is true rather than intended.
  sendOrderMail(id, "shipped");

  revalidateOrder(id);
  return { ok: true, message: `Booked with Delhivery — waybill ${waybill}.` };
}

export async function requestDelhiveryPickup(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const date = str(formData, "date");

  const config = delhiveryConfig();
  if (!config) return { error: NOT_CONFIGURED };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Choose a pickup date.", field: "date" };
  if (date < new Date().toISOString().slice(0, 10)) return { error: "That date has passed.", field: "date" };

  const order = await db.order.findUnique({ where: { id }, select: { number: true, awb: true, courier: true } });
  if (!order?.awb || order.courier !== "Delhivery") return { error: "Book the shipment first, then request a pickup." };

  let pickupId: string | number | null;
  try {
    ({ pickupId } = await requestPickup(config, { date, time: "14:00:00", expectedPackages: 1 }));
  } catch (error) {
    console.error("[shipping] pickup", order.number, error instanceof Error ? error.message : error);
    return { error: courierMessage(error) };
  }

  await db.orderEvent.create({
    data: {
      orderId: id,
      status: "PACKED",
      title: "Courier pickup requested",
      description: `Delhivery will collect the parcel on ${date}${pickupId ? ` (pickup ref ${pickupId})` : ""}.`,
      location: BUSINESS.address.city,
      actorName: session.name,
    },
  });
  await logActivity(session, {
    action: "order.shipment.pickup",
    entity: "Order",
    entityId: id,
    summary: `Requested a Delhivery pickup for ${order.number} on ${date}`,
    metadata: { date, pickupId },
  });
  revalidateOrder(id);
  return { ok: true, message: `Pickup requested for ${date}.` };
}

export async function refreshTracking(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!delhiveryConfig()) return { error: NOT_CONFIGURED };

  const tracking = await syncTracking(id, { force: true });
  revalidateOrder(id);
  if (!tracking) return { error: "No tracking came back from Delhivery. Check the waybill, or try again in a moment." };
  return {
    ok: true,
    message: `${tracking.status || "No status yet"}${tracking.location ? ` — ${tracking.location}` : ""}${tracking.at ? ` (${tracking.at})` : ""}`,
  };
}
