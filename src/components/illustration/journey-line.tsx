"use client";

import { motion } from "motion/react";
import { Ink, drawnPath } from "@/components/illustration/ink";
import { DrawIn } from "@/components/ui/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * What physically happens to a parcel once the money has cleared: it is packed,
 * it is driven, it is handed over, and — because this is the question customers
 * actually arrive with — it can come back.
 *
 * The component lays out the four labels itself rather than exporting a bare
 * drawing for the caller to annotate. That is not a convenience. The stops sit
 * in completely different places in the two orientations, so a caller placing
 * its own text would have to rebuild both grids and then keep them in step with
 * this file for ever; the first time one drifted, a label would be sitting
 * under the wrong glyph and the whole thing would stop being a diagram and go
 * back to being decoration. The words and the coordinates stay together.
 *
 * There are two separate drawings, horizontal and vertical, swapped at `sm`.
 * The obvious shortcut — one drawing rotated ninety degrees in CSS — rotates
 * the words along with it, so it was never on the table.
 *
 * Both drawings are hidden from assistive technology. The four labels beside
 * them already carry the entire meaning, and a screen reader announcing a van
 * adds nothing a customer can act on.
 */

/* The site's one entrance curve, spelled out because Motion needs the four
   numbers in JS and cannot be handed the `--ease-out-quint` token. */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* The same margin `Reveal` uses, so the drawing and the prose around it start
   moving at one scroll position rather than a beat apart. */
const VIEWPORT = { once: true, margin: "0px 0px -60px 0px" } as const;

/* The line is broken rather than drawn under the stops: a four-unit clearance
   either side of each 32-unit node makes it read as passing behind the glyph,
   which is the whole reason the stops look like they are ON the route instead
   of merely near it. Both strings are one path with several subpaths, so a
   single dash offset draws them in order — left to right, top to bottom. */
const DESKTOP_RULE = "M0 60H100M140 60H340M380 60H580M620 60H820M860 60H960";
const MOBILE_RULE = "M16 0V60M16 100V220M16 260V380M16 420V540M16 580V640";

/* Top-left corners of each 32-unit node box. Horizontally the stops sit on the
   centres of four equal columns rather than hard against the two ends, because
   the labels below are four equal columns and a stop that does not stand over
   its own words is worse than no drawing at all. Vertically the same reasoning
   gives four equal rows. */
const DESKTOP_BOX = [104, 344, 584, 824];
const DESKTOP_TOP = 44;
const MOBILE_BOX = [64, 224, 384, 544];
const MOBILE_LEFT = 0;

/* Node 1 — the carton. The long horizontal is where the two top flaps close
   onto the body; the short vertical above it is the taped seam between them. */
function Carton() {
  return (
    <>
      <rect x={4} y={7} width={24} height={18} />
      <path d="M4 13H28" />
      <path d="M16 7V13" />
    </>
  );
}

/* Node 2 — the van, nose to the right so it travels the way the desktop line is
   read. The streak over the roof is the only thing in either drawing that
   repeats; it breathes rather than blinks, and it does so from a class in
   globals.css so that the site's reduced-motion block stops it without this
   file having to know the preference exists. */
function Van() {
  return (
    <>
      <path d="M2 5H20V11H26L30 15V21H2Z" />
      <rect x={6} y={21} width={6} height={6} />
      <rect x={21} y={21} width={6} height={6} />
      <path className="journey-pulse" d="M2 2H14" />
    </>
  );
}

/* Node 3 — the doorstep, at the same proportions as the pin in the masthead
   drawing so the two illustrations are recognisably the same hand. */
function Pin() {
  return (
    <>
      <path d="M9 7H23V19H20L16 25L12 19H9Z" />
      <path d="M12 12L15 15L19 11" />
    </>
  );
}

/* Node 4 — the return. The arrow comes back onto the square's own top-left
   corner rather than pointing away somewhere, because a return is the parcel
   going back exactly where it started; an arrow leaving the frame would say the
   opposite. */
function Return() {
  return (
    <>
      <rect x={6} y={6} width={20} height={20} />
      <path d="M30 14Q30 2 18 2Q6 2 6 6" />
      <path d="M3 3L6 6L9 3" />
    </>
  );
}

const GLYPHS = [Carton, Van, Pin, Return];

/**
 * One stop, translated onto the line. The translate lives on a plain outer `g`
 * and the animation on an inner one: Motion writes its own `transform` and
 * would otherwise overwrite the placement it is supposed to be moving from.
 */
function Stop({
  index,
  tx,
  ty,
  reduce,
}: {
  index: number;
  tx: number;
  ty: number;
  reduce: boolean;
}) {
  const Glyph = GLYPHS[index];

  /* There are four glyphs and the section is written around four steps, but the
     prop type cannot say so. A fifth step should cost that step its picture, not
     take the masthead's neighbour down with an undefined component. */
  if (!Glyph) return null;

  return (
    <g transform={`translate(${tx} ${ty})`}>
      {reduce ? (
        <g>
          <Glyph />
        </g>
      ) : (
        <motion.g
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.5, delay: 0.25 + index * 0.12, ease: EASE }}
        >
          <Glyph />
        </motion.g>
      )}
    </g>
  );
}

export function JourneyLine({ steps }: { steps: { label: string; value: string }[] }) {
  const reduce = usePrefersReducedMotion();

  return (
    <>
      {/* Desktop. The aspect ratio is set in CSS rather than left to the height
          attribute, so that in a container wider than the viewBox the drawing
          still scales instead of being centred with gutters — gutters would
          slide every stop off the label column it belongs to. */}
      <div className="hidden sm:block">
        <Ink
          viewBox="0 0 960 120"
          strokeWidth={1.5}
          className="aspect-[8/1] h-auto w-full text-brand-700"
        >
          <DrawIn duration={900}>
            <path
              d={DESKTOP_RULE}
              stroke="var(--color-rule)"
              strokeWidth={1}
              {...drawnPath}
            />
          </DrawIn>
          {steps.map((step, index) => (
            <Stop
              key={step.label}
              index={index}
              tx={DESKTOP_BOX[index]}
              ty={DESKTOP_TOP}
              reduce={reduce}
            />
          ))}
        </Ink>

        <ul className="mt-4 grid grid-cols-4">
          {steps.map((step) => (
            <li key={step.label} className="px-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                {step.label}
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-700">{step.value}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Phone. The drawing and the label list are both exactly the height of
          the row, and each row centres its own words, so the four stops and the
          four labels line up at any text size without a single magic offset. */}
      <div className="flex h-[560px] gap-5 sm:hidden">
        <Ink
          viewBox="0 0 64 640"
          strokeWidth={1.5}
          className="h-full w-14 shrink-0 text-brand-700"
        >
          <DrawIn duration={900}>
            <path
              d={MOBILE_RULE}
              stroke="var(--color-rule)"
              strokeWidth={1}
              {...drawnPath}
            />
          </DrawIn>
          {steps.map((step, index) => (
            <Stop
              key={step.label}
              index={index}
              tx={MOBILE_LEFT}
              ty={MOBILE_BOX[index]}
              reduce={reduce}
            />
          ))}
        </Ink>

        <ul className="grid flex-1 grid-rows-4">
          {steps.map((step) => (
            <li key={step.label} className="flex flex-col justify-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                {step.label}
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-700">{step.value}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
