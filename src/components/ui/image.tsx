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
 * Next's default is 75, and in Next 16 it is also the only value allowed unless
 * `qualities` in next.config.ts says otherwise — so the whole catalogue was
 * being encoded at 75 and there was nothing a caller could do about it. On a
 * shop, the photograph *is* the product: 75 is where the AVIF encoder starts
 * smoothing fabric, brushed metal and the edge of a printed label, which is
 * precisely the detail somebody is enlarging the picture to judge.
 *
 * 90 costs roughly a third more bytes and buys back that detail. It is set
 * here, once, rather than at three hundred call sites — and a caller that wants
 * fewer bytes for something decorative can still pass quality={75}.
 *
 * Worth being straight about what this cannot do: it does not add pixels. A
 * source photograph that is 900px wide still has 900px of detail, and asking a
 * 1400px slot to show it will still look soft however it is encoded. That is a
 * matter of uploading larger originals, not of settings.
 */
const DEFAULT_QUALITY = 90;

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
