import "server-only";

import type { DeliveryOption, PaymentMethod } from "@/lib/types";
import type { Rates } from "@/lib/pricing";
import { getSettings } from "./settings";

/**
 * The parts of Settings the shopper actually sees: what delivery costs, how
 * long it takes, and which ways there are to pay. Read once in the storefront
 * shell and handed to the client store, so an owner's change in the admin panel
 * shows up on the next page load instead of needing a deploy.
 */

export interface StorefrontConfig {
  deliveryOptions: DeliveryOption[];
  paymentMethods: PaymentMethod[];
  rates: Rates;
  codLimit: number;
  store: { name: string; supportEmail: string; supportPhone: string };
}

/** Copy that belongs to the option rather than to the price. */
const PAYMENT_COPY: Record<string, Omit<PaymentMethod, "id">> = {
  // No offerText on either: there is no cashback scheme and no bank
  // arrangement behind one. An inducement we cannot honour is the kind of
  // claim a payment reviewer treats as a red flag, and a customer as a lie.
  upi: {
    name: "UPI",
    description: "Google Pay, PhonePe, Paytm, BHIM or any UPI app",
    badge: "Fastest",
  },
  card: {
    name: "Credit / Debit card",
    description: "Visa, Mastercard, RuPay and Amex, issued in India",
  },
  netbanking: { name: "Net banking", description: "All major Indian banks supported" },
  wallet: { name: "Wallets", description: "Paytm, Amazon Pay, Mobikwik, Freecharge" },
  cod: {
    name: "Cash on Delivery",
    description: "Pay in cash or by UPI when the order arrives",
  },
};

const dayRange = (days: [number, number]) =>
  days[0] === days[1] ? `${days[0]} working day` : `${days[0]} to ${days[1]} working days`;

export async function getStorefrontConfig(): Promise<StorefrontConfig> {
  const s = await getSettings();

  const deliveryOptions: DeliveryOption[] = [
    {
      id: "standard",
      name: "Standard delivery",
      description:
        s.shipping.freeThreshold > 0
          ? `Free on orders above ₹${s.shipping.freeThreshold.toLocaleString("en-IN")}. Handed to our courier partner within 2 business days.`
          : "Free on every order. Handed to our courier partner within 2 business days.",
      price: s.shipping.standardFee,
      minDays: s.shipping.standardDays[0],
      maxDays: s.shipping.standardDays[1],
    },
    {
      id: "express",
      name: "Express delivery",
      description: `Priority dispatch, delivered in ${dayRange(s.shipping.expressDays)}.`,
      price: s.shipping.expressFee,
      minDays: s.shipping.expressDays[0],
      maxDays: s.shipping.expressDays[1],
    },
    {
      id: "scheduled",
      name: "Pick your day",
      description: "Choose a delivery date up to 10 days out. Ideal for gifting.",
      price: s.shipping.scheduledFee,
      minDays: Math.max(s.shipping.standardDays[1], 4),
      maxDays: 10,
    },
  ];

  // Order matters: this is the order the payment step lists them in.
  const enabled: PaymentMethod["id"][] = (["upi", "card", "netbanking", "wallet", "cod"] as const).filter(
    (id) => s.payments[id],
  );

  return {
    deliveryOptions,
    paymentMethods: enabled.map((id) => ({ id, ...PAYMENT_COPY[id] })),
    rates: {
      freeThreshold: s.shipping.freeThreshold,
      standardFee: s.shipping.standardFee,
      gstRate: s.tax.gstRate,
    },
    codLimit: s.payments.codLimit,
    store: {
      name: s.store.name,
      supportEmail: s.store.supportEmail,
      supportPhone: s.store.supportPhone,
    },
  };
}
