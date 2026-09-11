"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/customer";
import { rateLimit, TOO_MANY } from "@/lib/rate-limit";
import { AVATAR_MAX_BYTES, sniffImage } from "@/lib/avatar";

export interface AvatarState {
  ok?: boolean;
  message?: string;
  error?: string;
}

const EXPIRED = "Your session has ended. Sign in again to change your photo.";

/**
 * Save a profile photo.
 *
 * The browser resizes and re-encodes the image before sending it, which also
 * strips its EXIF metadata — a phone photo can carry the GPS position it was
 * taken at. The server still trusts none of that: it checks the bytes itself,
 * caps the size, and stores the result under a fresh random key.
 */
export async function uploadAvatar(_prev: AvatarState, formData: FormData): Promise<AvatarState> {
  const session = await getCustomerSession();
  if (!session) return { error: EXPIRED };
  if (!rateLimit("avatar:upload", session.id, 8, 10 * 60_000)) return { error: TOO_MANY };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo to upload." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "That photo is too large. Use one under 1 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return { error: "Use a JPG, PNG or WebP photo." };

  // A new key on every upload: the key is the URL, so the old photo can never
  // be served from a cache once it has been replaced.
  const key = randomBytes(18).toString("base64url");

  await db.customerAvatar.upsert({
    where: { customerId: session.id },
    create: { customerId: session.id, key, mime, data: bytes },
    update: { key, mime, data: bytes },
  });

  revalidatePath("/account", "layout");
  return { ok: true, message: "Your photo is updated." };
}

/** Go back to the sign-in provider's photo, or the default avatar. */
export async function removeAvatar(): Promise<AvatarState> {
  const session = await getCustomerSession();
  if (!session) return { error: EXPIRED };
  if (!rateLimit("avatar:upload", session.id, 8, 10 * 60_000)) return { error: TOO_MANY };

  await db.customerAvatar.deleteMany({ where: { customerId: session.id } });

  revalidatePath("/account", "layout");
  return { ok: true, message: "Your photo is removed." };
}
