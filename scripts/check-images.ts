/**
 * Every photograph the shop points at, asked whether it still exists.
 *
 * Unsplash retires ids. When one goes, the shop keeps serving the URL, Next's
 * image optimiser passes the 404 straight through, and the tile renders as an
 * empty grey rectangle with a price under it. A customer does not read that as
 * "still loading" — they read it as a broken shop. Two ids had gone that way,
 * one of them on a product on the homepage.
 *
 *   npx tsx scripts/check-images.ts
 *
 * Exits non-zero if anything is unreachable, so it can gate a deploy.
 *
 * Only remote URLs are checked. A path like /products/steam-iron-1.jpg is
 * served out of public/ and is verified against the filesystem instead.
 *
 * `OrderLine.image` and `Review.images` are deliberately not checked: those
 * are historical records of what someone saw or uploaded, not live shop
 * content, and they must never be rewritten.
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const PUBLIC_DIR = join(import.meta.dirname ?? __dirname, "..", "public");

async function main() {
  /** url -> the things that point at it */
  const users = new Map<string, string[]>();
  const note = (url: string | null | undefined, who: string) => {
    if (!url) return;
    users.set(url, [...(users.get(url) ?? []), who]);
  };

  for (const r of await db.productImage.findMany({
    select: { url: true, product: { select: { slug: true } } },
  })) {
    note(r.url, `product ${r.product.slug}`);
  }
  for (const c of await db.category.findMany({ select: { slug: true, imageUrl: true } })) {
    note(c.imageUrl, `category ${c.slug}`);
  }
  for (const s of await db.subcategory.findMany({ select: { slug: true, imageUrl: true } })) {
    note(s.imageUrl, `subcategory ${s.slug}`);
  }
  for (const b of await db.banner.findMany({ select: { id: true, imageUrl: true } })) {
    note(b.imageUrl, `banner ${b.id}`);
  }

  console.log(`${users.size} distinct photographs`);

  const dead: { url: string; status: string; who: string[] }[] = [];
  const all = [...users.entries()];

  // Twelve at a time: enough to finish a 250-image catalogue in seconds,
  // few enough that Unsplash does not start refusing.
  const CONCURRENCY = 12;
  for (let i = 0; i < all.length; i += CONCURRENCY) {
    await Promise.all(
      all.slice(i, i + CONCURRENCY).map(async ([url, who]) => {
        if (!/^https?:\/\//.test(url)) {
          // A local file under public/. No request to make — just look.
          if (!existsSync(join(PUBLIC_DIR, url.replace(/^\//, "")))) {
            dead.push({ url, status: "missing file", who });
          }
          return;
        }
        try {
          // GET, not HEAD: Unsplash answers HEAD for ids it no longer serves.
          const res = await fetch(url, { redirect: "follow" });
          if (!res.ok) dead.push({ url, status: String(res.status), who });
        } catch (e) {
          dead.push({ url, status: `unreachable (${(e as Error).message})`, who });
        }
      }),
    );
    process.stdout.write(`\r  checked ${Math.min(i + CONCURRENCY, all.length)}/${all.length}`);
  }
  process.stdout.write("\n");

  if (!dead.length) {
    console.log("every photograph resolves");
  } else {
    console.log(`\n${dead.length} dead photograph(s):`);
    for (const d of dead) console.log(`  ${d.status}  ${d.url}\n       ${d.who.join(", ")}`);
  }
  await db.$disconnect();
  process.exit(dead.length ? 1 : 0);
}

main();
