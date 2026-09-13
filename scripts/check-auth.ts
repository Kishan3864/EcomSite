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

/** Can this box open a connection to that host at all? */
async function reach(url: string) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    return ok(`${url} — HTTP ${res.status} in ${Date.now() - started}ms`);
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    return bad(`${url} — ${why} (after ${Date.now() - started}ms)`);
  }
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

    console.log("\n  Reachable from this server?");
    for (const host of p.hosts) console.log("  " + (await reach(host)));

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
