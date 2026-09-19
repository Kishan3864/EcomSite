import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Is the app up? Asked by deploy/health.sh after every deploy and rollback.
 *
 * It lives under /api on purpose. The proxy never runs on /api routes, so
 * maintenance mode cannot touch this: the deploy used to ask "/" instead, got
 * the 503 holding page while the shop was deliberately paused, took a healthy
 * app for a dead one and rolled it back.
 *
 * 200 means the process is serving AND the database answers, which is what a
 * page needs. It says nothing else — no version, no environment, no counts —
 * because it is reachable by anyone.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
