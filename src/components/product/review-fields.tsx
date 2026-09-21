"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { REVIEW_LIMITS } from "@/lib/review-rules";
import { cn } from "@/lib/utils";

/**
 * Five stars to pick a rating with.
 *
 * `about` names what is being rated in each button's accessible name ("4 stars
 * for the kettle") — needed wherever several products are rated on one page,
 * or a screen reader hears a list of identical "4 stars" buttons.
 */
export function StarPicker({
  value,
  onChange,
  about,
  size = 24,
  labels,
}: {
  value: number;
  onChange: (value: number) => void;
  about?: string;
  size?: number;
  /** A word per star ("Poor" … "Loved it"), shown beside them for the star hovered or picked. */
  labels?: readonly string[];
}) {
  const [hover, setHover] = useState(0);

  return (
    // Phones: each star a 40px target; the row is pulled back by the padding
    // so the first star still lines up with the text above it. The stars fill
    // as the pointer crosses them, which is feedback enough — a star that also
    // grew was the one thing on the page bouncing under the cursor.
    <div className="flex flex-wrap items-center gap-x-3">
      <div className="-ml-2 flex sm:-ml-1 sm:gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}${about ? ` for ${about}` : ""}`}
            aria-pressed={value === n}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="tap p-2 sm:p-1"
          >
            <Star
              size={size}
              strokeWidth={1.75}
              className={cn(
                "transition-colors duration-200",
                n <= (hover || value) ? "fill-gold-400 text-gold-500" : "text-ink-300",
              )}
            />
          </button>
        ))}
      </div>
      {labels && (
        <span aria-live="polite" className="min-w-[5.5rem] text-[13.5px] font-semibold text-ink-800">
          {labels[(hover || value) - 1] ?? ""}
        </span>
      )}
    </div>
  );
}

/** A rating already given, drawn with the same stars, read-only. */
export function StarsGiven({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex align-[-2px]" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.75}
          aria-hidden
          className={n <= value ? "fill-gold-400 text-gold-500" : "text-ink-300"}
        />
      ))}
    </span>
  );
}

/**
 * The inside of a review form: the stars, the headline and the review.
 *
 * One component for both places a full review is written — under a product,
 * and on the page a review email opens — so the two cannot drift into
 * different rules, different limits or different looks. The caller owns the
 * <form>, the submit button and what happens on submit; the text fields are
 * uncontrolled and read from FormData as `title` and `body`.
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
  return (
    <>
      <fieldset className="mt-4">
        <legend className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          Your rating
        </legend>
        <div className="mt-1">
          <StarPicker value={rating} onChange={onRating} />
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
