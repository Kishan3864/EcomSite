/**
 * Checks the Delhivery connection from this server, in the environment .env
 * points at.
 *
 *   npx tsx scripts/check-delhivery.ts              # token, reachability, a pincode
 *   npx tsx scripts/check-delhivery.ts 395006       # a pincode of your choosing
 *
 * Read-only: it books nothing, cancels nothing and takes no waybill from the
 * account. The pincode lookup needs the token, so a valid answer proves the
 * token at the same time.
 */
import "dotenv/config";
import { setDefaultAutoSelectFamily, setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import { setDefaultResultOrder } from "node:dns";
import { DelhiveryError, checkPincode, delhiveryConfig } from "../src/lib/shipping/delhivery";

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
    console.log("    DELHIVERY_ENV=production          # or staging, if Delhivery gave you a staging token");
    console.log("    DELHIVERY_API_TOKEN=<Delhivery One → Settings → API and MCP Setup>");
    console.log("    DELHIVERY_PICKUP_LOCATION=<Settings → Pickup Locations → the name, exactly>");
    return;
  }
  console.log(ok(`environment  ${config.env}${config.env === "production" ? "  (LIVE account — bookings are real)" : "  (test system — nothing moves)"}`));
  console.log(ok(`token        …${config.token.slice(-6)}`));
  console.log(ok(`pickup       ${config.pickupLocation}`));

  const pin = process.argv[2] ?? "395006";
  console.log(head(`Token, reachability and serviceability for ${pin}`));
  try {
    const r = await checkPincode(config, pin);
    console.log(ok("Delhivery answered and accepted the token"));
    if (!r.serviceable) console.log(warn(`${pin} is not serviceable by Delhivery`));
    else console.log(ok(`${pin} → ${r.city}, ${r.state} — prepaid ${r.prepaid ? "yes" : "no"}, cash on delivery ${r.cod ? "yes" : "no"}`));
  } catch (error) {
    console.log(bad(error instanceof Error ? error.message : String(error)));
    if (error instanceof DelhiveryError && (error.status === 401 || error.status === 403)) {
      console.log("    The token was rejected: wrong token, or a token for the other environment.");
    } else {
      console.log("    This server could not get an answer from Delhivery — the same network the");
      console.log("    Google sign-in notes describe. Try once more; if it keeps failing, say so.");
    }
    return;
  }

  console.log(head("Next"));
  console.log("  Place a cash-on-delivery test order on the site, open it in /admin/orders and");
  console.log("  press “Book with Delhivery”. Then cancel that order from the same page: the");
  console.log("  booking is cancelled with Delhivery too, and a shipment cancelled before pickup");
  console.log("  is never billed. That is the whole live test.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
