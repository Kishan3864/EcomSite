"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import Image from "@/components/ui/image";
import { Button, buttonClasses } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ReviewFields } from "@/components/product/review-fields";
import { reviewProblem } from "@/lib/review-rules";
import { submitReviewFromLink } from "@/services/commerce";
import type { ReviewItem, ReviewLinkState } from "@/services/order-reviews";
import { formatDate } from "@/lib/utils";

/**
 * The review form an email button opens, for exactly one product.
 *
 * No search, no sign-in, no list to pick from: the token in the link has
 * already said which order and which product, so the stars are the first
 * thing a thumb can reach. Once it is posted, the order's other products are
 * offered underneath — each one a single tap from its own form — and nothing
 * more is asked.
 */

const HEAD = "text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500";

const REFUSALS: Record<Exclude<ReviewLinkState, { ok: true }>["reason"], { title: string; body: string }> = {
  invalid: {
    title: "This review link does not work",
    body: "It may have been cut short when it was copied. Open it again from the email, or sign in and review anything you have received from its product page.",
  },
  expired: {
    title: "This review link has expired",
    body: "Links in review emails stop working a few months after delivery. You can still review anything you have received from its product page, signed in.",
  },
  "not-received": {
    title: "Not delivered yet",
    body: "This order has not reached you yet, so there is nothing to review. Once it is delivered you can review it here or from the product page.",
  },
  unavailable: {
    title: "No longer on sale",
    body: "This product has been taken off the shop, so it cannot be reviewed any more. Thank you for thinking of it.",
  },
};

function Thumb({ item, size }: { item: ReviewItem; size: "lg" | "sm" }) {
  const box = size === "lg" ? "h-24 w-24 sm:h-28 sm:w-28" : "h-14 w-14";
  return (
    <span className={`relative ${box} shrink-0 overflow-hidden bg-ink-100`}>
      {item.image && (
        <Image
          src={item.image}
          alt=""
          fill
          sizes={size === "lg" ? "112px" : "56px"}
          className="object-cover"
        />
      )}
    </span>
  );
}

/** The rest of the order: one tap to each product's own form, or a tick. */
function Others({ items, orderId, token }: { items: ReviewItem[]; orderId: string; token: string }) {
  if (items.length === 0) return null;
  const left = items.filter((i) => !i.reviewed).length;

  return (
    <section className="mt-8 pt-5 sm:mt-10">
      <h2 className={HEAD}>Also in this order</h2>
      <p className="mt-2 max-w-[52ch] text-[13px] leading-[1.6] text-ink-600">
        {left > 0
          ? "If you have a moment for these too — each opens its own short form."
          : "You have reviewed everything in this order. Thank you."}
      </p>
      <ul className="mt-3">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center gap-3 py-2.5">
            <Thumb item={item} size="sm" />
            <span className="min-w-0 flex-1 line-clamp-2 text-[13.5px] font-medium leading-[1.4] text-ink-900">
              {item.title}
            </span>
            {item.reviewed ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-brand-700">
                <Check size={13} /> Reviewed
              </span>
            ) : (
              <Link
                href={`/review/${orderId}/${item.productId}?t=${encodeURIComponent(token)}`}
                className={buttonClasses("outline", "sm", "tap h-10 shrink-0 sm:h-9")}
              >
                Rate this
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReviewLinkClient({ state, token }: { state: ReviewLinkState; token: string }) {
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!state.ok) {
    const copy = REFUSALS[state.reason];
    return (
      <div className="mx-auto max-w-xl bg-surface p-5 shadow-sm sm:p-8">
        <span className="eyebrow">Your review</span>
        <h1 className="mt-3 font-display text-[24px] leading-[1.1] tracking-[-0.025em] text-ink-950 sm:text-[30px]">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-[52ch] text-[14px] leading-[1.6] text-ink-600">{copy.body}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/account/orders" className={buttonClasses("primary", "md")}>
            My orders
          </Link>
          <Link href="/contact" className={buttonClasses("ghost", "md")}>
            Contact us
          </Link>
        </div>
      </div>
    );
  }

  const { item, orderId } = state;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") ?? "");
    const body = String(data.get("body") ?? "");

    const problem = reviewProblem({ rating, title, body });
    if (problem) return setError(problem);

    setError(null);
    startTransition(async () => {
      const result = await submitReviewFromLink({
        orderId,
        productId: item.productId,
        token,
        rating,
        title,
        body,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const done = sent || state.existing !== null;

  return (
    <div className="mx-auto max-w-xl bg-surface p-5 shadow-sm sm:p-8">
      <span className="eyebrow tabular-nums">
        Order {state.orderNumber} · delivered {formatDate(state.deliveredAt, "short")}
      </span>

      <div className="mt-4 flex items-start gap-4">
        <Thumb item={item} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-[20px] leading-[1.2] tracking-[-0.02em] text-ink-950 sm:text-[24px]">
            {item.title}
          </h1>
          {item.variantLabel && (
            <p className="mt-1 text-[13px] text-ink-500">{item.variantLabel}</p>
          )}
          <Link
            href={`/p/${item.slug}`}
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            See the product <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {done ? (
        <div className="mt-7" role="status">
          <h2 className={HEAD}>{sent ? "Review received" : "Your review"}</h2>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-[1.6] text-ink-700">
            {sent || state.existing === "pending"
              ? "Thank you — your review is with our team. Once it has been checked it will appear on the product page, marked as a verified purchase."
              : state.existing === "published"
                ? "You have already reviewed this product, and your review is on its page. Thank you."
                : "You have already reviewed this product. Thank you."}
          </p>
        </div>
      ) : (
        <Form onSubmit={submit} className="mt-6">
          <h2 className="text-[16px] font-semibold text-ink-950">How is it working out?</h2>
          <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-[1.6] text-ink-600">
            Your honest opinion — good, bad or in between — is what helps the next person decide.
            Only the stars are needed; a few words help even more.
          </p>

          <ReviewFields rating={rating} onRating={setRating} idPrefix="link-review" />

          {error && (
            <p role="alert" className="mt-3 text-[13px] font-medium text-sale-600">
              {error}
            </p>
          )}

          <Button type="submit" size="md" loading={pending} className="tap mt-5 w-full sm:w-auto">
            Post review
          </Button>

          <p className="mt-4 max-w-[52ch] text-[12.5px] leading-[1.6] text-ink-500">
            Posting as {state.author} · {state.location}. It will be marked as a verified purchase
            and checked before it appears. We never edit or remove a review for being negative.
          </p>
        </Form>
      )}

      <Others items={state.others} orderId={state.orderId} token={token} />

      {done && (
        <div className="mt-8">
          <Link href="/" className={buttonClasses("ghost", "md", "px-0")}>
            Back to the shop <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </div>
  );
}
