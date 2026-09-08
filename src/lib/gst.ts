/**
 * The tax arithmetic behind a GST invoice.
 *
 * Deliberately free of database and framework imports: an invoice has to add up
 * the same way wherever it is rendered, and this is the only place that decides
 * how it does. Everything here works in paise, because a rupee-rounded tax
 * split does not reconcile — 18% of ₹899 is ₹137.14, and three lines rounded
 * early drift away from the total the customer actually paid.
 */

/** GST state codes. The first two digits of a GSTIN are the seller's. */
export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

const CODE_BY_STATE = new Map(
  Object.entries(GST_STATE_CODES).map(([code, state]) => [state.toLowerCase(), code]),
);

/** "Karnataka" → "29". Unknown states fall back to the Other Territory code. */
export function stateCode(state: string | null | undefined): string {
  return CODE_BY_STATE.get((state ?? "").trim().toLowerCase()) ?? "97";
}

export function stateFromCode(code: string | null | undefined): string {
  return GST_STATE_CODES[(code ?? "").trim()] ?? "Other Territory";
}

/** A GSTIN carries its state in the first two digits and the PAN in 3–12. */
export function gstinState(gstin: string | null | undefined): string {
  return (gstin ?? "").trim().slice(0, 2);
}

export function panFromGstin(gstin: string | null | undefined): string | null {
  const value = (gstin ?? "").trim().toUpperCase();
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]/.test(value) ? value.slice(2, 12) : null;
}

const IST = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
});

/**
 * The Indian financial year runs April to March, and invoice numbering has to
 * restart with it. April 2026 → "2026-27"; February 2027 → still "2026-27".
 *
 * Read in Indian time, not the server's: a shop hosted in another zone would
 * otherwise start the new year's serials several hours early or late, and an
 * invoice series that jumps a year is exactly what an auditor asks about.
 */
export function financialYear(date: Date): { start: number; label: string } {
  const parts = IST.formatToParts(date);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const year = part("year");
  const start = part("month") >= 4 ? year : year - 1;
  return { start, label: `${start}-${String((start + 1) % 100).padStart(2, "0")}` };
}

export function invoiceNumberFor(date: Date, sequence: number, prefix = "MYR") {
  return `${prefix}/${financialYear(date).label}/${String(sequence).padStart(6, "0")}`;
}

/* ------------------------------ Money ------------------------------ */

export const toPaise = (rupees: number) => Math.round(rupees * 100);

/** Two decimals, grouped the Indian way: 1,23,456.78 */
export function formatPaise(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function underThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
  return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${underThousand(n % 100)}` : ""}`;
}

/** Indian grouping — crore, lakh, thousand — as every invoice here is read. */
function inWords(value: number): string {
  if (value === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const rest = value % 1000;
  if (crore) parts.push(`${inWords(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (rest) parts.push(underThousand(rest));
  return parts.join(" ");
}

/** "One Thousand Seven Hundred Ninety Eight Rupees Only" */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(Math.abs(paise) / 100);
  const paisa = Math.abs(paise) % 100;
  const words = `${inWords(rupees)} Rupee${rupees === 1 ? "" : "s"}`;
  return paisa ? `${words} and ${inWords(paisa)} Paise Only` : `${words} Only`;
}

/* ------------------------------- Tax -------------------------------- */

export interface TaxSplit {
  /** Value of the supply before tax. */
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  /** cgst + sgst + igst. */
  tax: number;
}

/**
 * Backs the tax out of a GST-inclusive amount, or adds it on when the shop
 * prices exclusive of tax. The place of supply decides the split: within the
 * seller's own state the tax is halved into CGST and SGST, and anywhere else it
 * is a single IGST at the full rate.
 */
export function splitTax(
  amountPaise: number,
  ratePercent: number,
  options: { interState: boolean; inclusive: boolean },
): TaxSplit {
  const taxable = options.inclusive
    ? Math.round(amountPaise / (1 + ratePercent / 100))
    : amountPaise;
  const tax = options.inclusive ? amountPaise - taxable : Math.round(amountPaise * (ratePercent / 100));

  if (options.interState) return { taxable, cgst: 0, sgst: 0, igst: tax, tax };

  // Half each, with any odd paisa given to CGST so the two still sum to `tax`.
  const sgst = Math.floor(tax / 2);
  return { taxable, cgst: tax - sgst, sgst, igst: 0, tax };
}

/**
 * Spreads a whole-order discount across lines in proportion to their value.
 * The rounding remainder goes to the largest line, so the parts add back up to
 * the discount the customer was actually given.
 */
export function allocate(totalPaise: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || totalPaise <= 0) return weights.map(() => 0);

  const shares = weights.map((w) => Math.floor((totalPaise * w) / sum));
  const remainder = totalPaise - shares.reduce((a, b) => a + b, 0);
  if (remainder > 0) {
    const biggest = weights.reduce((best, w, i) => (w > weights[best] ? i : best), 0);
    shares[biggest] += remainder;
  }
  return shares;
}

export interface TaxableItem {
  amountPaise: number;
  ratePercent: number;
}

const EMPTY_SPLIT: TaxSplit = { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 };

const addSplits = (a: TaxSplit, b: TaxSplit): TaxSplit => ({
  taxable: a.taxable + b.taxable,
  cgst: a.cgst + b.cgst,
  sgst: a.sgst + b.sgst,
  igst: a.igst + b.igst,
  tax: a.tax + b.tax,
});

/**
 * The whole tax picture for one order, in one place.
 *
 * The order's stored tax figure and the invoice are both derived from this, so
 * the number a customer sees on their confirmation cannot drift from the one
 * printed on the legal document. A coupon reduces the taxable value of the
 * goods it applied to; delivery is a supply in its own right and is never
 * discounted, so it is taxed apart from the items.
 */
export function taxOnOrder(input: {
  items: TaxableItem[];
  discountPaise: number;
  shipping?: TaxableItem | null;
  interState: boolean;
  inclusive: boolean;
}): {
  items: { discountPaise: number; tax: TaxSplit }[];
  shipping: TaxSplit | null;
  totals: TaxSplit;
} {
  const { interState, inclusive } = input;
  const discounts = allocate(
    input.discountPaise,
    input.items.map((i) => i.amountPaise),
  );

  const items = input.items.map((item, i) => ({
    discountPaise: discounts[i],
    tax: splitTax(item.amountPaise - discounts[i], item.ratePercent, { interState, inclusive }),
  }));

  const shipping =
    input.shipping && input.shipping.amountPaise > 0
      ? splitTax(input.shipping.amountPaise, input.shipping.ratePercent, { interState, inclusive })
      : null;

  const totals = [...items.map((i) => i.tax), ...(shipping ? [shipping] : [])].reduce(
    addSplits,
    EMPTY_SPLIT,
  );

  return { items, shipping, totals };
}
