/**
 * Repoint product photographs whose source has gone away.
 *
 * Unsplash retires ids. When one goes the shop keeps serving the URL, Next's
 * image optimiser passes the 404 straight through, and the product renders as
 * an empty grey rectangle with a price under it — which a customer reads as a
 * broken shop, not as a slow one. Two ids had gone that way and taken four
 * products with them, one of which was on the homepage.
 *
 * `scripts/seed-catalogue.ts` is fixed for anything seeded from now on. This
 * is for databases that already hold the dead ids — production included, where
 * re-running the whole catalogue seed is not wanted.
 *
 *   npx tsx scripts/repair-images.ts            # report only
 *   npx tsx scripts/repair-images.ts --write    # apply
 *
 * `prisma/seed.ts` also calls it, and the deploy runs that, so the live
 * database heals without anyone having to remember this file. Safe to run any
 * number of times: once the rows are repaired there is nothing left to match.
 *
 * `OrderLine.image` and `Review.images` are deliberately untouched. Those
 * record what a customer saw or uploaded, and rewriting history is not repair.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=entropy&w=1200&h=1500&q=80`;

/**
 * Retired id → the live id that takes its place, from the same department pool
 * the seed draws on. Each replacement duplicates another slot in that pool,
 * picked nine and six places away, so the two products that end up sharing a
 * photograph never land side by side in a grid. Real product photography is
 * the proper answer; this is what stops the blank tiles today.
 */
const SWAPS: Record<string, string> = {
  "1584990347449-a2d4c2c9ca42": "1593618998160-e34014e67546", // kitchen-dining
  "1616628188540-925618b98319": "1584622650111-993a426fbf0a", // laundry-cleaning
};

export async function repairRetiredPhotographs(
  db: PrismaClient,
  { write, quiet = false }: { write: boolean; quiet?: boolean },
): Promise<number> {
  const say = (s: string) => { if (!quiet) console.log(s); };
  let touched = 0;

  for (const [dead, live] of Object.entries(SWAPS)) {
    const from = photo(dead);
    const to = photo(live);

    const counts = {
      productImage: await db.productImage.count({ where: { url: from } }),
      category: await db.category.count({ where: { imageUrl: from } }),
      subcategory: await db.subcategory.count({ where: { imageUrl: from } }),
      banner: await db.banner.count({ where: { imageUrl: from } }),
    };
    const n = Object.values(counts).reduce((a, b) => a + b, 0);
    if (!n) continue;

    /**
     * Never write a replacement that is itself gone — that only moves the
     * blank tile. But a server that cannot reach Unsplash is a different
     * thing: this runs inside the deploy's seed step, and a deploy must not
     * fall over because a third party is unreachable. Unverified means skip.
     */
    const ok = await fetch(to, { redirect: "follow" })
      .then((r) => r.ok)
      .catch(() => null);
    if (ok === false) {
      console.error(`  the replacement for ${dead} is gone too — leaving it alone`);
      continue;
    }
    if (ok === null) {
      say(`  cannot reach Unsplash to check the replacement for ${dead} — skipped`);
      continue;
    }

    for (const [table, c] of Object.entries(counts)) if (c) say(`  ${table}: ${c} row(s) on ${dead}`);
    touched += n;
    if (!write) continue;

    await db.productImage.updateMany({ where: { url: from }, data: { url: to } });
    await db.category.updateMany({ where: { imageUrl: from }, data: { imageUrl: to } });
    await db.subcategory.updateMany({ where: { imageUrl: from }, data: { imageUrl: to } });
    await db.banner.updateMany({ where: { imageUrl: from }, data: { imageUrl: to } });
  }

  return touched;
}

/**
 * Run on its own: npx tsx scripts/repair-images.ts [--write]
 *
 * Deliberately no top-level await here. `prisma/seed.ts` imports this module,
 * and tsx compiles the seed to CommonJS — a module with a top-level await
 * cannot be required from one, so the seed would die at import with
 * ERR_REQUIRE_ASYNC_MODULE before it ran a single statement.
 */
if (process.argv[1] && /repair-images\.ts$/.test(process.argv[1])) {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  const write = process.argv.includes("--write");

  repairRetiredPhotographs(db, { write })
    .then((n) => {
      console.log(
        n === 0
          ? "nothing to repair"
          : write
            ? `repaired ${n} row(s)`
            : `${n} row(s) would change — re-run with --write`,
      );
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
