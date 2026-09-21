"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CircleCheck, MessageSquareHeart } from "lucide-react";
import Image from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { StarPicker, StarsGiven } from "@/components/product/review-fields";
import { REVIEW_LIMITS, reviewProblem } from "@/lib/review-rules";
import { submitReviewFromLink } from "@/services/commerce";
import type { ReviewItem, ReviewPanel } from "@/services/order-reviews";
import { cn } from "@/lib/utils";

/**
 * "Loved it? Tell others" — rating an order's products right where the
 * customer is looking at it, the moment it is delivered.
 *
 * Shown on the track page and the order page. The server decides whether it
 * appears at all and which products it lists (src/services/order-reviews.ts:
 * reviewPanelFor); this only draws it and posts from it. Posting goes through
 * the same action as the review page an email opens, with the order's review
 * token, so a customer who came from an email link without signing in can use
 * it — and so there is one set of rules: stars required, words optional, one
 * review per product, verified purchase, checked before it appears.
 *
 * Drawn as its own brand-tinted card, each product on a white sheet inside
 * it, so it reads as an invitation rather than one more ledger row. Mobile
 * first: everything stacks, and the button is full width until there is room
 * to set it at the right.
 */

/** What each star means, said as the customer picks it. */
const STAR_WORDS = ["Poor", "Okay", "Good", "Great", "Loved it"] as const;

const THANKS = "Thanks! Your review will appear after a quick check.";

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
  const [posted, setPosted] = useState(false);
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
      setPosted(true);
      onRated(item.productId, rating);
    });
  }

  return (
    <li className="bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-3.5 sm:gap-4">
        <Link
          href={`/p/${item.slug}`}
          className="relative h-20 w-20 shrink-0 overflow-hidden bg-ink-100 sm:h-24 sm:w-24"
        >
          {item.image && <Image src={item.image} alt="" fill sizes="96px" className="object-cover" />}
        </Link>
        <div className="min-w-0">
          <Link
            href={`/p/${item.slug}`}
            className="line-clamp-2 text-[14.5px] font-semibold leading-[1.35] text-ink-950 hover:text-brand-700 sm:text-[15px]"
          >
            {item.title}
          </Link>
          {item.variantLabel && <p className="mt-0.5 text-[12.5px] text-ink-500">{item.variantLabel}</p>}
          {item.myRating !== null && !posted && (
            <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-600">
              You rated this <StarsGiven value={item.myRating} /> — thank you
            </p>
          )}
        </div>
      </div>

      {posted ? (
        <p role="status" className="mt-4 flex items-start gap-2 text-[14px] font-medium leading-[1.5] text-brand-800">
          <CircleCheck size={18} className="mt-px shrink-0 text-brand-700" />
          {THANKS}
        </p>
      ) : item.myRating === null ? (
        <div className="mt-4">
          <StarPicker
            value={rating}
            onChange={(n) => {
              setRating(n);
              setError(null);
            }}
            about={item.title}
            size={30}
            labels={STAR_WORDS}
          />

          <label htmlFor={fieldId} className="sr-only">
            What did you like about {item.title}? (optional)
          </label>
          <textarea
            id={fieldId}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={REVIEW_LIMITS.body}
            placeholder="What did you like? How are you using it?"
            // 16px on phones: iOS zooms the page into any smaller field.
            className="mt-3 block w-full bg-canvas px-3.5 py-3 text-[16px] leading-[1.55] text-ink-900 outline-none placeholder:text-ink-400 sm:text-[14px]"
          />
          <p className="mt-1.5 text-[12px] text-ink-500">
            Optional · {body.length}/{REVIEW_LIMITS.body} characters
          </p>

          {error && (
            <p role="alert" className="mt-2 text-[13px] font-medium text-sale-600">
              {error}
            </p>
          )}

          <div className="mt-3 flex sm:justify-end">
            <Button
              type="button"
              size="md"
              loading={pending}
              disabled={rating === 0}
              onClick={post}
              className="tap h-11 w-full sm:w-auto sm:min-w-[11rem]"
            >
              Post review
            </Button>
          </div>
        </div>
      ) : null}
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
  const postedHere = Object.keys(given).length > 0;

  const card = cn("scroll-mt-24 bg-brand-50 p-4 sm:p-6", className);

  // Everything rated: one line. Just posted the last one → the same thanks
  // the row would have shown; everything rated on an earlier visit → a plain
  // thank-you.
  if (allDone) {
    return (
      <section id="rate" className={card} aria-live="polite">
        <p className="flex items-start gap-2 text-[14px] font-medium leading-[1.5] text-brand-800">
          <CircleCheck size={18} className="mt-px shrink-0 text-brand-700" />
          {postedHere ? THANKS : "Thanks for reviewing your order — it helps the next person decide."}
        </p>
      </section>
    );
  }

  return (
    <section id="rate" className={card} aria-labelledby="rate-heading">
      <h2
        id="rate-heading"
        className="flex items-center gap-2 font-display text-[19px] leading-[1.2] tracking-[-0.02em] text-ink-950 sm:text-[22px]"
      >
        <MessageSquareHeart size={20} strokeWidth={1.75} className="shrink-0 text-brand-700" />
        Loved it? Tell others
      </h2>
      <p className="mt-1.5 max-w-[56ch] text-[13.5px] leading-[1.55] text-ink-600">
        Good or not so good, an honest word from someone who owns it helps the next person decide.
        Tap the stars — words are optional.
      </p>

      <ul className="mt-4 space-y-3" aria-live="polite">
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

      <p className="mt-3 text-[11.5px] leading-[1.55] text-ink-500">
        Posting as {panel.author} · {panel.location}. Marked as a verified purchase and checked before
        it appears. We never edit or remove a review for being negative.
      </p>
    </section>
  );
}
