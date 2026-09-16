"use client";

import { DrawIn } from "@/components/ui/motion";
import { Ink, drawnPath } from "./ink";

/**
 * The four marks above the counter band.
 *
 * They sit beside four facts a shop that does not exist cannot publish — a
 * postal address, a phone somebody answers, a named courier, and the ways it
 * can be paid. The marks are there so those four facts read as a set at a
 * glance rather than as four sentences; they carry no meaning of their own,
 * which is why they are hidden from screen readers and why the labels beneath
 * them say everything.
 *
 * Drawn on a 24-unit grid at stroke 1.5, the same weight as the department
 * glyphs at this size, so the two sets look like they came from one hand.
 */

export type CounterGlyphName = "pin" | "phone" | "van" | "note";

/** A map so a caller can iterate the four cells without a switch. */
const PATHS: Record<CounterGlyphName, string[]> = {
  /* A map pin with a square window, not the usual circle: the rest of the
     site has no round corners and one stray circle here would show. */
  pin: ["M12 22 L4 13 A8 8 0 1 1 20 13 Z", "M9 9 H15 V15 H9 Z"],
  /* A handset with two ticks of signal leaving it. */
  phone: ["M4 3 H9 L11 8 L8 10 A10 10 0 0 0 14 16 L16 13 L21 15 V20 H17 A14 14 0 0 1 4 7 Z"],
  /* A delivery van: body, cab, two wheels, one line of movement behind it. */
  van: ["M2 6 H14 V16 H2 Z", "M14 9 H18 L21 12 V16 H14 Z", "M5 16 H8 V19 H5 Z", "M16 16 H19 V19 H16 Z"],
  /* A banknote with a rupee stroked inside it.

     The rupee used to be `M14 9 A3 3 0 0 1 11 15 L9 15 L15 15` — an arc whose
     chord (6.71) is longer than the diameter it asks for (6), which the SVG
     spec makes the browser scale up silently, so it drew a flat semicircle
     instead of a bowl and then retraced its own bottom bar, leaving the glyph
     with no stem and no leg. It is now lucide's IndianRupee at half size,
     centred in the note: two bars, the bowl as a cubic, the stub and the leg.
     brand/payment-marks.tsx draws the same note for the cash-on-delivery mark
     and carries the same paths — keep the two in step by hand. */
  note: [
    "M2 6 H22 V18 H2 Z",
    "M9.6 7.5 H15.6",
    "M9.6 10 H15.6",
    "M9.6 12.5 H11.1",
    "M11.1 12.5 C14.4 12.5 14.4 7.5 11.1 7.5",
    "M9.6 12.5 L13.9 16.5",
  ],
};

/* Two short lines behind the van, drawn separately so they can be given a
   lighter weight than the vehicle without splitting the map above. */
const VAN_MOTION = ["M0 9 H1", "M0 13 H1"];

export function CounterGlyph({
  name,
  size = 20,
  className,
  delay = 0,
}: {
  name: CounterGlyphName;
  size?: number;
  className?: string;
  /** Milliseconds, so four cells can draw one after another across a row. */
  delay?: number;
}) {
  return (
    <Ink viewBox="0 0 24 24" size={size} strokeWidth={1.5} className={className}>
      <DrawIn duration={600} delay={delay}>
        {PATHS[name].map((d) => (
          <path key={d} d={d} {...drawnPath} />
        ))}
        {name === "van" &&
          VAN_MOTION.map((d) => (
            <path key={d} d={d} strokeWidth={1} opacity={0.5} {...drawnPath} />
          ))}
      </DrawIn>
    </Ink>
  );
}
