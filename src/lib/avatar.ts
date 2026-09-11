import "server-only";

/**
 * Profile photos: what counts as one, and where it is served from.
 *
 * An upload is trusted for nothing. Its declared type and file name are
 * ignored; the bytes themselves are checked against the signatures of the
 * three formats accepted. SVG is deliberately not one of them — it is a
 * document that can carry script, not a picture.
 */

/** After the browser has resized it, a photo is tens of kilobytes. */
export const AVATAR_MAX_BYTES = 1_000_000;

export type AvatarMime = "image/jpeg" | "image/png" | "image/webp";

/** Identify the format from the file's first bytes, or reject it. */
export function sniffImage(bytes: Uint8Array): AvatarMime | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((b, i) => bytes[i] === b)) return "image/png";

  // WebP: "RIFF" .... "WEBP"
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";

  return null;
}

/**
 * The photo to show for a customer: their own upload first, then the one their
 * sign-in provider supplied, else null (the UI then draws a default avatar).
 *
 * A provider URL is only used when it is https. It comes from a third party, and
 * although an <img> cannot run script, nothing else from outside gets rendered
 * on trust either.
 */
export function resolveAvatar(customer: {
  avatar?: { key: string } | null;
  avatarUrl?: string | null;
}): string | null {
  if (customer.avatar?.key) return `/api/account/avatar/${customer.avatar.key}`;
  const provider = customer.avatarUrl?.trim();
  if (provider && provider.startsWith("https://")) return provider;
  return null;
}
