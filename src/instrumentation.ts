/**
 * Runs once when the server starts, before it serves anything.
 *
 * Happy Eyeballs: when a hostname resolves to both an IPv6 and an IPv4
 * address, try the second family a quarter of a second after the first rather
 * than waiting out a connection that is never going to open.
 *
 * This box needs it. A plain TCP connect to Google's token endpoint answers
 * over IPv6 in 7ms and times out over IPv4 after 10 seconds — its IPv4 route
 * out is broken. Without this, Node picks one address, waits, and fails, which
 * is how a correctly configured Google sign-in ended up telling customers it
 * could not be finished. With it, the healthy family wins the race and nobody
 * notices the other one is down.
 *
 * It is not a workaround for this box alone: it is what a client should do on
 * any dual-stack network, and it cuts nothing off. If IPv4 is later repaired
 * and IPv6 breaks instead, this keeps working with no change.
 */
export async function register() {
  // Only the Node runtime has sockets; the edge runtime loads this too.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { enableHappyEyeballs } = await import("./instrumentation-node");
  enableHappyEyeballs();
}
