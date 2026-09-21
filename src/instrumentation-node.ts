import { setDefaultAutoSelectFamily, setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";

/**
 * Node-only start-up work, in its own file because `instrumentation.ts` is also
 * loaded by the edge runtime, which has neither sockets nor a filesystem.
 */
export async function startNodeRuntime() {
  // Happy Eyeballs: when a hostname resolves to both an IPv6 and an IPv4
  // address, try the second family shortly after the first rather than waiting
  // out a connection that is never going to open. This server's routes out are
  // unreliable in both directions at different moments, so neither family can
  // be trusted on its own.
  setDefaultAutoSelectFamily(true);
  setDefaultAutoSelectFamilyAttemptTimeout(500);

  // Google's signing keys, fetched now and kept fresh, so that verifying a
  // sign-in never waits on a network call. Failures here are expected and
  // harmless: the customer's first sign-in falls back to fetching them, and
  // the timer tries again shortly.
  const { refreshGoogleKeys } = await import("@/lib/auth/google-keys");

  void refreshGoogleKeys();

  // Every half hour, and soon after a failure. Unref'd so it never holds the
  // process open by itself.
  const timer = setInterval(() => void refreshGoogleKeys(), 30 * 60_000);
  timer.unref?.();

  // Review requests after delivery, and their one reminder. Production only —
  // the guards and the reasoning are on startReviewRequestTimer.
  const { startReviewRequestTimer } = await import("@/services/order-reviews");
  startReviewRequestTimer();
}
