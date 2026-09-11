import "server-only";

import { headers } from "next/headers";

/**
 * Sliding-window rate limiting, in process memory.
 *
 * The app runs as a single PM2 process (see deploy/ecosystem.config.cjs), so a
 * Map is the whole store and needs no Redis. If the app is ever scaled to more
 * than one instance, each would keep its own count and the effective limit
 * would multiply by the instance count — at that point this moves to Redis.
 *
 * The point is not to stop a determined attacker at the application layer; it
 * is to make password guessing, payment-order spamming and upload flooding
 * slow and expensive, and to do it without ever getting in the way of a real
 * customer, whose usage sits far below every limit here.
 */

const hits = new Map<string, number[]>();
let lastSweep = 0;

/** Drop keys nobody has touched for an hour, so the map cannot grow forever. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, times] of hits) {
    if (times.length === 0 || now - times[times.length - 1] > 3_600_000) hits.delete(key);
  }
}

/**
 * Record an attempt and report whether it is allowed.
 * Returns false once `limit` attempts have been made inside `windowMs`.
 */
export function rateLimit(bucket: string, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);

  const id = `${bucket}:${key}`;
  const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(id, recent);
    return false;
  }

  recent.push(now);
  hits.set(id, recent);
  return true;
}

/**
 * The caller's IP address, as nginx saw it.
 *
 * nginx sets X-Real-IP from $remote_addr, overwriting anything the client sent,
 * so it cannot be spoofed. X-Forwarded-For is only a fallback, and then only its
 * last entry — the one nginx appended — because every entry before it came
 * from the client and could say anything.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    return parts[parts.length - 1] ?? "unknown";
  }
  return "unknown";
}

export const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
