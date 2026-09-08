import type { ReturnStatus } from "@/generated/prisma/client";

/**
 * Pure helpers shared by the returns pages and the returns actions. No server
 * imports here so either side (and client components) can use them.
 */

export const RETURN_STATUSES: ReturnStatus[] = ["REQUESTED", "APPROVED", "PICKED_UP", "REFUNDED", "REJECTED"];

/** The happy path, in order. REJECTED is a terminal side-exit from REQUESTED. */
export const RETURN_FLOW: ReturnStatus[] = ["REQUESTED", "APPROVED", "PICKED_UP", "REFUNDED"];

/** Every legal status change. Anything not listed here is refused by the actions. */
export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PICKED_UP"],
  PICKED_UP: ["REFUNDED"],
  REFUNDED: [],
  REJECTED: [],
};

export function canTransition(from: ReturnStatus, to: ReturnStatus) {
  return RETURN_TRANSITIONS[from].includes(to);
}

export function isReturnStatus(value: string | undefined): value is ReturnStatus {
  return Boolean(value) && (RETURN_STATUSES as string[]).includes(value as string);
}

/** The refund amount can be corrected until the item is on its way back. */
export function isRefundAmountEditable(status: ReturnStatus) {
  return status === "REQUESTED" || status === "APPROVED";
}

export function isReturnOpen(status: ReturnStatus) {
  return status !== "REFUNDED" && status !== "REJECTED";
}

export const RETURN_STATUS_COPY: Record<ReturnStatus, { label: string; hint: string }> = {
  REQUESTED: { label: "Requested", hint: "Waiting for a decision" },
  APPROVED: { label: "Approved", hint: "Pickup to be arranged" },
  PICKED_UP: { label: "Picked up", hint: "Item collected, refund due" },
  REFUNDED: { label: "Refunded", hint: "Closed — money returned" },
  REJECTED: { label: "Rejected", hint: "Closed — not eligible" },
};

/** Requests older than this without a decision are flagged in the list. */
export const DECISION_SLA_HOURS = 48;

/** Compact id for tables: seeded ids are short already, cuids get their tail. */
export function shortReturnId(id: string) {
  return id.length > 10 ? id.slice(-8) : id;
}

/** "3d", "5h", "12m" — how long between two instants. */
export function ageLabel(from: Date, until: Date) {
  const ms = Math.max(0, until.getTime() - from.getTime());
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function hoursBetween(from: Date, until: Date) {
  return (until.getTime() - from.getTime()) / 3_600_000;
}

export interface TimelineStep {
  status: ReturnStatus;
  label: string;
  state: "done" | "current" | "upcoming";
  at: Date | null;
  /** Admin who moved the return into this step, when the activity log knows. */
  actor: string | null;
}

/** When (and by whom) a step was reached, as recorded in the activity log. */
export type TimelineEvents = Partial<Record<ReturnStatus, { at: Date; actor: string | null }>>;

/** Activity-log actions written by the returns actions, keyed by the status they lead to. */
export const RETURN_ACTIVITY_ACTIONS: Record<string, ReturnStatus> = {
  "return.approve": "APPROVED",
  "return.picked_up": "PICKED_UP",
  "return.refund": "REFUNDED",
  "return.reject": "REJECTED",
};

/**
 * The request only stores requestedAt and resolvedAt, so intermediate steps
 * are derived from the status: everything up to the current status is done,
 * the current step carries the last update time, terminal steps use resolvedAt.
 * Activity-log events, when supplied, give the done steps their real times.
 */
export function buildReturnTimeline(
  input: {
    status: ReturnStatus;
    requestedAt: Date;
    resolvedAt: Date | null;
    updatedAt: Date;
  },
  events: TimelineEvents = {},
): TimelineStep[] {
  const { status, requestedAt, resolvedAt, updatedAt } = input;

  if (status === "REJECTED") {
    const ev = events.REJECTED;
    return [
      { status: "REQUESTED", label: "Requested", state: "done", at: requestedAt, actor: null },
      { status: "REJECTED", label: "Rejected", state: "current", at: resolvedAt ?? ev?.at ?? updatedAt, actor: ev?.actor ?? null },
    ];
  }

  const current = RETURN_FLOW.indexOf(status);
  return RETURN_FLOW.map((step, i) => {
    const state: TimelineStep["state"] = i < current ? "done" : i === current ? "current" : "upcoming";
    const ev = state === "upcoming" ? undefined : events[step];
    let at: Date | null = ev?.at ?? null;
    if (i === 0) at = requestedAt;
    else if (!at && step === "REFUNDED" && state === "current") at = resolvedAt ?? updatedAt;
    else if (!at && state === "current") at = updatedAt;
    return { status: step, label: RETURN_STATUS_COPY[step].label, state, at, actor: ev?.actor ?? null };
  });
}
