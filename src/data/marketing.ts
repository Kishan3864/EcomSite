import type {
  Address,
  Banner,
  Customer,
  DeliveryOption,
  Offer,
  PaymentMethod,
  PromoTile,
  ReturnRequest,
} from "@/lib/types";
import { POOL, img } from "./images";
import { BUSINESS } from "@/config/business";

/* ------------------------------ Banners ---------------------------- */

export const heroBanners: Banner[] = [
  {
    id: "hb1",
    eyebrow: "Festive Edit 2026",
    title: "Everything for the weekend.",
    subtitle:
      "Electronics, home appliances, kitchen and fashion — stocked in-house, priced with nothing hidden at checkout.",
    cta: "Shop the edit",
    href: "/offers",
    image: { url: img(POOL.lifestyle[1], { fit: "ultrawide", w: 1800 }), alt: "WeekendCart product range" },
    align: "left",
    theme: "dark",
  },
  {
    id: "hb2",
    eyebrow: "New in Tech",
    title: "The Zenith 5 Pro has landed.",
    subtitle:
      "200MP triple camera, four years of updates, and a battery that survives an Indian commute. Now with exchange bonus.",
    cta: "See the Zenith 5 Pro",
    href: "/p/orbo-zenith-5-pro",
    image: { url: img(POOL.phones[1], { fit: "ultrawide", w: 1800 }), alt: "Orbo Zenith 5 Pro" },
    align: "right",
    theme: "dark",
  },
  {
    id: "hb3",
    eyebrow: "Fashion Edit",
    title: "Woven in Kaithoon. Worn everywhere.",
    subtitle:
      "A tighter fashion edit for the season, with the size chart and fabric stated on every product page.",
    cta: "Shop fashion",
    href: "/c/fashion/women",
    image: { url: img(POOL.womenwear[2], { fit: "ultrawide", w: 1800, h: 760 }), alt: "Handloom collection" },
    align: "left",
    theme: "dark",
  },
];

export const promoTiles: PromoTile[] = [
  {
    id: "pt1",
    title: "Under ₹999",
    subtitle: "Everyday things worth owning",
    href: "/products?maxPrice=999&sort=popularity",
    cta: "Shop now",
    image: { url: img(POOL.decor[1], { fit: "square", w: 700 }), alt: "Affordable everyday products" },
  },
  {
    id: "pt2",
    title: "Set up the home",
    subtitle: "Furniture with free assembly",
    href: "/c/home-living/furniture",
    cta: "Explore",
    image: { url: img(POOL.furniture[1], { fit: "square", w: 700 }), alt: "Home furniture" },
  },
  {
    id: "pt3",
    title: "Audio, sorted",
    subtitle: "ANC from ₹3,499",
    href: "/c/electronics/audio",
    cta: "Listen up",
    image: { url: img(POOL.audio[0], { fit: "square", w: 700 }), alt: "Headphones and audio" },
  },
  {
    id: "pt4",
    title: "The gifting shop",
    subtitle: "Wrapped and shipped free",
    href: "/c/jewellery",
    cta: "Find a gift",
    image: { url: img(POOL.jewellery[1], { fit: "square", w: 700 }), alt: "Jewellery gifts" },
  },
];

export const midBanners: Banner[] = [
  {
    id: "mb1",
    eyebrow: "Kitchen Week",
    title: "Triply that survives a decade of dal",
    subtitle: "Copperleaf cookware at up to 30% off, with a lifetime warranty on the base.",
    cta: "Shop cookware",
    href: "/c/kitchen/cookware",
    image: { url: img(POOL.kitchen[1], { fit: "wide", w: 1200 }), alt: "Copperleaf cookware" },
    align: "left",
    theme: "light",
  },
  {
    id: "mb2",
    eyebrow: "Run Club",
    title: "Trail shoes tuned for Indian roads",
    subtitle: "Terra Nine drops the Trail Runner 3 with a compound built for wet tarmac.",
    cta: "Shop footwear",
    href: "/c/fashion/footwear",
    image: { url: img(POOL.footwear[0], { fit: "wide", w: 1200 }), alt: "Running shoes" },
    align: "right",
    theme: "dark",
  },
];

/* ------------------------------ Offers ----------------------------- */

export const offers: Offer[] = [
  { id: "o1", code: "WEEKEND10", title: "10% off your first order", description: "New customers get 10% off, capped at ₹750. Works on everything except books.", type: "percent", value: 10, minSpend: 1499, maxDiscount: 750, expiresAt: "2026-12-31T23:59:59.000Z", accent: "#2c837c" },
  { id: "o2", code: "FESTIVE500", title: "Flat ₹500 off above ₹4,999", description: "Our festive season discount. Stacks with bank offers, not with other coupons.", type: "flat", value: 500, minSpend: 4999, expiresAt: "2026-11-15T23:59:59.000Z", accent: "#ee9014" },
  { id: "o3", code: "FREESHIP", title: "Free express shipping", description: "Skip the ₹99 express fee on any order above ₹999.", type: "shipping", value: 99, minSpend: 999, expiresAt: "2026-12-31T23:59:59.000Z", accent: "#1f6963" },
  { id: "o5", code: "TECH2000", title: "₹2,000 off electronics above ₹24,999", description: "Applies to phones, laptops, cameras and audio.", type: "flat", value: 2000, minSpend: 24999, categorySlug: "electronics", expiresAt: "2026-10-20T23:59:59.000Z", accent: "#164441" },
  { id: "o6", code: "HOME20", title: "20% off home and living", description: "Furniture, decor, bedding and rugs. Capped at ₹5,000.", type: "percent", value: 20, minSpend: 2999, maxDiscount: 5000, categorySlug: "home-living", expiresAt: "2026-11-30T23:59:59.000Z", accent: "#d2740c" },
];

export const offerMap = new Map(offers.map((o) => [o.code, o]));

/* ------------------------- Checkout options ------------------------ */

export const deliveryOptions: DeliveryOption[] = [
  { id: "standard", name: "Standard delivery", description: "Free on orders above ₹999. Handed to our courier partner within 2 business days.", price: 0, minDays: 3, maxDays: 5 },
  { id: "express", name: "Express delivery", description: "Priority dispatch, delivered in 1 to 2 working days.", price: 99, minDays: 1, maxDays: 2 },
  { id: "scheduled", name: "Pick your day", description: "Choose a delivery date up to 10 days out. Ideal for gifting.", price: 49, minDays: 4, maxDays: 10 },
];

export const paymentMethods: PaymentMethod[] = [
  { id: "upi", name: "UPI", description: "Google Pay, PhonePe, Paytm, BHIM or any UPI app", badge: "Fastest", offerText: "" },
  { id: "card", name: "Credit / Debit card", description: "Visa, Mastercard, RuPay and Amex, issued in India", offerText: "" },
  { id: "netbanking", name: "Net banking", description: "All major Indian banks supported" },
  { id: "wallet", name: "Wallets", description: "Paytm, Amazon Pay, Mobikwik, Freecharge" },
  { id: "cod", name: "Cash on Delivery", description: "Pay in cash or by UPI when the order arrives", badge: "Popular" },
];

export const upiApps = [
  { id: "gpay", name: "Google Pay", tone: "#2c837c" },
  { id: "phonepe", name: "PhonePe", tone: "#5b3fbf" },
  { id: "paytm", name: "Paytm", tone: "#1b6ea8" },
  { id: "bhim", name: "BHIM", tone: "#d2740c" },
];

export const banks = [
  "HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank",
  "Kotak Mahindra Bank", "Yes Bank", "IndusInd Bank", "Punjab National Bank",
];

export const wallets = ["Paytm Wallet", "Amazon Pay", "Mobikwik", "Freecharge"];

/* --------------------------- Customer data -------------------------- */

export const customer: Customer = {
  id: "cus_8814",
  name: "Ananya Iyer",
  email: "ananya.iyer@example.in",
  phone: "+91 98450 12345",
  memberSince: "2024-03-18T00:00:00.000Z",
  tier: "WeekendCart Club",
  avatarInitials: "AI",
  loyaltyPoints: 4820,
};

export const savedAddresses: Address[] = [
  {
    id: "addr_1",
    label: "Home",
    fullName: "Ananya Iyer",
    phone: "+91 98450 12345",
    line1: "402, Brigade Sanctuary, 12th Main",
    line2: "HSR Layout Sector 3",
    landmark: "Opposite the BDA park",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560102",
    isDefault: true,
  },
  {
    id: "addr_2",
    label: "Work",
    fullName: "Ananya Iyer",
    phone: "+91 98450 12345",
    line1: "Level 6, Prestige Tech Park, Tower C",
    line2: "Marathahalli Outer Ring Road",
    landmark: "Next to the Kadubeesanahalli signal",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560103",
    isDefault: false,
  },
  {
    id: "addr_3",
    label: "Other",
    fullName: "Lakshmi Iyer",
    phone: "+91 94440 55512",
    line1: "18, Sannidhi Street, Mylapore",
    landmark: "Behind Kapaleeshwarar temple",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600004",
    isDefault: false,
  },
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export const returnRequests: ReturnRequest[] = [
  {
    id: "ret_1",
    orderNumber: "MYR-2026-004182",
    productTitle: "Saanjh Linen Co-ord Set",
    image: img(POOL.womenwear[4], { fit: "square", w: 240 }),
    reason: "Size too large",
    status: "refunded",
    requestedAt: "2026-07-14T09:20:00.000Z",
    refundAmount: 4299,
    refundMode: "Original payment method (HDFC ****4412)",
  },
  {
    id: "ret_2",
    orderNumber: "MYR-2026-004691",
    productTitle: "Novair Drift Buds",
    image: img(POOL.audio[2], { fit: "square", w: 240 }),
    reason: "Left bud not charging",
    status: "picked_up",
    requestedAt: "2026-08-28T15:05:00.000Z",
    refundAmount: 3499,
    refundMode: "WeekendCart wallet credit",
  },
];

/* ----------------------------- Trust bar ---------------------------- */

export const trustBadges = [
  {
    icon: "truck",
    title: `Free delivery over ₹${BUSINESS.ops.freeShippingThreshold}`,
    body: `Dispatched in ${BUSINESS.ops.dispatchDays} business days, delivered in ${BUSINESS.ops.deliveryDaysMin}–${BUSINESS.ops.deliveryDaysMax}`,
  },
  {
    icon: "rotate-ccw",
    title: `${BUSINESS.ops.returnWindowDays}–${BUSINESS.ops.returnWindowExtendedDays} day returns`,
    body: "No restocking fee. Refunds go back to how you paid",
  },
  {
    icon: "shield-check",
    title: "Bought and invoiced by us",
    body: "A first-party store, not a marketplace. No third-party sellers",
  },
  {
    icon: "headset",
    title: "A person answers",
    body: BUSINESS.supportHours,
  },
];

export const popularSearches = [
  "wireless earbuds", "cotton kurta", "triply kadai", "running shoes",
  "vitamin c serum", "study desk", "silver earrings", "yoga mat",
  "5g phone under 20000", "bedsheet king size",
];

export const trendingSearches = [
  { term: "Zenith 5 Pro", href: "/search?q=zenith" },
  { term: "Cork yoga mat", href: "/search?q=yoga+mat" },
  { term: "Kota Doria saree", href: "/search?q=saree" },
  { term: "Air fryer", href: "/search?q=air+fryer" },
  { term: "Noise cancelling", href: "/search?q=anc" },
  { term: "Gold huggies", href: "/search?q=huggies" },
];
