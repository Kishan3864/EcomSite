import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { BUSINESS, formatAddress, isGstRegistered } from "../src/config/business";

/**
 * Push src/config/business.ts into the database.
 *
 * Store details live in two places by design. `src/config/business.ts` is the
 * source of truth for everything rendered from code — policy pages, footer,
 * structured data. The `StoreSetting` table holds the same values so the owner
 * can edit them from the admin panel without a deploy, and `getSettings()`
 * merges the stored row *over* the defaults.
 *
 * That merge is why a rebrand does not reach a running site on its own: the
 * seeded row still says what it said the day it was written, and it wins.
 * `npm run db:seed` will not correct it either — its upsert deliberately passes
 * `update: {}` so re-seeding never overwrites the owner's own edits.
 *
 * This script is the deliberate exception. Run it once after changing the
 * business config:
 *
 *   npm run db:sync-business
 *
 * It also clears the seller snapshot frozen onto existing orders. An invoice is
 * supposed to reprint identically years later, so each order copies the
 * seller's legal name, address and GSTIN at the moment it is raised — which
 * means old orders would keep printing the old company for ever. Clearing them
 * is safe only while no real invoice has been issued to a real customer; the
 * script refuses to touch a paid order for exactly that reason.
 */

// Prisma 7 requires a driver adapter; mirror what src/lib/db.ts does so this
// script talks to the same database the app does.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Run this from the app directory with .env present.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/**
 * --force also rewrites paid orders. Only correct before the first real sale:
 * after that, an invoice already in a customer's hands must keep printing what
 * it printed the day it was issued.
 */
const force = process.argv.includes("--force");

async function main() {
  const store = {
    name: BUSINESS.brandName,
    legalName: BUSINESS.legalName,
    tagline: BUSINESS.tagline,
    supportEmail: BUSINESS.supportEmail,
    supportPhone: BUSINESS.supportPhone,
    address: formatAddress(),
    // Empty unless genuinely registered. The invoice builder branches on this:
    // no GSTIN means a bill of supply with no tax charged, which is the only
    // lawful document an unregistered seller can issue.
    gstin: isGstRegistered ? BUSINESS.gstin : "",
    currency: "INR",
  };

  await db.storeSetting.upsert({
    where: { key: "store" },
    create: { key: "store", value: store },
    update: { value: store },
  });

  console.log("store settings updated:");
  for (const [k, v] of Object.entries(store)) {
    console.log(`  ${k.padEnd(14)} ${v === "" ? "(empty)" : v}`);
  }

  // Only unpaid orders. A paid order's invoice is a document that has already
  // been given to somebody, and rewriting it after the fact is not ours to do.
  const stale = await db.order.updateMany({
    where: {
      paymentStatus: { not: "PAID" },
      sellerLegalName: { not: BUSINESS.legalName },
    },
    data: {
      sellerLegalName: null,
      sellerAddress: null,
      sellerGstin: null,
      sellerStateCode: null,
    },
  });

  console.log(`\nseller snapshot cleared on ${stale.count} unpaid order(s).`);

  const paidStale = await db.order.count({
    where: {
      paymentStatus: "PAID",
      sellerLegalName: { not: BUSINESS.legalName },
    },
  });

  if (paidStale > 0 && !force) {
    console.log(
      `\n⚠  ${paidStale} paid order(s) still carry the previous seller details.\n` +
        `   Their invoices count as already issued, so they are left alone by default.\n` +
        `   If these are seeded demo orders and no real sale has happened yet, run:\n` +
        `     npm run db:sync-business -- --force`,
    );
  } else if (paidStale > 0) {
    const forced = await db.order.updateMany({
      where: { sellerLegalName: { not: BUSINESS.legalName } },
      data: {
        sellerLegalName: null,
        sellerAddress: null,
        sellerGstin: null,
        sellerStateCode: null,
      },
    });
    console.log(`--force: seller snapshot cleared on ${forced.count} paid order(s) too.`);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
