"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, MessageSquare, ThumbsUp, VerifiedIcon } from "lucide-react";
import type { QuestionAnswer, RatingBreakdown, Review } from "@/lib/types";
import { ReviewForm } from "./review-form";
import { Stars } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn, formatCompact, formatDate } from "@/lib/utils";

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

  return (
    <section id="reviews" className="scroll-mt-32">
      <h2 className="font-display text-[18px] tracking-[-0.02em] text-ink-950 sm:text-[28px]">
        Ratings and reviews
      </h2>

      <div className="mt-4 grid gap-5 sm:mt-6 sm:gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
        {/* Summary */}
        <div>
          {/* Phones set the score beside the bars, as shopping apps do, rather
              than stacking two short blocks; from sm they stack as before. */}
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 sm:block">
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-end sm:gap-3">
              <span className="font-display text-[28px] leading-none tracking-[-0.03em] text-ink-950 sm:text-[52px]">
                {rating.toFixed(1)}
              </span>
              <div className="sm:pb-1.5">
                <Stars value={rating} size={16} />
                <p className="mt-1 text-[12px] text-ink-500 sm:text-[12.5px]">
                  {formatCompact(reviewCount)} ratings
                </p>
              </div>
            </div>

            <ul className="space-y-1.5 sm:mt-5">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = breakdown[star];
                const pct = total ? (count / total) * 100 : 0;
                return (
                  <li key={star}>
                    <button
                      onClick={() => setFilter(filter === star ? "all" : star)}
                      className="tap group flex w-full items-center gap-2 sm:gap-2.5"
                    >
                      <span className="w-3 text-right text-[12px] tabular-nums text-ink-600">
                        {star}
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                        <motion.span
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                          className={cn(
                            "block h-full rounded-full",
                            star >= 4 ? "bg-brand-600" : star === 3 ? "bg-gold-400" : "bg-sale-400",
                            filter === star && "ring-2 ring-brand-700/30",
                          )}
                          style={{ backgroundColor: undefined }}
                        />
                      </span>
                      <span className="w-9 text-right text-[11.5px] tabular-nums text-ink-400 group-hover:text-ink-700 sm:w-10">
                        {formatCompact(count)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-5">
            {[
              { key: "all" as const, label: "All reviews" },
              { key: "images" as const, label: "With photos" },
            ].map((chip) => (
              <button
                key={chip.key}
                onClick={() => setFilter(chip.key)}
                className={cn(
                  "tap rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors sm:text-[12px]",
                  filter === chip.key
                    ? "border-brand-900 bg-brand-900 text-white"
                    : "border-ink-200 text-ink-600 hover:border-ink-400",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <p className="mt-4 rounded-lg bg-ink-50 p-3 text-[12px] leading-relaxed text-ink-500 sm:mt-5">
            Only customers who bought the product on WeekendCart can leave a review. We never edit or
            remove a review for being negative.
          </p>
        </div>

        {/* List */}
        <div>
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 p-5 text-center text-[13px] text-ink-500 sm:p-8 sm:text-sm">
              No reviews match that filter yet.
            </p>
          ) : (
            <ul className="space-y-4 sm:space-y-5">
              <AnimatePresence initial={false}>
                {filtered.slice(0, visible).map((review) => (
                  <motion.li
                    key={review.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="border-b border-hairline pb-4 last:border-b-0 sm:pb-5"
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11.5px] font-semibold text-brand-800 sm:h-9 sm:w-9 sm:text-[12px]">
                          {review.author
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] font-semibold text-ink-950 sm:text-[13.5px] lg:flex-nowrap">
                            {review.author}
                            {review.verified && (
                              <span
                                title="Verified purchase"
                                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-brand-700"
                              >
                                <VerifiedIcon size={9} /> Verified
                              </span>
                            )}
                          </p>
                          <p className="text-[11.5px] text-ink-400">
                            {review.location} · {formatDate(review.createdAt, "short")}
                          </p>
                        </div>
                      </div>
                      <Stars value={review.rating} size={13} className="shrink-0" />
                    </div>

                    <h3 className="mt-2.5 text-[13.5px] font-semibold text-ink-950 sm:mt-3 sm:text-[14px]">
                      {review.title}
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-600 sm:mt-1.5 sm:text-[13.5px]">
                      {review.body}
                    </p>

                    {review.images && (
                      <div className="mt-2.5 flex flex-wrap gap-2 sm:mt-3 lg:flex-nowrap">
                        {review.images.map((src) => (
                          <span
                            key={src}
                            className="relative h-16 w-16 overflow-hidden rounded-lg bg-ink-100"
                          >
                            <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() =>
                        setHelpful((h) => ({ ...h, [review.id]: !h[review.id] }))
                      }
                      className={cn(
                        "tap mt-2.5 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] transition-colors sm:mt-3 sm:text-[12px]",
                        helpful[review.id]
                          ? "border-brand-500 bg-brand-50 text-brand-800"
                          : "border-ink-200 text-ink-500 hover:border-ink-400 hover:text-ink-800",
                      )}
                    >
                      <ThumbsUp size={12} />
                      Helpful ({review.helpfulCount + (helpful[review.id] ? 1 : 0)})
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {visible < filtered.length && (
            <Button
              variant="outline"
              className="tap mt-4 w-full sm:mt-6"
              onClick={() => setVisible((v) => v + 4)}
            >
              Show more reviews ({filtered.length - visible} left)
            </Button>
          )}

          <ReviewForm productId={productId} />
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
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 sm:gap-4">
        <h2 className="font-display text-[18px] tracking-[-0.02em] text-ink-950 sm:text-[28px]">
          Questions and answers
        </h2>
        <p className="text-[12.5px] text-ink-500 sm:text-[13px]">
          Cannot find your answer?{" "}
          <a
            href="/contact"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Ask our team
          </a>
        </p>
      </div>

      <ul className="mt-3 divide-y divide-hairline border-y border-hairline sm:mt-5">
        {questions.map((qa) => {
          const expanded = open === qa.id;
          return (
            <li key={qa.id}>
              <button
                onClick={() => setOpen(expanded ? null : qa.id)}
                aria-expanded={expanded}
                className="tap flex w-full items-start gap-2.5 py-3.5 text-left sm:gap-3 sm:py-4"
              >
                <MessageSquare size={16} className="mt-0.5 shrink-0 text-brand-600" />
                <span className="min-w-0 flex-1 text-[13.5px] font-medium text-ink-900 sm:text-[14px]">
                  {qa.question}
                </span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "mt-0.5 shrink-0 text-ink-400 transition-transform duration-200",
                    expanded && "rotate-180",
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    {/* Indented to line up with the question, past its icon. */}
                    <div className="pb-4 pl-[26px] sm:pb-5 sm:pl-7">
                      <p className="text-[13px] leading-relaxed text-ink-600 sm:text-[13.5px]">
                        {qa.answer}
                      </p>
                      <p className="mt-2 text-[11.5px] text-ink-400">
                        Answered by {qa.answeredBy} · {formatDate(qa.answeredAt, "short")} ·{" "}
                        {qa.upvotes} found this useful
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
