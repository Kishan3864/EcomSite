import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/admin";
import { MEDIA_MAX_BYTES, formatBytes, mediaUrl, sniffImage } from "@/lib/media";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Receive an image from the admin panel.
 *
 * A route rather than a server action because the image field uploads as soon
 * as a file is chosen — before the form it sits in is submitted — so that the
 * preview and the saved URL are settled while the owner is still filling in the
 * rest of the page. The form then only ever carries a URL, exactly as it did
 * when a URL was the only way to give it one.
 *
 * Nothing about the upload is taken on trust: the size is capped, the format is
 * read from the file's own first bytes rather than from what the browser
 * claimed, and the stored key is fresh random so the URL cannot be guessed or
 * collided with.
 */

const bad = (error: string, status = 400) =>
  Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return bad("Your session has expired. Sign in again.", 401);

  if (!rateLimit("media:upload", session.id || (await clientIp()), 60, 10 * 60_000)) {
    return bad("Too many uploads just now. Wait a minute and try again.", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("That upload could not be read. Try again.");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return bad("Choose an image to upload.");
  if (file.size > MEDIA_MAX_BYTES) {
    return bad(`That image is ${formatBytes(file.size)}. The limit is ${formatBytes(MEDIA_MAX_BYTES)}.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return bad("Use a JPG, PNG or WebP image. (SVG is not accepted — it can carry script.)");

  const alt = typeof form.get("alt") === "string" ? (form.get("alt") as string).trim().slice(0, 200) : "";
  const key = randomBytes(18).toString("base64url");
  const filename = file.name.replace(/[^\w.\- ]+/g, "").slice(0, 120) || "image";

  const asset = await db.mediaAsset.create({
    data: {
      key,
      filename,
      mime,
      bytes: bytes.byteLength,
      data: bytes,
      alt,
      uploadedById: session.id,
    },
    select: { key: true, filename: true, bytes: true },
  });

  return Response.json(
    { url: mediaUrl(asset.key), key: asset.key, filename: asset.filename, bytes: asset.bytes },
    { headers: { "Cache-Control": "no-store" } },
  );
}
