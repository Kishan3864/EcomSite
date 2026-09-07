"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, MessageSquare, ThumbsUp, VerifiedIcon } from "lucide-react";
import type { QuestionAnswer, RatingBreakdown, Review } from "@/lib/types";
import { Stars } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn, formatCompact, formatDate } from "@/lib/utils";

export function ReviewsSection({
  reviews,
  rating,
  reviewCount,
  breakdown,
}: {
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
      <h2 className="font-display text-[24px] tracking-[-0.02em] text-ink-950 sm:text-[28px]">
        Ratings and reviews
      </h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
        {/* Summary */}
        <div>
          <div className="flex items-end gap-3">
            <span className="font-display text-[52px] leading-none tracking-[-0.03em] text-ink-950">
              {rating.toFixed(1)}
            </span>
            <div className="pb-1.5">
              <Stars value={rating} size={16} />
              <p className="mt-1 text-[12.5px] text-ink-500">
                {formatCompact(reviewCount)} ratings
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = breakdown[star];
              const pct = total ? (count / total) * 100 : 0;
              return (
                <li key={star}>
                  <button
                    onClick={() => setFilter(filter === star ? "all" : star)}
                    className="group flex w-full items-center gap-2.5"
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
                    <span className="w-10 text-right text-[11.5px] tabular-nums text-ink-400 group-hover:text-ink-700">
                      {formatCompact(count)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {[
              { key: "all" as const, label: "All reviews" },
              { key: "images" as const, label: "With photos" },
            ].map((chip) => (
              <button
                key={chip.key}
                onClick={() => setFilter(chip.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  filter === chip.key
                    ? "border-brand-900 bg-brand-900 text-white"
                    : "border-ink-200 text-ink-600 hover:border-ink-400",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <p className="mt-5 rounded-lg bg-ink-50 p-3 text-[12px] leading-relaxed text-ink-500">
            Only customers who bought the product on Mayura can leave a review. We never edit or
            remove a review for being negative.
          </p>
        </div>

        {/* List */}
        <div>
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 p-8 text-center text-sm text-ink-500">
              No reviews match that filter yet.
            </p>
          ) : (
            <ul className="space-y-5">
              <AnimatePresence initial={false}>
                {filtered.slice(0, visible).map((review) => (
                  <motion.li
                    key={review.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="border-b border-hairline pb-5 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-800">
                          {review.author
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <div>
                          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-950">
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
                      <Stars value={review.rating} size={13} />
                    </div>

                    <h3 className="mt-3 text-[14px] font-semibold text-ink-950">{review.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600">
                      {review.body}
                    </p>

                    {review.images && (
                      <div className="mt-3 flex gap-2">
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
                        "mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors",
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
              className="mt-6 w-full"
              onClick={() => setVisible((v) => v + 4)}
            >
              Show more reviews ({filtered.length - visible} left)
            </Button>
          )}
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-[24px] tracking-[-0.02em] text-ink-950 sm:text-[28px]">
          Questions and answers
        </h2>
        <p className="text-[13px] text-ink-500">
          Cannot find your answer?{" "}
          <a
            href="/contact"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Ask our team
          </a>
        </p>
      </div>

      <ul className="mt-5 divide-y divide-hairline border-y border-hairline">
        {questions.map((qa) => {
          const expanded = open === qa.id;
          return (
            <li key={qa.id}>
              <button
                onClick={() => setOpen(expanded ? null : qa.id)}
                aria-expanded={expanded}
                className="flex w-full items-start gap-3 py-4 text-left"
              >
                <MessageSquare size={16} className="mt-0.5 shrink-0 text-brand-600" />
                <span className="flex-1 text-[14px] font-medium text-ink-900">{qa.question}</span>
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
                    <div className="pb-5 pl-7">
                      <p className="text-[13.5px] leading-relaxed text-ink-600">{qa.answer}</p>
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
