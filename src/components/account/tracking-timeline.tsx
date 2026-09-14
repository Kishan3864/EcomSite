"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import type { OrderTrackingEvent } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

/**
 * What has happened to the parcel so far, set as the homepage's own route
 * turned on its side: one rule, square nodes sitting on it, a short break in
 * the rule either side of each node so it reads as passing behind them. The
 * geometry is lifted straight from `@/components/illustration/journey-line` —
 * the band that draws the same idea on the homepage — because two visual
 * languages for one journey is one too many.
 *
 * Three things went with the old drawing. The pulsing halo, because nothing on
 * this site scales by more than three per cent and a ring that trebles in size
 * is a notification, not a shipment. The tinted "Current" lozenge, because the
 * shop has no pills left anywhere else. And the round nodes, for the obvious
 * reason.
 *
 * The nodes sit on the white sheet: both callers — the order page and the
 * public tracking page — put this inside a `bg-surface` block, and the break in
 * the rule is drawn by the node's own fill.
 */

/* The site's one entrance curve, spelled out because Motion needs the four
   numbers in JS and cannot be handed the `--ease-out-quint` token. */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* The same margin `Reveal` uses, so the timeline and the prose around it start
   moving at one scroll position rather than a beat apart. */
const VIEWPORT = { once: true, margin: "0px 0px -60px 0px" } as const;

/* The node is 13px and the rule is centred on it at 6px, which is the only
   pair of whole numbers that centres a 1px line under a square at this size.
   The segment below a node starts 3px clear of it and runs to the foot of the
   row; the next node's own 3px of headroom closes the other end, so every
   break is the same 6px however tall a row's text happens to be. */
const NODE = "absolute left-0 top-[3px] h-[13px] w-[13px]";
const SEGMENT = "absolute left-[6px] top-[19px] bottom-0 w-px";

export function TrackingTimeline({ events }: { events: OrderTrackingEvent[] }) {
  const reduce = usePrefersReducedMotion();

  return (
    <ol className="relative">
      {events.map((event, i) => {
        const next = events[i + 1];
        const isCurrent = event.done && !next?.done;

        return (
          <li key={event.status} className="relative pb-6 pl-8 last:pb-0 sm:pb-7">
            {/* Drawn before the node so the node's fill always wins the pixel
                they share. A segment is inked only where the parcel has
                actually been. */}
            {next && (
              <span
                aria-hidden
                className={cn(SEGMENT, next.done ? "bg-brand-700" : "bg-rule")}
              />
            )}

            <motion.span
              aria-hidden
              initial={reduce ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT}
              transition={{ duration: 0.5, delay: 0.12 * i, ease: EASE }}
              className={cn(
                NODE,
                event.done ? "bg-brand-700" : "border border-rule bg-surface",
              )}
            />

            <p
              className={cn(
                "text-[13.5px] leading-[1.35] sm:text-[14px]",
                event.done ? "font-semibold text-ink-950" : "font-medium text-ink-500",
              )}
            >
              {event.title}
              {isCurrent && (
                <span className="ml-2 align-[1px] text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                  Now
                </span>
              )}
            </p>
            <p
              className={cn(
                "mt-1 text-[13px] leading-[1.5]",
                event.done ? "text-ink-600" : "text-ink-500",
              )}
            >
              {event.description}
            </p>
            <p className="mt-1 text-[13px] leading-[1.5] tabular-nums text-ink-500">
              {event.location}
              {event.done && ` · ${formatDateTime(event.at)}`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
