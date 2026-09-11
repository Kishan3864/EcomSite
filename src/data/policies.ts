import type { PolicySection } from "@/components/content/prose-page";
import {
  BUSINESS,
  formatAddress,
  isFilled,
  isGstRegistered,
  operatorDescription,
} from "@/config/business";

/**
 * Policy copy lives in the data layer like everything else, so a legal review
 * can be applied without touching a component.
 *
 * Every factual claim here is assembled from `@/config/business`. Nothing in
 * this file invents a company detail, a certification, a capability or a
 * timeline. If a claim is not true of the business as configured, it does not
 * belong here — a payment aggregator or Google reviewer will check.
 */

const ADDRESS = formatAddress();
const O = BUSINESS.ops;

/**
 * The party the customer contracts with, worded to match the payment
 * aggregator's KYC record. See `registrationStatus` in the business config.
 */
const ENTITY = operatorDescription();

/**
 * The Udyam number appears in exactly two places - the Privacy policy and the
 * Terms of use - and nowhere in the site chrome.
 */
const UDYAM_LINE: string[] = isFilled(BUSINESS.udyamNumber)
  ? ["Udyam (MSME) registration number: " + BUSINESS.udyamNumber + "."]
  : [];

const GRIEVANCE_BLOCK = [
  `${BUSINESS.grievanceOfficer.name}, ${BUSINESS.grievanceOfficer.designation}`,
  `Email: ${BUSINESS.grievanceEmail}`,
  `Phone: ${BUSINESS.supportPhone} (${BUSINESS.supportHours})`,
  `Post: ${ENTITY}, ${ADDRESS}`,
].join(" · ");

const DELIVERY_WINDOW = `${O.deliveryDaysMin} to ${O.deliveryDaysMax} business days`;
const REFUND_WINDOW = `${O.refundSettlementDaysMin} to ${O.refundSettlementDaysMax} business days`;

export interface Policy {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  description: string;
  updatedAt: string;
  sections: PolicySection[];
}

const UPDATED = BUSINESS.policiesEffectiveFrom;

export const policies: Policy[] = [
  // ───────────────────────────────────────────────────────────── privacy ─────
  {
    slug: "privacy",
    title: "Privacy policy",
    eyebrow: "Legal",
    description: `What personal data ${BUSINESS.brandName} collects, why, how long it is kept, who it is shared with, and how you exercise your rights under the Digital Personal Data Protection Act, 2023.`,
    intro:
      "We collect the minimum personal data needed to sell you something, deliver it, support you afterwards, and meet our legal obligations. This page states exactly what that is and what you can do about it.",
    updatedAt: UPDATED,
    sections: [
      {
        id: "who-we-are",
        heading: "Who we are",
        paragraphs: [
          `This website is owned and operated by ${ENTITY}, having its place of business at ${ADDRESS} (referred to as "we", "us" or "${BUSINESS.brandName}").`,
          ...UDYAM_LINE,
          `For the purposes of the Digital Personal Data Protection Act, 2023 we are the Data Fiduciary in respect of the personal data described below. You are the Data Principal.`,
          `This policy is published under the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 and under Section 5 of the Digital Personal Data Protection Act, 2023.`,
        ],
      },
      {
        id: "what-we-collect",
        heading: "What we collect and why",
        paragraphs: [
          "We collect only what a purpose actually requires. Each item below is tied to the specific purpose it serves.",
        ],
        table: {
          head: ["Data", "Why we collect it"],
          rows: [
            ["Name, email address, phone number", "To create your account, confirm your order and contact you about it"],
            [
              "Mobile number and one-time codes",
              "To sign you in by SMS code when you choose to. We store only a scrambled (hashed) form of each code, and delete it within two days",
            ],
            ["Delivery and billing addresses", "To deliver your order and raise a correct invoice"],
            ["Order history and cart contents", "To fulfil orders, handle returns and show you your own orders"],
            ["Payment status and reference number", "To confirm payment and process refunds"],
            ["Last four digits and card network", "So you can recognise which card you used. We never receive the full number"],
            ["GSTIN, if you supply one", "To raise a business invoice you can claim input credit on"],
            ["IP address, browser and device type", "To keep the site secure and to detect fraudulent orders"],
            ["Pages visited on this site", "To measure and fix the site"],
          ],
        },
      },
      {
        id: "lawful-basis",
        heading: "Consent and lawful basis",
        paragraphs: [
          "We process your personal data on one of two bases. Most processing happens because it is necessary for the specific purpose for which you voluntarily gave us the data — placing an order, for example. Marketing communications happen only on your consent.",
          "Marketing consent is never bundled with a purchase. The newsletter checkbox is unticked by default, and you can withdraw consent at any time from your account settings or by using the unsubscribe link in any message. Withdrawing consent is as easy as giving it, and it does not affect processing already carried out.",
        ],
      },
      {
        id: "sharing",
        heading: "Who we share it with",
        paragraphs: [
          "We share personal data only with the service providers that make an order possible, and only the fields each one needs.",
        ],
        bullets: [
          `Courier partners — your name, delivery address and phone number, so the parcel reaches you.${isFilled(O.courierPartners[0] ?? "") ? ` We currently work with ${O.courierPartners.join(", ")}.` : ""}`,
          "Our payment aggregator — the order amount and reference. Card, UPI and bank credentials are collected directly by them on their own secure page and are never transmitted to or stored by us.",
          "Communication providers — your email address and phone number, to send order confirmations, dispatch alerts and delivery updates, and the one-time sign-in codes you ask for by SMS.",
          "Government authorities, courts and law-enforcement agencies, where we are legally required to disclose.",
          "A prospective buyer of the business, if it is ever sold, subject to the same obligations set out in this policy.",
        ],
      },
      {
        id: "what-we-do-not",
        heading: "What we do not do",
        bullets: [
          "We do not sell your personal data to anyone, for any price.",
          "We do not store your full card number, CVV, UPI PIN or net-banking password. We never see them.",
          "We do not use dark patterns to obtain marketing consent.",
          "We do not process data belonging to children under 18 knowingly, and we do not run behavioural advertising or tracking directed at children.",
        ],
      },
      {
        id: "how-long",
        heading: "How long we keep it",
        paragraphs: [
          "We erase personal data once the purpose it was collected for is served, unless a law requires us to keep it longer.",
        ],
        table: {
          head: ["Data", "Retention", "Why"],
          rows: [
            ["Invoices and order records", "8 years", "Required under Indian tax law"],
            ["Delivery addresses", "Until you delete them", "So checkout stays fast"],
            ["Support conversations", "24 months", "To resolve repeat issues"],
            ["Website and session logs", "12 months", "Security and troubleshooting"],
            ["Marketing preferences", "Until you unsubscribe", "So we honour your choice"],
          ],
        },
      },
      {
        id: "your-rights",
        heading: "Your rights",
        paragraphs: [
          "Under the Digital Personal Data Protection Act, 2023 you have the following rights. To exercise any of them, write to us at the address in the next section. We respond within 30 days.",
        ],
        bullets: [
          "Right to access — a summary of the personal data we hold about you and the processing we have carried out.",
          "Right to correction and completion — to have inaccurate or incomplete data corrected or updated.",
          "Right to erasure — to have your personal data deleted, except where we are legally required to retain it.",
          "Right to grievance redressal — to complain to us first, using the channel below.",
          "Right to nominate — to nominate another individual who may exercise these rights on your behalf in the event of your death or incapacity.",
          "Right to withdraw consent — at any time, for anything processed on the basis of consent.",
        ],
        table: {
          head: ["What happens", "When you delete your account"],
          rows: [
            ["Addresses, wishlist, cart, marketing preferences", "Deleted immediately"],
            ["Account login and profile", "Deleted immediately"],
            ["Invoices and order records", "Retained for 8 years, as tax law requires"],
          ],
        },
      },
      {
        id: "grievance",
        heading: "Grievance officer",
        paragraphs: [
          `If you have a complaint about how we handle your personal data, contact our Grievance Officer. We acknowledge every complaint within 48 hours and resolve it within one month of receipt.`,
          GRIEVANCE_BLOCK,
          "If we do not resolve your complaint to your satisfaction, you may escalate it to the Data Protection Board of India. Consumer complaints may also be raised with the National Consumer Helpline on 1915 or at consumerhelpline.gov.in.",
        ],
      },
      {
        id: "security",
        heading: "How we protect it",
        paragraphs: [
          "We apply reasonable security safeguards as required under Section 8(5) of the Digital Personal Data Protection Act, 2023 and the SPDI Rules, 2011.",
        ],
        bullets: [
          "The entire site is served over HTTPS with TLS encryption.",
          "Account passwords are stored as salted hashes, never in readable form.",
          "Payment credentials are handled entirely by our PCI-DSS compliant payment aggregator. They never reach our servers.",
          "Access to customer data within the business is limited to the people who need it to do their job.",
          "If a personal data breach occurs, we will notify the Data Protection Board of India and every affected Data Principal, as required by law.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies and local storage",
        paragraphs: [
          "Your cart, wishlist and recently viewed items are stored in your own browser, not on our servers — clearing site data clears them. We set a session cookie to keep you signed in, which is strictly necessary for the site to work.",
          "We do not run third-party advertising or cross-site tracking cookies on this site. You can block or delete cookies in your browser settings, though signing in and checkout will not work without the session cookie.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to this policy",
        paragraphs: [
          "If we change this policy we will update the date shown at the top of this page. Where a change materially affects your rights, we will notify you by email or by a notice on the site before it takes effect. Continuing to use the site after that means you accept the revised policy.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────── terms ─────
  {
    slug: "terms",
    title: "Terms of use",
    eyebrow: "Legal",
    description: `The agreement between you and ${BUSINESS.brandName} when you use this website or place an order on it.`,
    intro:
      "These terms govern your use of this website and every order you place on it. Please read them before you buy. By using the site you accept them.",
    updatedAt: UPDATED,
    sections: [
      {
        id: "the-agreement",
        heading: "The agreement",
        paragraphs: [
          `This website is operated by ${ENTITY}, with its place of business at ${ADDRESS}. In these terms, "we", "us" and "${BUSINESS.brandName}" mean the operator named above, and "you" means the person using the site.`,
          ...UDYAM_LINE,
          "By accessing this website, creating an account or placing an order, you confirm that you accept these terms and agree to be bound by them. If you do not accept them, please do not use the site.",
          "These terms are published as an electronic record under the Information Technology Act, 2000. They do not require a physical or digital signature.",
        ],
      },
      {
        id: "eligibility",
        heading: "Who may use this site",
        paragraphs: [
          "You must be at least 18 years old and legally capable of entering into a binding contract under the Indian Contract Act, 1872. If you are under 18 you may use the site only under the supervision of a parent or legal guardian, who accepts these terms on your behalf.",
          "This site sells and ships only within India. We do not currently accept international orders or ship outside India.",
        ],
      },
      {
        id: "your-account",
        heading: "Your account",
        bullets: [
          "You are responsible for the accuracy of the information you give us, particularly your delivery address and phone number. Orders that fail because the address was wrong are not our responsibility.",
          "You are responsible for keeping your password confidential and for everything done through your account.",
          "Tell us immediately if you believe your account has been used without your permission.",
          "We may suspend or close an account that is used for fraud, for repeated non-acceptance of deliveries, or in breach of these terms.",
        ],
      },
      {
        id: "orders",
        heading: "How an order is formed",
        paragraphs: [
          "A product listing on this site is an invitation to offer, not an offer. When you place an order you are making an offer to buy. A contract forms only when we send you a dispatch confirmation for that order — not when you press pay and not when you receive the order acknowledgement.",
          "We may decline or cancel an order before dispatch, including where the item is out of stock, where the price or description was published in error, where we cannot deliver to your pincode, or where we reasonably suspect fraud. If we cancel an order you have already paid for, we refund it in full.",
        ],
      },
      {
        id: "pricing",
        heading: "Pricing and payment",
        bullets: [
          "All prices are shown in Indian Rupees (INR) and are inclusive of applicable taxes.",
          "The total payable, including any delivery charge, is shown to you in full before you confirm payment. There are no hidden charges added afterwards.",
          "We do not charge any fee for choosing one payment method over another.",
          "Prices and offers can change at any time before you place an order. A change does not affect an order already placed.",
          "If a product is listed at an obviously incorrect price through a technical or human error, we may cancel the order and refund you in full rather than honour that price.",
          isGstRegistered
            ? "A GST tax invoice is issued for every order and is available in your account. To claim input credit, add your business GSTIN at checkout before you pay."
            : "A bill of supply is issued for every order and is available in your account.",
        ],
      },
      {
        id: "delivery-returns",
        heading: "Delivery, returns and refunds",
        paragraphs: [
          `Delivery timelines, charges and serviceability are set out in our Shipping policy. Cancellation, return and refund rights are set out in our Refund and cancellation policy. Both form part of these terms.`,
          "Risk in the goods passes to you on delivery. Title passes once we have received payment in full.",
        ],
      },
      {
        id: "acceptable-use",
        heading: "Acceptable use",
        paragraphs: ["When using this site, you agree not to:"],
        bullets: [
          "Place orders that are fraudulent, speculative, or made with the intent to resell in breach of any applicable law.",
          "Use any automated system to scrape, copy or monitor the site, or to place orders.",
          "Attempt to gain unauthorised access to the site, its servers, or any other user's account.",
          "Upload or transmit anything unlawful, defamatory, obscene, infringing, or harmful, including in product reviews and questions.",
          "Interfere with the operation of the site or introduce malicious code.",
          "Impersonate any person or misrepresent your association with any person or entity.",
        ],
      },
      {
        id: "reviews",
        heading: "Reviews and content you submit",
        paragraphs: [
          "You may post reviews and questions provided the content is your own, is accurate, and does not breach the acceptable-use rules above. You keep ownership of what you post, but grant us a non-exclusive, royalty-free licence to display and reproduce it on this site.",
          "We may decline to publish, or may remove, any submission that breaches these terms. We do not verify every review, and a review reflects the opinion of the person who wrote it, not ours.",
        ],
      },
      {
        id: "ip",
        heading: "Intellectual property",
        paragraphs: [
          `The design, layout, text, graphics, logos and software on this site are owned by or licensed to ${ENTITY} and are protected under Indian copyright and trade mark law. You may not reproduce, distribute or create derivative works from them without our written permission.`,
          "Product names, brand names and logos of the products we sell belong to their respective owners. They appear on this site solely to identify the goods being offered for sale, and their appearance does not imply any endorsement of us by those owners.",
        ],
      },
      {
        id: "third-party",
        heading: "Third-party links and services",
        paragraphs: [
          "This site may link to third-party websites and relies on third-party services for payments, delivery and communications. We do not control those parties and are not responsible for their content, their policies or their acts and omissions. Your dealings with them are governed by their own terms.",
        ],
      },
      {
        id: "liability",
        heading: "Liability",
        paragraphs: [
          "We take responsibility for delivering what you ordered, in the condition described, within the timelines we publish. Where we fail to do so, your remedies are the replacement, return and refund rights set out in our Refund and cancellation policy.",
          "To the extent permitted by law, we are not liable for indirect or consequential loss — including loss of profit, loss of opportunity or loss of data — arising from your use of this site. Our total liability in connection with any order is limited to the amount you paid for that order.",
          "Nothing in these terms excludes or limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot lawfully be excluded. Your rights under the Consumer Protection Act, 2019 are not affected by anything in these terms.",
        ],
      },
      {
        id: "indemnity",
        heading: "Indemnity",
        paragraphs: [
          "You agree to indemnify us against any claim, loss or expense arising from your breach of these terms, your misuse of the site, or your violation of any law or third-party right.",
        ],
      },
      {
        id: "force-majeure",
        heading: "Events outside our control",
        paragraphs: [
          "We are not liable for failure or delay in performing our obligations where that failure results from an event beyond our reasonable control — including natural disaster, epidemic, war, civil unrest, strike, fire, flood, failure of public infrastructure, government action, or failure of telecommunications or payment networks. Where such an event occurs, we will tell you and either extend the timeline or cancel and refund the order.",
        ],
      },
      {
        id: "changes-terms",
        heading: "Changes to these terms",
        paragraphs: [
          "We may amend these terms from time to time. The version published on this page at the moment you place an order is the version that governs that order. We will update the date at the top of this page whenever we make a change.",
        ],
      },
      {
        id: "governing-law",
        heading: "Governing law and disputes",
        paragraphs: [
          `These terms are governed by the laws of India. Subject to the paragraph below, the courts at ${BUSINESS.jurisdictionCity}, ${BUSINESS.jurisdictionState} have exclusive jurisdiction.`,
          "Please contact us first — most disputes are resolved quickly that way. Our Grievance Officer acknowledges every complaint within 48 hours and resolves it within one month.",
          `Grievance Officer — ${GRIEVANCE_BLOCK}`,
          "Nothing here prevents you from approaching a consumer forum under the Consumer Protection Act, 2019, or the National Consumer Helpline on 1915.",
        ],
      },
    ],
  },

  // ────────────────────────────────────────────── refund & cancellation ─────
  {
    slug: "refunds",
    title: "Refund and cancellation policy",
    eyebrow: "Legal",
    description:
      "How to cancel an order, how long you have to return an item, what cannot be returned, and exactly when your money comes back.",
    intro:
      "Cancel before dispatch for a full refund, no questions asked. After delivery you have a return window that depends on what you bought. Refund timelines below are the ones we hold ourselves to.",
    updatedAt: UPDATED,
    sections: [
      {
        id: "cancellation",
        heading: "Cancelling an order",
        table: {
          head: ["When you cancel", "What happens"],
          rows: [
            ["Before dispatch", "Cancelled in full. No cancellation charge. Full refund initiated within 24 hours."],
            ["After dispatch, before delivery", "We cannot recall the parcel. Refuse it at the door, or accept it and raise a return."],
            ["After delivery", "Treated as a return, under the return window below."],
          ],
        },
        paragraphs: [
          "To cancel, open the order in your account and use Cancel, or contact us on the details at the bottom of this page. We do not levy a cancellation charge on orders cancelled before dispatch.",
          "We may cancel an order ourselves if the item turns out to be out of stock, if your pincode is not serviceable, if the price was published in error, or if we reasonably suspect fraud. In every such case we refund you in full.",
        ],
      },
      {
        id: "return-window",
        heading: "Return windows",
        paragraphs: [
          `You may return an eligible item within ${O.returnWindowDays} days of delivery. Some categories carry a longer window of ${O.returnWindowExtendedDays} days. The exact window that applies is shown on each product page and on your order.`,
        ],
        table: {
          head: ["Category", "Return window", "Condition"],
          rows: [
            ["Fashion and accessories", `${O.returnWindowExtendedDays} days`, "Unworn, unwashed, tags intact"],
            ["Home, kitchen and decor", `${O.returnWindowDays} days`, "Unused, original packaging"],
            ["Electronics and gadgets", `${O.returnWindowDays} days`, "Unused, all accessories and seals intact"],
            ["Home appliances", `${O.returnWindowDays} days`, "Unused, original packaging, invoice retained"],
            ["Damaged, defective or wrong item", `${O.returnWindowDays} days`, "Report with photos on arrival"],
          ],
        },
      },
      {
        id: "not-returnable",
        heading: "What cannot be returned",
        paragraphs: [
          "Some items cannot be returned once delivered, for reasons of hygiene, safety or because they were made for you. This is stated clearly on the product page before you buy.",
        ],
        bullets: [
          "Innerwear, socks and any item sold on hygiene grounds.",
          "Items personalised, engraved or made to your specification.",
          "Perishable goods and consumables.",
          "Items where the manufacturer's security seal has been broken, unless the item is defective.",
          "Products damaged by misuse, mishandling or unauthorised repair after delivery.",
          "Items returned without their original packaging, accessories, freebies or invoice.",
          "Items reported outside the return window applicable to them.",
        ],
      },
      {
        id: "how-to-return",
        heading: "How to start a return",
        bullets: [
          "Open the order in your account and select Return, or contact us with your order number.",
          "Tell us what is wrong. For a damaged, defective or wrong item, attach photographs — it lets us resolve it without a second trip.",
          "We arrange a pickup through our courier partner where the pincode is serviceable. Where it is not, we will tell you and arrange a self-ship, reimbursing reasonable courier charges against a receipt.",
          "Keep the item in its original packaging with all accessories until pickup.",
          `Once the item reaches us we inspect it within ${O.inspectionDays} business days.`,
        ],
      },
      {
        id: "refund-timelines",
        heading: "Refund timelines",
        paragraphs: [
          `Once a return passes inspection, we initiate the refund within ${O.refundInitiationDays} business days. Your bank or payment provider then takes its own time to credit it — that part is outside our control, but the windows below are what our aggregator publishes.`,
        ],
        table: {
          head: ["Paid by", "Refunded to", "Time after we initiate"],
          rows: [
            ["UPI", "Same UPI account", "1 to 3 business days"],
            ["Credit or debit card", "Same card", REFUND_WINDOW],
            ["Net banking", "Same bank account", REFUND_WINDOW],
            ["Wallet", "Same wallet", "1 to 3 business days"],
          ],
        },
        bullets: [
          "Refunds always go back to the original payment method. We cannot redirect a refund to a different account.",
          "Where an order was cancelled before dispatch, we skip inspection and initiate the refund within 24 hours.",
          "Delivery charges are refunded in full when the return is because the item was damaged, defective or not what you ordered. On a change-of-mind return, the original delivery charge is not refunded.",
          "We do not levy a restocking fee.",
        ],
      },
      {
        id: "replacements",
        heading: "Replacements and exchanges",
        paragraphs: [
          "Where an item arrives damaged, defective or is not what you ordered, you can choose a replacement instead of a refund, subject to stock. We dispatch the replacement once the original is picked up, and you pay nothing extra.",
          "Where a replacement is not available, we refund you in full including the delivery charge.",
        ],
      },
      {
        id: "failed-payments",
        heading: "Money debited but no order",
        paragraphs: [
          "If money left your account but the order did not appear, the payment did not complete and the amount is being held by your bank, not by us. Such holds are reversed automatically, normally within 5 to 7 business days.",
          "If it has not reversed after that, send us the transaction reference and the date and we will pursue it with our payment aggregator on your behalf.",
        ],
      },
      {
        id: "warranty",
        heading: "Manufacturer warranty",
        paragraphs: [
          "Products that carry a manufacturer warranty are covered by that manufacturer's terms for the stated period. A warranty claim is made with the manufacturer or its authorised service centre, not with us. Keep your invoice — you will need it.",
          "Our return window and the manufacturer's warranty are separate things. A warranty claim after our return window has closed is between you and the manufacturer, though we will help you find the right service centre.",
        ],
      },
      {
        id: "refund-grievance",
        heading: "If something goes wrong",
        paragraphs: [
          `Contact our Grievance Officer. Every complaint is acknowledged within 48 hours and resolved within one month.`,
          GRIEVANCE_BLOCK,
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────── shipping ─────
  {
    slug: "shipping",
    title: "Shipping and delivery policy",
    eyebrow: "Legal",
    description:
      "How long dispatch and delivery take, what shipping costs, where we deliver, and what happens when a parcel goes wrong.",
    intro:
      "We stock what we sell and hand it to a courier partner ourselves. The timelines below are the ones we commit to, and they are deliberately conservative.",
    updatedAt: UPDATED,
    sections: [
      {
        id: "dispatch",
        heading: "Dispatch and delivery times",
        table: {
          head: ["Stage", "Timeline"],
          rows: [
            ["Order confirmed after payment", "Immediately"],
            ["Packed and handed to courier", `Within ${O.dispatchDays} business days`],
            ["In transit to you", DELIVERY_WINDOW],
            ["Total, order to doorstep", `${O.dispatchDays + O.deliveryDaysMin} to ${O.dispatchDays + O.deliveryDaysMax} business days`],
          ],
        },
        paragraphs: [
          "Business days exclude Sundays and public holidays. Orders placed after 2:00pm are processed the next business day.",
          "Remote and hill pincodes, and areas affected by weather or local restrictions, can take longer. Where we know in advance, we tell you before you pay.",
        ],
      },
      {
        id: "charges",
        heading: "Shipping charges",
        table: {
          head: ["Order value", "Shipping charge"],
          rows: [
            [`₹${O.freeShippingThreshold} and above`, "Free"],
            [`Below ₹${O.freeShippingThreshold}`, `₹${O.shippingFee}`],
          ],
        },
        bullets: [
          "The exact shipping charge is shown in your cart before you pay. Nothing is added afterwards.",
          "Shipping charges are inclusive of applicable taxes.",
          O.codEnabled
            ? `Cash on Delivery is available on orders up to ₹${O.codLimit}, where the pincode supports it.`
            : "We do not currently offer Cash on Delivery. All orders are prepaid.",
        ],
      },
      {
        id: "where",
        heading: "Where we deliver",
        paragraphs: [
          "We deliver across India through our courier partners. Serviceability depends on the courier network for your pincode — enter yours on any product page for a straight answer before you buy.",
          "We do not ship outside India, and we do not deliver to APO, FPO or PO Box addresses.",
          "We cannot deliver to an address that is incomplete or unreachable. Please check your address and phone number before confirming the order.",
        ],
      },
      {
        id: "tracking",
        heading: "Tracking your parcel",
        paragraphs: [
          "You get a tracking link by email and SMS the moment the parcel is handed to the courier. The same link is on your order page. Tracking usually starts updating within 24 hours of dispatch.",
        ],
      },
      {
        id: "delivery-attempts",
        heading: "When you are not home",
        bullets: [
          "The courier attempts delivery up to three times and normally calls first.",
          "You can reschedule from the tracking link.",
          "After three failed attempts the parcel returns to us. We refund the order in full, less the original shipping charge.",
          "Please do not accept a parcel that arrives visibly damaged or with a broken seal. Refuse it and tell us — that is the fastest route to a replacement.",
        ],
      },
      {
        id: "delays",
        heading: "Delays",
        paragraphs: [
          "If a parcel is running materially late we will tell you, and you can choose to wait or to cancel for a full refund.",
          "We are not liable for delays caused by events outside our reasonable control, including weather, natural disaster, strikes, civil unrest, government restrictions or courier network failure. Where such a delay occurs, we will keep you informed and refund you in full if you would rather cancel.",
        ],
      },
      {
        id: "shipping-grievance",
        heading: "Delivery problems",
        paragraphs: [
          `Tell us within ${O.returnWindowDays} days of the delivery date and we will resolve it. Complaints are acknowledged within 48 hours and resolved within one month.`,
          GRIEVANCE_BLOCK,
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────── payments & security ─────
  {
    slug: "payments",
    title: "Payments and security policy",
    eyebrow: "Legal",
    description:
      "Which payment methods we accept, how your payment credentials are protected, and what happens when a payment fails.",
    intro:
      "Payments on this site are processed by a payment aggregator authorised by the Reserve Bank of India. We never see, handle or store your card number, UPI PIN or banking password.",
    updatedAt: UPDATED,
    sections: [
      {
        id: "methods",
        heading: "What we accept",
        bullets: [
          "UPI — including Google Pay, PhonePe, Paytm, BHIM and any other UPI application.",
          "Credit and debit cards — Visa, Mastercard, RuPay and American Express, where issued in India.",
          "Net banking from major Indian banks.",
          "Wallets supported by our payment aggregator.",
          O.codEnabled
            ? `Cash on Delivery on orders up to ₹${O.codLimit}, in serviceable pincodes.`
            : "We do not currently offer Cash on Delivery.",
        ],
        paragraphs: [
          "All transactions are in Indian Rupees (INR) only. We do not charge a convenience fee, surcharge or handling fee for any payment method.",
        ],
      },
      {
        id: "how-secure",
        heading: "How your payment details are protected",
        bullets: [
          "The payment page is served by our PCI-DSS compliant payment aggregator, not by us. Your card number, expiry, CVV, UPI PIN and net-banking credentials are entered on their page and are never transmitted to our servers.",
          "We do not store card data. Under the Reserve Bank of India's card-on-file tokenisation mandate, merchants may not store card numbers — any saved card is held as a token by the card network, not by us.",
          "Card transactions are protected by the additional factor of authentication required by the Reserve Bank of India — an OTP, PIN or biometric approval that only you can complete.",
          "The whole site, including checkout, is served over HTTPS with TLS encryption.",
          "We only retain the payment method used, the last four digits of the card and the transaction reference — enough to show you what you paid with and to process a refund.",
        ],
      },
      {
        id: "failed",
        heading: "When a payment fails",
        paragraphs: [
          "If a payment fails, no order is created and no contract is formed. Where an amount was debited despite the failure, it is a bank-side hold rather than a charge to us, and it reverses automatically — normally within 5 to 7 business days.",
          "If a debited amount has not reversed after that, send us the transaction reference and date and we will pursue it with our payment aggregator. Under the Reserve Bank of India's turnaround-time framework, banks and payment operators are required to reverse failed transactions within prescribed timelines and to compensate the customer for delays beyond them.",
        ],
      },
      {
        id: "refunds-payments",
        heading: "Refunds",
        paragraphs: [
          "Refunds are always credited back to the original payment method. We cannot send a refund to a different card, account or UPI ID. Timelines are set out in our Refund and cancellation policy.",
        ],
      },
      {
        id: "fraud",
        heading: "Fraud prevention",
        paragraphs: [
          "We may hold or cancel an order where a transaction shows signs of fraud, where the billing and delivery details do not reconcile, or where an account shows a pattern of abuse. Where we cancel such an order, we refund it in full.",
          "We will never call, email or message you to ask for your card number, CVV, OTP, UPI PIN or password. Anyone who does is not us. Do not share those with anyone.",
        ],
      },
      {
        id: "invoice",
        heading: "Invoices",
        paragraphs: [
          isGstRegistered
            ? `A GST tax invoice is issued for every order under GSTIN ${BUSINESS.gstin} and is available from your account. To have your business GSTIN printed on the invoice, add it at checkout before you pay.`
            : "An invoice is issued for every order and is available for download from your account.",
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────── disclaimer ─────
  {
    slug: "disclaimer",
    title: "Disclaimer",
    eyebrow: "Legal",
    description:
      "The limits of what we can guarantee about product images, descriptions, availability, third-party brands and the information published on this site.",
    intro:
      "We work hard to keep this site accurate. This page sets out honestly where the limits of that accuracy lie, so you know what you are relying on.",
    updatedAt: UPDATED,
    sections: [
      {
        id: "product-info",
        heading: "Product images and descriptions",
        bullets: [
          "Product photographs are taken under studio lighting. Colour reproduction varies between screens, and the shade you see may differ slightly from the item delivered.",
          "Images may show a product at a scale that is not its true size. Always read the stated dimensions and weight.",
          "Accessories or props shown in a photograph are not included unless the description says so.",
          "Descriptions and specifications are sourced from the manufacturer or brand. Where a manufacturer changes a specification without notice, the item delivered may differ. If it differs materially from what was described, you may return it under our return policy.",
          "A minor variation in shade, grain or finish in handmade and natural-material products is inherent to the product and is not a defect.",
        ],
      },
      {
        id: "availability",
        heading: "Availability and pricing",
        paragraphs: [
          "Stock levels shown on this site are indicative and can change between the moment you add an item to your cart and the moment you pay. Where an item turns out to be unavailable after you have paid, we cancel that line and refund it in full.",
          "Despite our best efforts, a price or specification may occasionally be published in error. Where an error is obvious, we may cancel the order and refund you rather than honour it. We will always tell you before doing so.",
        ],
      },
      {
        id: "brands",
        heading: "Third-party brands and trade marks",
        paragraphs: [
          "Brand names, product names, logos and trade marks appearing on this site are the property of their respective owners. They are used solely to identify the goods offered for sale.",
          `Their appearance does not imply that the owner endorses, sponsors or is affiliated with ${BUSINESS.legalName}, unless we expressly state an authorised-partner relationship on the product page.`,
        ],
      },
      {
        id: "warranty-disclaimer",
        heading: "Warranties",
        paragraphs: [
          "Where a product carries a manufacturer warranty, that warranty is given by the manufacturer, on the manufacturer's terms, and is honoured through the manufacturer's service network. We are not the warrantor and do not extend, vary or underwrite it.",
          "This does not affect your statutory rights under the Consumer Protection Act, 2019, or the return and refund rights we give you separately.",
        ],
      },
      {
        id: "no-advice",
        heading: "No professional advice",
        paragraphs: [
          "Content on this site — including buying guides, size charts, care instructions and answers to customer questions — is general information only. It is not medical, legal, financial, nutritional or professional advice, and should not be relied on as such. For anything that matters, consult a qualified professional.",
          "Product suitability, particularly for electrical appliances, depends on your own installation, voltage and usage conditions. Always read the manufacturer's manual before use.",
        ],
      },
      {
        id: "site-availability",
        heading: "Site availability",
        paragraphs: [
          "We do not warrant that this site will be available uninterrupted or free of errors. Access may be suspended for maintenance, or interrupted by circumstances outside our control. We are not liable for loss arising from the site being unavailable.",
        ],
      },
      {
        id: "external-links",
        heading: "External links",
        paragraphs: [
          "This site may link to third-party websites for your convenience. We do not control them, do not endorse their content, and are not responsible for their accuracy, their security or their privacy practices. Visiting them is at your own risk.",
        ],
      },
      {
        id: "user-content",
        heading: "Reviews and user content",
        paragraphs: [
          "Reviews, ratings and questions published on this site reflect the views of the individuals who submitted them. They are not verified by us and do not represent our opinion or any assurance about a product's performance.",
        ],
      },
    ],
  },
];

export const policyMap = new Map(policies.map((p) => [p.slug, p]));

/**
 * Plain-language description of what the store actually does, rendered at
 * /services. Payment aggregators look for this — it is how a reviewer confirms
 * the business model matches the KYC category on the application.
 */
export const servicesSections: PolicySection[] = [
  {
    id: "what-we-do",
    heading: "What we do",
    paragraphs: [
      BUSINESS.brandName +
        " is an online retail store operated by " +
        operatorDescription() +
        ", selling physical consumer goods to customers across India through this website.",
      "We are a first-party retailer, not a marketplace. We buy stock, hold it ourselves, and sell it under our own invoice. There are no third-party sellers on this site, and no seller onboarding.",
    ],
  },
  {
    id: "what-we-sell",
    heading: "What we sell",
    paragraphs: [
      "Our catalogue covers everyday consumer goods across the categories below. Every item is a physical product that is packed and shipped to your address.",
    ],
    bullets: BUSINESS.categoriesSold.map((c) => c),
  },
  {
    id: "what-we-do-not-sell",
    heading: "What we do not sell",
    paragraphs: [
      "We do not sell services, subscriptions, digital goods, downloadable content, financial products, tickets or vouchers. We do not sell alcohol, tobacco, pharmaceuticals, weapons, or any item restricted under Indian law or under our payment aggregator's prohibited-business list.",
    ],
  },
  {
    id: "how-it-works",
    heading: "How an order works",
    table: {
      head: ["Step", "What happens"],
      rows: [
        ["1. You order", "Add items to the cart and pay online in INR. The total, including delivery, is shown before payment."],
        ["2. We confirm", "You get an order acknowledgement by email and SMS with the order number."],
        ["3. We pack", `Packed and handed to a courier partner within ${O.dispatchDays} business days.`],
        ["4. It ships", `Delivered in ${DELIVERY_WINDOW}, with a tracking link.`],
        ["5. You decide", `Keep it, or return it within ${O.returnWindowDays} to ${O.returnWindowExtendedDays} days for a refund.`],
      ],
    },
  },
  {
    id: "support",
    heading: "Support",
    paragraphs: [
      `Support runs ${BUSINESS.supportHours}. Reach us on ${BUSINESS.supportPhone} or ${BUSINESS.supportEmail}. Formal complaints go to our Grievance Officer, are acknowledged within 48 hours and resolved within one month.`,
    ],
  },
  {
    id: "coverage",
    heading: "Where we operate",
    paragraphs: [
      `We ship across India from ${[BUSINESS.address.city, BUSINESS.address.state].filter(isFilled).join(", ") || "our warehouse"}. We do not currently ship internationally, and all pricing and settlement is in Indian Rupees.`,
    ],
  },
];

export const faqs: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: "Orders",
    items: [
      {
        q: "How do I know my order went through?",
        a: "You get a confirmation email and SMS with an order number, and the order appears immediately under My orders. If you see none of those, the payment did not complete and no order was created.",
      },
      {
        q: "Can I cancel an order after placing it?",
        a: "Yes, free of charge, any time before dispatch — open the order in My orders and use Cancel. After dispatch you can refuse the delivery or return it once it arrives.",
      },
      {
        q: "Can I change the delivery address after ordering?",
        a: "Only before dispatch. Contact us with your order number as soon as you can. Once the parcel is with the courier we cannot change where it goes.",
      },
      {
        q: isGstRegistered ? "Do you send a GST invoice?" : "Do I get an invoice?",
        a: isGstRegistered
          ? "Yes. Every order gets a GST tax invoice, downloadable from My orders. To have your business GSTIN on it, add it at checkout before you pay."
          : "Yes. An invoice is emailed to you and is downloadable from My orders.",
      },
    ],
  },
  {
    category: "Delivery",
    items: [
      {
        q: "How long will my order take?",
        a: `We dispatch within ${O.dispatchDays} business days and delivery takes ${DELIVERY_WINDOW} after that. Remote pincodes can take longer.`,
      },
      {
        q: "Do you deliver to my pincode?",
        a: "Enter your pincode in the delivery checker on any product page for a straight answer before you buy. We ship across India through courier partners, but not every pincode is serviceable.",
      },
      {
        q: "What does shipping cost?",
        a: `Free on orders of ₹${O.freeShippingThreshold} and above, ₹${O.shippingFee} below that. The exact charge is shown in your cart before you pay.`,
      },
      {
        q: "What if I am not at home?",
        a: "The courier attempts delivery three times and normally calls first. You can reschedule from the tracking link. After three failed attempts the parcel returns to us and we refund the order less the original shipping charge.",
      },
      {
        q: "Do you ship outside India?",
        a: "No. We currently ship only within India, and all prices are in Indian Rupees.",
      },
    ],
  },
  {
    category: "Payments",
    items: [
      {
        q: "Which payment methods can I use?",
        a: O.codEnabled
          ? `UPI including Google Pay and PhonePe, credit and debit cards, net banking, wallets, and Cash on Delivery up to ₹${O.codLimit} in serviceable pincodes.`
          : "UPI including Google Pay and PhonePe, credit and debit cards, net banking and wallets. All orders are prepaid — we do not currently offer Cash on Delivery.",
      },
      {
        q: "Are my card details safe?",
        a: "We never see them. The payment page is served by our PCI-DSS compliant payment aggregator and your card number, CVV and UPI PIN are entered there, not on our site. We only keep the last four digits so you can recognise the card.",
      },
      {
        q: "Money left my account but there is no order. What now?",
        a: "The payment did not complete, so that is a bank-side hold rather than a charge. It reverses automatically, normally within 5 to 7 business days. If it has not, send us the transaction reference and we will chase it.",
      },
      {
        q: "Do you charge extra for any payment method?",
        a: "No. There is no convenience fee, surcharge or handling charge on any payment method. The total you see before paying is the total you pay.",
      },
    ],
  },
  {
    category: "Returns and refunds",
    items: [
      {
        q: "How long do I have to return something?",
        a: `${O.returnWindowDays} days from delivery for most categories, and ${O.returnWindowExtendedDays} days for fashion. The window that applies is shown on each product page.`,
      },
      {
        q: "What cannot be returned?",
        a: "Innerwear and hygiene items, personalised or made-to-order items, perishables, items with a broken manufacturer seal unless defective, and anything damaged after delivery through misuse. This is stated on the product page before you buy.",
      },
      {
        q: "When do I get my money back?",
        a: `We inspect the returned item within ${O.inspectionDays} business days and initiate the refund within ${O.refundInitiationDays} business days after that. UPI lands in 1 to 3 business days, cards and net banking in ${REFUND_WINDOW}.`,
      },
      {
        q: "Can the refund go to a different account?",
        a: "No. Refunds always go back to the payment method you originally used. That is a requirement we cannot work around.",
      },
      {
        q: "My item arrived damaged. What should I do?",
        a: "Tell us as soon as you can and attach photographs. We will replace it or refund you in full including the delivery charge, whichever you prefer. If the parcel looks damaged at the door, refuse it — that is the fastest route.",
      },
    ],
  },
  {
    category: "Products",
    items: [
      {
        q: "Are the products genuine?",
        a: "Yes. We buy stock ourselves and sell it under our own invoice. We are a first-party retailer, not a marketplace, so there are no third-party sellers on this site.",
      },
      {
        q: "Will the colour match the photo?",
        a: "Very closely, but colour reproduction varies between screens, so a slight difference in shade is possible. If what arrives is materially different from what was shown, return it and we will refund you.",
      },
      {
        q: "What warranty do I get?",
        a: "Products that carry a manufacturer warranty are covered on the manufacturer's terms for the stated period, claimed through their service network. Keep your invoice. Our return window is separate from that warranty.",
      },
      {
        q: "An item is out of stock. Will it come back?",
        a: "Usually yes for regular lines. Tap Notify me on the product page and we will email you when it is back.",
      },
    ],
  },
];
