import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/customer";
import { getCustomerAddresses } from "@/services/orders";

/**
 * Who is signed in, plus their saved addresses.
 *
 * The storefront reads this from the browser instead of rendering it, so the
 * catalogue pages stay static and cacheable while the header and checkout
 * still know the customer. Never cached, by anyone.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json(
      { customer: null, addresses: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const [addresses, profile] = await Promise.all([
    getCustomerAddresses(),
    db.customer.findUnique({ where: { id: session.id }, select: { phone: true } }),
  ]);

  return NextResponse.json(
    {
      customer: {
        id: session.id,
        name: session.name,
        email: session.email,
        phone: profile?.phone ?? "",
      },
      addresses,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
