import { CheckoutPaymentMethodsProvider } from "@/components/checkout/payment-methods";
import { getCheckoutPaymentMethods } from "@/services/storefront-config";

/**
 * The checkout's own payment options, resolved per visitor.
 *
 * This reads the admin cookie (see `getCheckoutPaymentMethods`) and so renders
 * dynamically — which costs nothing, because every `/checkout` route is already
 * dynamic and served `no-store`. Confining that read to this layout is what
 * lets the rest of the shop stay prerendered.
 */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const methods = await getCheckoutPaymentMethods();
  return <CheckoutPaymentMethodsProvider methods={methods}>{children}</CheckoutPaymentMethodsProvider>;
}
