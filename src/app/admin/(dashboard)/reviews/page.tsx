import Link from "next/link";
import Image from "next/image";
import { Check, Eye, EyeOff, MessageCircleQuestion, Package, ShieldCheck, Star, Trash2, X } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { cn, formatDate } from "@/lib/utils";
import { Stars } from "@/components/ui/primitives";
import { ConfirmForm, ParamSelect, SearchBox } from "@/components/admin/client";
import {
  AdminPagination,
  DateCell,
  EmptyRow,
  PageHeader,
  Pill,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
  withParams,
} from "@/components/admin/ui";
import {
  answerQuestion,
  approveReview,
  bulkReviews,
  deleteQuestion,
  deleteReview,
  hideQuestion,
  hideReview,
  restoreQuestion,
} from "@/services/admin/reviews-actions";
import { insensitive, pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";
import { AnswerForm } from "./answer-form";
import { BulkBar, SelectAllBox } from "./bulk-bar";
import { ReviewExcerpt } from "./review-excerpt";

/**
 * Reviews & Q&A moderation. One URL, two tabs (`?tab=reviews|questions`);
 * every filter lives in the query string so links are shareable and row
 * actions can bounce back to exactly the same view via `returnTo`.
 */

const BASE = "/admin/reviews";
const BULK_FORM_ID = "bulk-reviews";
const REVIEW_STATUSES = ["PENDING", "APPROVED", "HIDDEN"] as const;
const QUESTION_STATUSES = ["PENDING", "ANSWERED", "HIDDEN"] as const;

type ReviewStatus = (typeof REVIEW_STATUSES)[number];
type QuestionStatus = (typeof QUESTION_STATUSES)[number];

const isReviewStatus = (v: string): v is ReviewStatus => (REVIEW_STATUSES as readonly string[]).includes(v);
const isQuestionStatus = (v: string): v is QuestionStatus => (QUESTION_STATUSES as readonly string[]).includes(v);

const rowBtn = "rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900";
const rowBtnDanger = "rounded-md p-1.5 text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600";

const productSelect = {
  select: {
    id: true,
    title: true,
    slug: true,
    images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true, alt: true } },
  },
};

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseListParams(raw, {
    perPage: 20,
    defaultSort: "newest",
    filterKeys: ["tab", "status", "rating", "product"],
  });
  const tab = params.filters.tab === "questions" ? "questions" : "reviews";
  const canModerate = hasRole(session, "MANAGER");
  const canDelete = hasRole(session, "OWNER");

  const [pendingReviews, pendingQuestions, productFilter] = await Promise.all([
    db.review.count({ where: { status: "PENDING" } }),
    db.question.count({ where: { status: "PENDING" } }),
    params.filters.product
      ? db.product.findUnique({ where: { id: params.filters.product }, select: { id: true, title: true } })
      : null,
  ]);

  const current: Record<string, string | undefined> = {
    tab: tab === "questions" ? "questions" : undefined,
    q: params.q || undefined,
    status: params.filters.status,
    rating: params.filters.rating,
    product: productFilter?.id,
    sort: params.sort !== "newest" ? params.sort : undefined,
  };
  const returnTo = withParams(BASE, current, { page: params.page > 1 ? params.page : undefined });

  return (
    <>
      <PageHeader
        title="Reviews & Q&A"
        description="Moderate what shoppers say on product pages. Approving or hiding a review recomputes that product's star rating straight away."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TabLink
          href={withParams(BASE, {}, { product: productFilter?.id })}
          active={tab === "reviews"}
          icon={<Star size={14} />}
          label="Reviews"
          count={pendingReviews}
        />
        <TabLink
          href={withParams(BASE, {}, { tab: "questions", product: productFilter?.id })}
          active={tab === "questions"}
          icon={<MessageCircleQuestion size={14} />}
          label="Questions"
          count={pendingQuestions}
        />
        {productFilter && (
          <Pill tone="sky" className="ml-1 gap-2 py-1">
            <Package size={12} />
            <span className="max-w-[240px] truncate">{productFilter.title}</span>
            <Link
              href={withParams(BASE, current, { product: null, page: null })}
              aria-label="Clear product filter"
              className="-mr-0.5 rounded-full p-0.5 hover:bg-white/60"
            >
              <X size={12} />
            </Link>
          </Pill>
        )}
      </div>

      {tab === "reviews" ? (
        <ReviewsTab
          params={params}
          current={current}
          returnTo={returnTo}
          canModerate={canModerate}
          canDelete={canDelete}
          productId={productFilter?.id}
        />
      ) : (
        <QuestionsTab
          params={params}
          current={current}
          returnTo={returnTo}
          canModerate={canModerate}
          canDelete={canDelete}
          productId={productFilter?.id}
          adminName={session.name}
        />
      )}
    </>
  );
}

/* ------------------------------- Tabs ------------------------------- */

function TabLink({
  href,
  active,
  icon,
  label,
  count,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
        active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-surface text-ink-700 hover:border-ink-400",
      )}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums",
            active ? "bg-white/15 text-white" : "bg-gold-100 text-gold-800",
          )}
          title={`${count} pending`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

type TabProps = {
  params: ReturnType<typeof parseListParams>;
  current: Record<string, string | undefined>;
  returnTo: string;
  canModerate: boolean;
  canDelete: boolean;
  productId?: string;
};

function ProductCell({
  product,
}: {
  product: { id: string; title: string; images: { url: string; alt: string }[] };
}) {
  const thumb = product.images[0];
  return (
    <div className="flex items-center gap-3">
      {thumb ? (
        <Image
          src={thumb.url}
          alt={thumb.alt || product.title}
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-md border border-hairline object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-canvas text-ink-300">
          <Package size={16} />
        </span>
      )}
      <Link
        href={`/admin/products/${product.id}`}
        className="line-clamp-2 max-w-[200px] text-[12.5px] font-medium leading-snug text-ink-950 hover:text-brand-700"
      >
        {product.title}
      </Link>
    </div>
  );
}

/* ------------------------------ Reviews ----------------------------- */

async function ReviewsTab({ params, current, returnTo, canModerate, canDelete, productId }: TabProps) {
  const status = params.filters.status;
  const rating = Number(params.filters.rating);
  const q = params.q;

  const where: Prisma.ReviewWhereInput = {
    ...(isReviewStatus(status) ? { status } : {}),
    ...(Number.isInteger(rating) && rating >= 1 && rating <= 5 ? { rating } : {}),
    ...(productId ? { productId } : {}),
    ...(q
      ? {
          OR: [
            { author: insensitive(q) },
            { title: insensitive(q) },
            { body: insensitive(q) },
            { product: { title: insensitive(q) } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
    params.sort === "oldest"
      ? [{ createdAt: "asc" }]
      : params.sort === "highest"
        ? [{ rating: "desc" }, { createdAt: "desc" }]
        : params.sort === "lowest"
          ? [{ rating: "asc" }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }];

  const [rows, total] = await Promise.all([
    db.review.findMany({
      where,
      orderBy,
      select: {
        id: true,
        author: true,
        location: true,
        rating: true,
        title: true,
        body: true,
        images: true,
        verified: true,
        helpfulCount: true,
        status: true,
        createdAt: true,
        product: productSelect,
      },
      ...skipTake(params),
    }),
    db.review.count({ where }),
  ]);
  const meta = pageMeta(total, params);
  const filtered = Boolean(q || status || params.filters.rating || productId);
  const cols = canModerate ? 8 : 7;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search product, author or review text…" defaultValue={q} className="w-full sm:w-80" />
        <ParamSelect
          name="status"
          value={status}
          allLabel="All statuses"
          options={[
            { value: "PENDING", label: "Pending" },
            { value: "APPROVED", label: "Approved" },
            { value: "HIDDEN", label: "Hidden" },
          ]}
        />
        <ParamSelect
          name="rating"
          value={params.filters.rating}
          allLabel="Any rating"
          options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? "" : "s"}` }))}
        />
        <ParamSelect
          name="sort"
          value={params.sort === "newest" ? "" : params.sort}
          allLabel="Newest first"
          options={[
            { value: "oldest", label: "Oldest first" },
            { value: "highest", label: "Highest rating" },
            { value: "lowest", label: "Lowest rating" },
          ]}
        />
        {canModerate && <BulkBar formId={BULK_FORM_ID} action={bulkReviews} returnTo={returnTo} />}
      </div>

      <Table>
        <thead>
          <tr>
            {canModerate && (
              <Th className="w-10">
                <SelectAllBox formId={BULK_FORM_ID} />
              </Th>
            )}
            <Th>Product</Th>
            <Th>Author</Th>
            <Th>Rating</Th>
            <Th>Review</Th>
            <Th>Status</Th>
            <Th>Date</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={cols}
              title={filtered ? "No reviews match" : "No reviews yet"}
              body={
                filtered
                  ? "Try clearing a filter or searching for something else."
                  : "Reviews shoppers leave on product pages will show up here for moderation."
              }
            />
          ) : (
            rows.map((r) => (
              <Tr key={r.id} className={r.status === "PENDING" ? "bg-gold-50/40" : undefined}>
                {canModerate && (
                  <Td>
                    <input
                      type="checkbox"
                      name="ids"
                      value={r.id}
                      form={BULK_FORM_ID}
                      aria-label={`Select review by ${r.author}`}
                      className="h-4 w-4 cursor-pointer accent-[var(--color-brand-700)]"
                    />
                  </Td>
                )}
                <Td>
                  <ProductCell product={r.product} />
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-ink-950">{r.author}</span>
                    {r.verified && (
                      <span
                        title="Verified purchase"
                        className="inline-flex items-center gap-0.5 rounded-full bg-brand-100 px-1.5 py-px text-[10.5px] font-semibold text-brand-800"
                      >
                        <ShieldCheck size={11} /> Verified
                      </span>
                    )}
                  </div>
                  <span className="block text-[11.5px] text-ink-400">{r.location}</span>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5" title={`${r.rating} out of 5`}>
                    <Stars value={r.rating} size={13} />
                    <span className="text-[12px] tabular-nums text-ink-500">{r.rating}</span>
                  </div>
                </Td>
                <Td>
                  <ReviewExcerpt title={r.title} body={r.body} imageCount={r.images.length} />
                </Td>
                <Td>
                  <StatusPill status={r.status} />
                </Td>
                <Td>
                  <DateCell value={r.createdAt} />
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    {canModerate && r.status !== "APPROVED" && (
                      <form action={approveReview}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button type="submit" title="Approve" className={cn(rowBtn, "hover:text-brand-700")}>
                          <Check size={14} />
                        </button>
                      </form>
                    )}
                    {canModerate && r.status !== "HIDDEN" && (
                      <form action={hideReview}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button type="submit" title="Hide from storefront" className={rowBtn}>
                          <EyeOff size={14} />
                        </button>
                      </form>
                    )}
                    {canDelete && (
                      <ConfirmForm
                        action={deleteReview}
                        message={`Delete ${r.author}'s ${r.rating}-star review? This cannot be undone and the product rating will be recomputed.`}
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button type="submit" title="Delete" className={rowBtnDanger}>
                          <Trash2 size={14} />
                        </button>
                      </ConfirmForm>
                    )}
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>

      <AdminPagination meta={meta} hrefFor={(p) => withParams(BASE, current, { page: p })} label="reviews" />
    </>
  );
}

/* ----------------------------- Questions ---------------------------- */

async function QuestionsTab({
  params,
  current,
  returnTo,
  canModerate,
  canDelete,
  productId,
  adminName,
}: TabProps & { adminName: string }) {
  const status = params.filters.status;
  const q = params.q;

  const where: Prisma.QuestionWhereInput = {
    ...(isQuestionStatus(status) ? { status } : {}),
    ...(productId ? { productId } : {}),
    ...(q
      ? {
          OR: [
            { question: insensitive(q) },
            { answer: insensitive(q) },
            { askedBy: insensitive(q) },
            { product: { title: insensitive(q) } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.question.findMany({
      where,
      orderBy: { createdAt: params.sort === "oldest" ? "asc" : "desc" },
      select: {
        id: true,
        question: true,
        answer: true,
        askedBy: true,
        answeredBy: true,
        answeredAt: true,
        upvotes: true,
        status: true,
        createdAt: true,
        product: productSelect,
      },
      ...skipTake(params),
    }),
    db.question.count({ where }),
  ]);
  const meta = pageMeta(total, params);
  const filtered = Boolean(q || status || productId);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search questions, answers or products…" defaultValue={q} className="w-full sm:w-80" />
        <ParamSelect
          name="status"
          value={status}
          allLabel="All statuses"
          options={[
            { value: "PENDING", label: "Pending" },
            { value: "ANSWERED", label: "Answered" },
            { value: "HIDDEN", label: "Hidden" },
          ]}
        />
        <ParamSelect
          name="sort"
          value={params.sort === "newest" ? "" : params.sort}
          allLabel="Newest first"
          options={[{ value: "oldest", label: "Oldest first" }]}
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Product</Th>
            <Th>Question</Th>
            <Th>Asked by</Th>
            <Th>Answer</Th>
            <Th>Status</Th>
            <Th>Date</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={7}
              title={filtered ? "No questions match" : "No questions yet"}
              body={
                filtered
                  ? "Try clearing a filter or searching for something else."
                  : "Questions shoppers ask on product pages will show up here to be answered."
              }
            />
          ) : (
            rows.map((qn) => (
              <Tr key={qn.id} className={qn.status === "PENDING" ? "bg-gold-50/40" : undefined}>
                <Td>
                  <ProductCell product={qn.product} />
                </Td>
                <Td>
                  <p className="min-w-[200px] max-w-[360px] text-[13px] leading-snug text-ink-950">{qn.question}</p>
                </Td>
                <Td>
                  <span className="font-medium text-ink-900">{qn.askedBy}</span>
                  {qn.upvotes > 0 && (
                    <span className="block text-[11.5px] text-ink-400">
                      {qn.upvotes} {qn.upvotes === 1 ? "upvote" : "upvotes"}
                    </span>
                  )}
                </Td>
                <Td>
                  <AnswerForm
                    key={`${qn.id}:${qn.answeredAt?.getTime() ?? 0}`}
                    action={answerQuestion.bind(null, qn.id)}
                    initial={qn.answer ?? ""}
                    answeredBy={qn.answeredBy ?? adminName}
                    answeredAtLabel={qn.answeredAt ? formatDate(qn.answeredAt, "short") : undefined}
                    askedBy={qn.askedBy}
                    returnTo={returnTo}
                    canEdit={canModerate}
                  />
                </Td>
                <Td>
                  <StatusPill status={qn.status} />
                </Td>
                <Td>
                  <DateCell value={qn.createdAt} />
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    {canModerate && qn.status !== "HIDDEN" && (
                      <form action={hideQuestion}>
                        <input type="hidden" name="id" value={qn.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button type="submit" title="Hide from storefront" className={rowBtn}>
                          <EyeOff size={14} />
                        </button>
                      </form>
                    )}
                    {canModerate && qn.status === "HIDDEN" && (
                      <form action={restoreQuestion}>
                        <input type="hidden" name="id" value={qn.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button type="submit" title="Show on storefront" className={cn(rowBtn, "hover:text-brand-700")}>
                          <Eye size={14} />
                        </button>
                      </form>
                    )}
                    {canDelete && (
                      <ConfirmForm action={deleteQuestion} message={`Delete ${qn.askedBy}'s question? This cannot be undone.`}>
                        <input type="hidden" name="id" value={qn.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button type="submit" title="Delete" className={rowBtnDanger}>
                          <Trash2 size={14} />
                        </button>
                      </ConfirmForm>
                    )}
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>

      <AdminPagination meta={meta} hrefFor={(p) => withParams(BASE, current, { page: p })} label="questions" />
    </>
  );
}
