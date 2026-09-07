"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { Check } from "lucide-react";
import type { OrderTrackingEvent } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

export function TrackingTimeline({ events }: { events: OrderTrackingEvent[] }) {
  const reduce = usePrefersReducedMotion();
  const doneCount = events.filter((e) => e.done).length;
  const progress = ((doneCount - 1) / Math.max(1, events.length - 1)) * 100;

  return (
    <ol className="relative pl-8">
      {/* Rail */}
      <span
        aria-hidden
        className="absolute left-[11px] top-2 bottom-6 w-0.5 rounded-full bg-ink-200"
      />
      <motion.span
        aria-hidden
        initial={reduce ? { height: `${progress}%` } : { height: 0 }}
        animate={{ height: `${Math.max(0, progress)}%` }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="absolute left-[11px] top-2 w-0.5 rounded-full bg-brand-600"
      />

      {events.map((event, i) => {
        const isCurrent = event.done && !events[i + 1]?.done;
        return (
          <li key={event.status} className="relative pb-7 last:pb-0">
            <motion.span
              initial={reduce ? false : { scale: 0.5, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 * i, type: "spring", stiffness: 400, damping: 22 }}
              className={cn(
                "absolute -left-8 top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-canvas",
                event.done ? "bg-brand-600 text-white" : "border-2 border-ink-200 bg-canvas",
              )}
            >
              {event.done && <Check size={13} strokeWidth={3} />}
            </motion.span>

            {isCurrent && (
              <span
                aria-hidden
                className="absolute -left-8 top-0 h-6 w-6 animate-ping rounded-full bg-brand-400/40"
              />
            )}

            <div>
              <p
                className={cn(
                  "text-[14px] font-semibold",
                  event.done ? "text-ink-950" : "text-ink-400",
                )}
              >
                {event.title}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-brand-800">
                    Current
                  </span>
                )}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[12.5px] leading-relaxed",
                  event.done ? "text-ink-600" : "text-ink-400",
                )}
              >
                {event.description}
              </p>
              <p className="mt-1 text-[11.5px] text-ink-400">
                {event.location}
                {event.done && ` · ${formatDateTime(event.at)}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
