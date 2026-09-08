"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, PenLine, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { submitReview } from "@/services/commerce";
import { useStore } from "@/store/store";
import { cn } from "@/lib/utils";

/**
 * Reviews are held for moderation, so nothing written here appears on the page
 * until someone approves it in the admin panel. Saying so up front is kinder
 * than letting a shopper wonder where their review went.
 */
export function ReviewForm({ productId }: { productId: string }) {
  const { customer, sessionChecked } = useStore();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 p-4 text-[13px] leading-relaxed text-brand-900">
        <Check size={16} className="mt-0.5 shrink-0 text-brand-600" />
        <span>
          Thank you — your review is with our team. Once it is checked it will show up on this
          page, usually within a day.
        </span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mt-6 rounded-xl border border-hairline bg-surface p-4 text-[13px] text-ink-600">
        {sessionChecked ? (
          <>
            <Link
              href="/login"
              className="font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              Sign in
            </Link>{" "}
            to write a review. We only publish reviews from real accounts.
          </>
        ) : (
          <span className="text-ink-400">Checking your account…</span>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="md" className="mt-6" onClick={() => setOpen(true)}>
        <PenLine size={15} /> Write a review
      </Button>
    );
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const body = String(data.get("body") ?? "").trim();

    if (rating < 1) return setError("Pick a rating from one to five stars.");
    if (title.length < 3) return setError("Give your review a short headline.");
    if (body.length < 15) return setError("A sentence or two helps other shoppers decide.");

    setError(null);
    startTransition(async () => {
      const result = await submitReview({ productId, rating, title, body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-xl border border-hairline bg-surface p-5">
      <h3 className="text-[14px] font-semibold text-ink-950">Write a review</h3>
      <p className="mt-1 text-[12.5px] text-ink-500">
        Posting as {customer.name}. Reviews are checked before they appear.
      </p>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-[12.5px] font-medium text-ink-800">Your rating</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              aria-pressed={rating === value}
              onMouseEnter={() => setHover(value)}
              onClick={() => setRating(value)}
              className="rounded-md p-1 transition-transform hover:scale-110"
            >
              <Star
                size={24}
                strokeWidth={1.75}
                className={cn(
                  "transition-colors",
                  value <= (hover || rating)
                    ? "fill-gold-400 text-gold-500"
                    : "text-ink-300",
                )}
              />
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Headline" htmlFor="review-title" className="mt-4">
        <Input id="review-title" name="title" placeholder="Worth every rupee" maxLength={80} />
      </Field>

      <Field label="Your review" htmlFor="review-body" className="mt-4">
        <textarea
          id="review-body"
          name="body"
          rows={4}
          maxLength={1200}
          placeholder="How does it feel to use? Would you buy it again?"
          className="w-full rounded-lg border border-ink-200 bg-canvas px-3.5 py-3 text-[14px] leading-relaxed text-ink-900 outline-none transition-colors placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500"
        />
      </Field>

      {error && (
        <p role="alert" className="mt-3 text-[12.5px] font-medium text-sale-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Button type="submit" size="sm" loading={pending}>
          Submit review
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
