"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  canViewOrder,
  getCustomerSession,
  registerCustomer,
  rememberGuestOrder,
  signInCustomer,
  signOutCustomer,
} from "@/lib/auth/customer";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { findResetToken, issueResetToken, redeemResetToken } from "@/lib/auth/password-reset";
import { buildPasswordResetEmail, resetUrl } from "@/lib/emails/password-reset";
import type { Address, CartLine, DeliverySpeed, PaymentMethodId } from "@/lib/types";
import { computeTotals } from "@/lib/pricing";
import {
  financialYear,
  gstinState,
  invoiceNumberFor,
  stateCode,
  taxOnOrder,
  toPaise,
} from "@/lib/gst";
import { safeNextPath } from "@/lib/auth/oauth";
import { lookupOrder } from "./orders";
import { getSettings } from "./settings";
import { visibleProducts } from "./visibility";
import { clientIp, rateLimit, TOO_MANY } from "@/lib/rate-limit";
import {
  COOLDOWN_MS,
  LIMITS,
  cooldownFor,
  cooldownMessage,
  describeSender,
  isBlocked,
  isLinkSpam,
  logAbuse,
  overDailyCap,
  verifyFormToken,
} from "@/lib/contact-guard";
import { buildContactAck } from "@/lib/emails/contact-ack";
import { CONTACT_NOTIFY_TO, buildContactAdminEmail } from "@/lib/emails/contact-admin";
import { upiConfigured } from "@/lib/payments/upi";
import { expireStalePendingOrders, trimUnpaidOrders } from "./order-expiry";
import { reviewEligibilityFor, type ReviewEligibility } from "./reviews";
import { after } from "next/server";
import { mailConfigured, sendMail } from "@/lib/mail";
import { sendOrderConfirmation } from "./order-email";
import { buildWelcomeEmail } from "@/lib/emails/welcome";

/**
 * Everything the storefront writes goes through here. Prices and stock
 * rules are recomputed from the database on every call — the client is only
 * ever a suggestion.
 */

export type { ReviewEligibility } from "./reviews";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; field?: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const PHONE = /^(\+91[\s-]?)?[6-9]\d{9}$/;

/* ----------------------------- Orders ------------------------------ */

export interface PlaceOrderInput {
  lines: CartLine[];
  contact: { name: string; email: string; phone: string };
  address: Address;
  deliveryId: DeliverySpeed;
  deliveryDate?: string | null;
  giftWrap: boolean;
  buyerGstin?: string | null;
  paymentMethod: PaymentMethodId;
  paymentDetail?: string | null;
}

const INVOICE_PREFIX = "WKC";

/** Delivery is SAC 9968, taxed at 18% — the invoice bills it the same way. */
const DELIVERY_TAX_RATE = 18;

async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const count = await tx.order.count({ where: { number: { startsWith: `WKC-${year}-` } } });
  // Sequential and human-readable; a collision under concurrent checkouts is
  // caught by the unique index and retried by the caller.
  return `WKC-${year}-${String(5000 + count + 1).padStart(6, "0")}`;
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient, at: Date) {
  // One consecutive series per financial year, so the count is scoped to this
  // year's prefix — the backfilled numbers carry the same shape and are counted
  // with it. Concurrent checkouts that count the same total both try to insert
  // the same number: the unique index rejects the loser with P2002, and the
  // caller's retry counts again, now seeing the committed row.
  const { label } = financialYear(at);
  const count = await tx.order.count({
    where: { invoiceNumber: { startsWith: `${INVOICE_PREFIX}/${label}/` } },
  });
  return invoiceNumberFor(at, count + 1, INVOICE_PREFIX);
}

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<ActionResult<{ orderId: string; number: string }>> {
  // Orders belong to an account: it is where tracking, invoices and returns
  // live, so there is nowhere to put an order placed without one.
  const session = await getCustomerSession();
  if (!session)
    return {
      ok: false,
      error: "Create an account or sign in to place this order. Nothing you have entered is lost.",
      field: "account",
    };

  if (!rateLimit("order:place", session.id, 8, 10 * 60_000)) return { ok: false, error: TOO_MANY };

  // Writing an order takes its stock off the shelf, so unpaid online orders are
  // a way to hold stock nobody else can buy. Release the lapsed ones first.
  await expireStalePendingOrders();
  // A customer placing a fresh order has abandoned any of their own that never
  // reached a payment window — most often because the gateway could not be
  // reached at the time. Those are released after two minutes rather than
  // forty-five, so a retry is never refused for the earlier attempt's sake. A
  // payment that lands late on a released order revives it.
  await expireStalePendingOrders({ customerId: session.id, olderThanMinutes: 2 });
  // A UPI order gets half a day before it is released — there is no payment
  // window to close, and the customer may pay from another phone hours later.
  await expireStalePendingOrders({ method: "UPI" });
  // Past a handful of unpaid orders, release this customer's oldest instead of
  // refusing them a new one. Stock is what needs bounding, not the person —
  // and on a shop whose UPI orders stay open for twelve hours, counting them
  // and saying no locked people out of buying anything at all.
  await trimUnpaidOrders(session.id);

  if (!input.lines?.length) return { ok: false, error: "Your bag is empty." };
  if (!input.contact?.name?.trim()) return { ok: false, error: "Contact name is required.", field: "name" };
  if (!EMAIL.test(input.contact.email ?? "")) return { ok: false, error: "Enter a valid email.", field: "email" };
  if (!PHONE.test((input.contact.phone ?? "").replace(/\s/g, "")))
    return { ok: false, error: "Enter a valid Indian mobile number.", field: "phone" };
  if (!input.address?.line1 || !/^\d{6}$/.test(input.address.pincode ?? ""))
    return { ok: false, error: "Delivery address is incomplete." };

  const settings = await getSettings();

  // Re-price every line from the catalogue.
  //
  // No top-level `select`, so the whole Product row is loaded — `supplierId`
  // included. Nothing here serialises it: the rows are read field by field
  // below, and the `...line` in `priced.push` spreads the CLIENT's CartLine,
  // not the product. Keep it that way — spreading a product row into a
  // CartLine would put the wholesaler on the checkout payload.
  const products = await db.product.findMany({
    // The storefront rule, not status alone: a product in a hidden category or
    // collection cannot be bought either, however it got into the bag.
    where: visibleProducts({ id: { in: input.lines.map((l) => l.productId) } }),
    include: {
      variantGroups: { include: { options: true } },
      category: { select: { defaultHsnCode: true, defaultTaxRate: true } },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const priced: (CartLine & { hsnCode: string | null; taxRate: number })[] = [];
  for (const line of input.lines) {
    const product = byId.get(line.productId);
    if (!product) return { ok: false, error: `${line.title} is no longer available.` };
    if (product.stock < line.quantity)
      return {
        ok: false,
        error:
          product.stock === 0
            ? `${product.title} just sold out.`
            : `Only ${product.stock} of ${product.title} left.`,
      };

    const chosen = new Set((line.variantKey ?? "").split("|").filter(Boolean));
    let delta = 0;
    for (const group of product.variantGroups) {
      const option = group.options.find((o) => chosen.has(o.value));
      if (option) delta += option.priceDelta;
    }

    priced.push({
      ...line,
      title: product.title,
      price: product.price + delta,
      mrp: product.mrp + delta,
      stock: product.stock,
      deliveryDays: product.deliveryDays,
      freeShipping: product.freeShipping,
      categorySlug: line.categorySlug,
      // Resolved now and frozen onto the line: the invoice has to reprint the
      // same rate years later, whatever the product or the shop is set to then.
      // A missing HSN is legitimate — a rate is not, so Settings backs it.
      hsnCode: product.hsnCode ?? product.category.defaultHsnCode ?? null,
      taxRate: product.taxRate ?? product.category.defaultTaxRate ?? settings.tax.gstRate,
    });
  }


  const speed = input.deliveryId ?? "standard";
  const delivery = {
    id: speed,
    name: speed === "express" ? "Express delivery" : speed === "scheduled" ? "Pick your day" : "Standard delivery",
    description: "",
    price:
      speed === "express"
        ? settings.shipping.expressFee
        : speed === "scheduled"
          ? settings.shipping.scheduledFee
          : 0,
    minDays: speed === "express" ? settings.shipping.expressDays[0] : settings.shipping.standardDays[0],
    maxDays: speed === "express" ? settings.shipping.expressDays[1] : settings.shipping.standardDays[1],
  };
  const totals = computeTotals(priced, {
    delivery,
    rates: {
      freeThreshold: settings.shipping.freeThreshold,
      standardFee: settings.shipping.standardFee,
      gstRate: settings.tax.gstRate,
    },
  });

  // Three ways to pay: UPI straight into the shop's own bank account, the
  // gateway, or cash on delivery. Older drafts saved in a browser may still say
  // "card" or "netbanking"; those were always going to the gateway, so they are
  // read as online rather than rejected.
  const GATEWAY_IDS = ["online", "card", "netbanking", "wallet"];
  const isUpi = input.paymentMethod === "upi";
  if (input.paymentMethod !== "cod" && !isUpi && !GATEWAY_IDS.includes(input.paymentMethod))
    return { ok: false, error: "Choose how you would like to pay.", field: "payment" };

  if (isUpi && !upiConfigured())
    return { ok: false, error: "UPI is not available just now. Choose another way to pay.", field: "payment" };

  // Cash on delivery has three ways of not being allowed, and the customer is
  // told which. The prepaid-only check reads the catalogue, not the cart: the
  // browser's copy of a line is a suggestion, and a product can be switched to
  // prepaid-only between filling a bag and paying for it.
  if (input.paymentMethod === "cod") {
    if (!settings.payments.cod)
      return { ok: false, error: "Cash on delivery is not being offered at the moment.", field: "payment" };
    if (totals.total > settings.payments.codLimit)
      return {
        ok: false,
        error: `Cash on delivery is available on orders up to ₹${settings.payments.codLimit.toLocaleString("en-IN")}.`,
        field: "payment",
      };
    const prepaidOnly = priced.find((line) => byId.get(line.productId)?.codAvailable === false);
    if (prepaidOnly)
      return {
        ok: false,
        error: `${prepaidOnly.title} is prepaid only, so this order cannot be sent cash on delivery.`,
        field: "payment",
      };
  }

  const slowest = priced.reduce((m, l) => Math.max(m, l.deliveryDays), 1);
  const eta = new Date();
  eta.setDate(eta.getDate() + Math.max(delivery.maxDays, slowest));
  const scheduled = input.deliveryDate ? new Date(input.deliveryDate) : null;
  const estimatedDelivery = speed === "scheduled" && scheduled ? scheduled : eta;

  // Gateway orders are written as ONLINE and narrowed to what was actually
  // used once the gateway reports it. A UPI order is UPI from the start: there
  // is no gateway to narrow it, only a bank credit to match.
  const method: "ONLINE" | "COD" | "UPI" =
    input.paymentMethod === "cod" ? "COD" : isUpi ? "UPI" : "ONLINE";
  const email = input.contact.email.toLowerCase().trim();
  // A business buyer claiming input credit must have their GSTIN on the invoice;
  // anything that is not one is dropped rather than printed as fact.
  const gstin = (input.buyerGstin ?? "").trim().toUpperCase();
  const buyerGstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/.test(gstin) ? gstin : null;

  // The tax stored on the order is the same figure the invoice will print, from
  // the same helper: two ways of arriving at it is one way too many on a
  // document the customer can be asked to produce for a refund or a tax claim.
  const sellerStateCode = gstinState(settings.store.gstin);
  const placeCode = stateCode(input.address.state);
  const taxSummary = taxOnOrder({
    items: priced.map((l) => ({
      amountPaise: toPaise(l.price * l.quantity),
      ratePercent: l.taxRate,
    })),
    discountPaise: 0,
    shipping:
      totals.shipping > 0
        ? { amountPaise: toPaise(totals.shipping), ratePercent: DELIVERY_TAX_RATE }
        : null,
    interState: sellerStateCode !== placeCode,
    inclusive: true,
  });
  // Stored in whole rupees like every other money column on the order.
  const taxRupees = Math.round(taxSummary.totals.tax / 100);

  let created: { id: string; number: string } | null = null;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    try {
      created = await db.$transaction(async (tx) => {
        const number = await nextOrderNumber(tx);
        const invoicedAt = new Date();
        const invoiceNumber = await nextInvoiceNumber(tx, invoicedAt);
        const order = await tx.order.create({
          data: {
            number,
            customerId: session.id,
            contactName: input.contact.name.trim(),
            contactEmail: email,
            contactPhone: input.contact.phone.trim(),
            // An online order is not confirmed until the gateway says the money
            // arrived. It is written PENDING here and moved to PAID by
            // src/services/payments.ts, from the webhook. Marking it PAID at
            // creation would confirm every abandoned checkout as a sale.
            status: method === "COD" ? "CONFIRMED" : "PENDING",
            paymentStatus: method === "COD" ? "COD_PENDING" : "PENDING",
            paymentMethod: method,
            paymentDetail: input.paymentDetail ?? null,
            // Filled with the gateway's payment id once one exists.
            paymentRef: null,
            deliverySpeed: speed.toUpperCase() as "STANDARD" | "EXPRESS" | "SCHEDULED",
            deliveryName: delivery.name,
            deliveryPrice: totals.shipping,
            scheduledDate: speed === "scheduled" ? scheduled : null,
            giftWrap: Boolean(input.giftWrap),
            buyerGstin,
            shipLabel: input.address.label,
            shipName: input.address.fullName,
            shipPhone: input.address.phone,
            shipLine1: input.address.line1,
            shipLine2: input.address.line2 || null,
            shipLandmark: input.address.landmark || null,
            shipCity: input.address.city,
            shipState: input.address.state,
            shipPincode: input.address.pincode,
            itemsTotal: totals.itemsTotal,
            mrpTotal: totals.mrpTotal,
            productDiscount: totals.productDiscount,
            shipping: totals.shipping,
            tax: taxRupees,
            total: totals.total,
            invoiceNumber,
            invoiceDate: invoicedAt,
            // Copied, not referenced: a GSTIN or a registered address the shop
            // changes next April must not rewrite the invoice raised today.
            sellerLegalName: settings.store.legalName,
            sellerAddress: settings.store.address,
            sellerGstin: settings.store.gstin,
            sellerStateCode,
            placeOfSupply: input.address.state,
            placeOfSupplyCode: placeCode,
            // No courier and no tracking number until a parcel is actually
            // booked. These used to be invented at checkout, which made every
            // order look shipped the moment it was placed — the customer was
            // given a tracking number that tracked nothing, and the admin
            // panel, seeing an AWB, offered no way to book the real one.
            estimatedDelivery,
            lines: {
              create: priced.map((l) => ({
                productId: l.productId,
                slug: l.slug,
                title: l.title,
                brand: l.brand,
                categorySlug: l.categorySlug,
                image: l.image,
                variantLabel: l.variantLabel ?? null,
                variantKey: l.variantKey ?? null,
                price: l.price,
                mrp: l.mrp,
                quantity: l.quantity,
                hsnCode: l.hsnCode,
                taxRate: l.taxRate,
              })),
            },
            events: {
              create: {
                status: "CONFIRMED",
                title: "Order confirmed",
                description:
                  method === "COD"
                    ? "We have received your order. Pay when it arrives."
                    : "We have received your order and payment.",
                location: `${settings.store.name}, ${settings.store.address.split(",").slice(-2)[0]?.trim() ?? ""}`.replace(/, $/, ""),
                actorName: "System",
              },
            },
          },
          select: { id: true, number: true },
        });

        for (const l of priced) {
          /**
           * The decrement IS the stock check. This is the whole fix for
           * overselling.
           *
           * Stock was validated far above, outside this transaction, and then
           * subtracted unconditionally here — with the settings read, the tax
           * maths, the order-number allocation and the order insert all sitting
           * in between. Two shoppers buying the last unit both passed the check
           * and both subtracted: stock went negative and two orders were taken
           * for one item. On a quiet shop the window is invisible; at the scale
           * of "everyone orders at once" it is the normal case.
           *
           * `updateMany` with the quantity in its WHERE emits
           *   UPDATE "Product" SET stock = stock - $1 WHERE id = $2 AND stock >= $1
           * and Postgres re-evaluates that predicate against the committed row
           * after waiting on the row lock. So of N racing buyers exactly one
           * matches; the rest update nothing, throw, and roll the whole
           * transaction back — no order, no charge, no negative stock.
           */
          const claimed = await tx.product.updateMany({
            where: { id: l.productId, stock: { gte: l.quantity } },
            data: { stock: { decrement: l.quantity }, soldCount: { increment: l.quantity } },
          });
          if (claimed.count === 0) {
            throw Object.assign(new Error(soldOutMessage(l.title)), { soldOut: true });
          }
          await tx.stockMovement.create({
            data: {
              productId: l.productId,
              delta: -l.quantity,
              reason: "Order placed",
              reference: order.number,
              actorName: "Storefront",
            },
          });
        }

        // How they paid this time becomes the default next time, so a returning
        // customer lands on the payment step with their choice already made.
        await tx.customer.update({
          where: { id: session.id },
          data: {
            preferredPayment: method,
            phone: input.contact.phone.trim(),
          },
        });

        return order;
      });
    } catch (error) {
      // Somebody else took the last one between the basket and the button.
      // That is an ordinary shopping outcome, not a fault: it must reach the
      // shopper as a sentence, never as an Internal Server Error. Returning
      // here exits placeOrder; the transaction has already rolled back, so no
      // order exists and nothing was charged.
      if ((error as { soldOut?: boolean }).soldOut) {
        return { ok: false, error: (error as Error).message };
      }
      const code = (error as { code?: string }).code;
      if (code !== "P2002" || attempt === 2) throw error;
    }
  }

  if (!created) return { ok: false, error: "We could not place the order. Please try again." };

  // Cash on delivery is confirmed the moment it is placed, so the receipt goes
  // now. Everything else is still unpaid at this point and gets its receipt
  // from whichever payment path confirms it — sending one here would be
  // telling the customer an unpaid order is confirmed.
  if (method === "COD") void sendOrderConfirmation(created.id);

  revalidatePath("/admin", "layout");
  /**
   * Only the pages this order actually changed.
   *
   * This used to be `revalidatePath("/", "layout")`, which carries the implicit
   * `/layout` tag every app page is stamped with — so one order threw away the
   * cached copy of every page on the site. At one order a minute that is a shop
   * that is never cached, and every visitor afterwards rebuilds a page from the
   * database. Exactly the wrong behaviour under the load the owner is worried
   * about: the busier the shop, the less of it is cached.
   *
   * What an order really changes is the stock on the products in it. The
   * listing and category pages read searchParams and are already dynamic, and
   * the homepage refreshes itself every two minutes.
   */
  for (const line of priced) revalidatePath(`/p/${line.slug}`);

  return { ok: true, data: { orderId: created.id, number: created.number } };
}

/**
 * What a shopper is told when the last one went while they were deciding.
 * Kept here so the wording is the same wherever a claim fails.
 */
function soldOutMessage(title: string) {
  return `${title} just sold out — someone else took the last one. Remove it from your bag and the rest of the order can go through.`;
}

/* ------------------------------ Returns ----------------------------- */

export async function requestReturn(input: {
  orderId: string;
  orderLineId: string;
  reason: string;
  details?: string;
}): Promise<ActionResult<{ id: string }>> {
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    include: { lines: true, returns: true },
  });
  if (!order || !(await canViewOrder(order))) return { ok: false, error: "Order not found." };
  if (order.status !== "DELIVERED") return { ok: false, error: "Only delivered orders can be returned." };

  const line = order.lines.find((l) => l.id === input.orderLineId);
  if (!line) return { ok: false, error: "That item is not on this order." };
  if (order.returns.some((r) => r.orderLineId === line.id && r.status !== "REJECTED"))
    return { ok: false, error: "A return is already open for this item." };

  const session = await getCustomerSession();
  const request = await db.returnRequest.create({
    data: {
      orderId: order.id,
      orderLineId: line.id,
      customerId: session?.id ?? order.customerId,
      reason: input.reason.trim() || "Not specified",
      details: input.details?.trim() || null,
      refundAmount: line.price * line.quantity,
      refundMode: order.paymentMethod === "COD" ? "Bank account (to be collected)" : "Original payment method",
    },
    select: { id: true },
  });

  revalidatePath("/account/returns");
  revalidatePath("/admin", "layout");
  return { ok: true, data: { id: request.id } };
}

/* ------------------------------ Reviews ----------------------------- */

/**
 * Whether the signed-in customer may review this product. The rule itself
 * lives in services/reviews.ts; this only supplies who is asking.
 */
export async function reviewEligibility(productId: string): Promise<ReviewEligibility> {
  const session = await getCustomerSession();
  if (!session) return { can: false, reason: "signin" };
  return reviewEligibilityFor(session.id, productId);
}

export async function submitReview(input: {
  productId: string;
  rating: number;
  title: string;
  body: string;
}): Promise<ActionResult> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Sign in to write a review." };

  if (!rateLimit("review:write", session.id, 10, 60 * 60_000)) return { ok: false, error: TOO_MANY };

  // Checked again here, not only in the UI: the form is a convenience, this is
  // the rule.
  const eligible = await reviewEligibility(input.productId);
  if (!eligible.can) {
    return {
      ok: false,
      error:
        eligible.reason === "already"
          ? "You have already reviewed this product."
          : eligible.reason === "awaiting-delivery"
            ? "You can review this once it has been delivered."
            : "Only customers who have bought and received this product can review it.",
    };
  }

  const rating = Math.round(Number(input.rating));
  if (rating < 1 || rating > 5) return { ok: false, error: "Pick a star rating." };
  if (input.title.trim().length < 3) return { ok: false, error: "Give your review a title." };
  if (input.body.trim().length < 20) return { ok: false, error: "Tell us a little more — at least 20 characters." };

  const customer = await db.customer.findUnique({
    where: { id: session.id },
    include: { addresses: { where: { isDefault: true }, take: 1 } },
  });

  await db.review.create({
    data: {
      productId: input.productId,
      customerId: session.id,
      author: session.name,
      location: customer?.addresses[0] ? `${customer.addresses[0].city}` : "India",
      rating,
      title: input.title.trim(),
      body: input.body.trim(),
      // True by construction now: nobody who has not received the product can
      // reach this line.
      verified: true,
      status: "PENDING",
    },
  });

  revalidatePath("/admin/reviews");
  return { ok: true };
}

/* ------------------------------ Inbox ------------------------------- */

/**
 * Takes a contact submission, or refuses it and says why.
 *
 * The checks run cheapest-first and the first one to fail wins, so a bot that
 * trips the honeypot is never also charged a database round trip for the
 * cooldown. Being signed in changes nothing about the limits — it only means
 * the server stops trusting the email field and uses the account's address.
 *
 * Every refusal returns the same shape a validation error does. None of them
 * reveal which identity matched: a sender who learns it was their IP simply
 * changes network.
 */
export async function submitContact(input: {
  name: string;
  email: string;
  topic: string;
  orderNumber?: string;
  message: string;
  /** The honeypot. Any value at all means a bot filled a field humans cannot see. */
  website?: string;
  /** Signed, issued when the form was rendered. Proves how long the form was open. */
  formToken?: string;
}): Promise<ActionResult> {
  const session = await getCustomerSession();

  // A signed-in customer's address comes from their account, never from the
  // submitted field — otherwise the email cooldown is dodged by typing a
  // different address while signed in.
  const email = session ? session.email : String(input.email ?? "").toLowerCase().trim();
  const sender = await describeSender(email, session?.id ?? null);

  // 1. Blocklist. Before anything else, and told the same story as a cooldown.
  if (await isBlocked(sender.ip, email)) {
    await logAbuse("BLOCKED", sender);
    return { ok: false, error: cooldownMessage(new Date(Date.now() + COOLDOWN_MS)) };
  }

  // 2. Honeypot. No message, no hint about what gave it away.
  if (typeof input.website === "string" && input.website.trim() !== "") {
    await logAbuse("HONEYPOT", sender);
    return { ok: false, error: GENERIC_REFUSAL };
  }

  // 3. Time on form.
  const verdict = verifyFormToken(input.formToken);
  if (verdict !== "ok") {
    await logAbuse(verdict === "too-fast" ? "TOO_FAST" : "VALIDATION", sender, `token:${verdict}`);
    return {
      ok: false,
      error:
        verdict === "too-fast"
          ? "That was quick — take a moment and send it again."
          : "This form has been open a while. Please reload the page and send it again.",
    };
  }

  // 4. Field validation, with a ceiling on every one of them.
  const name = String(input.name ?? "").trim();
  const topic = String(input.topic ?? "").trim();
  const orderNumber = String(input.orderNumber ?? "").trim();
  const message = String(input.message ?? "").trim();

  const problem = validateContactFields({ name, email, topic, orderNumber, message });
  if (problem) {
    await logAbuse("VALIDATION", sender, `field:${problem.field}`);
    return { ok: false, error: problem.error, field: problem.field };
  }

  // 5. Links wearing a sentence.
  if (isLinkSpam(message)) {
    await logAbuse("LINK_SPAM", sender);
    return {
      ok: false,
      error: "That message is mostly links, so it did not go through. Tell us in your own words and we will help.",
    };
  }

  // 6. The cooldown, across all four identities at once.
  const cooldown = await cooldownFor(sender);
  if (cooldown) {
    await logAbuse("COOLDOWN", sender, `retryAt:${cooldown.retryAt.toISOString()}`);
    return { ok: false, error: cooldownMessage(cooldown.retryAt) };
  }

  // 7. The day's ceiling, which a patient bot would reach instead.
  if (await overDailyCap(sender)) {
    await logAbuse("DAILY_CAP", sender);
    return {
      ok: false,
      error: "You have sent us several messages today. Please reply to one of those and we will pick it up there.",
    };
  }

  // Link the message to a real order when the number given matches one, so
  // support opens it with the history already in front of them. Matched on the
  // order number alone — never guessed from the email, which would attach one
  // customer's question to another's order.
  const matchedOrder = orderNumber
    ? await db.order.findFirst({
        where: { number: { equals: orderNumber, mode: "insensitive" } },
        select: { id: true, customerId: true },
      })
    : null;

  const created = await db.contactMessage.create({
    data: {
      name,
      email,
      topic,
      orderNumber: orderNumber || null,
      message,
      ip: sender.ip,
      deviceId: sender.deviceId,
      // The account if signed in; otherwise the one the matched order belongs
      // to, which is how a guest message still lands on a customer's record.
      customerId: session?.id ?? matchedOrder?.customerId ?? null,
      userAgent: sender.userAgent,
      orderId: matchedOrder?.id ?? null,
    },
    select: { id: true },
  });

  revalidatePath("/admin/messages");

  // The acknowledgement to the customer and the notification to the shop, both
  // only now that the row exists, and both after the response so a slow SMTP
  // server never holds up the form's answer. A refused submission returned
  // long before this line and so can never trigger either.
  if (mailConfigured()) {
    after(async () => {
      try {
        const notice = buildContactAdminEmail({
          id: created.id,
          name,
          email,
          topic,
          orderNumber: orderNumber || null,
          message,
          createdAt: new Date(),
          ip: sender.ip,
          customerId: session?.id ?? matchedOrder?.customerId ?? null,
          orderId: matchedOrder?.id ?? null,
        });
        await sendMail({
          to: CONTACT_NOTIFY_TO,
          subject: notice.subject,
          html: notice.html,
          text: notice.text,
          // So that hitting reply in the shop's inbox writes to the customer.
          replyTo: notice.replyTo,
        });
      } catch (error) {
        console.error("[contact] admin notice failed", (error as { message?: string }).message ?? "");
      }

      try {
        const ack = buildContactAck({
          name,
          topic,
          message,
          orderNumber: orderNumber || null,
          reference: created.id.slice(-8).toUpperCase(),
        });
        await sendMail({ to: email, subject: ack.subject, html: ack.html, text: ack.text });
      } catch (error) {
        // A failed acknowledgement must not lose the message, which is already
        // stored and already visible in the inbox.
        console.error("[contact] ack email failed", (error as { message?: string }).message ?? "");
      }
    });
  }

  return { ok: true };
}

/** Said to a sender whose submission was refused without explaining the tell. */
const GENERIC_REFUSAL = "We could not send that message. Please reload the page and try again.";

/** Server-side field rules. The client checks the same things; only these count. */
function validateContactFields(input: {
  name: string;
  email: string;
  topic: string;
  orderNumber: string;
  message: string;
}): { error: string; field: string } | null {
  if (input.name.length < 2) return { error: "Tell us your name.", field: "name" };
  if (input.name.length > LIMITS.name) return { error: "That name is too long.", field: "name" };

  if (!EMAIL.test(input.email) || input.email.length > LIMITS.email)
    return { error: "We need a valid email to reply to.", field: "email" };

  if (!input.topic || input.topic.length > LIMITS.topic)
    return { error: "Choose what this is about.", field: "topic" };

  if (input.orderNumber.length > LIMITS.orderNumber)
    return { error: "That order number is too long.", field: "orderNumber" };

  if (input.message.length < 10)
    return { error: "A sentence or two helps us answer properly.", field: "message" };
  if (input.message.length > LIMITS.message)
    return {
      error: `Please keep it under ${LIMITS.message.toLocaleString("en-IN")} characters — attach the detail in a reply if you need to.`,
      field: "message",
    };

  return null;
}

/**
 * Adds an address to the newsletter and, the first time only, sends it the
 * welcome email. The answer is the same `{ ok: true }` whether the address was
 * new or already subscribed, so the form cannot be used to find out who is on
 * the list.
 */
export async function subscribeNewsletter(email: string, source = "footer"): Promise<ActionResult> {
  if (!rateLimit("newsletter:ip", await clientIp(), 5, 10 * 60_000)) return { ok: false, error: TOO_MANY };
  const address = String(email ?? "").trim().toLowerCase();
  if (!EMAIL.test(address) || address.length > 254) return { ok: false, error: "Enter a valid email address." };
  // A public endpoint: the label is stored and listed in admin, so only a short tag is kept.
  const origin = typeof source === "string" && /^[a-z0-9_-]{1,32}$/i.test(source) ? source : "footer";

  const existing = await db.newsletterSubscriber.findUnique({ where: { email: address }, select: { id: true } });
  if (existing) return { ok: true };

  let created: { id: string };
  try {
    created = await db.newsletterSubscriber.create({
      data: { email: address, source: origin },
      select: { id: true },
    });
  } catch (error) {
    // Two submissions racing for one address: the unique index keeps a single
    // row, and whoever lost is simply already subscribed.
    if ((error as { code?: string }).code === "P2002") return { ok: true };
    throw error;
  }

  if (mailConfigured()) {
    // After the response, so the form answers at once and a slow or failing
    // SMTP server never holds it up. welcomedAt is set only once Gmail has
    // accepted the message.
    after(async () => {
      try {
        const sent = await sendMail({ to: address, ...buildWelcomeEmail(address) });
        if (sent) {
          await db.newsletterSubscriber.updateMany({
            where: { id: created.id, welcomedAt: null },
            data: { welcomedAt: new Date() },
          });
        }
      } catch (error) {
        console.error("[newsletter] welcome email failed", error instanceof Error ? error.message : error);
      }
    });
  }

  return { ok: true };
}

/* ---------------------------- Addresses ----------------------------- */

function addressData(a: Omit<Address, "id" | "isDefault">) {
  return {
    label: a.label.toUpperCase() as "HOME" | "WORK" | "OTHER",
    fullName: a.fullName.trim(),
    phone: a.phone.trim(),
    line1: a.line1.trim(),
    line2: a.line2?.trim() || null,
    landmark: a.landmark?.trim() || null,
    city: a.city.trim(),
    state: a.state,
    pincode: a.pincode,
  };
}

export async function saveAddress(address: Address): Promise<ActionResult<{ id: string }>> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Sign in to save addresses." };
  if (!/^\d{6}$/.test(address.pincode)) return { ok: false, error: "Enter a valid 6-digit pincode." };

  const existing = await db.address.findFirst({ where: { id: address.id, customerId: session.id } });

  const saved = await db.$transaction(async (tx) => {
    if (address.isDefault) {
      await tx.address.updateMany({ where: { customerId: session.id }, data: { isDefault: false } });
    }
    const data = { ...addressData(address), isDefault: address.isDefault };
    return existing
      ? tx.address.update({ where: { id: existing.id }, data, select: { id: true } })
      : tx.address.create({ data: { ...data, customerId: session.id }, select: { id: true } });
  });

  revalidatePath("/account/addresses");
  revalidatePath("/checkout/address");
  return { ok: true, data: { id: saved.id } };
}

export async function removeAddress(id: string): Promise<ActionResult> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Sign in first." };
  await db.address.deleteMany({ where: { id, customerId: session.id } });
  revalidatePath("/account/addresses");
  return { ok: true };
}

/* ------------------------------ Tracking ----------------------------- */

export interface TrackFormState {
  error?: string;
  field?: string;
  /** Echoed back so a failed lookup does not wipe what was typed. */
  values?: { number: string; contact: string };
}

/**
 * Public tracking. The order number alone is not enough — the visitor also has
 * to know the email or phone the order was placed with. Once they prove that,
 * the order is added to this browser's guest cookie so the tracking page can
 * show it without asking again.
 */
export async function trackOrderAction(
  _prev: TrackFormState,
  formData: FormData,
): Promise<TrackFormState> {
  const number = String(formData.get("number") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const values = { number, contact };

  if (!number) return { error: "Enter your order number.", field: "number", values };
  if (!contact)
    return { error: "Enter the email or phone used on the order.", field: "contact", values };

  const order = await lookupOrder(number, contact);
  if (!order)
    return {
      error:
        "No order matches that number and contact detail. Check the confirmation email, or contact support.",
      field: "number",
      values,
    };

  await rememberGuestOrder(order.id);
  redirect(`/track/${order.id}`);
}

/* --------------------------- Password help --------------------------- */

export interface PasswordHelpState {
  ok?: boolean;
  error?: string;
  values?: { email?: string };
}

/**
 * Sends a password reset link, or appears to.
 *
 * The answer is identical whether or not the address has an account: a form
 * that says "no such account" is a tool for finding out which addresses are
 * customers. Nothing in the returned state, its timing or its wording differs.
 *
 * Rate limited twice over, reusing the contact form's limiter: by address, so
 * one mailbox cannot be flooded with reset mail by somebody who knows it; and
 * by IP, so one attacker cannot walk a list of addresses. Both refusals return
 * the same success shape for the same reason.
 */
export async function requestPasswordHelp(
  _prev: PasswordHelpState,
  formData: FormData,
): Promise<PasswordHelpState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "Enter the email address on your account.", values: { email } };

  const ip = await clientIp();
  // Three an hour per address, ten an hour per network. A person who has lost
  // their password needs one or two; anything past that is not them.
  const withinLimits =
    rateLimit("password-reset:email", email, 3, 60 * 60_000) &&
    rateLimit("password-reset:ip", ip, 10, 60 * 60_000);

  if (withinLimits) {
    const customer = await db.customer.findUnique({
      where: { email },
      select: { id: true, name: true, isActive: true, passwordHash: true },
    });

    // A deactivated account gets no link. An account that only ever signed in
    // with Google has no password to reset, and sending it a reset link would
    // quietly convert it to a password account behind the owner's back.
    if (customer && customer.isActive && customer.passwordHash !== null && mailConfigured()) {
      const issued = await issueResetToken(customer.id, ip);
      after(async () => {
        try {
          const mail = buildPasswordResetEmail({
            name: customer.name,
            resetUrl: resetUrl(issued.token),
            expiresAt: issued.expiresAt,
          });
          await sendMail({ to: email, subject: mail.subject, html: mail.html, text: mail.text });
        } catch (error) {
          // The ticket is already issued; a failed send simply means they must
          // ask again. Never surfaced, because the answer must not vary.
          console.error("[password-reset] send failed", (error as { message?: string }).message ?? "");
        }
      });
    }
  }

  return { ok: true };
}

export interface ResetPasswordState {
  error?: string;
  field?: string;
  ok?: boolean;
}

/**
 * Sets a new password against a reset token.
 *
 * The token is spent inside the same transaction that writes the password, so
 * two submissions racing with one link cannot both win.
 */
export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!rateLimit("password-reset:submit", await clientIp(), 10, 60 * 60_000))
    return { error: TOO_MANY };

  const problem = passwordProblem(password);
  if (problem) return { error: problem, field: "password" };

  const found = await findResetToken(token);
  if (!found.ok) {
    return {
      error:
        found.reason === "expired"
          ? "That link has expired. Ask for a new one and it will arrive in a moment."
          : found.reason === "used"
            ? "That link has already been used. Ask for a new one if you still need it."
            : "That link is not valid. Ask for a new one and use the newest email.",
    };
  }

  const done = await redeemResetToken(found.tokenId, found.customerId, await hashPassword(password));
  if (!done) return { error: "That link has already been used. Ask for a new one if you still need it." };

  return { ok: true };
}

/* -------------------------------- Auth ------------------------------ */

export interface AuthFormState {
  error?: string;
  field?: string;
  /** React resets a form after its action runs; this puts the values back. */
  values?: { name?: string; email?: string; phone?: string };
}

function safeNext(raw: FormDataEntryValue | null, fallback: string) {
  // Shared with the OAuth callback so both doors sanitise the same way: a
  // prefix check alone lets `/\evil.com` through, which browsers normalise
  // into a protocol-relative URL and follow off-site.
  return safeNextPath(typeof raw === "string" ? raw : null, fallback);
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const values = { email };

  // Password guessing is the attack here, so count per address as well as
  // per IP: an attacker rotating IPs against one account is still stopped.
  const ip = await clientIp();
  if (!rateLimit("login:ip", ip, 12, 15 * 60_000) || !rateLimit("login:email", email.toLowerCase(), 10, 15 * 60_000))
    return { error: TOO_MANY, values };

  if (!EMAIL.test(email)) return { error: "Enter a valid email address.", field: "email", values };
  if (password.length < 6) return { error: "Enter your password.", field: "password", values };

  const result = await signInCustomer(email, password);
  if (!result.ok) return { error: result.reason, values };

  redirect(safeNext(formData.get("next"), "/account"));
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const values = { name, email, phone };
  if (!rateLimit("register:ip", await clientIp(), 6, 60 * 60_000)) return { error: TOO_MANY, values };
  if (name.length < 2) return { error: "Tell us your name.", field: "name", values };
  if (!EMAIL.test(email)) return { error: "Enter a valid email address.", field: "email", values };
  if (!PHONE.test(phone.replace(/\s/g, "")))
    return { error: "Enter a 10-digit Indian mobile number.", field: "phone", values };
  const weak = passwordProblem(password);
  if (weak) return { error: weak, field: "password", values };

  const result = await registerCustomer({ name, email, phone, password });
  if (!result.ok) return { error: result.reason, field: "email", values };

  redirect(safeNext(formData.get("next"), "/account"));
}

export async function logoutAction() {
  await signOutCustomer();
  redirect("/");
}

export async function updateProfile(input: { name: string; phone: string }): Promise<ActionResult> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Sign in first." };
  if (input.name.trim().length < 2) return { ok: false, error: "Tell us your name." };
  await db.customer.update({
    where: { id: session.id },
    data: { name: input.name.trim(), phone: input.phone.trim() },
  });
  revalidatePath("/account");
  return { ok: true };
}
