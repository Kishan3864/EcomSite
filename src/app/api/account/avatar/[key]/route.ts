import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/customer";

/**
 * Serve a customer's uploaded photo — to that customer only.
 *
 * The key in the URL is random and rotates on every upload, but it is still
 * checked against the signed-in customer: knowing someone's photo URL is not a
 * reason to be shown their photo. Anything that does not match gets a plain 404,
 * the same answer as a key that never existed, so the endpoint cannot be used to
 * probe which keys are real.
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const notFound = () => new Response("Not found", { status: 404 });

  if (!/^[A-Za-z0-9_-]{16,40}$/.test(key)) return notFound();

  const session = await getCustomerSession();
  if (!session) return notFound();

  const photo = await db.customerAvatar.findFirst({
    where: { key, customerId: session.id },
    select: { mime: true, data: true },
  });
  if (!photo) return notFound();

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      // Private: it is one person's photo, and must not sit in a shared cache.
      // Immutable: the key changes whenever the photo does.
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      // Even if a crafted file slipped past the signature check, a browser
      // opening this URL directly gets nothing it could execute.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
