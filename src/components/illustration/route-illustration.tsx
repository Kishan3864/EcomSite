"use client";

import { motion } from "motion/react";
import { Ink, drawnPath } from "@/components/illustration/ink";
import { DrawIn } from "@/components/ui/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * The masthead drawing: the premises, the road out of them, and the doorstep
 * that road ends at.
 *
 * The sentence beside it makes a promise about delivery, and a photograph
 * cannot stand behind that promise — a photograph of a parcel is always
 * somebody else's parcel. A line drawn from this shop's own door to a pin is
 * read as a diagram of how the shop works rather than as bought imagery, which
 * is the only kind of picture worth putting under those two buttons.
 *
 * The caller sizes it and gives it its colour, and hides it below `lg`: on a
 * phone it would land between the buttons and the product, which is the one
 * place on the page where nothing decorative belongs.
 */

/* Declared once because two things need a byte-identical string: the path that
   draws the road, and the `offset-path` the travelling marker rides along it.
   Any drift between the two would send the marker across blank paper. */
const ROUTE_D = "M44 160 Q120 96 175 118 Q230 140 280 106 Q330 72 392 69";

/* Evenly spaced, all stopping on the same lower edge. That edge is deliberately
   not drawn: four ticks ending level with one another already state a ground
   line, and a real rule there would compete with the road for the eye. */
const TICKS = [60, 160, 260, 360];

/* The site's one entrance curve. Spelled out rather than read from the
   `--ease-out-quint` token because Motion needs the four numbers in JS, and a
   CSS custom property cannot be handed to it. */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* Matches the margin `Reveal` uses, so a drawing and the prose around it start
   moving at the same scroll position instead of a beat apart. */
const VIEWPORT = { once: true, margin: "0px 0px -80px 0px" } as const;

/* The destination. A 14x18 pin with a square window in its head — the same
   proportions the journey drawing uses for its third stop, so the two pictures
   are plainly the same hand. */
const PIN = (
  <>
    <path d="M385 51H399V63H396L392 69L388 63H385Z" />
    <rect x={390} y={54} width={5} height={5} />
  </>
);

export function RouteIllustration({ className }: { className?: string }) {
  const reduce = usePrefersReducedMotion();

  return (
    <Ink viewBox="0 0 420 220" strokeWidth={1.25} className={className}>
      {/* The premises. A square under a two-line awning is the smallest mark
          that still reads as a shop rather than as a crate. It never animates:
          it is the thing the road grows out of, so it has to be there before
          there is any road. */}
      <rect x={24} y={168} width={16} height={16} />
      <path d="M20 164H44" />
      <path d="M20 160H44" />

      {/* Days in transit, in the rule colour so they stay behind everything
          else. They are the ruled paper the journey is drawn on, not a part of
          the journey, and the colour is the only thing saying so. */}
      {TICKS.map((x, index) =>
        reduce ? (
          <line key={x} x1={x} y1={188} x2={x} y2={196} stroke="var(--color-rule)" />
        ) : (
          <motion.line
            key={x}
            x1={x}
            y1={188}
            x2={x}
            y2={196}
            stroke="var(--color-rule)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.4, delay: 0.4 + index * 0.09, ease: EASE }}
          />
        ),
      )}

      {/* The road. One unbroken stroke over three shallow arcs, because the
          moment it is cut into segments the eye starts counting them instead of
          following them. With no `DrawIn` ancestor it simply renders whole. */}
      <DrawIn duration={1400}>
        <path d={ROUTE_D} {...drawnPath} />
      </DrawIn>

      {/* The doorstep arrives after the road has reached it, which is the only
          order that tells the story the right way round. Hence one late fade
          rather than a stagger shared with anything else. */}
      {reduce ? (
        <g>{PIN}</g>
      ) : (
        <motion.g
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.5, delay: 1.2, ease: EASE }}
        >
          {PIN}
        </motion.g>
      )}

      {/* The parcel, and the only thing on the site that loops. It is authored
          sitting at the far end of the road rather than at the origin, because
          that is where a browser with no `offset-path` support will leave it —
          the one case the class in globals.css cannot place it — and a square
          parked at the destination reads as "arrived" instead of as a stray dot
          in the corner. Where `offset-path` does work the class puts it in the
          same spot anyway, so the two outcomes agree.

          `transform-box: fill-box` is what makes the square's own centre the
          point that rides the line. The SVG default would measure the anchor
          from the middle of the whole viewBox and throw it half a drawing
          away. */}
      <rect
        className="route-marker"
        x={389}
        y={66}
        width={6}
        height={6}
        fill="var(--color-gold-400)"
        stroke="none"
        style={{ offsetPath: `path("${ROUTE_D}")`, transformBox: "fill-box" }}
      />
    </Ink>
  );
}
