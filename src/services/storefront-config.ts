import "server-only";

import type { DeliveryOption, PaymentMethod } from "@/lib/types";
import type { Rates } from "@/lib/pricing";
import { payuConfigured } from "@/lib/payments/payu";
import { upiConfigured } from "@/lib/payments/upi";
import { getAdminSession } from "@/lib/auth/admin";
import { getSettings, type StoreSettings } from "./settings";

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

/**
 * Which ways to pay are really on, worked out from the settings alone.
 *
 * Both the checkout's list and the homepage's promise of what this shop accepts
 * are built from this one place, because the two of them disagreeing is a lie
 * told to somebody who has not even reached the basket. The one thing it
 * deliberately does not know is whether an admin is signed in: answering that
 * needs cookies, and only the checkout has any business paying that price.
 */
function paymentSwitches(s: StoreSettings) {
  // Each option is offered only when it can actually take money. A method
  // switched on in the admin panel but missing its keys would be a dead end at
  // the last step of a checkout, which is the worst place to find one.
  const upi = s.payments.upi && upiConfigured();
  const gatewaySwitchedOn = s.payments.gateway && payuConfigured();

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
   * The "show the test checkout to everyone" switch in Settings → Payments
   * shows it to everyone anyway, for demonstrating the checkout to someone who
   * cannot sign into the admin panel. It is opt-in, and the option then says
   * plainly what it is. Take it off before the shop has customers who might
   * believe it.
   *
   * The mode is read exactly as `payuConfig()` reads it, so the warning a
   * customer is shown cannot disagree with the host their form is posted to.
   */
  const gatewayInTestMode = (process.env.PAYU_MODE?.trim() || "test") !== "live";
  const testGatewayIsPublic = s.payments.gatewayDemo;

  return {
    upi,
    gatewaySwitchedOn,
    gatewayInTestMode,
    testGatewayIsPublic,
    /** The gateway as a signed-out customer finds it, with no admin session in it. */
    gatewayForCustomers: gatewaySwitchedOn && (!gatewayInTestMode || testGatewayIsPublic),
  };
}

/**
 * The payment options as words, given whether the gateway is being offered.
 *
 * Shared by the shell and the checkout so the two can never describe the same
 * option differently — the only thing that varies between them is whether the
 * gateway is in the list at all.
 */
function describeMethods(
  s: StoreSettings,
  opts: { gatewayOn: boolean; gatewayInTestMode: boolean; testGatewayIsPublic: boolean },
): PaymentMethod[] {
  const { upi } = paymentSwitches(s);

  // Order matters: this is the order the payment step lists them in.
  const enabled: PaymentMethod["id"][] = [
    ...(upi ? (["upi"] as const) : []),
    ...(opts.gatewayOn ? (["online"] as const) : []),
    ...(s.payments.cod ? (["cod"] as const) : []),
  ];

  return enabled.map((id) => {
    const copy = PAYMENT_COPY[id];
    // Whoever reaches this branch needs telling which of the two systems
    // they are about to pay on, and what it will and will not do.
    if (id === "online" && opts.gatewayInTestMode) {
      return {
        id,
        name: copy.name,
        description: opts.testGatewayIsPublic
          ? "Demo — this is the card and net-banking checkout being tested. No real money moves and nothing is dispatched. Use UPI above for a real order."
          : "Test mode — only you can see this option. No real money moves, and the order it confirms is a test order. Customers are offered UPI.",
        badge: opts.testGatewayIsPublic ? "Demo only" : "Test · owner only",
      };
    }
    return { id, ...copy };
  });
}

/**
 * What the checkout offers, which is the only place the owner's own session
 * can change the answer.
 *
 * This reads cookies, so it belongs to `/checkout` and nowhere else. It used to
 * live in `getStorefrontConfig()` — which the shell around *every* storefront
 * page calls — and the cost of that was the whole shop: one `cookies()` read in
 * a shared layout opts every route into dynamic rendering, so switching the
 * gateway on in the admin panel quietly turned 200-odd prerendered pages into
 * pages rebuilt from the database on every single request.
 */
/**
 * "Is the owner the one looking at this page?" — asked so that it cannot fail.
 *
 * Kept apart from `getAdminSession()` deliberately. That function is right to
 * throw for the admin panel, where a broken session lookup must stop the page;
 * here the same throw would stop a customer's checkout, and the question being
 * asked is only ever a courtesy to the owner. So the failure is swallowed and
 * logged, and the answer defaults to "no".
 */
async function ownerIsSignedIn(): Promise<boolean> {
  try {
    return !!(await getAdminSession());
  } catch (error) {
    // Never swallow the framework's own control flow. Next signals redirect,
    // not-found and "this route cannot be static after all" by THROWING, and a
    // bare catch around a call that touches cookies() turns those signals into
    // silence — a redirect that does not happen, or worse, a dynamic page that
    // Next goes on believing it may cache. Only a genuine fault is swallowed.
    if (isFrameworkSignal(error)) throw error;
    console.error("[checkout] admin session lookup failed; treating as a customer:", error);
    return false;
  }
}

/** Next's control-flow throws, which carry a `digest` naming the signal. */
function isFrameworkSignal(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === "string" &&
    (digest === "DYNAMIC_SERVER_USAGE" ||
      digest.startsWith("NEXT_REDIRECT") ||
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

export async function getCheckoutPaymentMethods(): Promise<PaymentMethod[]> {
  const s = await getSettings();
  const { gatewaySwitchedOn, gatewayInTestMode, testGatewayIsPublic, gatewayForCustomers } =
    paymentSwitches(s);

  // Only ask who is here in the one case that can change the outcome.
  //
  // And never let the answer break the checkout. `getAdminSession()` reads a
  // cookie AND queries the database; either can fail, and this runs inside the
  // checkout LAYOUT, where a throw is not caught by the segment's own error
  // boundary and the shopper gets a bare "Internal Server Error" instead of a
  // page. A customer paying for a kettle must never be stopped by a lookup
  // whose only purpose is to decide whether the OWNER sees an extra option.
  //
  // Failing closed is the safe direction: `false` means "not the owner", so
  // the worst case is that the owner does not see their own test-mode option
  // and has to reload. No customer is ever shown a gateway that is off.
  const ownerIsWatching =
    gatewaySwitchedOn && gatewayInTestMode && !testGatewayIsPublic
      ? await ownerIsSignedIn()
      : false;

  return describeMethods(s, {
    gatewayOn: gatewayForCustomers || ownerIsWatching,
    gatewayInTestMode,
    testGatewayIsPublic,
  });
}

export async function getStorefrontConfig(): Promise<StorefrontConfig> {
  const s = await getSettings();

  // One delivery. A shop this size cannot honour a priority promise made at
  // checkout, and offering a choice it cannot keep is worse than offering
  // none — so the speed is the one the courier actually gives, and the price
  // is the one the shipping settings set.
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
  ];

  const { gatewayInTestMode, testGatewayIsPublic, gatewayForCustomers } = paymentSwitches(s);

  // Deliberately no admin session, therefore no cookies: this is the shell
  // around every page, and one cookie read here costs the whole site its
  // static rendering. The owner's own view of a test gateway is resolved in
  // `getCheckoutPaymentMethods()`, on the one route that can afford it.
  return {
    deliveryOptions,
    paymentMethods: describeMethods(s, {
      gatewayOn: gatewayForCustomers,
      gatewayInTestMode,
      testGatewayIsPublic,
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

/**
 * What a signed-out visitor will actually be offered at checkout.
 *
 * Reads settings only — NO getAdminSession(), therefore NO cookies() — so the
 * homepage, which is statically revalidated every 120s, can call this without
 * being forced into dynamic rendering. getSettings() is cache()d.
 *
 * The owner-only test-gateway branch deliberately does NOT apply: this answers
 * what a customer gets, not what the owner sees.
 */
export async function getPublicPaymentMethods(): Promise<{
  upi: boolean;
  gateway: boolean;
  cod: boolean;
  codLimit: number;
}> {
  const s = await getSettings();
  const { upi, gatewayForCustomers } = paymentSwitches(s);

  // Cash on delivery is the live switch, never BUSINESS.ops.codEnabled: that is
  // a literal written when the shop was drawn up and it has been wrong since
  // the day the owner turned the option off.
  return { upi, gateway: gatewayForCustomers, cod: s.payments.cod, codLimit: s.payments.codLimit };
}
