"use client";

import { useMemo, useState } from "react";
import Image from "@/components/ui/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ThumbsUp, VerifiedIcon } from "lucide-react";
import type { QuestionAnswer, RatingBreakdown, Review } from "@/lib/types";
import { ReviewForm } from "./review-form";
import { Stars } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn, formatCompact, formatDate } from "@/lib/utils";

/**
 * Ratings and reviews.
 *
 * This is the page's trust surface, so it is drawn like a printed record: a
 * measured average, five bars that are a measure rather than a traffic light,
 * and a ruled list underneath. Nothing here is allowed to imply a score the
 * shop has not been given — the average, the stars and the bars each appear
 * only once there is something real behind them, and when there is not, the
 * panel says so in the shop's own words.
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

  // A listing nobody has reviewed yet would otherwise print "0.0" beside five
  // empty stars and "0 ratings" — which reads as a product everyone disliked
  // rather than one nobody has received yet. The panel says which it is, and
  // the form beneath still explains who may write the first one.
  if (reviewCount === 0 && reviews.length === 0) {
    return (
      <section id="reviews" className="scroll-mt-32">
        <h2 className="font-display text-[18px] tracking-[-0.02em] text-ink-950 sm:text-[28px]">
          Ratings and reviews
        </h2>
        <div className="mt-3 border-t border-hairline pt-4 sm:mt-5 sm:pt-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            No reviews yet
          </p>
          <p className="mt-2 max-w-[46ch] text-[13px] leading-[1.6] text-ink-600 sm:text-[14px]">
            Reviews here are written only by customers who bought this and had it delivered, so
            there are none until the first one arrives. That is also why the ones you do see can be
            trusted.
          </p>
          <ReviewForm productId={productId} />
        </div>
      </section>
    );
  }

  return (
    <section id="reviews" className="scroll-mt-32">
      <h2 className="font-display text-[18px] tracking-[-0.02em] text-ink-950 sm:text-[28px]">
        Ratings and reviews
      </h2>

      <div className="mt-3 grid gap-5 border-t border-hairline pt-4 sm:mt-5 sm:gap-8 sm:pt-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        {/* Summary */}
        <div>
          {/* Phones set the score beside the bars, as shopping apps do, rather
              than stacking two short blocks; from sm they stack as before. With
              no score to set beside them the two-track grid would size itself
              to the bars alone, so it is only a grid when both halves exist. */}
          <div
            className={cn(
              rating > 0 && "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-6 sm:block",
            )}
          >
            {/* The score is set in the text face with tabular figures. Fraunces
                is for titles, and its proportional numerals put the decimal in
                a different place on every product in the shop. */}
            {rating > 0 && (
              <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-end sm:gap-3">
                <span className="text-[32px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink-950 sm:text-[52px]">
                  {rating.toFixed(1)}
                </span>
                <div className="sm:pb-1.5">
                  <Stars value={rating} size={16} />
                  <p className="mt-1.5 text-[13px] tabular-nums text-ink-500">
                    {formatCompact(reviewCount)} ratings
                  </p>
                </div>
              </div>
            )}

            {/* Five bars in one ink. Colouring the top two ocean, the middle
                one aqua and the bottom two rose turned a record of what
                customers said into the shop's own verdict on it, and spent the
                two colours that are meant to mean a signal and a reduction on
                a chart. The bar is a measure; only the filtered row changes
                colour, because that is a state of this page rather than a
                judgement on the product. */}
            {total > 0 && (
              <ul className={cn("space-y-2", rating > 0 && "sm:mt-6")}>
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = breakdown[star];
                  const pct = (count / total) * 100;
                  const active = filter === star;
                  return (
                    <li key={star}>
                      <button
                        onClick={() => setFilter(active ? "all" : star)}
                        aria-pressed={active}
                        className="tap group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5"
                      >
                        <span
                          className={cn(
                            "w-3 text-right text-[13px] tabular-nums transition-colors",
                            active ? "text-ink-950" : "text-ink-500 group-hover:text-ink-950",
                          )}
                        >
                          {star}
                        </span>
                        <span className="block h-1.5 w-full overflow-hidden bg-ink-100">
                          <motion.span
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            className={cn("block h-full", active ? "bg-brand-700" : "bg-ink-900")}
                          />
                        </span>
                        <span
                          className={cn(
                            "w-9 text-right text-[13px] tabular-nums transition-colors sm:w-10",
                            active ? "text-ink-950" : "text-ink-500 group-hover:text-ink-950",
                          )}
                        >
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
                onClick={() => setFilter(chip.key)}
                aria-pressed={filter === chip.key}
                className={cn(
                  "tap inline-flex h-9 items-center rounded-lg border px-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200 sm:text-[11.5px]",
                  filter === chip.key
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-hairline text-ink-600 hover:border-ink-950 hover:text-ink-950",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* The rule runs the width of the column and the words stop at the
              measure, so the note reads as a footnote to the panel above it
              rather than as another tinted box. Every word of it is the
              shop's own promise and is kept as written. */}
          <div className="mt-5 border-t border-hairline pt-4">
            <p className="max-w-[46ch] text-[13px] leading-[1.6] text-ink-500">
              Only customers who bought the product on WeekendCart can leave a review. We never edit
              or remove a review for being negative.
            </p>
          </div>
        </div>

        {/* List */}
        <div>
          {filtered.length === 0 ? (
            <p className="border-t border-hairline pt-4 text-[13px] text-ink-500 sm:text-[13.5px]">
              No reviews match that filter yet.
            </p>
          ) : (
            <ul className="border-t border-hairline">
              <AnimatePresence initial={false}>
                {filtered.slice(0, visible).map((review) => (
                  <motion.li
                    key={review.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="border-b border-hairline py-4 sm:py-5"
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                        {/* Initials in a hairline square, like a stamp on a
                            docket. The round tinted disc was the one piece of
                            app furniture left on the page. */}
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-hairline text-[11.5px] font-semibold tracking-[0.04em] text-ink-700">
                          {review.author
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-semibold text-ink-950 sm:text-[14px] lg:flex-nowrap">
                            {review.author}
                            {review.verified && (
                              <span
                                title="Verified purchase"
                                className="inline-flex items-center gap-1 border border-hairline px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-[0.1em] text-brand-700"
                              >
                                <VerifiedIcon size={10} /> Verified
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-[13px] text-ink-500">
                            {review.location} · {formatDate(review.createdAt, "short")}
                          </p>
                        </div>
                      </div>
                      <Stars value={review.rating} size={13} className="shrink-0" />
                    </div>

                    <h3 className="mt-3 text-[14px] font-semibold text-ink-950 sm:text-[14.5px]">
                      {review.title}
                    </h3>
                    <p className="mt-1.5 max-w-[46ch] text-[13px] leading-[1.6] text-ink-600 sm:text-[13.5px]">
                      {review.body}
                    </p>

                    {review.images && (
                      <div className="mt-3 flex flex-wrap gap-2 lg:flex-nowrap">
                        {review.images.map((src) => (
                          <span
                            key={src}
                            className="relative h-16 w-16 overflow-hidden rounded-lg border border-hairline bg-ink-100"
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
                      aria-pressed={Boolean(helpful[review.id])}
                      className={cn(
                        "tap mt-3 inline-flex h-9 items-center gap-2 border px-3 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200",
                        helpful[review.id]
                          ? "border-brand-700 bg-brand-700 text-white"
                          : "border-hairline text-ink-500 hover:border-ink-950 hover:text-ink-950",
                      )}
                    >
                      <ThumbsUp size={12} />
                      <span>
                        Helpful{" "}
                        <span className="tabular-nums">
                          ({review.helpfulCount + (helpful[review.id] ? 1 : 0)})
                        </span>
                      </span>
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
              <span>
                Show more reviews{" "}
                <span className="tabular-nums">({filtered.length - visible} left)</span>
              </span>
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

      {/* A heading over an empty rule reads as something that failed to load.
          A new listing has no questions yet, and saying so — with the way to
          ask one — is the honest version of the same space. */}
      {questions.length === 0 ? (
        <div className="mt-3 border-t border-hairline pt-4 sm:mt-5 sm:pt-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            No questions about this one yet
          </p>
          <p className="mt-2 max-w-[46ch] text-[13px] leading-[1.6] text-ink-600 sm:text-[14px]">
            Ask us anything — size, fit, what is in the box, how it runs. We answer within a day,
            and anything useful is published here for the next person wondering the same.
          </p>
          <a
            href="/contact"
            className="tap mt-4 inline-flex items-center text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-colors hover:text-gold-700"
          >
            Ask a question
          </a>
        </div>
      ) : (
        /* A ruled index that opens in place — the same shape as the collection
           list on the homepage, so a question reads as a line in a contents
           page rather than as another card. */
        <ul className="mt-3 divide-y divide-hairline border-y border-hairline sm:mt-5">
          {questions.map((qa) => {
            const expanded = open === qa.id;
            return (
              <li key={qa.id}>
                <button
                  onClick={() => setOpen(expanded ? null : qa.id)}
                  aria-expanded={expanded}
                  className="tap flex w-full items-start gap-3 py-3.5 text-left sm:py-4"
                >
                  <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-[1.45] text-ink-900 sm:text-[14px]">
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
                      <div className="pb-4 sm:pb-5">
                        <p className="max-w-[46ch] text-[13px] leading-[1.6] text-ink-600 sm:text-[13.5px]">
                          {qa.answer}
                        </p>
                        <p className="mt-2 text-[13px] tabular-nums text-ink-500">
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
      )}
    </section>
  );
}
