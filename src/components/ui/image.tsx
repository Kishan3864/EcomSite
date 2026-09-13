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
export default function Image(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  const remote = /^(https?:)?\/\//i.test(src);
  return <NextImage {...props} unoptimized={props.unoptimized ?? remote} />;
}
