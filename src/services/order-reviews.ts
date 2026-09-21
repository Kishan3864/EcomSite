import "server-only";

import { db } from "@/lib/db";
import { mailConfigured, sendMail } from "@/lib/mail";
import { reviewToken, reviewTokenValid } from "@/lib/order-token";
import { cleanReview, reviewProblem, type ReviewDraft } from "@/lib/review-rules";
import { SITE } from "@/lib/emails/layout";
import { buildReviewEmail, type ReviewEmailKind } from "@/lib/emails/review-request";
import { REVIEW_REQUESTS } from "@/config/review-requests";
import { insertReviewOnce, reviewStatusWord } from "./reviews";
import { refundState } from "./refunds";
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
  reviewRequestedAt: true,
  customer: { select: { name: true } },
  lines: { select: { id: true, productId: true, title: true, image: true, variantLabel: true } },
  returns: { select: { orderLineId: true, status: true, refundAmount: true, refundId: true } },
  refunds: { select: { amount: true, status: true } },
  manualRefunds: { select: { amount: true } },
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
  /** The stars they gave it, when they have. */
  myRating: number | null;
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
  const lookups = await loadLookups([order]);
  return itemsFrom(order, lookups, options);
}

/** What the items of one or many orders need from the database, in two queries. */
interface Lookups {
  visible: Map<string, { id: string; slug: string; title: string; images: { url: string }[] }>;
  /** customerId → productId → the stars they gave it. */
  ratings: Map<string, Map<string, number>>;
}

async function loadLookups(orders: ReviewOrder[]): Promise<Lookups> {
  const ids = [...new Set(orders.flatMap((o) => o.lines.map((l) => l.productId)).filter((id): id is string => !!id))];
  const customers = [...new Set(orders.map((o) => o.customerId).filter((id): id is string => !!id))];
  if (ids.length === 0) return { visible: new Map(), ratings: new Map() };

  const [visible, reviews] = await Promise.all([
    db.product.findMany({
      where: visibleProducts({ id: { in: ids } }),
      select: {
        id: true,
        slug: true,
        title: true,
        images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    customers.length > 0
      ? db.review.findMany({
          where: { customerId: { in: customers }, productId: { in: ids } },
          select: { customerId: true, productId: true, rating: true },
        })
      : Promise.resolve([]),
  ]);

  const ratings = new Map<string, Map<string, number>>();
  for (const r of reviews) {
    if (!r.customerId) continue;
    if (!ratings.has(r.customerId)) ratings.set(r.customerId, new Map());
    ratings.get(r.customerId)!.set(r.productId, r.rating);
  }
  return { visible: new Map(visible.map((p) => [p.id, p])), ratings };
}

function itemsFrom(
  order: ReviewOrder,
  lookups: Lookups,
  options: { leaveOutReturned?: boolean } = {},
): ReviewItem[] {
  const returnedLines = new Set(
    order.returns.filter((r) => r.status !== "REJECTED").map((r) => r.orderLineId),
  );
  const mine = (order.customerId && lookups.ratings.get(order.customerId)) || new Map<string, number>();
  const seen = new Set<string>();
  const items: ReviewItem[] = [];

  for (const line of order.lines) {
    if (!line.productId) continue;
    if (options.leaveOutReturned && returnedLines.has(line.id)) continue;
    const product = lookups.visible.get(line.productId);
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    const rating = mine.get(product.id) ?? null;
    items.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: line.image || product.images[0]?.url || null,
      variantLabel: line.variantLabel,
      reviewed: rating !== null,
      myRating: rating,
    });
  }
  return items;
}

/**
 * Why this order may not be asked for reviews at all, or null if it may.
 *
 * Shared by the email and the on-page panel, so they can never disagree about
 * who is asked: only a delivered order, with an account to publish under, that
 * has not been fully refunded. Cancelled and returned orders stop at the
 * status check.
 */
function whyNotAsk(order: ReviewOrder): string | null {
  if (!order.customerId) return "no account on the order to publish a review under";
  if (order.status !== "DELIVERED") return `the order is ${order.status.toLowerCase()}, not delivered`;
  if (!order.deliveredAt) return "no delivery date on the order";
  // Fully refunded, by the ledger or by a decision to refund it all. Asking
  // somebody who got all their money back to rate the thing is tone-deaf.
  if (order.paymentStatus === "REFUND_DUE" || order.paymentStatus === "REFUNDED") {
    return "a full refund is due or recorded on this order";
  }
  if (order.total > 0 && refundState(order).returned >= order.total) return "the order has been fully refunded";
  return null;
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

/* ------------------------------------------------------ asking for them */

/** The product's review form, with this order's review token. */
export function reviewUrl(orderId: string, productId: string): string {
  return `${SITE}/review/${orderId}/${productId}?t=${encodeURIComponent(reviewToken(orderId))}`;
}

export type ReviewMailPlan =
  | { ok: true; items: ReviewItem[]; alreadyReviewed: number }
  /** `dueAt` is set when the only thing wrong is that it is too early. */
  | { ok: false; why: string; dueAt?: Date };

/**
 * Whether this order should get this email now, and about which products.
 *
 * Every rule of the brief is here, in one place, in the order a person would
 * check them — so the admin order page, the preview and the timer all give the
 * same answer, and the reason when it is no.
 */
export async function reviewMailPlan(
  order: ReviewOrder,
  kind: ReviewEmailKind,
  now: Date = new Date(),
  options: { ignoreTiming?: boolean } = {},
): Promise<ReviewMailPlan> {
  const { delayDays, maxAgeDays, reminderAfterDays, reminderGraceDays } = REVIEW_REQUESTS;

  if (kind === "review-reminder" && reminderAfterDays === null) {
    return { ok: false, why: "reminders are switched off in src/config/review-requests.ts" };
  }
  if (order.emailsSent.includes(kind)) return { ok: false, why: "already sent — it is sent once, never repeated" };
  if (!order.contactEmail) return { ok: false, why: "the order has no email address" };
  const why = whyNotAsk(order);
  if (why || !order.deliveredAt) return { ok: false, why: why ?? "no delivery date on the order" };

  if (!options.ignoreTiming) {
    const since = now.getTime() - order.deliveredAt.getTime();
    if (kind === "review-request") {
      const dueAt = new Date(order.deliveredAt.getTime() + delayDays * DAY);
      if (now < dueAt) return { ok: false, why: `not due until ${delayDays} days after delivery`, dueAt };
      if (since > maxAgeDays * DAY) return { ok: false, why: `delivered more than ${maxAgeDays} days ago` };
    } else {
      if (!order.emailsSent.includes("review-request") || !order.reviewRequestedAt) {
        return { ok: false, why: "the request itself has not been sent" };
      }
      const dueAt = new Date(order.reviewRequestedAt.getTime() + (reminderAfterDays ?? 0) * DAY);
      if (now < dueAt) {
        return { ok: false, why: `not due until ${reminderAfterDays} days after the request`, dueAt };
      }
      if (now.getTime() > dueAt.getTime() + reminderGraceDays * DAY) {
        return { ok: false, why: "the reminder window passed without it being sent; it is dropped, not sent late" };
      }
    }
  }

  // Hidden, deleted and returned products are left out of the email.
  const items = await reviewItems(order, { leaveOutReturned: true });
  if (items.length === 0) {
    return { ok: false, why: "nothing in the order can be reviewed now (hidden, removed or returned)" };
  }
  const open = items.filter((i) => !i.reviewed);
  if (open.length === 0) return { ok: false, why: "every product in the order is already reviewed" };

  return { ok: true, items: open, alreadyReviewed: items.length - open.length };
}

type BuiltMail = { to: string; subject: string; html: string; text: string };

function build(
  order: ReviewOrder,
  kind: ReviewEmailKind,
  items: ReviewItem[],
  alreadyReviewed: number,
  now: Date,
): BuiltMail {
  const mail = buildReviewEmail({
    kind,
    number: order.number,
    contactName: order.contactName,
    deliveredAt: order.deliveredAt ?? now,
    items: items.map((i) => ({
      title: i.title,
      variantLabel: i.variantLabel,
      image: i.image,
      url: reviewUrl(order.id, i.productId),
    })),
    alreadyReviewed,
    daysSinceDelivery: order.deliveredAt ? (now.getTime() - order.deliveredAt.getTime()) / DAY : 0,
    reminderFollows: REVIEW_REQUESTS.reminderAfterDays !== null,
    askedDaysAgo: order.reviewRequestedAt
      ? Math.round((now.getTime() - order.reviewRequestedAt.getTime()) / DAY)
      : REVIEW_REQUESTS.reminderAfterDays,
  });
  return { to: order.contactEmail, ...mail };
}

/**
 * The email this order would get, or why it would not.
 *
 * `ignoreTiming` shows a real order's email before it is due (the preview
 * page). `ignoreRules` builds it whatever the rules say, from every product
 * in the order — ONLY for the admin's "send me a copy", which goes to the
 * admin and never to the customer.
 */
export async function renderReviewMail(
  orderId: string,
  kind: ReviewEmailKind,
  options: { now?: Date; ignoreTiming?: boolean; ignoreRules?: boolean } = {},
): Promise<{ ok: true; mail: BuiltMail } | { ok: false; why: string }> {
  const now = options.now ?? new Date();
  const order = await loadReviewOrder(orderId);
  if (!order) return { ok: false, why: "no such order" };

  if (options.ignoreRules) {
    let items = await reviewItems(order);
    if (items.length === 0) {
      // Nothing visible to show: fall back to the order's own lines so the
      // template can still be looked at.
      items = order.lines.map((l) => ({
        productId: l.productId ?? l.id,
        slug: "",
        title: l.title,
        image: l.image,
        variantLabel: l.variantLabel,
        reviewed: false,
        myRating: null,
      }));
    }
    return { ok: true, mail: build(order, kind, items, 0, now) };
  }

  const plan = await reviewMailPlan(order, kind, now, { ignoreTiming: options.ignoreTiming });
  if (!plan.ok) return { ok: false, why: plan.why };
  return { ok: true, mail: build(order, kind, plan.items, plan.alreadyReviewed, now) };
}

/**
 * Claims the send in the database, sends, and gives the claim back if the
 * mail server refused.
 *
 * The claim is a conditional push onto emailsSent: of two sweeps racing for
 * one order, exactly one sees count === 1. Claiming BEFORE sending is what
 * makes a duplicate impossible; releasing on failure is what keeps a refused
 * send from being lost — the next sweep tries again, until maxAgeDays or the
 * reminder's grace period says it is too late.
 */
async function deliver(
  orderId: string,
  kind: ReviewEmailKind,
  mail: BuiltMail,
  now: Date,
  send: (mail: BuiltMail) => Promise<boolean>,
): Promise<boolean> {
  const claimed = await db.order.updateMany({
    where: { id: orderId, status: "DELIVERED", NOT: { emailsSent: { has: kind } } },
    data: {
      emailsSent: { push: kind },
      ...(kind === "review-request" ? { reviewRequestedAt: now } : {}),
    },
  });
  if (claimed.count !== 1) return false;

  let sent = false;
  try {
    sent = await send(mail);
  } catch (error) {
    console.error("[review-requests] send", kind, orderId, error instanceof Error ? error.message : error);
  }

  if (!sent) {
    if (kind === "review-request") {
      await db.$executeRaw`UPDATE "Order" SET "emailsSent" = array_remove("emailsSent", ${kind}), "reviewRequestedAt" = NULL WHERE "id" = ${orderId}`;
    } else {
      await db.$executeRaw`UPDATE "Order" SET "emailsSent" = array_remove("emailsSent", ${kind}) WHERE "id" = ${orderId}`;
    }
  }
  return sent;
}

/** At most this many mails per sweep, so a backlog drains gently. */
const SENDS_PER_SWEEP = 40;

export interface SweepReport {
  sent: { number: string; kind: ReviewEmailKind }[];
  failed: { number: string; kind: ReviewEmailKind }[];
  skipped: { number: string; kind: ReviewEmailKind; why: string }[];
}

/**
 * Sends every review request and reminder that has fallen due.
 *
 * The candidate queries are deliberately wide and cheap — delivered, within
 * the window, not yet sent — and reviewMailPlan makes the real decision for
 * each, so there is one set of rules and not two. Candidates are bounded by
 * the time windows rather than a row limit, so an order that never qualifies
 * (everything already reviewed, say) cannot crowd out one that does.
 *
 * `send` is injectable so a test can capture the mail instead of sending it.
 */
export async function sweepReviewRequests(
  options: { now?: Date; send?: (mail: BuiltMail) => Promise<boolean> } = {},
): Promise<SweepReport> {
  const now = options.now ?? new Date();
  const send = options.send ?? sendMail;
  const { delayDays, maxAgeDays, reminderAfterDays, reminderGraceDays } = REVIEW_REQUESTS;
  const ago = (days: number) => new Date(now.getTime() - days * DAY);
  const report: SweepReport = { sent: [], failed: [], skipped: [] };

  const base = {
    status: "DELIVERED" as const,
    customerId: { not: null },
    paymentStatus: { notIn: ["REFUND_DUE" as const, "REFUNDED" as const] },
  };

  const requests = await db.order.findMany({
    where: {
      ...base,
      deliveredAt: { lte: ago(delayDays), gte: ago(maxAgeDays) },
      NOT: { emailsSent: { has: "review-request" } },
    },
    select: ORDER_SELECT,
    orderBy: { deliveredAt: "asc" },
  });

  const reminders =
    reminderAfterDays === null
      ? []
      : await db.order.findMany({
          where: {
            ...base,
            emailsSent: { has: "review-request" },
            NOT: { emailsSent: { has: "review-reminder" } },
            reviewRequestedAt: { lte: ago(reminderAfterDays), gte: ago(reminderAfterDays + reminderGraceDays) },
          },
          select: ORDER_SELECT,
          orderBy: { reviewRequestedAt: "asc" },
        });

  const queue: [ReviewOrder, ReviewEmailKind][] = [
    ...requests.map((o): [ReviewOrder, ReviewEmailKind] => [o, "review-request"]),
    ...reminders.map((o): [ReviewOrder, ReviewEmailKind] => [o, "review-reminder"]),
  ];

  for (const [order, kind] of queue) {
    if (report.sent.length + report.failed.length >= SENDS_PER_SWEEP) break;

    const outcome = await sendIfDue(order, kind, now, send);
    if (outcome === "sent" || outcome === "failed") report[outcome].push({ number: order.number, kind });
    else report.skipped.push({ number: order.number, kind, why: outcome.why });
  }

  return report;
}

/** The plan, then the claimed send. The one path every review email takes. */
async function sendIfDue(
  order: ReviewOrder,
  kind: ReviewEmailKind,
  now: Date,
  send: (mail: BuiltMail) => Promise<boolean>,
): Promise<"sent" | "failed" | { why: string }> {
  const plan = await reviewMailPlan(order, kind, now);
  if (!plan.ok) return { why: plan.why };
  const mail = build(order, kind, plan.items, plan.alreadyReviewed, now);
  return (await deliver(order.id, kind, mail, now, send)) ? "sent" : "failed";
}

/**
 * The review request for one order, now, if the rules say it is due.
 *
 * Called at the moment of delivery — straight after the "delivered" email, and
 * when a courier scan marks the order delivered — so with delayDays at 0 the
 * ask does not wait for the next sweep. The sweep still runs behind it and
 * picks up anything this missed; the claim in deliver() keeps the two from
 * ever both sending. Never throws.
 */
export async function sendReviewRequestIfDue(orderId: string): Promise<void> {
  try {
    if (!mailConfigured()) return;
    const order = await loadReviewOrder(orderId);
    if (!order) return;
    const outcome = await sendIfDue(order, "review-request", new Date(), sendMail);
    if (outcome === "failed") console.error(`[review-requests] mail server refused ${order.number} review-request, will retry`);
  } catch (error) {
    console.error("[review-requests] on delivery", orderId, error instanceof Error ? error.message : error);
  }
}

/**
 * Starts the sweep on a timer inside the running server. Called once from
 * src/instrumentation-node.ts.
 *
 * There is no cron on this box and no scheduler in the project, and the one
 * PM2 fork is always running, so the server checks for itself — the same way
 * it already refreshes Google's signing keys. Three guards:
 *
 *   - APP_ENV must be exactly "production". The staging checkout on the same
 *     box runs this code too and must never write to real customers; a local
 *     `next dev` has no APP_ENV at all.
 *   - Never during `next build`, which can load instrumentation in its workers.
 *   - One sweep at a time. A slow mail server cannot pile sweeps on top of
 *     each other; the claim in deliver() would stop duplicates anyway.
 *
 * Nothing is sent while the app is down; the next sweep after it comes back
 * picks up whatever fell due, within maxAgeDays and the reminder's grace.
 */
export function startReviewRequestTimer(): void {
  if (process.env.APP_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const holder = globalThis as typeof globalThis & {
    __weekendcartReviewTimer?: ReturnType<typeof setInterval>;
  };
  if (holder.__weekendcartReviewTimer) return;

  let running = false;
  const run = async () => {
    if (running || !mailConfigured()) return;
    running = true;
    try {
      const report = await sweepReviewRequests();
      const list = (rows: { number: string; kind: string }[]) =>
        rows.map((r) => `${r.number} ${r.kind}`).join(", ");
      if (report.sent.length > 0) {
        console.log(`[review-requests] sent ${report.sent.length}: ${list(report.sent)}`);
      }
      if (report.failed.length > 0) {
        console.error(`[review-requests] mail server refused ${report.failed.length}, will retry: ${list(report.failed)}`);
      }
    } catch (error) {
      console.error("[review-requests] sweep failed:", error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  };

  // First look two minutes after start, clear of the deploy's health check and
  // image warm-up; then every sweepEveryMinutes. Unref'd so neither timer
  // holds the process open by itself.
  const first = setTimeout(() => void run(), 2 * 60_000);
  first.unref?.();
  holder.__weekendcartReviewTimer = setInterval(() => void run(), REVIEW_REQUESTS.sweepEveryMinutes * 60_000);
  holder.__weekendcartReviewTimer.unref?.();
}

/**
 * One line for the admin order page: where this order's review request
 * stands. Null for an order that has not been delivered.
 */
export async function reviewRequestSummary(orderId: string, now: Date = new Date()): Promise<string | null> {
  const order = await loadReviewOrder(orderId);
  if (!order?.deliveredAt) return null;

  const when = (d: Date) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }).format(d);

  if (order.emailsSent.includes("review-request")) {
    const sentAt = order.reviewRequestedAt ? `Sent ${when(order.reviewRequestedAt)}` : "Sent";
    if (order.emailsSent.includes("review-reminder")) return `${sentAt} · reminder sent`;
    const reminder = await reviewMailPlan(order, "review-reminder", now);
    if (reminder.ok) return `${sentAt} · reminder due now`;
    if (reminder.dueAt) return `${sentAt} · reminder due ${when(reminder.dueAt)} if anything is still unreviewed`;
    return `${sentAt} · no reminder: ${reminder.why}`;
  }

  const plan = await reviewMailPlan(order, "review-request", now);
  if (plan.ok) return `Due now — goes out within ${REVIEW_REQUESTS.sweepEveryMinutes} minutes`;
  if (plan.dueAt) return `Due ${when(plan.dueAt)}`;
  return `Not sent — ${plan.why}`;
}

/* ------------------------------------------------------- on the page */

export interface ReviewPanel {
  orderId: string;
  /** The review-scoped token the panel submits with — see the note below. */
  token: string;
  deliveredAt: string;
  author: string;
  location: string;
  items: ReviewItem[];
}

/** Past this, the link — and so the panel, which submits through it — has expired. */
function linkExpired(order: ReviewOrder, now: Date): boolean {
  return !!order.deliveredAt && now.getTime() - order.deliveredAt.getTime() > REVIEW_REQUESTS.linkValidDays * DAY;
}

/**
 * The "How was it?" panel for the track page and the order page, or null when
 * it should not be shown.
 *
 * Shown the moment the order is delivered — no delay — under the same rules as
 * the email (whyNotAsk): not for a cancelled, returned or fully refunded order,
 * and without any product that is hidden now or has a return against it.
 * Products already reviewed come back with the customer's stars so the panel
 * can say so.
 *
 * ONLY call this from a page that has already decided the viewer may see this
 * order (getOrderForViewer). It hands out the order's review token, so that a
 * customer who arrived from an email link — signed in or not — can post
 * through exactly the same action and the same checks as /review/...; the
 * token is what a signed-out reader needs, and nobody is given it who could
 * not already open the order.
 */
export async function reviewPanelFor(orderId: string, now: Date = new Date()): Promise<ReviewPanel | null> {
  const order = await loadReviewOrder(orderId);
  if (!order || whyNotAsk(order) || !order.deliveredAt || linkExpired(order, now)) return null;

  const items = await reviewItems(order, { leaveOutReturned: true });
  if (items.length === 0) return null;

  return {
    orderId: order.id,
    token: reviewToken(order.id),
    deliveredAt: order.deliveredAt.toISOString(),
    ...authorOf(order),
    items,
  };
}

/**
 * For the account's order list: how many products in each delivered order are
 * still waiting for a review, under the same rules as the panel. Orders with
 * nothing to rate are absent. Two queries however many orders there are.
 */
export async function unreviewedCounts(orderIds: string[], now: Date = new Date()): Promise<Record<string, number>> {
  if (orderIds.length === 0) return {};
  const orders = await db.order.findMany({
    where: { id: { in: orderIds }, status: "DELIVERED" },
    select: ORDER_SELECT,
  });
  const eligible = orders.filter((o) => !whyNotAsk(o) && !linkExpired(o, now));
  const lookups = await loadLookups(eligible);

  const counts: Record<string, number> = {};
  for (const order of eligible) {
    const open = itemsFrom(order, lookups, { leaveOutReturned: true }).filter((i) => !i.reviewed).length;
    if (open > 0) counts[order.id] = open;
  }
  return counts;
}
