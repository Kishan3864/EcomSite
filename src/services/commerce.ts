"use server";

import { BUSINESS } from "@/config/business";
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
import { passwordProblem } from "@/lib/auth/password";
import type { Address, CartLine, DeliverySpeed, PaymentMethodId } from "@/lib/types";
import { computeTotals, evaluateCoupon } from "@/lib/pricing";
import {
  financialYear,
  gstinState,
  invoiceNumberFor,
  stateCode,
  taxOnOrder,
  toPaise,
} from "@/lib/gst";
import { getOffer } from "./catalog";
import { safeNextPath } from "@/lib/auth/oauth";
import { lookupOrder } from "./orders";
import { getSettings } from "./settings";

/**
 * Everything the storefront writes goes through here. Prices, stock and coupon
 * rules are recomputed from the database on every call — the client is only
 * ever a suggestion.
 */

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
  couponCode?: string | null;
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

  if (!input.lines?.length) return { ok: false, error: "Your bag is empty." };
  if (!input.contact?.name?.trim()) return { ok: false, error: "Contact name is required.", field: "name" };
  if (!EMAIL.test(input.contact.email ?? "")) return { ok: false, error: "Enter a valid email.", field: "email" };
  if (!PHONE.test((input.contact.phone ?? "").replace(/\s/g, "")))
    return { ok: false, error: "Enter a valid Indian mobile number.", field: "phone" };
  if (!input.address?.line1 || !/^\d{6}$/.test(input.address.pincode ?? ""))
    return { ok: false, error: "Delivery address is incomplete." };

  const settings = await getSettings();

  // Re-price every line from the catalogue.
  const products = await db.product.findMany({
    where: { id: { in: input.lines.map((l) => l.productId) }, status: "ACTIVE" },
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

  const itemsTotal = priced.reduce((s, l) => s + l.price * l.quantity, 0);
  const categories = [...new Set(priced.map((l) => l.categorySlug))];

  // Coupon, verified server-side.
  let coupon: { code: string; discount: number; type: "percent" | "flat" | "shipping" | "bank" } | null = null;
  const offerRow = input.couponCode ? await db.offer.findUnique({ where: { code: input.couponCode.toUpperCase() } }) : null;
  if (input.couponCode) {
    const offer = await getOffer(input.couponCode);
    const check = evaluateCoupon(offer, itemsTotal, categories);
    if (!check.ok) return { ok: false, error: check.reason ?? "That coupon cannot be applied.", field: "coupon" };
    if (offerRow?.usageLimit != null && offerRow.usedCount >= offerRow.usageLimit)
      return { ok: false, error: "That coupon has been fully redeemed.", field: "coupon" };
    coupon = { code: offer!.code, discount: check.discount, type: offer!.type };
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
    coupon,
    rates: {
      freeThreshold: settings.shipping.freeThreshold,
      standardFee: settings.shipping.standardFee,
      gstRate: settings.tax.gstRate,
    },
  });

  if (input.paymentMethod === "cod" && (!settings.payments.cod || totals.total > settings.payments.codLimit))
    return { ok: false, error: `Cash on Delivery is not available on this order.`, field: "payment" };

  const slowest = priced.reduce((m, l) => Math.max(m, l.deliveryDays), 1);
  const eta = new Date();
  eta.setDate(eta.getDate() + Math.max(delivery.maxDays, slowest));
  const scheduled = input.deliveryDate ? new Date(input.deliveryDate) : null;
  const estimatedDelivery = speed === "scheduled" && scheduled ? scheduled : eta;

  const method = input.paymentMethod.toUpperCase() as "UPI" | "CARD" | "NETBANKING" | "WALLET" | "COD";
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
    discountPaise: toPaise(totals.couponDiscount),
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
            couponCode: coupon?.code ?? null,
            couponDiscount: totals.couponDiscount,
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
            courier: BUSINESS.ops.courierPartners[0] ?? "Courier partner",
            awb: `WKCX${Date.now().toString().slice(-9)}`,
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
          await tx.product.update({
            where: { id: l.productId },
            data: { stock: { decrement: l.quantity }, soldCount: { increment: l.quantity } },
          });
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

        if (coupon) {
          await tx.offer.update({ where: { code: coupon.code }, data: { usedCount: { increment: 1 } } });
        }

        // How they paid this time becomes the default next time, so a returning
        // customer lands on the payment step with their choice already made.
        await tx.customer.update({
          where: { id: session.id },
          data: {
            preferredPayment: method,
            phone: input.contact.phone.trim(),
            ...(method === "UPI" && input.paymentDetail?.includes("@")
              ? { upiId: input.paymentDetail.trim() }
              : {}),
          },
        });

        return order;
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002" || attempt === 2) throw error;
    }
  }

  if (!created) return { ok: false, error: "We could not place the order. Please try again." };

  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");

  return { ok: true, data: { orderId: created.id, number: created.number } };
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

export async function submitReview(input: {
  productId: string;
  rating: number;
  title: string;
  body: string;
}): Promise<ActionResult> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: "Sign in to write a review." };
  const rating = Math.round(Number(input.rating));
  if (rating < 1 || rating > 5) return { ok: false, error: "Pick a star rating." };
  if (input.title.trim().length < 3) return { ok: false, error: "Give your review a title." };
  if (input.body.trim().length < 20) return { ok: false, error: "Tell us a little more — at least 20 characters." };

  const customer = await db.customer.findUnique({
    where: { id: session.id },
    include: { addresses: { where: { isDefault: true }, take: 1 } },
  });
  const verified = await db.orderLine.count({
    where: { productId: input.productId, order: { customerId: session.id, status: "DELIVERED" } },
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
      verified: verified > 0,
      status: "PENDING",
    },
  });

  revalidatePath("/admin/reviews");
  return { ok: true };
}

/* ------------------------------ Inbox ------------------------------- */

export async function submitContact(input: {
  name: string;
  email: string;
  topic: string;
  orderNumber?: string;
  message: string;
}): Promise<ActionResult> {
  if (input.name.trim().length < 2) return { ok: false, error: "Tell us your name.", field: "name" };
  if (!EMAIL.test(input.email)) return { ok: false, error: "We need a valid email to reply to.", field: "email" };
  if (input.message.trim().length < 10)
    return { ok: false, error: "A sentence or two helps us answer properly.", field: "message" };

  await db.contactMessage.create({
    data: {
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      topic: input.topic,
      orderNumber: input.orderNumber?.trim() || null,
      message: input.message.trim(),
    },
  });
  revalidatePath("/admin/messages");
  return { ok: true };
}

export async function subscribeNewsletter(email: string, source = "footer"): Promise<ActionResult> {
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email address." };
  await db.newsletterSubscriber.upsert({
    where: { email: email.toLowerCase().trim() },
    create: { email: email.toLowerCase().trim(), source },
    update: {},
  });
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
 * There is no email provider wired up, so this cannot send a reset link and
 * does not pretend to. It raises a support request that lands in the admin
 * inbox, and the answer to the customer says exactly that. The reply is the
 * same whether or not the account exists, so nobody can probe for addresses.
 */
export async function requestPasswordHelp(
  _prev: PasswordHelpState,
  formData: FormData,
): Promise<PasswordHelpState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email))
    return { error: "Enter the email address on your account.", values: { email } };

  const customer = await db.customer.findUnique({ where: { email }, select: { id: true, name: true } });
  if (customer) {
    await db.contactMessage.create({
      data: {
        name: customer.name,
        email,
        topic: "Password reset",
        message: "Asked for help signing in from the forgot-password page.",
      },
    });
    revalidatePath("/admin/messages");
  }

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
