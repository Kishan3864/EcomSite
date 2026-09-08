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
}

/**
 * The request only stores requestedAt and resolvedAt, so intermediate steps
 * are derived from the status: everything up to the current status is done,
 * the current step carries the last update time, terminal steps use resolvedAt.
 */
export function buildReturnTimeline(input: {
  status: ReturnStatus;
  requestedAt: Date;
  resolvedAt: Date | null;
  updatedAt: Date;
}): TimelineStep[] {
  const { status, requestedAt, resolvedAt, updatedAt } = input;

  if (status === "REJECTED") {
    return [
      { status: "REQUESTED", label: "Requested", state: "done", at: requestedAt },
      { status: "REJECTED", label: "Rejected", state: "current", at: resolvedAt ?? updatedAt },
    ];
  }

  const current = RETURN_FLOW.indexOf(status);
  return RETURN_FLOW.map((step, i) => {
    const state: TimelineStep["state"] = i < current ? "done" : i === current ? "current" : "upcoming";
    let at: Date | null = null;
    if (i === 0) at = requestedAt;
    else if (step === "REFUNDED" && state === "current") at = resolvedAt ?? updatedAt;
    else if (state === "current") at = updatedAt;
    return { status: step, label: RETURN_STATUS_COPY[step].label, state, at };
  });
}
