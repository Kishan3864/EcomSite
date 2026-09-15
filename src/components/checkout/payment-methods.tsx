"use client";

import { createContext, useContext } from "react";
import type { PaymentMethod } from "@/lib/types";
import { useStore } from "@/store/store";

/**
 * The payment options the checkout is allowed to offer.
 *
 * Everywhere else in the shop, this is simply `config.paymentMethods` from the
 * store — read once in the shell, identical for every visitor, and therefore
 * cacheable. The checkout is the one place where the answer can depend on who
 * is asking: while PayU is in test mode the gateway is shown to a signed-in
 * owner and to nobody else, which takes a cookie to decide.
 *
 * So the checkout layout resolves that list on the server and puts it here,
 * and the two steps that list payment options read it through this hook. The
 * fallback is the shell's list, so a step rendered outside the checkout — or
 * before this provider exists — still shows the customer's options rather than
 * none.
 */
const CheckoutPaymentMethodsContext = createContext<PaymentMethod[] | null>(null);

export function CheckoutPaymentMethodsProvider({
  methods,
  children,
}: {
  methods: PaymentMethod[];
  children: React.ReactNode;
}) {
  return (
    <CheckoutPaymentMethodsContext.Provider value={methods}>
      {children}
    </CheckoutPaymentMethodsContext.Provider>
  );
}

export function useCheckoutPaymentMethods(): PaymentMethod[] {
  const provided = useContext(CheckoutPaymentMethodsContext);
  const { config } = useStore();
  return provided ?? config.paymentMethods;
}
