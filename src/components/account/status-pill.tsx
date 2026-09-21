import { cn } from "@/lib/utils";

/** One pill shape for order and return states across the account pages. */
export type StatusTone = "progress" | "done" | "closed" | "alert";

const TONES: Record<StatusTone, string> = {
  progress: "bg-brand-50 text-brand-800 ring-brand-200",
  done: "bg-gold-50 text-gold-800 ring-gold-200",
  closed: "bg-ink-100 text-ink-600 ring-line-strong",
  alert: "bg-sale-50 text-sale-700 ring-sale-200",
};

const DOTS: Record<StatusTone, string> = {
  progress: "bg-brand-500",
  done: "bg-gold-500",
  closed: "bg-ink-400",
  alert: "bg-sale-600",
};

export function orderTone(status: string): StatusTone {
  if (status === "delivered") return "done";
  if (status === "cancelled" || status === "returned") return "closed";
  return "progress";
}

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-semibold ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", DOTS[tone], tone === "progress" && "motion-safe:animate-pulse")} />
      {children}
    </span>
  );
}
