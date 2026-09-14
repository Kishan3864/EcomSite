"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Clock, PenLine, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { reviewEligibility, submitReview, type ReviewEligibility } from "@/services/commerce";
import { useStore } from "@/store/store";
import { cn, formatDate } from "@/lib/utils";
import { Form } from "@/components/ui/form";

/** The same panel however it is filled, so the section never jumps about. */
function Note({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-hairline bg-surface p-3.5 text-[12.5px] leading-relaxed text-ink-600 sm:mt-6 sm:p-4 sm:text-[13px]">
      {icon}
      <span>{children}</span>
    </div>
  );
}

/**
 * Writing a review, for the people who have earned the right to.
 *
 * Only a customer the product actually reached can write one — see
 * `reviewEligibility`. That is checked on the server when the review is
 * submitted; this asks the same question first so the page can say *why* the
 * form is not there, which is the difference between a rule and a dead end.
 *
 * Reviews are then held for moderation, so nothing written here appears until
 * someone approves it. Saying so up front is kinder than letting a shopper
 * wonder where their review went.
 */
export function ReviewForm({ productId }: { productId: string }) {
  const { customer, sessionChecked } = useStore();
  const [status, setStatus] = useState<ReviewEligibility | null>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  // Asked once the session is known, and again if the visitor signs in while
  // the page is open.
  useEffect(() => {
    if (!sessionChecked) return;
    let stale = false;
    reviewEligibility(productId)
      .then((result) => {
        if (!stale) setStatus(result);
      })
      .catch(() => {
        if (!stale) setStatus({ can: false, reason: "not-bought" });
      });
    return () => {
      stale = true;
    };
  }, [productId, sessionChecked, customer?.id]);

  if (sent) {
    return (
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-[12.5px] leading-relaxed text-brand-900 sm:mt-6 sm:p-4 sm:text-[13px]">
        <Check size={16} className="mt-0.5 shrink-0 text-brand-600" />
        <span>
          Thank you — your review is with our team. Once it is checked it will show up on this
          page, usually within a day.
        </span>
      </div>
    );
  }

  if (!sessionChecked || !status) {
    return <Note>Checking your account…</Note>;
  }

  if (status.can === false) {
    if (status.reason === "signin") {
      return (
        <Note icon={<ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-600" />}>
          Every review here is from someone who bought this and had it delivered.{" "}
          <Link href="/login" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          if that is you.
        </Note>
      );
    }
    if (status.reason === "awaiting-delivery") {
      return (
        <Note icon={<Clock size={15} className="mt-0.5 shrink-0 text-brand-600" />}>
          Your order <strong className="font-medium text-ink-900">{status.orderNumber}</strong> is on
          its way — expected by {formatDate(status.expected, "day")}. You can write a review here
          once it has been delivered.
        </Note>
      );
    }
    if (status.reason === "already") {
      return (
        <Note icon={<Check size={15} className="mt-0.5 shrink-0 text-brand-600" />}>
          {status.status === "published"
            ? "You have already reviewed this product — thank you. It is on this page."
            : status.status === "pending"
              ? "Your review is with our team and will appear once it has been checked."
              : "You have already reviewed this product."}
        </Note>
      );
    }
    return (
      <Note icon={<ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-600" />}>
        Only customers who have bought this and had it delivered can review it — which is why every
        review below is from someone who owns it.
      </Note>
    );
  }

  if (!open) {
    return (
      <div className="mt-4 sm:mt-6">
        <Button
          variant="outline"
          size="md"
          className="tap w-full sm:w-auto"
          onClick={() => setOpen(true)}
        >
          <PenLine size={15} /> Write a review
        </Button>
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-500">
          <ShieldCheck size={13} className="shrink-0 text-brand-600" />
          You bought this on order {status.orderNumber} — your review will be marked a verified
          purchase.
        </p>
      </div>
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
    <Form onSubmit={submit} className="mt-4 rounded-xl border border-hairline bg-surface p-4 sm:mt-6 sm:p-5">
      <h3 className="text-[13.5px] font-semibold text-ink-950 sm:text-[14px]">Write a review</h3>
      <p className="mt-1 text-[12.5px] text-ink-500">
        Posting as {customer?.name ?? "your account"}. Reviews are checked before they appear.
      </p>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-[12.5px] font-medium text-ink-800">Your rating</legend>
        {/* Phones: each star a 40px target; the row is pulled back by the
            padding so the first star still lines up under the legend. */}
        <div className="-ml-2 flex sm:ml-0 sm:gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              aria-pressed={rating === value}
              onMouseEnter={() => setHover(value)}
              onClick={() => setRating(value)}
              className="tap rounded-md p-2 transition-transform hover:scale-110 sm:p-1"
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
          // 16px on phones: iOS zooms the page into any smaller field.
          className="w-full rounded-lg border border-ink-200 bg-canvas px-3.5 py-3 text-[16px] leading-relaxed text-ink-900 outline-none transition-colors placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 sm:text-[14px]"
        />
      </Field>

      {error && (
        <p role="alert" className="mt-3 text-[12.5px] font-medium text-sale-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Button type="submit" size="sm" loading={pending} className="tap h-10 sm:h-9">
          Submit review
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="tap h-10 sm:h-9"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </Form>
  );
}
