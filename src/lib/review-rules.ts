/**
 * What a review must contain, said once for every way of writing one.
 *
 * Only the stars are required. A headline and a few sentences help the next
 * shopper, and the form asks for them, but a person who will give five seconds
 * and not five minutes still has something true to say, and a rule that turns
 * them away loses it. Stars-only reviews count towards the rating like any
 * other and simply show no text.
 *
 * Shared by the product page's form, the review page the email links to, and
 * both server actions, so the browser and the server can never disagree about
 * what is allowed. They used to: the form accepted 15 characters, the server
 * demanded 20, and the gap came back as an error after pressing Submit.
 */

export const REVIEW_LIMITS = {
  title: 80,
  body: 1200,
} as const;

export interface ReviewDraft {
  rating: number;
  title: string;
  body: string;
}

/** Trimmed, with whitespace runs inside the headline collapsed. */
export function cleanReview(draft: ReviewDraft): ReviewDraft {
  return {
    rating: Math.round(Number(draft.rating)),
    title: String(draft.title ?? "").replace(/\s+/g, " ").trim(),
    body: String(draft.body ?? "").trim(),
  };
}

/** What is wrong with a review, in the words shown to its author, or null. */
export function reviewProblem(draft: ReviewDraft): string | null {
  const { rating, title, body } = cleanReview(draft);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return "Pick a rating from one to five stars.";
  if (title.length > REVIEW_LIMITS.title) return `Keep the headline under ${REVIEW_LIMITS.title} characters.`;
  if (body.length > REVIEW_LIMITS.body) return `Keep the review under ${REVIEW_LIMITS.body} characters.`;
  return null;
}
