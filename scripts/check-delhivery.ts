/**
 * Checks the Delhivery connection from this server, in the environment .env
 * points at.
 *
 *   npx tsx scripts/check-delhivery.ts              # token, reachability, a pincode
 *   npx tsx scripts/check-delhivery.ts 395006       # a pincode of your choosing
 *
 * It signs nothing and books nothing. It fetches one waybill from the account's
 * allocation to prove the token can, which on staging costs nothing and on
 * production consumes one number from a pool of thousands.
 */
import "dotenv/config";
import { setDefaultAutoSelectFamily, setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import { setDefaultResultOrder } from "node:dns";
import { checkPincode, delhiveryConfig, fetchWaybill } from "../src/lib/shipping/delhivery";

setDefaultResultOrder("ipv6first");
setDefaultAutoSelectFamily(true);
setDefaultAutoSelectFamilyAttemptTimeout(500);

const ok = (s: string) => `\x1b[32m✓\x1b[0m ${s}`;
const bad = (s: string) => `\x1b[31m✗\x1b[0m ${s}`;
const warn = (s: string) => `\x1b[33m!\x1b[0m ${s}`;
const head = (s: string) => `\n\x1b[1m${s}\x1b[0m`;

async function main() {
  console.log(head("Configuration"));
  const config = delhiveryConfig();
  if (!config) {
    console.log(bad("not configured. Set these in .env and reload PM2:"));
    console.log("    DELHIVERY_ENV=staging");
    console.log("    DELHIVERY_API_TOKEN=<token from Delhivery One → Settings → API>");
    console.log("    DELHIVERY_PICKUP_LOCATION=<warehouse name exactly as registered>");
    return;
  }
  console.log(ok(`environment  ${config.env}${config.env === "staging" ? "  (test — nothing moves in the real world)" : "  (LIVE)"}`));
  console.log(ok(`token        …${config.token.slice(-6)}`));
  console.log(ok(`pickup       ${config.pickupLocation}`));

  console.log(head("Token and reachability"));
  try {
    const waybill = await fetchWaybill(config);
    console.log(ok(`Delhivery answered and issued a waybill: ${waybill}`));
  } catch (error) {
    console.log(bad(error instanceof Error ? error.message : String(error)));
    console.log("    A rejected token means the token is wrong or is for the other environment.");
    console.log("    A connection failure means this server could not reach Delhivery — see");
    console.log("    docs/google-sign-in.md for what is known about this box's network.");
    return;
  }

  const pin = process.argv[2] ?? "395006";
  console.log(head(`Serviceability for ${pin}`));
  try {
    const r = await checkPincode(config, pin);
    if (!r.serviceable) console.log(warn("not serviceable by Delhivery"));
    else console.log(ok(`${r.city}, ${r.state} — prepaid ${r.prepaid ? "yes" : "no"}, cash on delivery ${r.cod ? "yes" : "no"}`));
  } catch (error) {
    console.log(bad(error instanceof Error ? error.message : String(error)));
  }

  console.log(head("Next"));
  console.log("  Place a test order on the site, open it in /admin/orders, and press");
  console.log("  “Book with Delhivery”. On staging that creates a test shipment you can");
  console.log("  track with “Refresh tracking”. When that works, switch DELHIVERY_ENV to");
  console.log("  production and the token to the live one — nothing else changes.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
