import { db } from "@/lib/db";

/**
 * Serve an image uploaded through the admin panel.
 *
 * Public, unlike a customer's profile photo: these are product and category
 * pictures, and every one of them is already on a page anybody can open. The
 * key is random all the same, and it changes whenever the image does, which is
 * what lets the response be cached forever — a replaced picture is a new
 * address, so no cache anywhere can go on serving the old bytes.
 *
 * The headers are the same belt and braces the avatar route wears: the type is
 * the one sniffed from the file's own bytes at upload, never the one the
 * browser claimed, and a policy that would stop anything executing even if a
 * crafted file had somehow got past that check.
 */

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(key)) return new Response("Not found", { status: 404 });

  const asset = await db.mediaAsset.findUnique({
    where: { key },
    select: { mime: true, data: true },
  });
  if (!asset) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
