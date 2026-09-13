/**
 * Checks everything a Google / Facebook sign-in depends on, from this server.
 *
 *   npx tsx scripts/check-auth.ts
 *
 * A failed social sign-in shows the shopper one sentence, because one sentence
 * is all they can act on. This prints what that sentence is hiding: whether the
 * credentials are set, what redirect URI this server will actually send (the
 * value that has to be registered, character for character), whether Google is
 * reachable from here at all, and whether the client id and secret are a pair
 * Google still recognises.
 *
 * It signs nobody in and changes nothing. Safe to run on the live box.
 */
import "dotenv/config";
import { connect, setDefaultAutoSelectFamily, setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import { setDefaultResultOrder } from "node:dns";
import { lookup } from "node:dns/promises";

/**
 * Test the way the app runs, not the way a bare `npx tsx` would.
 *
 * PM2 starts the app with --dns-result-order=ipv6first and it turns on Happy
 * Eyeballs in src/instrumentation.ts. A script run by hand inherits neither, so
 * without these two lines it reports failures the app itself would not have —
 * which is worse than useless, because it sends you looking for a fault that is
 * already handled.
 */
setDefaultResultOrder("ipv6first");
setDefaultAutoSelectFamily(true);
setDefaultAutoSelectFamilyAttemptTimeout(500);

const ok = (s: string) => `\x1b[32m✓\x1b[0m ${s}`;
const bad = (s: string) => `\x1b[31m✗\x1b[0m ${s}`;
const warn = (s: string) => `\x1b[33m!\x1b[0m ${s}`;
const head = (s: string) => `\n\x1b[1m${s}\x1b[0m`;

const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ?? "";

const PROVIDERS = [
  {
    id: "google",
    label: "Google",
    idEnv: "GOOGLE_CLIENT_ID",
    secretEnv: "GOOGLE_CLIENT_SECRET",
    tokenUrl: "https://oauth2.googleapis.com/token",
    hosts: [
      "https://accounts.google.com",
      "https://oauth2.googleapis.com",
      "https://openidconnect.googleapis.com",
    ],
  },
  {
    id: "facebook",
    label: "Facebook",
    idEnv: "FACEBOOK_CLIENT_ID",
    secretEnv: "FACEBOOK_CLIENT_SECRET",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    hosts: ["https://www.facebook.com", "https://graph.facebook.com"],
  },
];

/**
 * Opens a plain TCP connection to the host on 443, over one address family
 * only, and reports the DNS lookup and the connect separately.
 *
 * Separately, because they fail for different reasons and only one of them is
 * about routing. A ten-second total is a broken route if the connect took it,
 * and a slow resolver if the lookup did — and on this box both have been seen.
 */
async function tcp(host: string, family: 4 | 6) {
  const dnsStarted = Date.now();
  let address: string;
  try {
    ({ address } = await lookup(host, { family }));
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    const absent = /ENOTFOUND|ENODATA/.test(why);
    return {
      works: false,
      line: (absent ? warn : bad)(
        `IPv${family} — ${absent ? "no address of this family (fine)" : `DNS: ${why}`}` +
          ` (after ${Date.now() - dnsStarted}ms)`,
      ),
    };
  }
  const dnsMs = Date.now() - dnsStarted;

  const connectStarted = Date.now();
  try {
    await new Promise<void>((resolve, reject) => {
      const socket = connect({ host: address, port: 443, timeout: 10_000, autoSelectFamily: false });
      socket.once("connect", () => (socket.destroy(), resolve()));
      socket.once("timeout", () => (socket.destroy(), reject(new Error("timed out"))));
      socket.once("error", (error) => (socket.destroy(), reject(error)));
    });
    return {
      works: true,
      line: ok(`IPv${family} ${address} — dns ${dnsMs}ms, connect ${Date.now() - connectStarted}ms`),
    };
  } catch (error) {
    return {
      works: false,
      line: bad(
        `IPv${family} ${address} — dns ${dnsMs}ms, connect ` +
          `${error instanceof Error ? error.message : String(error)} after ${Date.now() - connectStarted}ms`,
      ),
    };
  }
}

/** Turns two connection results into the one sentence that matters. */
function familyVerdict(v4: { works: boolean }, v6: { works: boolean }) {
  if (v4.works && v6.works) return ok("both families work — routing is not the problem here.");
  if (v6.works && !v4.works)
    return warn(
      "IPv4 out of this server is broken; IPv6 is healthy.\n" +
        "    The app handles it (ipv6first + Happy Eyeballs), so sign-in works.\n" +
        "    But github.com is IPv4-only, so `git pull` on this box cannot work until\n" +
        "    the host fixes it — which is why deploys are pushed here instead.\n" +
        "    Do NOT add an IPv4 precedence line to /etc/gai.conf: it would force the\n" +
        "    broken family on everything.",
    );
  if (v4.works && !v6.works)
    return warn(
      "IPv6 out of this server is broken; IPv4 is healthy.\n" +
        "    Change NODE_OPTIONS in deploy/ecosystem.config.cjs to\n" +
        "    --dns-result-order=ipv4first and reload PM2.",
    );
  return bad("neither family can open a connection — this is a matter for the host.");
}

/**
 * Can this box open a connection to that host at all?
 *
 * Twice, because the app tries three times. On a network that fails
 * intermittently, one attempt tells you about one moment rather than about the
 * shop, and reporting "unreachable" for something the app would have got on its
 * second try is a false alarm.
 */
async function reach(url: string) {
  const started = Date.now();
  let why = "";
  for (const attempt of [1, 2]) {
    try {
      const res = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      const note = attempt > 1 ? " (on the second try — the network is flaky)" : "";
      return (attempt > 1 ? warn : ok)(
        `${url} — HTTP ${res.status} in ${Date.now() - started}ms${note}`,
      );
    } catch (error) {
      why = error instanceof Error ? error.message : String(error);
    }
  }
  return bad(`${url} — ${why} (after ${Date.now() - started}ms, two tries)`);
}

/**
 * Asks the token endpoint to redeem a code that was never issued.
 *
 * A rejection is the expected answer; which rejection is the useful part.
 * "invalid_grant" means the code was bad but the client id and secret were
 * accepted — the credentials are a valid pair. "invalid_client" means they are
 * not, and no amount of retrying a sign-in will help.
 */
async function checkCredentials(p: (typeof PROVIDERS)[number], clientId: string, secret: string) {
  try {
    const res = await fetch(p.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: "checking-credentials-not-a-real-code",
        redirect_uri: `${site}/api/auth/${p.id}/callback`,
        client_id: clientId,
        client_secret: secret,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const body = (await res.text().catch(() => "")).slice(0, 300);
    const error = /"error"\s*:\s*"([^"]+)"/.exec(body)?.[1] ?? "";

    if (error === "invalid_grant")
      return ok("client id and secret are a pair the provider accepts");
    if (error === "invalid_client")
      return bad(
        "the provider rejected the client id / secret pair.\n" +
          `    Re-copy both from the console into .env (${p.idEnv} / ${p.secretEnv}) and reload PM2.`,
      );
    if (error === "redirect_uri_mismatch")
      return bad(
        `the redirect URI is not registered:\n    ${site}/api/auth/${p.id}/callback\n` +
          "    Add it to the console, exactly, and try again.",
      );
    return warn(`unexpected answer — HTTP ${res.status} ${body}`);
  } catch (error) {
    return bad(
      `could not reach ${new URL(p.tokenUrl).host} — ${error instanceof Error ? error.message : String(error)}.\n` +
        "    Until this server can open that connection, no social sign-in can finish.",
    );
  }
}

async function main() {
  console.log(head("Site"));
  if (!site) {
    console.log(bad("NEXT_PUBLIC_SITE_URL is not set — every provider button is hidden."));
    return;
  }
  console.log(ok(`NEXT_PUBLIC_SITE_URL = ${site}`));
  console.log(
    warn(
      "Sign-in must START on this exact hostname. The handshake cookie is set on\n" +
        "    whichever host the button was pressed on, and the provider always returns to\n" +
        "    the one URI above — so starting on any other hostname loses the cookie and\n" +
        "    the attempt fails with “that sign-in attempt expired on the way back”.",
    ),
  );

  for (const p of PROVIDERS) {
    const clientId = process.env[p.idEnv]?.trim();
    const secret = process.env[p.secretEnv]?.trim();

    console.log(head(p.label));
    if (!clientId || !secret) {
      console.log(
        warn(`not configured (${p.idEnv} / ${p.secretEnv} empty) — the button is not shown.`),
      );
      continue;
    }
    console.log(ok(`${p.idEnv} set (…${clientId.slice(-14)})`));
    console.log(ok(`${p.secretEnv} set (${secret.length} characters)`));

    console.log("\n  Register these in the provider console, character for character:");
    console.log(`    redirect URI        ${site}/api/auth/${p.id}/callback`);
    if (p.id === "google") console.log(`    JavaScript origin   ${site}`);

    console.log("\n  Reachable from this server, the way the app reaches it?");
    for (const host of p.hosts) console.log("  " + (await reach(host)));

    console.log("\n  Each address family on its own, per host");
    let anyV4 = false;
    let anyV6 = false;
    for (const url of p.hosts) {
      const host = new URL(url).host;
      console.log(`  ${host}`);
      const v4 = await tcp(host, 4);
      const v6 = await tcp(host, 6);
      console.log("    " + v4.line);
      console.log("    " + v6.line);
      anyV4 ||= v4.works;
      anyV6 ||= v6.works;
    }
    console.log("  " + familyVerdict({ works: anyV4 }, { works: anyV6 }));

    console.log("\n  Credentials");
    console.log("  " + (await checkCredentials(p, clientId, secret)));
  }

  console.log(head("If a sign-in still fails"));
  console.log(`  pm2 logs weekendcart --lines 50 | grep '\\[auth:'`);
  console.log("  The callback now writes the provider's own reason to that log.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
