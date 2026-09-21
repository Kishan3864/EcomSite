"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reviewEligibility, submitReview, type ReviewEligibility } from "@/services/commerce";
import { useStore } from "@/store/store";
import { formatDate } from "@/lib/utils";
import { reviewProblem } from "@/lib/review-rules";
import { Form } from "@/components/ui/form";
import { ReviewFields } from "./review-fields";

/** One soft panel however it is filled, so the section never jumps about. */
function Note({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="card-muted mt-4 rounded-xl p-4 sm:p-5">
      {label && <p className="t-h3 text-[14px]">{label}</p>}
      <p className={label ? "t-body mt-1 max-w-[62ch]" : "t-body max-w-[62ch]"}>{children}</p>
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
      <Note label="Review received">
        Thank you — your review is with our team. Once it is checked it will show up on this
        page, usually within a day.
      </Note>
    );
  }

  if (!sessionChecked || !status) {
    return <Note>Checking your account…</Note>;
  }

  if (status.can === false) {
    if (status.reason === "signin") {
      return (
        <Note label="Sign in to review">
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
        <Note label="Your order">
          Your order{" "}
          <strong className="font-semibold tabular-nums text-ink-900">{status.orderNumber}</strong> is on
          its way — expected by {formatDate(status.expected, "day")}. You can write a review here
          once it has been delivered.
        </Note>
      );
    }
    if (status.reason === "already") {
      return (
        <Note label="Your review">
          {status.status === "published"
            ? "You have already reviewed this product — thank you. It is on this page."
            : status.status === "pending"
              ? "Your review is with our team and will appear once it has been checked."
              : "You have already reviewed this product."}
        </Note>
      );
    }
    return (
      <Note label="Who can review">
        Only customers who have bought this and had it delivered can review it — which is why every
        review below is from someone who owns it.
      </Note>
    );
  }

  if (!open) {
    return (
      <div className="card edge-glow mt-4 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <span className="icon-tile">
          <PenLine size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-h3">Write a review</p>
          <p className="t-body mt-1 max-w-[56ch]">
            You bought this on order{" "}
            <span className="font-semibold tabular-nums text-ink-900">{status.orderNumber}</span> —
            your review will be marked a verified purchase.
          </p>
        </div>
        <Button className="w-full shrink-0 sm:w-auto" onClick={() => setOpen(true)}>
          <PenLine size={16} aria-hidden /> Write a review
        </Button>
      </div>
    );
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") ?? "");
    const body = String(data.get("body") ?? "");

    const problem = reviewProblem({ rating, title, body });
    if (problem) return setError(problem);

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
    <Form onSubmit={submit} className="card mt-4 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="icon-tile icon-tile-sm">
          <PenLine size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="t-h3">Write a review</h3>
          <p className="t-small mt-1 max-w-[60ch]">
            Posting as {customer?.name ?? "your account"}. Only the stars are needed — a few words
            help the next person more. Reviews are checked before they appear.
          </p>
        </div>
      </div>

      <ReviewFields rating={rating} onRating={setRating} />

      {error && (
        <p role="alert" className="mt-3 text-[13px] font-medium text-sale-600">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={pending} className="w-full sm:w-auto">
          Submit review
        </Button>
        <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </Form>
  );
}
