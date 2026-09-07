import type { QuestionAnswer, Review } from "@/lib/types";
import { products } from "./products";
import { seeded } from "@/lib/utils";

const NAMES = [
  "Ananya Iyer", "Rohit Deshpande", "Fatima Sheikh", "Karthik Nair", "Priya Menon",
  "Aditya Raghavan", "Meera Joshi", "Sandeep Kaur", "Vikram Bhatt", "Ishita Sen",
  "Rahul Verma", "Nandini Rao", "Arjun Pillai", "Tanvi Shah", "Imran Qureshi",
  "Devika Krishnan", "Siddharth Bose", "Ritu Agarwal", "Manish Choudhary", "Sneha Kulkarni",
];

const CITIES = [
  "Bengaluru, KA", "Mumbai, MH", "New Delhi, DL", "Pune, MH", "Chennai, TN",
  "Hyderabad, TS", "Kolkata, WB", "Ahmedabad, GJ", "Jaipur, RJ", "Kochi, KL",
  "Lucknow, UP", "Indore, MP", "Chandigarh, CH", "Guwahati, AS", "Bhubaneswar, OD",
];

const POSITIVE_TITLES = [
  "Exactly what the listing promised",
  "Worth every rupee",
  "Better in person than in the photos",
  "Has become part of my daily routine",
  "Quality you can feel immediately",
  "Delivered fast, packed properly",
  "Would buy again without thinking",
  "Finally, something built for us",
];

const MIXED_TITLES = [
  "Good product, one small niggle",
  "Happy overall, sizing runs slightly big",
  "Solid, but the packaging could improve",
  "Does the job, delivery took a day extra",
];

const NEGATIVE_TITLES = [
  "Not quite what I expected",
  "Fine, but overpriced for what it is",
];

const POSITIVE_BODIES = [
  "Ordered on a Tuesday, arrived Thursday morning in Bengaluru. The finish is genuinely premium — no rough edges, no loose parts. I have used it every day for three weeks now and it still looks new.",
  "I was sceptical about buying this online without seeing it, but the photographs are honest. Colour is accurate, dimensions are accurate, and the build feels like something that will last years rather than months.",
  "Have bought cheaper alternatives twice before and replaced them both. This one has survived a Mumbai monsoon and daily use. Paying a little more up front worked out cheaper.",
  "The attention to detail is what got me — the packaging, the little care card, the way it is finished on the underside where nobody looks. That tells you something about the brand.",
  "My mother borrowed it within two days of it arriving and has not returned it. Ordering a second one. That is the highest praise I can give.",
  "Customer support answered on WhatsApp in under ten minutes when I had a question about care. Product is excellent, but the service is what will bring me back.",
];

const MIXED_BODIES = [
  "The product itself is very good — no complaints on quality or finish. My only note is that the size runs a little larger than the chart suggests, so consider sizing down if you are between sizes.",
  "Everything is as described and I am keeping it. Delivery slipped by a day past the promised date, which was mildly annoying but not a dealbreaker.",
  "Great build and it looks lovely. The instructions could be clearer — I worked it out, but a QR code to a short video would have saved me twenty minutes.",
];

const NEGATIVE_BODIES = [
  "It is a perfectly decent product, but at this price I expected a little more. The finish is good, not exceptional. Returned without any hassle, which I will say was a genuinely painless process.",
  "The colour is a shade darker than it appears on screen. Quality is fine otherwise. Three stars because I would have chosen differently had the photos been more accurate.",
];

function pick<T>(arr: readonly T[], rand: () => number) {
  return arr[Math.floor(rand() * arr.length)];
}

export const reviews: Review[] = products.flatMap((product) => {
  const rand = seeded(`rev-${product.id}`);
  const count = 4 + Math.floor(rand() * 4);

  return Array.from({ length: count }, (_, i) => {
    const roll = rand();
    const rating = roll > 0.32 ? 5 : roll > 0.14 ? 4 : roll > 0.06 ? 3 : 2;
    const positive = rating >= 4;
    const mixed = rating === 3;

    const daysAgo = 3 + Math.floor(rand() * 300);
    const created = new Date(2026, 8, 1);
    created.setDate(created.getDate() - daysAgo);

    return {
      id: `${product.id}-r${i + 1}`,
      productId: product.id,
      author: pick(NAMES, rand),
      location: pick(CITIES, rand),
      rating,
      title: positive
        ? pick(POSITIVE_TITLES, rand)
        : mixed
          ? pick(MIXED_TITLES, rand)
          : pick(NEGATIVE_TITLES, rand),
      body: positive
        ? pick(POSITIVE_BODIES, rand)
        : mixed
          ? pick(MIXED_BODIES, rand)
          : pick(NEGATIVE_BODIES, rand),
      createdAt: created.toISOString(),
      verified: rand() > 0.15,
      helpfulCount: Math.floor(rand() * 180),
      images:
        rand() > 0.72 ? [product.images[1].url, product.images[2].url] : undefined,
    } satisfies Review;
  });
});

export const reviewsByProduct = reviews.reduce<Record<string, Review[]>>((acc, r) => {
  (acc[r.productId] ??= []).push(r);
  return acc;
}, {});

/* ------------------------------- Q&A ------------------------------ */

const QA_BANK: [string, string][] = [
  ["Is this suitable for daily use, or is it more of an occasional product?", "Daily use is exactly what it was designed for. Our internal testing runs to 500 cycles, which works out to roughly two years of everyday handling."],
  ["Does it come with a proper bill for warranty claims?", "Yes. A GST invoice is emailed the moment your order is confirmed and is also downloadable from My Orders. That is all you need for any warranty claim."],
  ["How does the sizing compare to other Indian brands?", "It is true to standard Indian sizing. If you are between two sizes we suggest going up, since the fit is deliberately not skin-tight."],
  ["Can I return it if the colour does not match my room?", "Absolutely. You have the full return window from delivery, and pickup is free from every serviceable pincode."],
  ["Is Cash on Delivery available for this item?", "COD is available on orders below ₹25,000. Above that we ask for prepaid payment, purely because of courier insurance limits."],
  ["How long does delivery usually take to a tier-2 city?", "Metro deliveries are 1 to 2 days. Tier-2 and tier-3 cities are typically 3 to 5 days, and you will see the exact date on the product page once you enter your pincode."],
  ["Is the product covered if it arrives damaged in transit?", "Fully covered. Report it within 48 hours with a photograph and we ship a replacement the same day, before the damaged unit is even picked up."],
  ["Does the price include GST?", "Yes, every price you see on Mayura is inclusive of GST. There are no additional charges at checkout beyond shipping, which is shown before you pay."],
];

export const questions: QuestionAnswer[] = products.flatMap((product) => {
  const rand = seeded(`qa-${product.id}`);
  const count = 3 + Math.floor(rand() * 3);
  const used = new Set<number>();

  return Array.from({ length: count }, (_, i) => {
    let idx = Math.floor(rand() * QA_BANK.length);
    while (used.has(idx)) idx = (idx + 1) % QA_BANK.length;
    used.add(idx);
    const [question, answer] = QA_BANK[idx];

    const answered = new Date(2026, 7, 1);
    answered.setDate(answered.getDate() - Math.floor(rand() * 200));

    return {
      id: `${product.id}-q${i + 1}`,
      productId: product.id,
      question,
      answer,
      askedBy: pick(NAMES, rand).split(" ")[0],
      answeredBy: rand() > 0.5 ? "Mayura Support" : "Seller",
      answeredAt: answered.toISOString(),
      upvotes: Math.floor(rand() * 90),
    } satisfies QuestionAnswer;
  });
});

export const questionsByProduct = questions.reduce<Record<string, QuestionAnswer[]>>(
  (acc, q) => {
    (acc[q.productId] ??= []).push(q);
    return acc;
  },
  {},
);
