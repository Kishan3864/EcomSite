/**
 * Which ways of paying the storefront offers.
 *
 *   npx tsx scripts/payment-methods.ts                 # show what is on now
 *   npx tsx scripts/payment-methods.ts upi             # UPI only
 *   npx tsx scripts/payment-methods.ts upi cod         # UPI and cash on delivery
 *   npx tsx scripts/payment-methods.ts upi gateway cod # everything
 *
 * The same switches live in /admin → Settings; this is the version you can run
 * over SSH without clicking through the panel.
 *
 * Switching something on here is only half of it. Each method also has to be
 * able to take money — UPI needs UPI_VPA in .env, the gateway needs PAYU_KEY
 * and PAYU_SALT — and the checkout hides any method that cannot (see
 * src/services/storefront-config.ts). This script says so rather than letting
 * you believe a dead option is live.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEFAULTS = { upi: true, card: true, netbanking: true, wallet: true, cod: true, codLimit: 20000 };
const ok = (s: string) => `\x1b[32m✓\x1b[0m ${s}`;
const off = (s: string) => `\x1b[90m·\x1b[0m \x1b[90m${s}\x1b[0m`;
const warn = (s: string) => `\x1b[33m!\x1b[0m ${s}`;

async function main() {
  const row = await db.storeSetting.findUnique({ where: { key: "payments" } });
  const current = { ...DEFAULTS, ...((row?.value as object) ?? {}) } as typeof DEFAULTS;

  const wanted = process.argv.slice(2).map((a) => a.toLowerCase().replace(/^-+/, ""));
  const unknown = wanted.filter((w) => !["upi", "gateway", "cod"].includes(w));
  if (unknown.length) {
    console.log(`\nUnknown: ${unknown.join(", ")}. Use any of: upi, gateway, cod\n`);
    return;
  }

  if (wanted.length) {
    const gateway = wanted.includes("gateway");
    const next = {
      ...current,
      upi: wanted.includes("upi"),
      card: gateway,
      netbanking: gateway,
      wallet: gateway,
      cod: wanted.includes("cod"),
    };
    await db.storeSetting.upsert({
      where: { key: "payments" },
      create: { key: "payments", value: next },
      update: { value: next },
    });
    Object.assign(current, next);
    console.log("\nSaved.");
  }

  const upiReady = !!process.env.UPI_VPA?.trim();
  const gatewayReady = !!process.env.PAYU_KEY?.trim() && !!process.env.PAYU_SALT?.trim();
  const gatewayMode = (process.env.PAYU_MODE?.trim() || "test") === "live" ? "live" : "test";
  const gatewayOn = current.card || current.netbanking || current.wallet;

  console.log("\n\x1b[1mAt checkout right now\x1b[0m");
  console.log(current.upi && upiReady ? ok("UPI — QR and Google Pay / PhonePe / Paytm") : off("UPI"));
  const gatewayLabel = `Pay online — PayU (${gatewayMode})`;
  console.log(gatewayOn && gatewayReady ? ok(gatewayLabel) : off(gatewayLabel));
  console.log(current.cod ? ok(`Cash on Delivery — up to ₹${current.codLimit.toLocaleString("en-IN")}`) : off("Cash on Delivery"));

  if (current.upi && !upiReady) console.log(warn("UPI is switched on but UPI_VPA is empty in .env, so it stays hidden."));
  if (gatewayOn && !gatewayReady) console.log(warn("The gateway is switched on but PAYU_KEY / PAYU_SALT are missing, so it stays hidden."));
  if (gatewayOn && gatewayReady && gatewayMode === "test") console.log(warn("PayU is in TEST mode — no real money moves. Set PAYU_MODE=live when you are ready."));
  if (!(current.upi && upiReady) && !(gatewayOn && gatewayReady) && !current.cod) {
    console.log(warn("Nothing is payable — no order can be placed. Switch something on."));
  }
  console.log("\nReload the app for a change to reach shoppers:  pm2 reload weekendcart\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
