"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import Image from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { StarPicker, StarsGiven } from "@/components/product/review-fields";
import { REVIEW_LIMITS, reviewProblem } from "@/lib/review-rules";
import { submitReviewFromLink } from "@/services/commerce";
import type { ReviewItem, ReviewPanel } from "@/services/order-reviews";
import { cn } from "@/lib/utils";

/**
 * "How was it?" — rating an order's products right where the customer is
 * looking at it, the moment it is delivered.
 *
 * Shown on the track page and the order page. The server decides whether it
 * appears at all and which products it lists (src/services/order-reviews.ts:
 * reviewPanelFor); this only draws it and posts from it. Posting goes through
 * the same action as the review page an email opens, with the order's review
 * token, so a customer who came from an email link without signing in can use
 * it — and so there is one set of rules: stars required, words optional, one
 * review per product, verified purchase, checked before it appears.
 *
 * A row that has been rated turns into a quiet "you rated this" line; once
 * every row has, the whole panel folds down to one line of thanks.
 */

const HEAD = "text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500";

function Row({
  item,
  orderId,
  token,
  onRated,
}: {
  item: ReviewItem;
  orderId: string;
  token: string;
  onRated: (productId: string, rating: number) => void;
}) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldId = `rate-${item.productId}`;

  function post() {
    const problem = reviewProblem({ rating, title: "", body });
    if (problem) return setError(problem);
    setError(null);
    startTransition(async () => {
      const result = await submitReviewFromLink({
        orderId,
        productId: item.productId,
        token,
        rating,
        title: "",
        body,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onRated(item.productId, rating);
    });
  }

  return (
    <li className="flex gap-3 py-4 sm:gap-4">
      <Link href={`/p/${item.slug}`} className="relative h-16 w-16 shrink-0 overflow-hidden bg-ink-100">
        {item.image && <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/p/${item.slug}`}
          className="line-clamp-2 text-[13.5px] font-medium leading-[1.4] text-ink-900 hover:text-brand-700"
        >
          {item.title}
        </Link>
        {item.variantLabel && <p className="mt-0.5 text-[12.5px] text-ink-500">{item.variantLabel}</p>}

        {item.myRating !== null ? (
          <p className="mt-2 text-[13px] leading-[1.5] text-ink-600">
            You rated this <StarsGiven value={item.myRating} /> — thank you
          </p>
        ) : (
          <>
            <div className="mt-1.5">
              <StarPicker
                value={rating}
                onChange={(n) => {
                  setRating(n);
                  // A "pick a rating" left over from an earlier try is no longer true.
                  setError(null);
                }}
                about={item.title}
                size={22}
              />
            </div>
            <label htmlFor={fieldId} className="sr-only">
              A few words about {item.title} (optional)
            </label>
            <textarea
              id={fieldId}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              maxLength={REVIEW_LIMITS.body}
              placeholder="A few words, if you like (optional)"
              // 16px on phones: iOS zooms the page into any smaller field.
              className="mt-2 w-full max-w-xl bg-canvas px-3 py-2.5 text-[16px] leading-[1.55] text-ink-900 outline-none placeholder:text-ink-400 sm:text-[13.5px]"
            />
            {error && (
              <p role="alert" className="mt-2 text-[13px] font-medium text-sale-600">
                {error}
              </p>
            )}
            <Button
              type="button"
              size="sm"
              variant={rating > 0 ? "primary" : "outline"}
              loading={pending}
              onClick={post}
              className="tap mt-2.5 h-10 sm:h-9"
            >
              Post review
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

export function OrderReviewPanel({ panel, className }: { panel: ReviewPanel; className?: string }) {
  // Ratings given on this visit, laid over what the server knew.
  const [given, setGiven] = useState<Record<string, number>>({});
  const items = panel.items.map((i) =>
    given[i.productId] !== undefined ? { ...i, myRating: given[i.productId], reviewed: true } : i,
  );
  const allDone = items.every((i) => i.myRating !== null);

  if (allDone) {
    return (
      <section id="rate" className={cn("scroll-mt-24", className)} aria-live="polite">
        <p className="flex items-start gap-2 text-[13.5px] leading-[1.55] text-ink-700">
          <Check size={16} className="mt-[2px] shrink-0 text-brand-700" />
          {items.length === 1
            ? "Thank you for reviewing this order. Reviews are checked before they appear, marked as a verified purchase."
            : "Thank you for reviewing everything in this order. Reviews are checked before they appear, marked as a verified purchase."}
        </p>
      </section>
    );
  }

  return (
    <section id="rate" className={cn("scroll-mt-24", className)} aria-labelledby="rate-heading">
      <h2 id="rate-heading" className={HEAD}>
        How was it?
      </h2>
      <p className="mt-2 max-w-[60ch] text-[13.5px] leading-[1.6] text-ink-600">
        Your honest opinion — good, bad or in between — helps the next person decide. The stars are
        enough; a few words help even more.
      </p>

      <ul aria-live="polite">
        {items.map((item) => (
          <Row
            key={item.productId}
            item={item}
            orderId={panel.orderId}
            token={panel.token}
            onRated={(productId, rating) => setGiven((g) => ({ ...g, [productId]: rating }))}
          />
        ))}
      </ul>

      <p className="mt-1 max-w-[60ch] text-[12.5px] leading-[1.6] text-ink-500">
        Posting as {panel.author} · {panel.location}. Marked as a verified purchase and checked before
        it appears. We never edit or remove a review for being negative.
      </p>
    </section>
  );
}
