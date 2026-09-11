import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/customer";
import { getCustomerAddresses } from "@/services/orders";
import { resolveAvatar } from "@/lib/avatar";

/**
 * Who is signed in, their saved addresses and their checkout preferences.
 *
 * The storefront reads this from the browser instead of rendering it, so the
 * catalogue pages stay static and cacheable while the header, checkout and
 * account menu still know the customer. Never cached, by anyone.
 */
export const dynamic = "force-dynamic";

const EMPTY = { customer: null, addresses: [] };

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
  }

  const [addresses, profile] = await Promise.all([
    getCustomerAddresses(),
    db.customer.findUnique({
      where: { id: session.id },
      select: {
        phone: true,
        avatarUrl: true,
        avatar: { select: { key: true } },
        authProvider: true,
        preferredPayment: true,
        upiId: true,
      },
    }),
  ]);

  return NextResponse.json(
    {
      customer: {
        id: session.id,
        name: session.name,
        email: session.email,
        phone: profile?.phone ?? "",
        avatarUrl: profile ? resolveAvatar(profile) : null,
        authProvider: profile?.authProvider ?? "PASSWORD",
        // Lower-cased so it lines up with PaymentMethodId on the client.
        preferredPayment: profile?.preferredPayment
          ? (profile.preferredPayment.toLowerCase() as string)
          : null,
        upiId: profile?.upiId ?? null,
      },
      addresses,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
