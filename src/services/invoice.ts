import "server-only";

import { db } from "@/lib/db";
import { canViewOrder } from "@/lib/auth/customer";
import {
  amountInWords,
  gstinState,
  panFromGstin,
  stateCode,
  taxOnOrder,
  stateFromCode,
  toPaise,
  type TaxSplit,
} from "@/lib/gst";
import { getSettings } from "./settings";

/**
 * Builds the tax invoice for an order.
 *
 * Everything printed comes from what was snapshotted onto the order when it was
 * raised — the seller's details, the place of supply, each line's HSN and rate.
 * Settings are consulted only for orders old enough to predate those columns,
 * so changing the shop's GSTIN tomorrow cannot rewrite an invoice issued today.
 */

/** Delivery is a service in its own right: SAC 9968, taxed at 18%. */
const DELIVERY_SAC = "996819";
const DELIVERY_RATE = 18;

/**
 * Indian retail prices are inclusive of GST — the Legal Metrology rules require
 * the MRP on the pack to be the all-in price — so every amount stored here is
 * tax-inclusive and the tax is backed out of it.
 */
const PRICES_INCLUDE_TAX = true;

export interface InvoiceLine {
  serial: number;
  title: string;
  variantLabel: string | null;
  hsnCode: string;
  /** Unique Quantity Code, printed beside the quantity. */
  uqc: string;
  quantity: number;
  /** Per unit, before tax. */
  unitPaise: number;
  grossPaise: number;
  discountPaise: number;
  taxRate: number;
  tax: TaxSplit;
  totalPaise: number;
}

export interface HsnSummaryRow {
  hsnCode: string;
  taxRate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface Invoice {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  invoiceNumber: string;
  invoiceDate: Date;
  interState: boolean;
  placeOfSupply: string;
  placeOfSupplyCode: string;
  seller: {
    legalName: string;
    address: string;
    gstin: string;
    stateName: string;
    stateCode: string;
    pan: string | null;
    email: string;
    phone: string;
  };
  billTo: {
    name: string;
    lines: string[];
    state: string;
    stateCode: string;
    phone: string;
    email: string;
  };
  shipTo: { name: string; lines: string[]; state: string; stateCode: string; phone: string };
  lines: InvoiceLine[];
  hsnSummary: HsnSummaryRow[];
  totals: {
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    tax: number;
    /** What the items cost before the coupon, tax included — the price on the
     *  shelf, not a pre-tax figure. Labelled as such wherever it is printed. */
    itemsInclusiveBeforeDiscount: number;
    discount: number;
    roundOff: number;
    payable: number;
  };
  amountInWords: string;
  payment: { method: string; status: string; reference: string | null };
  buyerGstin: string | null;
  couponCode: string | null;
  /** True when there is no GST registration to invoice under. */
  isBillOfSupply: boolean;
}

const PAYMENT_LABEL: Record<string, string> = {
  UPI: "UPI",
  CARD: "Credit / Debit card",
  NETBANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Cash on Delivery",
};

const PAYMENT_STATE: Record<string, string> = {
  PAID: "Paid",
  COD_PENDING: "Payable on delivery",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
  FAILED: "Not paid",
};

function addressLines(a: {
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
}) {
  return [a.line1, a.line2, a.landmark, `${a.city}, ${a.state} ${a.pincode}`].filter(
    (l): l is string => Boolean(l && l.trim()),
  );
}

export async function getInvoice(orderId: string): Promise<Invoice | null> {
  const order = await db.order.findFirst({
    where: { OR: [{ id: orderId }, { number: orderId.toUpperCase() }] },
    include: { lines: { orderBy: { id: "asc" } } },
  });
  if (!order) return null;

  const settings = await getSettings();

  // Orders raised before the invoice columns existed fall back to Settings.
  const sellerGstin = order.sellerGstin ?? settings.store.gstin;
  const sellerStateCode = order.sellerStateCode ?? gstinState(sellerGstin);
  const placeCode = order.placeOfSupplyCode ?? stateCode(order.shipState);
  const interState = sellerStateCode !== placeCode;
  // A supplier with no GST registration issues a bill of supply and charges no
  // tax at all, so every rate drops to zero and the taxable value is the price.
  const billOfSupply = !sellerGstin.trim();
  const rateOf = (rate: number) => (billOfSupply ? 0 : rate);

  const gross = order.lines.map((l) => toPaise(l.price * l.quantity));
  const computedTax = taxOnOrder({
    items: order.lines.map((l, i) => ({
      amountPaise: gross[i],
      ratePercent: rateOf(l.taxRate ?? settings.tax.gstRate),
    })),
    discountPaise: toPaise(order.couponDiscount),
    shipping:
      order.shipping > 0
        ? { amountPaise: toPaise(order.shipping), ratePercent: rateOf(DELIVERY_RATE) }
        : null,
    interState,
    inclusive: PRICES_INCLUDE_TAX,
  });

  const lines: InvoiceLine[] = order.lines.map((line, i) => {
    const { tax, discountPaise } = computedTax.items[i];
    return {
      serial: i + 1,
      title: line.title,
      variantLabel: line.variantLabel,
      hsnCode: line.hsnCode ?? "—",
      uqc: line.uqc || "NOS",
      quantity: line.quantity,
      unitPaise: Math.round(tax.taxable / line.quantity),
      grossPaise: gross[i],
      discountPaise,
      taxRate: rateOf(line.taxRate ?? settings.tax.gstRate),
      tax,
      totalPaise: tax.taxable + tax.tax,
    };
  });

  // Delivery is charged and taxed like any other supply, so it earns a row.
  if (computedTax.shipping) {
    lines.push({
      serial: lines.length + 1,
      title: `Delivery charges — ${order.deliveryName}`,
      variantLabel: null,
      hsnCode: DELIVERY_SAC,
      uqc: "OTH",
      quantity: 1,
      unitPaise: computedTax.shipping.taxable,
      grossPaise: toPaise(order.shipping),
      discountPaise: 0,
      taxRate: rateOf(DELIVERY_RATE),
      tax: computedTax.shipping,
      totalPaise: computedTax.shipping.taxable + computedTax.shipping.tax,
    });
  }

  const { taxable, cgst, sgst, igst } = computedTax.totals;

  // What the lines add up to, against what the customer was actually charged.
  // The difference is a paisa or two of rounding and is shown as such.
  const payable = toPaise(order.total);
  const roundOff = payable - (taxable + cgst + sgst + igst);

  const byHsn = new Map<string, HsnSummaryRow>();
  for (const line of lines) {
    const key = `${line.hsnCode}@${line.taxRate}`;
    const row = byHsn.get(key) ?? {
      hsnCode: line.hsnCode,
      taxRate: line.taxRate,
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
    };
    row.taxable += line.tax.taxable;
    row.cgst += line.tax.cgst;
    row.sgst += line.tax.sgst;
    row.igst += line.tax.igst;
    row.total += line.totalPaise;
    byHsn.set(key, row);
  }

  const ship = {
    line1: order.shipLine1,
    line2: order.shipLine2,
    landmark: order.shipLandmark,
    city: order.shipCity,
    state: order.shipState,
    pincode: order.shipPincode,
  };

  return {
    orderId: order.id,
    orderNumber: order.number,
    orderDate: order.placedAt,
    // An order that somehow never got a number still prints, marked as a draft
    // rather than silently borrowing the order number.
    invoiceNumber: order.invoiceNumber ?? `DRAFT/${order.number}`,
    invoiceDate: order.invoiceDate ?? order.placedAt,
    interState,
    placeOfSupply: order.placeOfSupply ?? order.shipState,
    placeOfSupplyCode: placeCode,
    seller: {
      legalName: order.sellerLegalName ?? settings.store.legalName,
      address: order.sellerAddress ?? settings.store.address,
      gstin: sellerGstin,
      stateName: stateFromCode(sellerStateCode),
      stateCode: sellerStateCode,
      pan: panFromGstin(sellerGstin),
      email: settings.store.supportEmail,
      phone: settings.store.supportPhone,
    },
    billTo: {
      name: order.contactName,
      lines: addressLines(ship),
      state: order.shipState,
      stateCode: placeCode,
      phone: order.contactPhone,
      email: order.contactEmail,
    },
    shipTo: {
      name: order.shipName,
      lines: addressLines(ship),
      state: order.shipState,
      stateCode: placeCode,
      phone: order.shipPhone,
    },
    lines,
    hsnSummary: [...byHsn.values()],
    totals: {
      taxable,
      cgst,
      sgst,
      igst,
      tax: cgst + sgst + igst,
      itemsInclusiveBeforeDiscount: lines.reduce((t, l) => t + l.grossPaise, 0),
      discount: toPaise(order.couponDiscount),
      roundOff,
      payable,
    },
    amountInWords: amountInWords(payable),
    payment: {
      method: PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod,
      status: PAYMENT_STATE[order.paymentStatus] ?? order.paymentStatus,
      reference: order.paymentRef,
    },
    buyerGstin: order.buyerGstin,
    couponCode: order.couponCode,
    isBillOfSupply: billOfSupply,
  };
}

/** The invoice, but only for someone entitled to see this order. */
export async function getInvoiceForViewer(orderId: string): Promise<Invoice | null> {
  const order = await db.order.findFirst({
    where: { OR: [{ id: orderId }, { number: orderId.toUpperCase() }] },
    select: { id: true, customerId: true },
  });
  if (!order || !(await canViewOrder(order))) return null;
  return getInvoice(order.id);
}
