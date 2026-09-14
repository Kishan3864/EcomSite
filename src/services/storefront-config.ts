import "server-only";

import type { DeliveryOption, PaymentMethod } from "@/lib/types";
import type { Rates } from "@/lib/pricing";
import { payuConfigured } from "@/lib/payments/payu";
import { upiConfigured } from "@/lib/payments/upi";
import { getAdminSession } from "@/lib/auth/admin";
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
  // One option for everything the gateway takes. PayU's own checkout then
  // offers UPI (Google Pay, PhonePe, Paytm), cards, net banking and wallets, so
  // repeating those choices here would only add a step and a chance to pick
  // the wrong one.
  online: {
    name: "Pay online — card, UPI, net banking",
    description:
      "Credit and debit cards, UPI, net banking and wallets on PayU's secure checkout. Confirmed the moment it goes through.",
    badge: "Fastest",
  },
  // Paid straight into the shop's bank account by QR or a tap through to the
  // customer's own app. No gateway stands in between, which is why the wait
  // for confirmation is named here rather than discovered afterwards.
  upi: {
    name: "UPI — Google Pay, PhonePe, Paytm",
    description:
      "Scan a QR or tap through to your UPI app. Your order is reserved straight away and confirmed once we see the payment.",
    badge: "Recommended",
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
  //
  // Each option is offered only when it can actually take money. A method
  // switched on in the admin panel but missing its keys would be a dead end at
  // the last step of a checkout, which is the worst place to find one.
  const upiOn = s.payments.upi && upiConfigured();
  const gatewaySwitchedOn =
    (s.payments.card || s.payments.netbanking || s.payments.wallet) && payuConfigured();

  /**
   * A gateway in test mode is shown to the owner, and by default to nobody
   * else.
   *
   * A warning label is not enough on its own. PayU's test checkout carries a
   * "Simulate Success transaction" button; a customer who pressed it would get
   * a genuinely signed success, and the order would be marked paid with no
   * money behind it. So the safe default is that only a signed-in admin is
   * offered it — enough to test the whole flow on the real site without
   * exposing it to anyone else.
   *
   * PAYU_TEST_PUBLIC=1 shows it to everyone anyway, for demonstrating the
   * checkout to someone who cannot sign into the admin panel. It is opt-in,
   * and the option then says plainly what it is. Take it off before the shop
   * has customers who might believe it.
   */
  const gatewayInTestMode = (process.env.PAYU_MODE?.trim() || "test") !== "live";
  const testGatewayIsPublic = process.env.PAYU_TEST_PUBLIC?.trim() === "1";
  const ownerIsWatching =
    gatewaySwitchedOn && gatewayInTestMode && !testGatewayIsPublic
      ? !!(await getAdminSession())
      : false;
  const gatewayOn =
    gatewaySwitchedOn && (!gatewayInTestMode || testGatewayIsPublic || ownerIsWatching);

  const enabled: PaymentMethod["id"][] = [
    ...(upiOn ? (["upi"] as const) : []),
    ...(gatewayOn ? (["online"] as const) : []),
    ...(s.payments.cod ? (["cod"] as const) : []),
  ];

  return {
    deliveryOptions,
    paymentMethods: enabled.map((id) => {
      const copy = PAYMENT_COPY[id];
      // Whoever reaches this branch needs telling which of the two systems
      // they are about to pay on, and what it will and will not do.
      if (id === "online" && gatewayInTestMode) {
        return {
          id,
          name: copy.name,
          description: testGatewayIsPublic
            ? "Demo — this is the card and net-banking checkout being tested. No real money moves and nothing is dispatched. Use UPI above for a real order."
            : "Test mode — only you can see this option. No real money moves, and the order it confirms is a test order. Customers are offered UPI.",
          badge: testGatewayIsPublic ? "Demo only" : "Test · owner only",
        };
      }
      return { id, ...copy };
    }),
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
