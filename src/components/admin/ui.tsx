import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn, formatDate, formatDateTime, formatINR } from "@/lib/utils";

/**
 * Admin design primitives. Server-safe (no hooks) so pages can compose them
 * freely; interactive pieces live in `client.tsx`.
 */

/* ---------------------------- Page header --------------------------- */

export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  meta?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-500 transition-colors hover:text-brand-700"
          >
            <ChevronLeft size={14} /> {back.label}
          </Link>
        )}
        <h1 className="font-display text-[26px] leading-[1.1] tracking-[-0.025em] text-ink-950 sm:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-600">{description}</p>
        )}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ------------------------------ Cards ------------------------------- */

export function Card({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-hairline bg-surface", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
          <div>
            {title && (
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">{title}</h2>
            )}
            {description && <p className="mt-0.5 text-[12.5px] text-ink-500">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: { value: number; label?: string };
  icon?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">{label}</p>
        {icon && <span className="text-brand-600">{icon}</span>}
      </div>
      <p className="mt-2.5 font-display text-[28px] leading-none tracking-[-0.02em] text-ink-950 tabular-nums">
        {value}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
        {delta && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
              delta.value > 0
                ? "bg-brand-100 text-brand-800"
                : delta.value < 0
                  ? "bg-sale-100 text-sale-700"
                  : "bg-ink-100 text-ink-600",
            )}
          >
            {delta.value > 0 ? "+" : ""}
            {delta.value}%
          </span>
        )}
        {(delta?.label || hint) && <span className="text-ink-500">{delta?.label ?? hint}</span>}
      </div>
    </>
  );

  const cls =
    "block rounded-xl border border-hairline bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md";
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-hairline bg-surface p-4">{body}</div>
  );
}

/* ------------------------------ Status ------------------------------ */

type Tone = "neutral" | "brand" | "gold" | "sale" | "ink" | "sky";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-100 text-brand-800",
  gold: "bg-gold-100 text-gold-800",
  sale: "bg-sale-100 text-sale-700",
  ink: "bg-ink-900 text-white",
  sky: "bg-[#e6f0fb] text-[#1f4b8f]",
};

export function Pill({
  tone = "neutral",
  children,
  className,
  dot,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, { tone: Tone; label: string }> = {
  // orders
  PENDING: { tone: "neutral", label: "Pending" },
  CONFIRMED: { tone: "gold", label: "Confirmed" },
  PACKED: { tone: "gold", label: "Packed" },
  SHIPPED: { tone: "sky", label: "Shipped" },
  OUT_FOR_DELIVERY: { tone: "sky", label: "Out for delivery" },
  DELIVERED: { tone: "brand", label: "Delivered" },
  CANCELLED: { tone: "sale", label: "Cancelled" },
  RETURNED: { tone: "neutral", label: "Returned" },
  // payments
  PAID: { tone: "brand", label: "Paid" },
  COD_PENDING: { tone: "gold", label: "COD · unpaid" },
  FAILED: { tone: "sale", label: "Failed" },
  REFUNDED: { tone: "neutral", label: "Refunded" },
  PARTIALLY_REFUNDED: { tone: "neutral", label: "Part refunded" },
  // products
  DRAFT: { tone: "neutral", label: "Draft" },
  ACTIVE: { tone: "brand", label: "Active" },
  ARCHIVED: { tone: "ink", label: "Archived" },
  // returns
  REQUESTED: { tone: "gold", label: "Requested" },
  APPROVED: { tone: "sky", label: "Approved" },
  PICKED_UP: { tone: "sky", label: "Picked up" },
  REJECTED: { tone: "sale", label: "Rejected" },
  // reviews / questions / messages
  HIDDEN: { tone: "neutral", label: "Hidden" },
  ANSWERED: { tone: "brand", label: "Answered" },
  NEW: { tone: "gold", label: "New" },
  REPLIED: { tone: "brand", label: "Replied" },
  CLOSED: { tone: "neutral", label: "Closed" },
  // roles
  OWNER: { tone: "ink", label: "Owner" },
  MANAGER: { tone: "brand", label: "Manager" },
  STAFF: { tone: "neutral", label: "Staff" },
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_TONES[status] ?? { tone: "neutral" as Tone, label: status.replace(/_/g, " ") };
  return (
    <Pill tone={meta.tone} className={className} dot>
      {meta.label}
    </Pill>
  );
}

export function statusLabelOf(status: string) {
  return STATUS_TONES[status]?.label ?? status.replace(/_/g, " ");
}

/* ------------------------------ Tables ------------------------------ */

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-hairline bg-surface", className)}>
      <table className="w-full min-w-[640px] border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "border-b border-hairline bg-canvas px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cn(
        "border-b border-hairline px-4 py-3 align-middle text-ink-800 last:border-b-0",
        align === "right" && "text-right tabular-nums",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("transition-colors hover:bg-canvas [&:last-child>td]:border-b-0", className)}>{children}</tr>;
}

export function EmptyRow({ colSpan, title, body }: { colSpan: number; title: string; body?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <Inbox size={24} className="mx-auto text-ink-300" />
        <p className="mt-3 text-[14px] font-medium text-ink-900">{title}</p>
        {body && <p className="mt-1 text-[12.5px] text-ink-500">{body}</p>}
      </td>
    </tr>
  );
}

/* --------------------------- Pagination ----------------------------- */

export function AdminPagination({
  meta,
  hrefFor,
  label = "rows",
}: {
  meta: { total: number; page: number; totalPages: number; from: number; to: number };
  hrefFor: (page: number) => string;
  label?: string;
}) {
  if (meta.total === 0) return null;
  const btn =
    "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors";
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-ink-500">
      <p className="tabular-nums">
        Showing <span className="font-semibold text-ink-900">{meta.from}–{meta.to}</span> of{" "}
        <span className="font-semibold text-ink-900">{meta.total}</span> {label}
      </p>
      <div className="flex items-center gap-1.5">
        {meta.page > 1 ? (
          <Link href={hrefFor(meta.page - 1)} className={cn(btn, "border-ink-200 bg-surface text-ink-700 hover:border-ink-400")}>
            <ChevronLeft size={14} /> Prev
          </Link>
        ) : (
          <span className={cn(btn, "border-ink-100 text-ink-300")}>
            <ChevronLeft size={14} /> Prev
          </span>
        )}
        <span className="px-2 tabular-nums">
          Page {meta.page} / {meta.totalPages}
        </span>
        {meta.page < meta.totalPages ? (
          <Link href={hrefFor(meta.page + 1)} className={cn(btn, "border-ink-200 bg-surface text-ink-700 hover:border-ink-400")}>
            Next <ChevronRight size={14} />
          </Link>
        ) : (
          <span className={cn(btn, "border-ink-100 text-ink-300")}>
            Next <ChevronRight size={14} />
          </span>
        )}
      </div>
    </div>
  );
}

/** Builds a `?q=&page=` href while preserving the rest of the current params. */
export function withParams(base: string, current: Record<string, string | undefined>, patch: Record<string, string | number | undefined | null>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) if (v) params.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null || v === "") params.delete(k);
    else params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/* ------------------------------ Values ------------------------------ */

export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatINR(value)}</span>;
}

export function DateCell({ value, time = false }: { value: string | Date; time?: boolean }) {
  return (
    <span className="whitespace-nowrap tabular-nums text-ink-600">
      {time ? formatDateTime(value) : formatDate(value, "short")}
    </span>
  );
}

export function KeyValue({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-hairline">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 py-2.5 text-[13px]">
          <dt className="text-ink-500">{r.label}</dt>
          <dd className="min-w-0 text-ink-900">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------- Form bits ---------------------------- */

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-hairline bg-surface p-5", className)}>
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">{title}</h2>
      {description && <p className="mt-1 text-[12.5px] text-ink-500">{description}</p>}
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

export const inputCls =
  "h-10 w-full rounded-lg border border-ink-200 bg-canvas px-3 text-[13.5px] text-ink-900 outline-none transition-colors placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 disabled:opacity-60";
export const textareaCls =
  "w-full rounded-lg border border-ink-200 bg-canvas px-3 py-2.5 text-[13.5px] leading-relaxed text-ink-900 outline-none transition-colors placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500";
export const selectCls = cn(inputCls, "appearance-none pr-9 bg-no-repeat bg-[right_10px_center]");
export const selectArrow = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2377776f' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
};

export function Label({
  htmlFor,
  children,
  hint,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-medium text-ink-800">
        {children}
        {optional && <span className="text-[11px] font-normal text-ink-400">Optional</span>}
      </span>
      {hint && <span className="-mt-1 mb-1.5 block text-[11.5px] text-ink-400">{hint}</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-[12px] text-sale-600">{children}</p>;
}
