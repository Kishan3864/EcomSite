"use client";

import { motion } from "motion/react";
import {
  Ban,
  Check,
  ClipboardCheck,
  House,
  PackageCheck,
  RotateCcw,
  Truck,
  Navigation,
  type LucideIcon,
} from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import type { OrderStatus, OrderTrackingEvent } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

/**
 * The parcel's journey as a vertical timeline: a round node per step with its
 * lucide glyph, a rail inked as far as the parcel has got. Completed steps are
 * filled cobalt, the current one glows, the rest wait in outline.
 */

const ICONS: Record<OrderStatus, LucideIcon> = {
  confirmed: ClipboardCheck,
  packed: PackageCheck,
  shipped: Truck,
  out_for_delivery: Navigation,
  delivered: House,
  cancelled: Ban,
  returned: RotateCcw,
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const VIEWPORT = { once: true, margin: "0px 0px -60px 0px" } as const;

export function TrackingTimeline({ events }: { events: OrderTrackingEvent[] }) {
  const reduce = usePrefersReducedMotion();

  return (
    <ol className="relative">
      {events.map((event, i) => {
        const next = events[i + 1];
        const isCurrent = event.done && !next?.done;
        const Icon = event.done && !isCurrent ? Check : ICONS[event.status] ?? Check;

        return (
          <motion.li
            key={event.status}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.4, delay: 0.08 * i, ease: EASE }}
            className="relative flex gap-4 pb-6 last:pb-0"
            aria-current={isCurrent ? "step" : undefined}
          >
            {/* Rail to the next node, inked only where the parcel has been. */}
            {next && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[17px] top-10 bottom-1 w-0.5 rounded-full",
                  next.done ? "bg-brand-600" : "bg-line",
                )}
              />
            )}

            <span
              aria-hidden
              className={cn(
                "relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                isCurrent
                  ? "bg-brand-700 text-white shadow-(--shadow-glow) ring-4 ring-brand-100"
                  : event.done
                    ? "bg-brand-600 text-white"
                    : "bg-surface text-ink-400 ring-1 ring-inset ring-line-strong",
              )}
            >
              <Icon size={16} />
            </span>

            <div className="min-w-0 flex-1 pt-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className={cn("t-h3", !event.done && "font-medium text-ink-500")}>{event.title}</p>
                {isCurrent && (
                  <span className="inline-flex h-5 items-center rounded-full bg-brand-50 px-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-brand-700 ring-1 ring-inset ring-brand-200">
                    Now
                  </span>
                )}
              </div>
              <p className={cn("t-body mt-0.5 text-[13px]", !event.done && "text-ink-500")}>{event.description}</p>
              {(event.location || (event.done && event.at)) && (
                <p className="t-small mt-1 tabular-nums">
                  {event.location}
                  {event.done && event.at && `${event.location ? " · " : ""}${formatDateTime(event.at)}`}
                </p>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
