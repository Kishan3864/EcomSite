import { db } from "@/lib/db";

/**
 * Maintenance mode: one switch that takes the whole public storefront down to
 * a holding page, and leaves the admin alone.
 *
 * The state is a row in the existing StoreSetting table under the key
 * `maintenance`, so it survives a deploy and a restart and needs no schema
 * change. The proxy asks for it on every storefront page request, which must
 * not mean a database query on every request — this box runs other sites too.
 * So the answer is held in memory for a few seconds, and the admin action that
 * flips the switch overwrites that copy in the same process, which is what
 * makes it take effect at once rather than after the cache runs out.
 *
 * THIS ASSUMES ONE PROCESS. deploy/ecosystem.config.cjs runs the app under PM2
 * in fork mode with one instance, so the memory copy the admin action
 * overwrites is the same one the proxy reads, and the switch is instant. If
 * that file is ever changed to exec_mode "cluster" or instances > 1, each
 * worker keeps its own copy: the worker that handled the click flips at once,
 * and every other worker goes on serving the OLD state until its own copy
 * expires, up to TTL_MS later. Nothing breaks — the database row is still the
 * truth and every worker reaches it within five seconds — but "takes effect
 * immediately" becomes "within five seconds", and for those seconds some
 * shoppers see the shop and some see the holding page. If that matters then,
 * lower TTL_MS or move the flag to something shared between workers.
 *
 * It fails OPEN. If the database cannot be asked, the last known answer stands,
 * and with no answer at all the shop stays up: a database hiccup must never be
 * what takes the storefront down.
 */

export interface MaintenanceState {
  on: boolean;
  /** What the holding page says. */
  message: string;
  /** ISO time the shop expects to be back, or null. Drives Retry-After. */
  backBy: string | null;
}

export const MAINTENANCE_KEY = "maintenance";
export const MAINTENANCE_DEFAULT: MaintenanceState = {
  on: false,
  message: "We are making a few improvements and will be back shortly. Thank you for your patience.",
  backBy: null,
};

const TTL_MS = 5_000;

interface Held {
  at: number;
  state: MaintenanceState;
}
// On globalThis, not a module variable: the proxy and the server actions are
// separate bundles in one process, and each would otherwise keep its own copy.
const slot = globalThis as unknown as { __weekendcartMaintenance?: Held };

export function normaliseMaintenance(value: unknown): MaintenanceState {
  const row = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  const message = typeof row.message === "string" && row.message.trim() ? row.message.trim().slice(0, 600) : MAINTENANCE_DEFAULT.message;
  const backBy = typeof row.backBy === "string" && !Number.isNaN(Date.parse(row.backBy)) ? new Date(row.backBy).toISOString() : null;
  return { on: row.on === true, message, backBy };
}

/** The current state, from memory when it is fresh and from the database when it is not. */
export async function getMaintenance(): Promise<MaintenanceState> {
  const held = slot.__weekendcartMaintenance;
  if (held && Date.now() - held.at < TTL_MS) return held.state;
  try {
    const row = await db.storeSetting.findUnique({ where: { key: MAINTENANCE_KEY }, select: { value: true } });
    const state = normaliseMaintenance(row?.value);
    slot.__weekendcartMaintenance = { at: Date.now(), state };
    return state;
  } catch (error) {
    console.error("[maintenance] could not read the switch", error instanceof Error ? error.message : error);
    return held?.state ?? MAINTENANCE_DEFAULT;
  }
}

/** Write the switch, and make this process believe it immediately. */
export async function saveMaintenance(state: MaintenanceState): Promise<void> {
  await db.storeSetting.upsert({
    where: { key: MAINTENANCE_KEY },
    create: { key: MAINTENANCE_KEY, value: state as object },
    update: { value: state as object },
  });
  slot.__weekendcartMaintenance = { at: Date.now(), state };
}

/** Seconds a crawler or a client should wait: until "back by", else an hour. Never under a minute. */
export function retryAfterSeconds(state: MaintenanceState, now: number = Date.now()): number {
  if (!state.backBy) return 3600;
  return Math.max(60, Math.round((Date.parse(state.backBy) - now) / 1000));
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * The holding page, as one self-contained document.
 *
 * Built by hand rather than rendered by the app: it is served by the proxy,
 * before the app, and it has to work when the app is the thing being fixed. No
 * script, no external request, nothing to load but itself.
 */
export function maintenanceHtml(state: MaintenanceState, brand: { name: string; email: string }): string {
  const back = state.backBy
    ? new Date(state.backBy).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })
    : null;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(brand.name)} — back soon</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;background:#f4f2ee;color:#1d2a31;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px;box-sizing:border-box}
  main{max-width:520px;text-align:center}
  .mark{font:600 13px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#3b6579}
  h1{font:500 30px/1.2 Georgia,"Times New Roman",serif;letter-spacing:-.02em;margin:18px 0 12px}
  p{margin:0 0 10px;color:#46555d}
  .back{margin-top:18px;padding-top:16px;border-top:1px solid #d9d5cc;font-size:14px}
  a{color:#2f5265}
</style>
</head>
<body>
<main>
  <div class="mark">${escapeHtml(brand.name)}</div>
  <h1>We&rsquo;ll be right back</h1>
  <p>${escapeHtml(state.message)}</p>
  ${back ? `<p class="back">We expect to be back by <strong>${escapeHtml(back)}</strong> (IST).</p>` : ""}
  <p class="back">Need help with an order? Write to <a href="mailto:${escapeHtml(brand.email)}">${escapeHtml(brand.email)}</a>.</p>
</main>
</body>
</html>`;
}
