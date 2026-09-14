import { BUSINESS } from "@/config/business";
import { formatINR } from "@/lib/utils";

/**
 * How the storefront names the ways it can be paid.
 *
 * Three bands of the homepage tell a visitor what this shop accepts, and all
 * three have to say the same thing as the checkout — including when the owner
 * turns a method off at four in the afternoon. So none of them may read
 * `BUSINESS.ops.codEnabled`, which is a literal `true` written months ago and
 * is wrong today. They read the live switches, through
 * `getPublicPaymentMethods()`, and then turn the answer into words here so the
 * wording cannot drift between one band and the next either.
 *
 * A shop that promises a payment method it will not offer has lied to the
 * customer before they reached the basket, and that is the single cheapest way
 * to lose somebody who was ready to buy.
 */
export interface PublicPayments {
  upi: boolean;
  gateway: boolean;
  cod: boolean;
  codLimit: number;
}

/** The methods, longest-form, in the order a customer meets them at checkout. */
export function paymentMethodNames(p: PublicPayments): string[] {
  return [
    p.upi ? "UPI" : null,
    p.gateway ? `Card and net banking via ${BUSINESS.ops.paymentAggregator}` : null,
    p.cod ? `Cash on delivery up to ${formatINR(p.codLimit)}` : null,
  ].filter((name): name is string => name !== null);
}

/** The same list, shortened to fit a single line in a four-cell grid. */
export function paymentMethodNamesShort(p: PublicPayments): string[] {
  return [
    p.upi ? "UPI" : null,
    p.gateway ? "Card" : null,
    p.gateway ? "Net banking" : null,
    p.cod ? "Cash on delivery" : null,
  ].filter((name): name is string => name !== null);
}

/**
 * One sentence, or nothing at all.
 *
 * Returns `null` when every method is switched off rather than an empty
 * string, so a caller has to decide what to show in its place instead of
 * quietly printing a label with a blank beside it.
 */
export function paymentSentence(p: PublicPayments): string | null {
  const names = paymentMethodNamesShort(p);
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
