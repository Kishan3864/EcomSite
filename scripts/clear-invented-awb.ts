/**
 * Clears the tracking numbers that were never real.
 *
 *   npx tsx scripts/clear-invented-awb.ts          # show what would change
 *   npx tsx scripts/clear-invented-awb.ts --apply  # change it
 *
 * Until the courier was connected, every order was given a courier name and an
 * AWB the moment it was placed — `WKCX` followed by a timestamp. It tracked
 * nothing. Worse, the admin panel saw an AWB and concluded the parcel was
 * already booked, so it offered no way to book the real one.
 *
 * This removes those invented ones. Anything that looks like a real Delhivery
 * waybill is left exactly as it is, and so is any order somebody genuinely
 * booked by hand.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const ok = (s: string) => `\x1b[32m✓\x1b[0m ${s}`;
const dim = (s: string) => `\x1b[90m${s}\x1b[0m`;

async function main() {
  const apply = process.argv.includes("--apply");

  const invented = await db.order.findMany({
    // The generated shape, and only that: WKCX followed by digits.
    where: { awb: { startsWith: "WKCX" } },
    select: { id: true, number: true, courier: true, awb: true, status: true },
    orderBy: { placedAt: "desc" },
  });

  if (invented.length === 0) {
    console.log("\n" + ok("No invented tracking numbers left. Nothing to do.\n"));
    return;
  }

  console.log(`\n\x1b[1m${invented.length} order${invented.length === 1 ? "" : "s"} carrying a tracking number nobody issued\x1b[0m\n`);
  for (const o of invented.slice(0, 15)) {
    console.log(`  ${o.number}  ${dim(`${o.courier ?? "—"} · ${o.awb}`)}  ${dim(o.status.toLowerCase())}`);
  }
  if (invented.length > 15) console.log(dim(`  … and ${invented.length - 15} more`));

  if (!apply) {
    console.log(`\nRun it again with --apply to clear them:\n  npx tsx scripts/clear-invented-awb.ts --apply\n`);
    return;
  }

  const { count } = await db.order.updateMany({
    where: { awb: { startsWith: "WKCX" } },
    data: { courier: null, awb: null },
  });

  console.log(
    "\n" +
      ok(`Cleared ${count}. Those orders now show "Book with Delhivery" in /admin/orders,`),
  );
  console.log("  and their customers see \"being packed\" instead of a number that tracks nothing.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
