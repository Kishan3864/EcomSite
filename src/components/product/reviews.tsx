"use client";

import { useMemo, useState } from "react";
import Image from "@/components/ui/image";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  ChevronDown,
  MessageCircleQuestion,
  MessageSquareText,
  PenLine,
  Star,
  ThumbsUp,
} from "lucide-react";
import type { QuestionAnswer, RatingBreakdown, Review } from "@/lib/types";
import { ReviewForm } from "./review-form";
import { SectionHeader, Stars } from "@/components/ui/primitives";
import { Button, buttonClasses } from "@/components/ui/button";
import { cn, formatCompact, formatDate } from "@/lib/utils";

/**
 * Ratings and reviews: a summary card (average, stars, bars, write-a-review)
 * beside a list where each review is its own card. Nothing implies a score
 * the shop has not been given — each part appears only with real data.
 */
export function ReviewsSection({
  productId,
  reviews,
  rating,
  reviewCount,
  breakdown,
}: {
  productId: string;
  reviews: Review[];
  rating: number;
  reviewCount: number;
  breakdown: RatingBreakdown;
}) {
  const [filter, setFilter] = useState<number | "all" | "images">("all");
  const [visible, setVisible] = useState(4);
  const [helpful, setHelpful] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (filter === "all") return reviews;
    if (filter === "images") return reviews.filter((r) => r.images?.length);
    return reviews.filter((r) => r.rating === filter);
  }, [reviews, filter]);

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  // Nobody has reviewed it yet: say so rather than print "0.0" and empty stars.
  if (reviewCount === 0 && reviews.length === 0) {
    return (
      <section id="reviews" className="scroll-mt-32">
        <SectionHeader eyebrow="From customers" title="Ratings and reviews" />
        <div className="card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="icon-tile">
              <MessageSquareText size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="t-h3">No reviews yet</h3>
              <p className="t-body mt-1.5 max-w-[60ch]">
                Reviews here are written only by customers who bought this and had it delivered, so
                there are none until the first one arrives. That is also why the ones you do see can
                be trusted.
              </p>
            </div>
          </div>
          <ReviewForm productId={productId} />
        </div>
      </section>
    );
  }

  return (
    <section id="reviews" className="scroll-mt-32">
      <SectionHeader eyebrow="From customers" title="Ratings and reviews" />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
        {/* Summary card */}
        <div className="card h-fit p-5 lg:sticky-under-header">
          <div
            className={cn(
              rating > 0 && "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-6 lg:block",
            )}
          >
            {rating > 0 && (
              <div className="flex flex-col items-start gap-1.5">
                <span className="flex items-baseline gap-1">
                  <span className="t-price text-[40px] leading-none sm:text-[48px]">
                    {rating.toFixed(1)}
                  </span>
                  <span className="text-[13px] font-medium text-ink-500">/ 5</span>
                </span>
                <Stars value={rating} size={16} />
                <p className="t-small tabular-nums">
                  {formatCompact(reviewCount)} ratings
                </p>
              </div>
            )}

            {/* Bars: one gold measure; the filtered row turns cobalt. */}
            {total > 0 && (
              <ul className={cn("space-y-1.5", rating > 0 && "lg:mt-5")}>
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = breakdown[star];
                  const pct = (count / total) * 100;
                  const active = filter === star;
                  return (
                    <li key={star}>
                      <button
                        type="button"
                        onClick={() => setFilter(active ? "all" : star)}
                        aria-pressed={active}
                        aria-label={`${star} star reviews: ${count}. ${active ? "Show all reviews" : "Show only these"}`}
                        className={cn(
                          "group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors",
                          active ? "bg-brand-50" : "hover:bg-ink-50",
                        )}
                      >
                        <span className="inline-flex w-7 items-center gap-0.5 text-[12.5px] font-medium tabular-nums text-ink-700">
                          {star}
                          <Star size={14} aria-hidden className="text-gold-500" fill="currentColor" strokeWidth={0} />
                        </span>
                        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                          <motion.span
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            className={cn("block h-full rounded-full", active ? "bg-brand-600" : "bg-gold-400")}
                          />
                        </span>
                        <span className="w-9 text-right text-[12.5px] tabular-nums text-ink-500">
                          {formatCompact(count)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { key: "all" as const, label: "All reviews" },
              { key: "images" as const, label: "With photos" },
            ].map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                aria-pressed={filter === chip.key}
                className={cn(
                  "inline-flex h-8 items-center rounded-full border px-3 text-[12.5px] font-medium transition-colors duration-200",
                  filter === chip.key
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-line-strong text-ink-700 hover:border-brand-300 hover:text-brand-700",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <a href="#write-review" className={buttonClasses("outline", "md", "mt-5 w-full")}>
            <PenLine size={16} aria-hidden /> Write a review
          </a>

          <p className="t-small mt-4 border-t border-line pt-4">
            Only customers who bought the product on WeekendCart can leave a review. We never edit
            or remove a review for being negative.
          </p>
        </div>

        {/* List: each review its own card */}
        <div className="min-w-0">
          {filtered.length === 0 ? (
            <div className="card-muted rounded-xl p-5 text-[13px] text-ink-500">
              No reviews match that filter yet.
            </div>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {filtered.slice(0, visible).map((review) => (
                  <motion.li
                    key={review.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="card p-4 sm:p-5"
                  >
                    <article>
                      <header className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            aria-hidden
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-800 ring-1 ring-inset ring-brand-100"
                          >
                            {review.author
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-semibold text-ink-950">
                              {review.author}
                              {review.verified && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800 ring-1 ring-inset ring-brand-100">
                                  <BadgeCheck size={14} aria-hidden /> Verified purchase
                                </span>
                              )}
                            </p>
                            <p className="t-small mt-0.5">
                              {review.location} · {formatDate(review.createdAt, "short")}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 pt-1">
                          <span className="sr-only">Rated {review.rating} out of 5</span>
                          <Stars value={review.rating} size={14} />
                        </span>
                      </header>

                      {review.title && <h3 className="t-h3 mt-3.5">{review.title}</h3>}
                      {review.body && (
                        <p className={cn("t-body max-w-[70ch]", review.title ? "mt-1.5" : "mt-3.5")}>
                          {review.body}
                        </p>
                      )}

                      {review.images && review.images.length > 0 && (
                        <div className="mt-3.5 flex flex-wrap gap-2">
                          {review.images.map((src) => (
                            <span
                              key={src}
                              className="relative h-16 w-16 overflow-hidden rounded-lg bg-ink-100 ring-1 ring-inset ring-line sm:h-20 sm:w-20"
                            >
                              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3.5 border-t border-line pt-3">
                        <button
                          type="button"
                          onClick={() => setHelpful((h) => ({ ...h, [review.id]: !h[review.id] }))}
                          aria-pressed={Boolean(helpful[review.id])}
                          className={cn(
                            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors duration-200",
                            helpful[review.id]
                              ? "border-brand-700 bg-brand-700 text-white"
                              : "border-line-strong text-ink-600 hover:border-brand-300 hover:text-brand-700",
                          )}
                        >
                          <ThumbsUp size={14} aria-hidden />
                          <span>
                            Helpful{" "}
                            <span className="tabular-nums">
                              ({review.helpfulCount + (helpful[review.id] ? 1 : 0)})
                            </span>
                          </span>
                        </button>
                      </div>
                    </article>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {visible < filtered.length && (
            <Button variant="outline" className="mt-4 w-full" onClick={() => setVisible((v) => v + 4)}>
              <span>
                Show more reviews{" "}
                <span className="tabular-nums">({filtered.length - visible} left)</span>
              </span>
            </Button>
          )}

          <div id="write-review" className="scroll-mt-32">
            <ReviewForm productId={productId} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Q&A ------------------------------- */

export function QnaSection({ questions }: { questions: QuestionAnswer[] }) {
  const [open, setOpen] = useState<string | null>(questions[0]?.id ?? null);

  return (
    <section id="qna" className="scroll-mt-32">
      <SectionHeader
        eyebrow="Good to know"
        title="Questions and answers"
        action={
          questions.length > 0 ? (
            <p className="t-small hidden sm:block">
              Cannot find your answer?{" "}
              <a href="/contact" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
                Ask our team
              </a>
            </p>
          ) : undefined
        }
      />

      {questions.length === 0 ? (
        <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
          <span className="icon-tile">
            <MessageCircleQuestion size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="t-h3">No questions about this one yet</h3>
            <p className="t-body mt-1.5 max-w-[60ch]">
              Ask us anything — size, fit, what is in the box, how it runs. We answer within a day,
              and anything useful is published here for the next person wondering the same.
            </p>
            <a href="/contact" className={buttonClasses("outline", "sm", "mt-4")}>
              Ask a question
            </a>
          </div>
        </div>
      ) : (
        <>
          <ul className="card card-divided overflow-hidden">
            {questions.map((qa) => {
              const expanded = open === qa.id;
              return (
                <li key={qa.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : qa.id)}
                    aria-expanded={expanded}
                    aria-controls={`qa-${qa.id}`}
                    className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-ink-50 sm:px-5"
                  >
                    <span aria-hidden className="mt-px text-[12px] font-bold text-brand-700">Q</span>
                    <span className="min-w-0 flex-1 text-[14px] font-medium leading-[1.45] text-ink-900">
                      {qa.question}
                    </span>
                    <ChevronDown
                      size={16}
                      aria-hidden
                      className={cn(
                        "mt-0.5 shrink-0 text-ink-500 transition-transform duration-200",
                        expanded && "rotate-180",
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        id={`qa-${qa.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
                          <span aria-hidden className="mt-px text-[12px] font-bold text-gold-700">A</span>
                          <div className="min-w-0">
                            <p className="t-body max-w-[70ch]">{qa.answer}</p>
                            <p className="t-small mt-2 tabular-nums">
                              Answered by {qa.answeredBy} · {formatDate(qa.answeredAt, "short")} ·{" "}
                              {qa.upvotes} found this useful
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
          <p className="t-small mt-3 sm:hidden">
            Cannot find your answer?{" "}
            <a href="/contact" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
              Ask our team
            </a>
          </p>
        </>
      )}
    </section>
  );
}
