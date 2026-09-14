import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { canViewOrder } from "@/lib/auth/customer";
import { UPI_APPS, upiConfig, upiPayUrl, upiQrSvg } from "@/lib/payments/upi";
import { UpiClient } from "./upi-client";

export const metadata: Metadata = { title: "Pay by UPI", robots: { index: false, follow: false } };

/**
 * Paying an order by UPI.
 *
 * Everything the shopper needs is rendered on the server — the QR is drawn
 * here, not fetched — so the page works on a slow phone, with no script beyond
 * the small form that reports the reference back.
 */
export default async function UpiPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      total: true,
      customerId: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      paymentRef: true,
      contactEmail: true,
    },
  });
  if (!order) notFound();
  if (!(await canViewOrder(order))) notFound();

  // Already settled, or never a UPI order: the order page is the right place.
  if (order.paymentStatus === "PAID") redirect(`/order/${order.id}`);
  if (order.paymentMethod !== "UPI") redirect(`/order/${order.id}`);

  const config = upiConfig();
  if (!config) {
    // Nothing to scan without a UPI id. The order still exists and is still
    // payable — the shop just cannot show a QR for it.
    return (
      <UpiClient
        orderId={order.id}
        orderNumber={order.number}
        amount={order.total}
        qrSvg=""
        payUrl=""
        appLinks={[]}
        vpa=""
        reported={order.paymentStatus === "VERIFYING" ? (order.paymentRef ?? "") : ""}
        unavailable
      />
    );
  }

  const payUrl = upiPayUrl(config, { amountRupees: order.total, orderNumber: order.number });

  return (
    <UpiClient
      orderId={order.id}
      orderNumber={order.number}
      amount={order.total}
      qrSvg={await upiQrSvg(payUrl)}
      payUrl={payUrl}
      appLinks={UPI_APPS.map((app) => ({
        id: app.id,
        name: app.name,
        href: upiPayUrl(config, { amountRupees: order.total, orderNumber: order.number }, app.scheme),
      }))}
      vpa={config.vpa}
      reported={order.paymentStatus === "VERIFYING" ? (order.paymentRef ?? "") : ""}
    />
  );
}
