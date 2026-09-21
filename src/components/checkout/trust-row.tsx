import { Key, RotateCcw, ShieldCheck } from "lucide-react";
import { BUSINESS } from "@/config/business";
import { cn } from "@/lib/utils";

/**
 * The three promises checkout makes.
 *
 * Each glyph names a MECHANISM (the shield the connection is checked by, the
 * key that encrypts it, the arrow that sends a parcel back) — wayfinding, not
 * a trust seal. Never filled, never gold, never in a rosette.
 *
 * Honesty note: "256-bit encryption" is the owner's label; the sentence under
 * it says only what policies.ts actually states (HTTPS with TLS). Keep it so.
 *
 * On phones the sentences drop (`hidden sm:block`) so the panel does not push
 * the step's actual question below the fold.
 */
const SIGNALS = [
  {
    Icon: ShieldCheck,
    label: "Secure checkout",
    line: "PayU and your own bank take the payment, not us.",
  },
  {
    Icon: Key,
    label: "256-bit encryption",
    line: "Every page of this shop, including this one, is served over HTTPS with TLS.",
  },
  {
    Icon: RotateCcw,
    label: "Easy returns",
    line: `${BUSINESS.ops.returnWindowDays} days from delivery to change your mind on any eligible item.`,
  },
];

export function CheckoutTrustRow({
  className,
  variant = "row",
}: {
  className?: string;
  /** `row`: three columns from md (checkout). `stack`: one column (bag aside). */
  variant?: "row" | "stack";
}) {
  const stack = variant === "stack";
  return (
    // `role="list"` because preflight's `list-style: none` drops listitem
    // semantics in Safari.
    <ul
      role="list"
      className={cn("card grid card-divided", !stack && "md:grid-cols-3", className)}
    >
      {SIGNALS.map(({ Icon, label, line }, i) => (
        <li
          key={label}
          className={cn(
            "flex items-center gap-3 px-4 py-3 sm:items-start sm:py-4",
            // Three columns from md: the row rule becomes a column rule.
            !stack && "md:border-t-0",
            !stack && i > 0 && "md:border-l md:border-line",
          )}
        >
          <span className="icon-tile icon-tile-sm" aria-hidden>
            <Icon size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold leading-tight text-ink-900">{label}</span>
            <span className="t-small mt-1 hidden sm:block">{line}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
