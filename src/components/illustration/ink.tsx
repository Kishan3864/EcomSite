import * as React from "react";

/**
 * The root every drawing in this folder is built on.
 *
 * The illustrations are hand-authored inline SVG rather than an icon package,
 * because the house style is specific enough that no bought set follows it and
 * because this server cannot reliably reach an image host anyway: inline means
 * no request, no layout shift, and a drawing that sharpens on a retina screen.
 * Putting the root <svg> here rather than in each drawing is what keeps thirty
 * illustrations from drifting apart one attribute at a time.
 *
 * Two of the rules below look like oversights to anyone meeting the drawings
 * for the first time, and both will be quietly "corrected" back unless the
 * reason is written down, so:
 *
 * Round caps and joins are forbidden. The shop collapsed its radius scale to
 * 2px and overrides `.rounded-full`, so nothing else on a page has a soft
 * corner. A drawing with rounded joins reads as an import from somewhere else
 * — it is the single clearest tell that the illustrations were bought rather
 * than drawn for this shop. Square caps and mitred joins are most of what makes
 * them look like they belong to the same hand as the product cards.
 *
 * `vector-effect="non-scaling-stroke"` is forbidden. It pins a drawing to one
 * hairline however large it is rendered, so a 200px piece ends up wearing the
 * stroke of a 24px glyph and goes anaemic beside its own headline. Weight is a
 * deliberate decision per drawing instead — which is why `strokeWidth` is a
 * prop here and why the larger pieces choose theirs from their size.
 *
 * Colour never arrives as a hex inside a drawing either. Stroke is
 * `currentColor`, so an illustration inherits the text colour of whatever it
 * sits in and needs no variant to work in ink on paper and in white on the dark
 * editorial band; a deliberate second colour comes from a token, e.g.
 * `var(--color-gold-400)`. Only the caller ever decides what colour means here.
 *
 * Every drawing is decorative and hidden from assistive technology. The heading
 * or sentence beside it carries the meaning — an empty cart is explained by the
 * words "nothing here yet", never by a picture of a parcel.
 */
export function Ink({
  viewBox,
  size,
  strokeWidth = 1.5,
  className,
  children,
}: {
  viewBox: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox={viewBox}
      // React drops an attribute whose value is `undefined`, so passing `size`
      // straight through gives both behaviours from one expression: a number
      // sizes the drawing in pixels, and no number leaves width and height off
      // the element entirely, which lets a caller size it from a className
      // without having to fight an intrinsic size it never asked for.
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/**
 * Spread onto any path that should draw itself in: `<path d="…" {...drawnPath} />`.
 *
 * `pathLength={1}` renormalises the path so the browser reports its length as
 * 1 whatever its real geometry is. That is the point of it: the dash maths
 * below never has to know how long a particular line happens to be, so a path
 * can be redrawn or rescaled later without anyone remembering to retune its
 * animation.
 *
 * `--draw` runs 0 → 1 and is animated by `DrawIn` in @/components/ui/motion.
 * The fallback in `var(--draw, 1)` is the whole safety net: with no DrawIn
 * ancestor — a drawing used on its own, a server render before hydration, or a
 * reduced-motion reader — the custom property is simply absent, the offset
 * resolves to 0 and the path renders complete. A drawing can never be invisible
 * because an animation failed to run.
 */
export const drawnPath: {
  pathLength: 1;
  strokeDasharray: 1;
  style: { strokeDashoffset: string };
} = {
  pathLength: 1,
  strokeDasharray: 1,
  style: { strokeDashoffset: "calc(1 - var(--draw, 1))" },
};
