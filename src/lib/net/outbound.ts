import { request as httpsRequest } from "node:https";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";

/**
 * Outbound HTTPS that reaches the host over whichever address family works.
 *
 * Measured on the production box: IPv4 out of it is dead — a TCP connect to
 * accounts.google.com, oauth2.googleapis.com and openidconnect.googleapis.com
 * all time out after 10 seconds on IPv4 while IPv6 connects to every one of
 * them in 3–4ms. Google sign-in still failed, because `fetch` kept choosing the
 * IPv4 address and waiting it out. Neither `--dns-result-order=ipv6first` nor
 * `net.setDefaultAutoSelectFamily(true)` changed that: Node's bundled fetch
 * does not take its connection options from either, and configuring it properly
 * needs the `undici` package, which is not a dependency here.
 *
 * So the requests that must not fail do not go through fetch. `node:https`
 * takes the two options that matter directly:
 *
 *   lookup              every address, IPv6 first
 *   autoSelectFamily    try the next one 250ms later instead of waiting
 *
 * Between them, the healthy family answers in milliseconds and a dead one
 * costs a quarter of a second. Nothing is switched off: on a box where IPv4 is
 * the working family, IPv4 still wins the race — this is Happy Eyeballs, which
 * is what any client should do on a dual-stack network, and it keeps working
 * unchanged if the hosting provider repairs IPv4 tomorrow.
 *
 * No "server-only" marker: node:https would fail loudly in a browser bundle
 * anyway, and scripts/check-auth.ts imports this so the check exercises the
 * exact path a sign-in takes rather than an approximation of it.
 */
const ipv6First: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    // Descending family: 6 before 4, order otherwise untouched.
    const sorted = [...(addresses as LookupAddress[])].sort((a, b) => b.family - a.family);
    if (options.all) return (callback as (e: null, a: LookupAddress[]) => void)(null, sorted);
    callback(null, sorted[0].address, sorted[0].family);
  });
};

export interface OutboundResponse {
  status: number;
  body: string;
}

/** One HTTPS request, with a hard ceiling on how long it may take. */
export function httpsFetch(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number } = {},
): Promise<OutboundResponse> {
  const { method = "GET", headers = {}, body, timeoutMs = 10_000 } = init;
  const target = new URL(url);

  return new Promise((resolve, reject) => {
    // `autoSelectFamily` is a net.connect option; https.request forwards
    // anything it does not recognise straight through to the socket, but its
    // types stop at the HTTP layer, hence the cast.
    const options = {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || "443",
      path: `${target.pathname}${target.search}`,
      method,
      headers: body
        ? { ...headers, "Content-Length": Buffer.byteLength(body).toString() }
        : headers,
      lookup: ipv6First,
      autoSelectFamily: true,
      autoSelectFamilyAttemptTimeout: 250,
      timeout: timeoutMs,
    } as unknown as Parameters<typeof httpsRequest>[0];

    const req = httpsRequest(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }),
      );
      res.on("error", reject);
    });

    req.on("timeout", () => req.destroy(new Error(`timed out after ${timeoutMs}ms`)));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}
