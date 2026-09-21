"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { REVIEW_LIMITS } from "@/lib/review-rules";
import { cn } from "@/lib/utils";

/**
 * The inside of a review form: the stars, the headline and the review.
 *
 * One component for both places a review is written — under a product, and on
 * the page a review email opens — so the two cannot drift into different
 * rules, different limits or different looks. The caller owns the <form>, the
 * submit button and what happens on submit; the text fields are uncontrolled
 * and read from FormData as `title` and `body`.
 */
export function ReviewFields({
  rating,
  onRating,
  idPrefix = "review",
}: {
  rating: number;
  onRating: (value: number) => void;
  idPrefix?: string;
}) {
  const [hover, setHover] = useState(0);

  return (
    <>
      <fieldset className="mt-4">
        <legend className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          Your rating
        </legend>
        {/* Phones: each star a 40px target; the row is pulled back by the
            padding so the first star still lines up under the legend.
            The stars fill as the pointer crosses them, which is feedback
            enough — a star that also grew was the one thing on the page
            bouncing under the cursor. */}
        <div className="-ml-2 mt-1 flex sm:ml-0 sm:gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              aria-pressed={rating === value}
              onMouseEnter={() => setHover(value)}
              onClick={() => onRating(value)}
              className="tap p-2 sm:p-1"
            >
              <Star
                size={24}
                strokeWidth={1.75}
                className={cn(
                  "transition-colors duration-200",
                  value <= (hover || rating) ? "fill-gold-400 text-gold-500" : "text-ink-300",
                )}
              />
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Headline" htmlFor={`${idPrefix}-title`} optional className="mt-4">
        <Input
          id={`${idPrefix}-title`}
          name="title"
          placeholder="Sum it up in a few words"
          maxLength={REVIEW_LIMITS.title}
        />
      </Field>

      <Field label="Your review" htmlFor={`${idPrefix}-body`} optional className="mt-4">
        <textarea
          id={`${idPrefix}-body`}
          name="body"
          rows={4}
          maxLength={REVIEW_LIMITS.body}
          placeholder="How does it feel to use? Anything the next person should know?"
          // 16px on phones: iOS zooms the page into any smaller field.
          className="w-full bg-canvas px-3.5 py-3 text-[16px] leading-[1.6] text-ink-900 outline-none transition-colors placeholder:text-ink-400 sm:text-[14px]"
        />
      </Field>
    </>
  );
}
