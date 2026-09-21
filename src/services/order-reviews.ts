import "server-only";

import { db } from "@/lib/db";
import { reviewTokenValid } from "@/lib/order-token";
import { cleanReview, reviewProblem, type ReviewDraft } from "@/lib/review-rules";
import { REVIEW_REQUESTS } from "@/config/review-requests";
import { insertReviewOnce, reviewStatusWord } from "./reviews";
import { visibleProducts } from "./visibility";

/**
 * Reviews that start from an order: the link in the review email, and what it
 * is allowed to do.
 *
 * The email is read on a phone that has usually never signed in, so the link
 * carries a token (src/lib/order-token.ts, purpose "order-review:") instead of
 * relying on a session. What the token grants is decided here and nowhere
 * else, and it is deliberately narrow:
 *
 *   - it names one order, and only that order's products can be reviewed
 *   - only once each, as the account that placed the order
 *   - only once the order has reached the customer (delivered, or delivered
 *     and sent back — the same rule the product page applies)
 *   - only for REVIEW_REQUESTS.linkValidDays after delivery
 *   - only products a shopper can currently see
 *
 * It shows the order number, the delivery date and the products — nothing of
 * the address, the payment or the invoice — and it signs nobody in. Every
 * review still waits for moderation.
 *
 * On the visibility allowlist (eslint.config.mjs and
 * scripts/check-visibility.ts): its one product read goes through
 * visibleProducts(), so a product hidden since the order was placed is never
 * offered for review.
 */

const DAY = 24 * 60 * 60 * 1000;

/** The goods reached the customer. Mirrors RECEIVED in ./reviews.ts. */
const RECEIVED = ["DELIVERED", "RETURNED"];

const ORDER_SELECT = {
  id: true,
  number: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  total: true,
  deliveredAt: true,
  customerId: true,
  contactName: true,
  contactEmail: true,
  shipCity: true,
  emailsSent: true,
  customer: { select: { name: true } },
  lines: { select: { id: true, productId: true, title: true, image: true, variantLabel: true } },
  returns: { select: { orderLineId: true, status: true } },
} as const;

export type ReviewOrder = NonNullable<Awaited<ReturnType<typeof loadReviewOrder>>>;

export function loadReviewOrder(orderId: string) {
  return db.order.findUnique({ where: { id: orderId }, select: ORDER_SELECT });
}

/** One product from an order, as the review email and the review page show it. */
export interface ReviewItem {
  productId: string;
  slug: string;
  title: string;
  /** The image the customer saw at checkout, else the product's first image. */
  image: string | null;
  variantLabel: string | null;
  /** This customer has already reviewed it, whatever became of the review. */
  reviewed: boolean;
}

/**
 * The products in an order that may be reviewed, one entry per product.
 *
 * A product bought twice in two variants is still one product with one review,
 * so it appears once. Lines whose product has since been deleted, or hidden,
 * are left out. `leaveOutReturned` drops lines with a return in progress or
 * done — the email should not ask somebody to rate the thing they sent back —
 * while the review page keeps them, since a returned product did reach them
 * and they may well have something worth saying about it.
 */
export async function reviewItems(
  order: ReviewOrder,
  options: { leaveOutReturned?: boolean } = {},
): Promise<ReviewItem[]> {
  const returnedLines = new Set(
    order.returns.filter((r) => r.status !== "REJECTED").map((r) => r.orderLineId),
  );

  const lines = order.lines.filter(
    (line): line is typeof line & { productId: string } =>
      !!line.productId && !(options.leaveOutReturned && returnedLines.has(line.id)),
  );
  const ids = [...new Set(lines.map((l) => l.productId))];
  if (ids.length === 0) return [];

  const [visible, reviewed] = await Promise.all([
    db.product.findMany({
      where: visibleProducts({ id: { in: ids } }),
      select: {
        id: true,
        slug: true,
        title: true,
        images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    order.customerId
      ? db.review.findMany({
          where: { customerId: order.customerId, productId: { in: ids } },
          select: { productId: true },
        })
      : Promise.resolve([]),
  ]);

  const byId = new Map(visible.map((p) => [p.id, p]));
  const done = new Set(reviewed.map((r) => r.productId));
  const seen = new Set<string>();
  const items: ReviewItem[] = [];

  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    items.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: line.image || product.images[0]?.url || null,
      variantLabel: line.variantLabel,
      reviewed: done.has(product.id),
    });
  }
  return items;
}

/* ------------------------------------------------------------- the link */

export type ReviewLinkState =
  | {
      ok: false;
      /**
       * invalid     — bad token, unknown order, or a product not in it. One
       *               answer for all three, so the link cannot be used to learn
       *               which order ids exist.
       * expired     — past linkValidDays from delivery.
       * not-received — the order has not reached the customer (or was cancelled).
       * unavailable — the product is no longer on sale.
       */
      reason: "invalid" | "expired" | "not-received" | "unavailable";
    }
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      deliveredAt: string;
      /** The name and city the review will be published under. */
      author: string;
      location: string;
      item: ReviewItem;
      /** Where this customer's review of it stands, if they already wrote one. */
      existing: "pending" | "published" | "hidden" | null;
      /** The order's other reviewable products, for "also in this order". */
      others: ReviewItem[];
    };

function authorOf(order: ReviewOrder) {
  return {
    author: order.customer?.name?.trim() || order.contactName.trim(),
    location: order.shipCity.trim() || "India",
  };
}

export async function reviewLinkState(
  orderId: string,
  productId: string,
  token: string | null,
): Promise<ReviewLinkState> {
  if (!reviewTokenValid(orderId, token)) return { ok: false, reason: "invalid" };

  const order = await loadReviewOrder(orderId);
  // No account to publish under: the account was deleted, or the order is
  // from before checkout required one. Nothing to attribute a review to.
  if (!order || !order.customerId) return { ok: false, reason: "invalid" };
  if (!order.lines.some((l) => l.productId === productId)) return { ok: false, reason: "invalid" };

  if (!RECEIVED.includes(order.status) || !order.deliveredAt) return { ok: false, reason: "not-received" };
  if (Date.now() - order.deliveredAt.getTime() > REVIEW_REQUESTS.linkValidDays * DAY) {
    return { ok: false, reason: "expired" };
  }

  const items = await reviewItems(order);
  const item = items.find((i) => i.productId === productId);
  if (!item) return { ok: false, reason: "unavailable" };

  const mine = item.reviewed
    ? await db.review.findFirst({
        where: { productId, customerId: order.customerId },
        select: { status: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.number,
    deliveredAt: order.deliveredAt.toISOString(),
    ...authorOf(order),
    item,
    existing: mine ? reviewStatusWord(mine.status) : null,
    others: items.filter((i) => i.productId !== productId),
  };
}

const LINK_ERRORS: Record<Exclude<ReviewLinkState, { ok: true }>["reason"], string> = {
  invalid: "This review link is not valid. Please open it again from the email.",
  expired: "This review link has expired.",
  "not-received": "This order has not been delivered yet, so it cannot be reviewed.",
  unavailable: "This product is no longer on sale, so it cannot be reviewed.",
};

/**
 * Takes a review from the link. Every rule is checked again here — the page
 * having shown a form proves nothing about the request that arrives.
 */
export async function reviewFromLink(input: {
  orderId: string;
  productId: string;
  token: string | null;
  draft: ReviewDraft;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const state = await reviewLinkState(input.orderId, input.productId, input.token);
  if (!state.ok) return { ok: false, error: LINK_ERRORS[state.reason] };
  if (state.existing) return { ok: false, error: "You have already reviewed this product — thank you." };

  const problem = reviewProblem(input.draft);
  if (problem) return { ok: false, error: problem };
  const { rating, title, body } = cleanReview(input.draft);

  // reviewLinkState refused an order without an account, so this is set.
  const order = await loadReviewOrder(input.orderId);
  if (!order?.customerId) return { ok: false, error: LINK_ERRORS.invalid };

  const written = await insertReviewOnce({
    productId: input.productId,
    customerId: order.customerId,
    author: state.author,
    location: state.location,
    rating,
    title,
    body,
  });
  if (!written) return { ok: false, error: "You have already reviewed this product — thank you." };
  return { ok: true };
}
