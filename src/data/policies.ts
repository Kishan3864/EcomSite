import type { PolicySection } from "@/components/content/prose-page";

/**
 * Policy copy lives in the data layer like everything else, so a legal review
 * can be applied without touching a component.
 */

export interface Policy {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  description: string;
  updatedAt: string;
  sections: PolicySection[];
}

export const policies: Policy[] = [
  {
    slug: "privacy",
    title: "Privacy policy",
    eyebrow: "Legal",
    description:
      "What data Mayura collects, why we collect it, how long we keep it, and how you get it deleted.",
    intro:
      "We collect the minimum we need to sell you something and deliver it. This page says exactly what that is, in the order you are most likely to care about it.",
    updatedAt: "2026-08-01T00:00:00.000Z",
    sections: [
      {
        id: "what-we-collect",
        heading: "What we collect",
        paragraphs: [
          "There are only three reasons we hold your data: to complete an order, to support you afterwards, and because Indian tax law requires us to keep invoices.",
        ],
        bullets: [
          "Identity and contact: your name, email address, phone number and delivery addresses.",
          "Order data: what you bought, when, at what price, and where it was delivered.",
          "Payment metadata: the method used and the last four digits of a card. We never see or store a full card number — that stays with the payment processor.",
          "Device data: a session identifier, your approximate city from your IP address, and which pages you visited on this site.",
        ],
      },
      {
        id: "what-we-do-not",
        heading: "What we do not do",
        bullets: [
          "We do not sell your personal data to anyone, for any price, ever.",
          "We do not share your contact details with the brands whose products you buy.",
          "We do not use dark patterns to make you accept marketing. The newsletter checkbox is unticked by default.",
          "We do not run third-party advertising trackers on the checkout flow.",
        ],
      },
      {
        id: "how-long",
        heading: "How long we keep it",
        table: {
          head: ["Data", "Retention", "Why"],
          rows: [
            ["Invoices and order records", "8 years", "Required under Indian tax law"],
            ["Delivery addresses", "Until you delete them", "So checkout stays fast"],
            ["Support conversations", "24 months", "To resolve repeat issues"],
            ["Browsing and session data", "13 months", "To measure and fix the site"],
            ["Marketing preferences", "Until you unsubscribe", "So we honour your choice"],
          ],
        },
      },
      {
        id: "your-rights",
        heading: "Your rights",
        paragraphs: [
          "Under the Digital Personal Data Protection Act you can ask us for a copy of everything we hold about you, ask us to correct it, or ask us to delete it. Write to privacy@mayura.in and we will respond within 30 days, usually much sooner.",
          "Deleting your account removes your addresses, wishlist and marketing preferences immediately. Invoices survive deletion because we are legally required to keep them.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies and local storage",
        paragraphs: [
          "Your bag, wishlist and recently viewed items are stored in your browser, not on our servers. Clearing site data clears them. We use a single first-party analytics cookie to count page views, and no advertising cookies.",
        ],
      },
      {
        id: "contact-dpo",
        heading: "Who to contact",
        paragraphs: [
          "Our grievance officer is reachable at privacy@mayura.in or by post at Mayura Commerce Private Limited, 4th Floor, Ekam House, 27 Residency Road, Bengaluru 560025. If we do not resolve your complaint you may escalate to the Data Protection Board of India.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms and conditions",
    eyebrow: "Legal",
    description:
      "The agreement between you and Mayura Commerce Private Limited when you shop with us.",
    intro:
      "These are the rules of using Mayura. We have tried to write them in language a person can read rather than language a lawyer can hide behind.",
    updatedAt: "2026-08-01T00:00:00.000Z",
    sections: [
      {
        id: "the-agreement",
        heading: "The agreement",
        paragraphs: [
          "By placing an order you enter into a contract with Mayura Commerce Private Limited, CIN U52100KA2024PTC109887, registered in Bengaluru. The contract forms when we send your order confirmation email, not when you press the pay button.",
        ],
      },
      {
        id: "pricing",
        heading: "Pricing and availability",
        bullets: [
          "Every price shown includes GST. There are no charges at checkout beyond the shipping fee we display before you pay.",
          "Items in your bag are not reserved. Stock is allocated when the order is confirmed.",
          "If we list a price in obvious error — a phone at ₹99, for example — we may cancel the order and refund you in full rather than honour it.",
          "Prices can change without notice, but never after your order is confirmed.",
        ],
      },
      {
        id: "your-account",
        heading: "Your account",
        paragraphs: [
          "You are responsible for keeping your password confidential and for orders placed from your account. Tell us immediately if you think someone else has access. We may suspend an account we reasonably believe is being used fraudulently.",
        ],
      },
      {
        id: "acceptable-use",
        heading: "Acceptable use",
        bullets: [
          "Do not scrape the catalogue, resell our product photography, or attempt to interfere with the service.",
          "Reviews must describe a product you actually bought. We remove reviews that are paid for, defamatory, or contain personal information.",
          "Bulk orders placed for resale may be cancelled. We are a retail store.",
        ],
      },
      {
        id: "liability",
        heading: "Liability",
        paragraphs: [
          "Our liability for any order is limited to the amount you paid for it. We are not liable for indirect losses such as lost profits or missed occasions. Nothing here limits liability for death, personal injury or fraud, because it cannot lawfully be limited.",
        ],
      },
      {
        id: "governing-law",
        heading: "Governing law",
        paragraphs: [
          "These terms are governed by Indian law. Disputes go to the courts of Bengaluru, Karnataka. Consumer complaints can also be raised with the National Consumer Helpline on 1915.",
        ],
      },
    ],
  },
  {
    slug: "shipping",
    title: "Shipping policy",
    eyebrow: "Delivery",
    description:
      "Delivery timelines, charges, serviceable pincodes and what happens when a parcel goes missing.",
    intro:
      "We ship to about 19,000 pincodes across India using our own fleet in fourteen metros and vetted partners everywhere else. Here is what to expect.",
    updatedAt: "2026-08-01T00:00:00.000Z",
    sections: [
      {
        id: "charges",
        heading: "Charges",
        table: {
          head: ["Option", "Charge", "Timeline"],
          rows: [
            ["Standard, order above ₹999", "Free", "3 to 5 working days"],
            ["Standard, order below ₹999", "₹79", "3 to 5 working days"],
            ["Express", "₹99", "1 to 2 working days"],
            ["Pick your day", "₹49", "Up to 10 days out"],
            ["Large furniture", "Free", "7 to 12 working days, with assembly"],
          ],
        },
      },
      {
        id: "timelines",
        heading: "Timelines",
        paragraphs: [
          "Orders placed before 4pm on a working day are dispatched the same day. Metro deliveries usually take 1 to 2 days, tier-2 cities 3 to 4 days, and remote pincodes up to 7 days.",
          "The delivery date shown on the product page is calculated for the pincode you enter, not an all-India average. If we are going to miss it, we tell you before the date rather than after.",
        ],
      },
      {
        id: "tracking",
        heading: "Tracking",
        paragraphs: [
          "Every order gets an AWB number and a tracking page the moment it is packed. You also get an SMS when the parcel leaves our warehouse and again when it is out for delivery.",
        ],
      },
      {
        id: "problems",
        heading: "When something goes wrong",
        bullets: [
          "Parcel damaged in transit: report it within 48 hours with a photo and we ship a replacement the same day, before we collect the damaged one.",
          "Parcel marked delivered but not received: tell us within 72 hours and we open an investigation with the courier. You are not out of pocket while it runs.",
          "Three failed delivery attempts: the parcel returns to us and we refund you in full, minus nothing.",
          "Wrong address entered: contact support before dispatch and we will change it free of charge.",
        ],
      },
      {
        id: "serviceability",
        heading: "Serviceability",
        paragraphs: [
          "Enter your pincode on any product page to see whether we deliver, how long it takes and whether Cash on Delivery is available there. We do not currently ship outside India.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    title: "Return and refund policy",
    eyebrow: "Returns",
    description:
      "How long you have to return an item, what is not returnable, and how quickly refunds land.",
    intro:
      "If something is not right, send it back. Pickup is free, the process takes about ninety seconds, and we do not ask you to justify yourself.",
    updatedAt: "2026-08-01T00:00:00.000Z",
    sections: [
      {
        id: "windows",
        heading: "Return windows by category",
        table: {
          head: ["Category", "Window", "Condition"],
          rows: [
            ["Fashion and footwear", "14 days", "Unworn, tags attached"],
            ["Electronics", "10 days", "Original box and accessories"],
            ["Home, kitchen and furniture", "10 days", "Unused, original packaging"],
            ["Jewellery", "30 days", "Certificate and box included"],
            ["Beauty and wellness", "7 days", "Unopened and sealed only"],
            ["Books and stationery", "10 days", "Unmarked"],
          ],
        },
      },
      {
        id: "how-to",
        heading: "How to start a return",
        bullets: [
          "Go to My orders, choose the item and pick a reason. That is the whole form.",
          "A pickup is scheduled within 24 hours, usually for the next working day.",
          "Keep the item in its original packaging with tags attached. Our partner will not collect an item that is not packed.",
          "You get an SMS when we receive it, and again when the refund is initiated.",
        ],
      },
      {
        id: "refunds",
        heading: "Refund timelines",
        table: {
          head: ["Paid with", "Refund goes to", "Time after we receive the item"],
          rows: [
            ["UPI", "The same UPI ID", "1 to 2 working days"],
            ["Credit or debit card", "The same card", "5 to 7 working days"],
            ["Net banking", "The source bank account", "3 to 5 working days"],
            ["Wallet", "The same wallet", "1 working day"],
            ["Cash on Delivery", "Bank account you provide", "3 to 5 working days"],
          ],
        },
      },
      {
        id: "not-returnable",
        heading: "What we cannot take back",
        bullets: [
          "Beauty and personal care items that have been opened, for hygiene reasons.",
          "Innerwear and swimwear once the hygiene seal is broken.",
          "Made-to-order or personalised furniture and jewellery, unless it arrived faulty.",
          "Items returned without their original packaging, tags or accessories.",
          "Anything reported after the return window has closed. Contact support anyway — we look at genuine cases.",
        ],
      },
      {
        id: "exchanges",
        heading: "Exchanges",
        paragraphs: [
          "Size exchanges on fashion are free and unlimited within the return window. We ship the new size as soon as the pickup is scheduled rather than waiting for the old one to reach us.",
        ],
      },
    ],
  },
];

export const policyMap = new Map(policies.map((p) => [p.slug, p]));

export const faqs: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: "Orders",
    items: [
      {
        q: "How do I know my order went through?",
        a: "You get a confirmation email within a minute and an SMS shortly after. The order also appears immediately under My orders. If you see none of those, the payment did not go through and no money was taken.",
      },
      {
        q: "Can I change or cancel an order after placing it?",
        a: "Yes, until it is packed — usually a window of about two hours. Open the order in My orders and use Cancel. After dispatch you can refuse the delivery or return it once it arrives.",
      },
      {
        q: "Can I add an item to an order I already placed?",
        a: "Not to the same order, but place a second one and contact support with both numbers. If they have not been dispatched we will merge them and refund the duplicate shipping.",
      },
      {
        q: "Do you send a GST invoice?",
        a: "Every order gets a GST invoice by email and it is downloadable from My orders. For a business GSTIN on the invoice, add it at checkout before you pay.",
      },
    ],
  },
  {
    category: "Delivery",
    items: [
      {
        q: "How fast is delivery?",
        a: "One to two days in the fourteen metros we serve with our own fleet, three to five days elsewhere. The exact date appears on the product page once you enter your pincode.",
      },
      {
        q: "Do you deliver to my pincode?",
        a: "We ship to roughly 19,000 pincodes. Enter yours in the delivery checker on any product page for a straight answer, plus whether Cash on Delivery is available there.",
      },
      {
        q: "Can I choose a delivery date?",
        a: "Yes. Pick your day at checkout lets you choose any date up to ten days out for ₹49. It is popular for gifts and for people who travel.",
      },
      {
        q: "What if I am not home?",
        a: "The delivery partner calls first and will try three times across three days. You can also reschedule from the tracking page or ask them to leave it with a neighbour.",
      },
    ],
  },
  {
    category: "Payments",
    items: [
      {
        q: "Which payment methods do you accept?",
        a: "UPI, credit and debit cards, net banking from every major Indian bank, the main wallets, and Cash on Delivery on orders below ₹25,000.",
      },
      {
        q: "Is EMI available?",
        a: "Yes, on orders above ₹4,999 with most credit cards, and no-cost EMI on selected electronics. Options appear at the payment step once your card is entered.",
      },
      {
        q: "Are my card details safe?",
        a: "We never see your full card number. It goes directly to a PCI-DSS certified payment processor and we only ever store the last four digits so you can recognise the card.",
      },
      {
        q: "Why did my payment fail but money leave my account?",
        a: "That is a bank-side hold, not a charge. It reverses automatically within three to five working days. If it does not, send us the transaction reference and we will chase it for you.",
      },
    ],
  },
  {
    category: "Returns",
    items: [
      {
        q: "How long do I have to return something?",
        a: "Fourteen days for fashion, ten for electronics and home, thirty for jewellery, seven for unopened beauty. The exact window is printed on each product page.",
      },
      {
        q: "Is return pickup free?",
        a: "Yes, from every serviceable pincode. There is no return shipping charge and no restocking fee.",
      },
      {
        q: "When do I get my money back?",
        a: "The refund is initiated within 48 hours of the item reaching our warehouse. UPI lands in a day or two, cards take five to seven working days depending on your bank.",
      },
      {
        q: "Can I exchange for a different size instead?",
        a: "Yes, and it is free. We ship the new size as soon as the pickup is scheduled rather than making you wait for the first one to come back.",
      },
    ],
  },
  {
    category: "Products",
    items: [
      {
        q: "Are the products genuine?",
        a: "Every item is bought directly from the brand or made by the studio named on the page. We do not buy from grey-market distributors, which is why some products go out of stock rather than being restocked instantly.",
      },
      {
        q: "How do I know what size to order?",
        a: "Each fashion product has a size chart with actual garment measurements, not just S/M/L. If you are between sizes we say so on the page. Exchanges are free if we get it wrong.",
      },
      {
        q: "What warranty do I get?",
        a: "Full manufacturer warranty on everything, plus our own 7-day replacement for anything that arrives faulty. The warranty term is listed on each product page.",
      },
      {
        q: "Will an out-of-stock item come back?",
        a: "Usually yes for staples, and usually no for limited runs — we say which on the product page. Tap Notify me and we email you the moment it is back.",
      },
    ],
  },
];
