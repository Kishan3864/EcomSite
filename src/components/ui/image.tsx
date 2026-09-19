import NextImage, { type ImageProps } from "next/image";

export type { ImageProps, ImageLoaderProps, StaticImageData } from "next/image";

/**
 * `next/image`, with one rule added: a photo that lives on another host is
 * handed to the browser as it is.
 *
 * Images that live here — uploads under /api/media, files under /public — go
 * through Next's optimiser, which reads them from this same server, resizes
 * and re-encodes them. That is the fast path and it needs no network.
 *
 * For a remote URL the optimiser would have to download the image *from this
 * server*, and this server cannot reach the internet reliably: every such
 * request hung until nginx gave up with a 504, and the shopper saw a broken
 * photo. A visitor's browser has no such trouble, so it fetches the image
 * itself. Nothing is resized, which is the price of a remote URL — upload the
 * photo in the admin panel instead and it is optimised like the rest.
 *
 * Every import of an image component in this codebase comes through here, and
 * the lint rule in eslint.config.mjs keeps it that way: a raw `next/image`
 * with a remote src would throw, since no remote host is allowed through the
 * optimiser (see `images` in next.config.ts).
 */
/**
 * Quality, for every photograph on the shop.
 *
 * It was 90 for a while, on the reasoning that the photograph is the product.
 * Measured on the largest photograph in this catalogue (828 px wide): AVIF
 * 64 KB at 90 against 47 KB at 75 (−27%), WebP 152 KB against 83 KB (−45%),
 * and the encode 10–25% quicker. Enlarged to 2x side by side, 75 is very
 * slightly smoother in fine texture and otherwise the same; at the size a
 * shopper sees it, they cannot be told apart. So the bytes go.
 *
 * Be clear about what this did NOT fix. The galleries that 504'd after a
 * deploy did so because the optimiser's cache was emptied by every deploy and
 * sixteen widths were on offer — see deploy/link-image-cache.mjs and `images`
 * in next.config.ts. Quality is the smallest of the three changes.
 *
 * A caller that truly needs more can still pass quality={90}; it is on the
 * `qualities` list in next.config.ts.
 */
const DEFAULT_QUALITY = 75;

export default function Image(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  const remote = /^(https?:)?\/\//i.test(src);
  return (
    <NextImage
      {...props}
      quality={props.quality ?? DEFAULT_QUALITY}
      unoptimized={props.unoptimized ?? remote}
    />
  );
}
