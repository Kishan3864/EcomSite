import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { canViewOrder } from "@/lib/auth/customer";
import { getAdminSession } from "@/lib/auth/admin";
import { payuConfig } from "@/lib/payments/payu";
import { startPayuPayment } from "@/services/payu-core";
import { PayuRedirect } from "./payu-redirect";

export const metadata: Metadata = {
  title: "Taking you to payment",
  robots: { index: false, follow: false },
};

/**
 * The hand-off to PayU.
 *
 * The transaction is signed here, on the server, and the browser carries the
 * signed form across. Nothing is asked of PayU from this machine, which is why
 * this works where a server-to-server gateway did not.
 */
export default async function PayuHandoffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, number: true, total: true, customerId: true, paymentStatus: true },
  });
  if (!order) notFound();
  if (!(await canViewOrder(order))) notFound();
  if (order.paymentStatus === "PAID") redirect(`/order/${order.id}`);

  // The same rule the payment step follows, enforced where it actually
  // matters: while the gateway is in test mode nobody but the owner reaches
  // PayU. Hiding the option is not enough on its own — this URL is guessable,
  // and an older order placed before the option was hidden still points here.
  const config = payuConfig();
  if (config && config.mode !== "live" && !(await getAdminSession())) {
    return (
      <PayuRedirect
        orderId={order.id}
        orderNumber={order.number}
        amount={order.total}
        endpoint=""
        fields={{}}
        error="Card payment is still being set up on this site. Your order is saved — open it from My orders and pay by UPI, or call us and we will take it from there."
      />
    );
  }

  const started = await startPayuPayment(order.id);

  return (
    <PayuRedirect
      orderId={order.id}
      orderNumber={order.number}
      amount={order.total}
      endpoint={started.ok ? started.session.endpoint : ""}
      fields={started.ok ? started.session.fields : {}}
      error={started.ok ? null : started.error}
    />
  );
}
