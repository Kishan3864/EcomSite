import { CheckoutPaymentMethodsProvider } from "@/components/checkout/payment-methods";
import { getCheckoutPaymentMethods } from "@/services/storefront-config";

/**
 * The checkout's own payment options, resolved per visitor.
 *
 * `dynamic = "force-dynamic"` is DECLARED here rather than assumed, and that
 * is the whole point of this line.
 *
 * This layout reads the admin cookie (see `getCheckoutPaymentMethods`), and
 * this comment used to say "every /checkout route is already dynamic and
 * served no-store" — an assumption nothing in the tree enforced. Next then
 * tried to prerender the segment, the cookie read threw DYNAMIC_SERVER_USAGE,
 * and because the throw happened in a LAYOUT there was no error boundary above
 * it to catch it: the shopper got a bare "Internal Server Error" instead of a
 * checkout. It only bit when the gateway was switched on in owner-only test
 * mode, because that is the one branch that reaches for the cookie — which is
 * exactly why it looked random.
 *
 * Declaring it costs nothing. The checkout is a per-shopper page that must
 * never be cached or shared; it was always meant to be dynamic.
 */
export const dynamic = "force-dynamic";

/** A checkout must never be served from a cache — not even for a second. */
export const revalidate = 0;

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const methods = await getCheckoutPaymentMethods();
  return <CheckoutPaymentMethodsProvider methods={methods}>{children}</CheckoutPaymentMethodsProvider>;
}
