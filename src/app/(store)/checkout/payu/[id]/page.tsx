import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { canViewOrder } from "@/lib/auth/customer";
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
