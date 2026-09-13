import "server-only";

/**
 * Images uploaded through the admin panel: what counts as one, and where it is
 * served from.
 *
 * An upload is trusted for nothing. Its declared content type and its file name
 * are ignored entirely; the bytes themselves are matched against the signatures
 * of the three formats accepted. SVG is deliberately not one of them — it is a
 * document that can carry script, not a picture, and `next.config.ts` refuses to
 * optimise one for the same reason.
 */

/** A product photograph at a sensible resolution is well under this. */
export const MEDIA_MAX_BYTES = 8_000_000;

export type MediaMime = "image/jpeg" | "image/png" | "image/webp";

export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp";

/** Identify the format from the file's first bytes, or reject it. */
export function sniffImage(bytes: Uint8Array): MediaMime | null {
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

/** Where an uploaded image lives. Also how the admin recognises one. */
export const MEDIA_PREFIX = "/api/media/";

export function mediaUrl(key: string) {
  return `${MEDIA_PREFIX}${key}`;
}

/** The key back out of a stored URL, or null if it is not one of ours. */
export function mediaKeyFromUrl(url: string): string | null {
  if (!url.startsWith(MEDIA_PREFIX)) return null;
  const key = url.slice(MEDIA_PREFIX.length).split(/[?#]/)[0];
  return /^[A-Za-z0-9_-]{16,40}$/.test(key) ? key : null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
