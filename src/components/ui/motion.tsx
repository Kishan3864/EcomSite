"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  type MotionStyle,
  type Variants,
} from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * One easing curve for the whole site, so a section arriving, a grid filling in
 * and a line drawing itself all settle in the same handwriting.
 */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Scroll-reveal wrapper. One shared easing curve keeps every section on the
 * page feeling like it belongs to the same product, and reduced-motion users
 * get the content with no transform at all.
 *
 * The travel is small — 8px over 0.42s — because the page is now paper and
 * hairlines rather than big photographs. A block sliding 18px under a 1px rule
 * reads as the template animating itself; 8px reads as the page settling.
 */
export function Reveal({
  children,
  delay = 0,
  y = 8,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduce = usePrefersReducedMotion();
  const Component = motion[as];

  return (
    <Component
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      // A percentage margin rather than a fixed 80px, so the trigger sits at the
      // same point of a phone screen as it does of a desktop one.
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.42, delay, ease: EASE }}
      className={className}
    >
      {children}
    </Component>
  );
}

/** The gap before the first child moves, and the gap between children after it. */
const STAGGER_LEAD = 0.05;
const STAGGER_STEP = 0.07;
/**
 * How many children may take a delay of their own. A stagger that keeps
 * climbing turns a 200-product grid into a wave rolling down the page, which is
 * exactly the bought-template look this design removes; six is enough for the
 * eye to read the order and stop counting.
 */
const STAGGER_CAP = 6;

/**
 * Exported for anything that builds its own stagger parent. StaggerGroup below
 * drives a capped variant instead, for the reason given there.
 */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER_STEP, delayChildren: STAGGER_LEAD } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
};

/**
 * The variant StaggerGroup actually runs.
 *
 * `staggerChildren` has no ceiling: the hundredth tile of a long grid would
 * start seven seconds after the first. Motion stops consulting
 * `staggerChildren` the moment `delayChildren` is given as a function, so the
 * cadence is restated here from the same two constants with a ceiling on top —
 * the seventh child onwards leaves with the sixth rather than with its own.
 */
const staggerParentCapped: Variants = {
  hidden: {},
  show: {
    transition: {
      delayChildren: (index: number) =>
        STAGGER_LEAD + Math.min(index, STAGGER_CAP - 1) * STAGGER_STEP,
    },
  },
};

export function StaggerGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      variants={staggerParentCapped}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={staggerChild} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Drives a 0..1 `--draw` progress once the element has been scrolled to.
 *
 * DrawIn is the only caller today, and a hook that exists for one component is
 * usually a hook that should not exist. This one earns its keep because the
 * progress is handed back as the number itself: a drawing that has to do more
 * than dash a stroke — count a figure up, swing a needle — can read it without
 * putting a second intersection observer on the same element, racing the first.
 *
 * Under reduced motion the value is 1 from the first effect, so a caller can
 * render the finished state without asking about the preference itself; `reduce`
 * comes back too, for the callers that want a different element entirely.
 */
export function useDrawOnView({
  duration = 900,
  delay = 0,
}: { duration?: number; delay?: number } = {}) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<SVGGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const draw = useMotionValue(0);

  useEffect(() => {
    if (reduce) {
      draw.set(1);
      return;
    }
    if (!inView) return;

    const playback = animate(draw, 1, {
      duration: duration / 1000,
      delay: delay / 1000,
      ease: EASE,
    });
    return () => playback.stop();
  }, [draw, inView, reduce, duration, delay]);

  return { ref, draw, reduce };
}

/**
 * `--draw` is a custom property, and neither React's CSSProperties nor motion's
 * MotionStyle carries an index signature for one — the DOM types only know the
 * properties the CSS working group has named. So the object has to be asserted
 * where it is handed over — here, and again in DrawIn's animated branch. Both
 * assertions are over a literal written on the spot, with nothing in it a
 * compiler could have caught for us.
 */
const DRAWN = { "--draw": 1 } as React.CSSProperties;

/**
 * Draws its children on once, when they are scrolled into view.
 *
 * It renders an SVG `<g>` rather than a div because every caller is an
 * illustration and this has to be legal inside an `<svg>`. Paths opt in by
 * spreading `drawnPath`, which reads `--draw`; a path with no DrawIn above it
 * finds the custom property unset, falls back to 1 and renders complete, so a
 * drawing can never go missing because an animation did not run.
 *
 * Reduced motion gets a plain `<g>` with the drawing already finished. Not a
 * faster draw — no draw: the request is for no movement, not for less of it.
 */
export function DrawIn({
  children,
  duration = 900,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const { ref, draw, reduce } = useDrawOnView({ duration, delay });

  if (reduce) {
    return (
      <g className={className} style={DRAWN}>
        {children}
      </g>
    );
  }

  return (
    <motion.g ref={ref} className={className} style={{ "--draw": draw } as MotionStyle}>
      {children}
    </motion.g>
  );
}
