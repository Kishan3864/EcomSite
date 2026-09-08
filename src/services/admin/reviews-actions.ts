"use server";

import { redirect } from "next/navigation";
import type { Prisma, ReviewStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logActivity, requireAdmin, type AdminSession } from "@/lib/auth/admin";
import type { FormState } from "./form-state";
import { list, revalidateAdmin, revalidateStorefront, str } from "./shared";

/**
 * Reviews & Q&A moderation.
 *
 * Product.rating / Product.reviewCount are denormalised from APPROVED reviews,
 * so every status change or deletion recomputes them inside the same
 * transaction — the storefront must never show a count its reviews contradict.
 */

const BASE = "/admin/reviews";

/** Row actions post the list URL they came from so filters survive the round trip. */
function returnTo(formData: FormData) {
  const raw = str(formData, "returnTo");
  return raw.startsWith(BASE) && !raw.startsWith("//") && !raw.includes("://") ? raw : BASE;
}

function withFlash(path: string, message: string, tone?: "error") {
  const url = new URL(path, "http://admin.local");
  url.searchParams.delete("flash");
  url.searchParams.delete("tone");
  url.searchParams.set("flash", message);
  if (tone) url.searchParams.set("tone", tone);
  return `${url.pathname}${url.search}`;
}

const REVIEW_VERB: Record<ReviewStatus, string> = {
  APPROVED: "approved",
  HIDDEN: "hidden",
  PENDING: "moved back to pending",
};

/* ------------------------------ Reviews ----------------------------- */

async function recomputeProductRating(tx: Prisma.TransactionClient, productId: string) {
  const agg = await tx.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const rating = agg._avg.rating == null ? 0 : Math.round(agg._avg.rating * 10) / 10;
  return tx.product.update({
    where: { id: productId },
    data: { rating, reviewCount: agg._count._all },
    select: { id: true, slug: true, title: true, rating: true, reviewCount: true },
  });
}

async function setReviewStatus(session: AdminSession, formData: FormData, status: ReviewStatus) {
  const id = str(formData, "id");
  const back = returnTo(formData);

  const review = await db.review.findUnique({
    where: { id },
    select: { id: true, author: true, status: true, productId: true, product: { select: { title: true } } },
  });
  if (!review) redirect(withFlash(back, "That review no longer exists.", "error"));
  if (review.status === status) redirect(withFlash(back, `Review by ${review.author} is already ${REVIEW_VERB[status]}.`));

  const product = await db.$transaction(async (tx) => {
    await tx.review.update({ where: { id }, data: { status } });
    return recomputeProductRating(tx, review.productId);
  });

  await logActivity(session, {
    action: `review.${status.toLowerCase()}`,
    entity: "Review",
    entityId: id,
    summary: `${status === "APPROVED" ? "Approved" : "Hid"} review by ${review.author} on ${product.title}`,
    metadata: { from: review.status, to: status, productRating: product.rating, productReviewCount: product.reviewCount },
  });
  revalidateStorefront([`/p/${product.slug}`]);
  revalidateAdmin("reviews");
  redirect(withFlash(back, `Review by ${review.author} ${REVIEW_VERB[status]}`));
}

export async function approveReview(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  await setReviewStatus(session, formData, "APPROVED");
}

export async function hideReview(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  await setReviewStatus(session, formData, "HIDDEN");
}

export async function deleteReview(formData: FormData) {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");
  const back = returnTo(formData);

  const review = await db.review.findUnique({
    where: { id },
    select: { id: true, author: true, rating: true, status: true, productId: true },
  });
  if (!review) redirect(withFlash(back, "That review no longer exists.", "error"));

  const product = await db.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });
    return recomputeProductRating(tx, review.productId);
  });

  await logActivity(session, {
    action: "review.delete",
    entity: "Review",
    entityId: id,
    summary: `Deleted ${review.rating}-star review by ${review.author} on ${product.title}`,
    metadata: { status: review.status, productRating: product.rating, productReviewCount: product.reviewCount },
  });
  revalidateStorefront([`/p/${product.slug}`]);
  revalidateAdmin("reviews");
  redirect(withFlash(back, `Review by ${review.author} deleted`));
}

/** Bulk approve / hide for the selected rows. `ids` is repeated, `intent` is approve|hide. */
export async function bulkReviews(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const back = returnTo(formData);
  const intent = str(formData, "intent");
  const ids = list(formData, "ids").slice(0, 200);

  const status: ReviewStatus | null = intent === "approve" ? "APPROVED" : intent === "hide" ? "HIDDEN" : null;
  if (!status) redirect(withFlash(back, "Choose whether to approve or hide the selected reviews.", "error"));
  if (ids.length === 0) redirect(withFlash(back, "Select at least one review first.", "error"));

  const affected = await db.review.findMany({
    where: { id: { in: ids }, NOT: { status } },
    select: { id: true, productId: true },
  });
  if (affected.length === 0) {
    redirect(withFlash(back, `Nothing to change — the selected reviews are already ${REVIEW_VERB[status]}.`));
  }

  const productIds = [...new Set(affected.map((r) => r.productId))];
  const products = await db.$transaction(async (tx) => {
    await tx.review.updateMany({ where: { id: { in: affected.map((r) => r.id) } }, data: { status } });
    const out: { slug: string; title: string }[] = [];
    for (const productId of productIds) out.push(await recomputeProductRating(tx, productId));
    return out;
  });

  const noun = affected.length === 1 ? "review" : "reviews";
  await logActivity(session, {
    action: `review.bulk_${status.toLowerCase()}`,
    entity: "Review",
    summary: `${status === "APPROVED" ? "Approved" : "Hid"} ${affected.length} ${noun} across ${products.length} ${products.length === 1 ? "product" : "products"}`,
    metadata: { ids: affected.map((r) => r.id), products: products.map((p) => p.slug) },
  });
  revalidateStorefront(products.map((p) => `/p/${p.slug}`));
  revalidateAdmin("reviews");
  redirect(withFlash(back, `${affected.length} ${noun} ${REVIEW_VERB[status]}`));
}

/* ----------------------------- Questions ---------------------------- */

const ANSWER_MAX = 2000;

/** Inline per-row answer form. Errors come back as FormState; success redirects with a flash. */
export async function answerQuestion(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const back = returnTo(formData);
  const answer = str(formData, "answer");
  const answeredBy = str(formData, "answeredBy") || session.name;

  if (answer.length < 2) return { error: "Write an answer before posting.", field: "answer" };
  if (answer.length > ANSWER_MAX) return { error: `Keep the answer under ${ANSWER_MAX} characters.`, field: "answer" };
  if (answeredBy.length > 60) return { error: "Keep the name under 60 characters.", field: "answeredBy" };

  const question = await db.question.findUnique({
    where: { id },
    select: { id: true, askedBy: true, answer: true, status: true, product: { select: { slug: true, title: true } } },
  });
  if (!question) return { error: "That question no longer exists — it may have been deleted." };

  const wasAnswered = Boolean(question.answer);
  await db.question.update({
    where: { id },
    data: { answer, answeredBy, answeredAt: new Date(), status: "ANSWERED" },
  });

  await logActivity(session, {
    action: wasAnswered ? "question.update_answer" : "question.answer",
    entity: "Question",
    entityId: id,
    summary: `${wasAnswered ? "Updated the answer to" : "Answered"} ${question.askedBy}'s question on ${question.product.title}`,
    metadata: { answeredBy, from: question.status },
  });
  revalidateStorefront([`/p/${question.product.slug}`]);
  revalidateAdmin("reviews");
  redirect(withFlash(back, wasAnswered ? "Answer updated" : `Answer posted for ${question.askedBy}`));
}

export async function hideQuestion(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const back = returnTo(formData);

  const question = await db.question.findUnique({
    where: { id },
    select: { id: true, askedBy: true, status: true, product: { select: { slug: true, title: true } } },
  });
  if (!question) redirect(withFlash(back, "That question no longer exists.", "error"));
  if (question.status === "HIDDEN") redirect(withFlash(back, "That question is already hidden."));

  await db.question.update({ where: { id }, data: { status: "HIDDEN" } });
  await logActivity(session, {
    action: "question.hide",
    entity: "Question",
    entityId: id,
    summary: `Hid ${question.askedBy}'s question on ${question.product.title}`,
    metadata: { from: question.status },
  });
  revalidateStorefront([`/p/${question.product.slug}`]);
  revalidateAdmin("reviews");
  redirect(withFlash(back, `Question from ${question.askedBy} hidden`));
}

/** Un-hide: back to ANSWERED when an answer exists, otherwise back into the pending queue. */
export async function restoreQuestion(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const back = returnTo(formData);

  const question = await db.question.findUnique({
    where: { id },
    select: { id: true, askedBy: true, answer: true, status: true, product: { select: { slug: true, title: true } } },
  });
  if (!question) redirect(withFlash(back, "That question no longer exists.", "error"));
  if (question.status !== "HIDDEN") redirect(withFlash(back, "That question is already visible."));

  const status = question.answer ? "ANSWERED" : "PENDING";
  await db.question.update({ where: { id }, data: { status } });
  await logActivity(session, {
    action: "question.restore",
    entity: "Question",
    entityId: id,
    summary: `Restored ${question.askedBy}'s question on ${question.product.title}`,
    metadata: { to: status },
  });
  revalidateStorefront([`/p/${question.product.slug}`]);
  revalidateAdmin("reviews");
  redirect(
    withFlash(back, status === "ANSWERED" ? `Question from ${question.askedBy} is visible again` : `Question from ${question.askedBy} moved back to pending`),
  );
}

export async function deleteQuestion(formData: FormData) {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");
  const back = returnTo(formData);

  const question = await db.question.findUnique({
    where: { id },
    select: { id: true, askedBy: true, status: true, product: { select: { slug: true, title: true } } },
  });
  if (!question) redirect(withFlash(back, "That question no longer exists.", "error"));

  await db.question.delete({ where: { id } });
  await logActivity(session, {
    action: "question.delete",
    entity: "Question",
    entityId: id,
    summary: `Deleted ${question.askedBy}'s question on ${question.product.title}`,
    metadata: { status: question.status },
  });
  revalidateStorefront([`/p/${question.product.slug}`]);
  revalidateAdmin("reviews");
  redirect(withFlash(back, `Question from ${question.askedBy} deleted`));
}
