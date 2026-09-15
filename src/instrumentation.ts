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

  const { startNodeRuntime } = await import("./instrumentation-node");
  await startNodeRuntime();
}

/**
 * Name the route that failed.
 *
 * Every server error used to reach the log as the same eight anonymous lines:
 *
 *     ⨯ [Error: An error occurred in the Server Components render. The
 *       specific message is omitted in production builds…]
 *       digest: 'DYNAMIC_SERVER_USAGE'
 *
 * — with no URL, no route and no reason. Fifty-four of those arrived over one
 * afternoon and there was no way to tell from the log which page produced
 * them, whether it was a visitor's request or a background revalidation, or
 * whether the fix had worked. Diagnosing it meant guessing and redeploying.
 *
 * Next hands all of that to `onRequestError`, so it is written as ONE grep-able
 * line per error:
 *
 *     [request-error] path=/checkout/address route=/(store)/checkout/address
 *                     type=render source=react-server-components
 *                     revalidate=stale digest=DYNAMIC_SERVER_USAGE msg="…"
 *
 * `routeType` and `revalidateReason` are the two that matter most: together
 * they say whether a real person hit this or whether it was ISR regenerating
 * the page in the background, which are different bugs with different fixes.
 *
 * Deliberately no headers, no cookies and no request body — an error log is
 * read by more people than a session is, and a logged cookie is a session
 * anyone with log access can steal. The path is enough to reproduce with.
 *
 * It must never throw: an error handler that fails while handling an error
 * loses the original. Hence the try/catch around what is only string work.
 */
export const onRequestError: import("next").Instrumentation.onRequestError = (
  err,
  request,
  context,
) => {
  try {
    const digest =
      typeof err === "object" && err !== null && "digest" in err
        ? String((err as { digest?: unknown }).digest)
        : undefined;
    const message = err instanceof Error ? err.message : String(err);

    console.error(
      `[request-error] path=${request.path} method=${request.method} ` +
        `route=${context.routePath} type=${context.routeType} ` +
        `source=${context.renderSource ?? "-"} ` +
        `revalidate=${context.revalidateReason ?? "-"} ` +
        `digest=${digest ?? "-"} msg=${JSON.stringify(message.slice(0, 300))}`,
    );

    // The stack is the one thing worth the extra lines, and production strips
    // it from the message the browser sees, so this is the only place it
    // survives at all.
    if (err instanceof Error && err.stack) console.error(err.stack);
  } catch {
    // Never let reporting an error become an error.
  }
};
