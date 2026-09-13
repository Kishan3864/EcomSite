/**
 * Clears the demo catalogue out of a database so a real one can be built.
 *
 * The store shipped with a sample catalogue — eight departments, a few dozen
 * invented products, a demo customer with demo orders — so that the storefront
 * had something to render before there was anything to sell. None of it is
 * real, and it has to be gone before the first genuine product goes up.
 *
 * Deleted: products (with their images, variants, reviews, questions and stock
 * history), categories and their collections, brands, banners, offers, and
 * every customer with their orders, returns and addresses.
 *
 * Kept: admin logins, store settings, newsletter subscribers, contact messages
 * and the activity log. Nothing a real person has given you is touched.
 *
 * It is deliberately awkward to run:
 *
 *   npx tsx scripts/reset-store.ts             # dry run — counts only
 *   npx tsx scripts/reset-store.ts --yes       # actually deletes
 *
 * Take a database dump first. On the server, deploy/backup-db.sh does it.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run this from the app directory with a .env present.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const confirmed = process.argv.includes("--yes");

/** Shows which database is about to be emptied, without leaking the password. */
function describe(connectionString: string) {
  try {
    const u = new URL(connectionString);
    return `${u.pathname.replace(/^\//, "")} on ${u.hostname}:${u.port || 5432}`;
  } catch {
    return "the configured database";
  }
}

async function main() {
  const counts = {
    products: await db.product.count(),
    categories: await db.category.count(),
    subcategories: await db.subcategory.count(),
    brands: await db.brand.count(),
    banners: await db.banner.count(),
    offers: await db.offer.count(),
    reviews: await db.review.count(),
    questions: await db.question.count(),
    customers: await db.customer.count(),
    orders: await db.order.count(),
    returns: await db.returnRequest.count(),
  };

  const kept = {
    "admin logins": await db.adminUser.count(),
    "store settings": await db.storeSetting.count(),
    "newsletter subscribers": await db.newsletterSubscriber.count(),
    "contact messages": await db.contactMessage.count(),
  };

  console.log(`\nDatabase: ${describe(url!)}\n`);
  console.log("Will delete");
  for (const [name, n] of Object.entries(counts)) console.log(`  ${String(n).padStart(5)}  ${name}`);
  console.log("\nWill keep");
  for (const [name, n] of Object.entries(kept)) console.log(`  ${String(n).padStart(5)}  ${name}`);

  if (!confirmed) {
    console.log("\nDry run — nothing was deleted.");
    console.log("Take a backup, then re-run with --yes to go ahead.\n");
    return;
  }

  console.log("\nDeleting…");

  // Order matters. Orders go first because their lines point at products;
  // products before categories and brands, which they point at in turn.
  // Everything below those rows (images, variants, order events, returns,
  // payment attempts, addresses) is removed by the cascades in schema.prisma.
  const step = async (label: string, run: () => Promise<{ count: number }>) => {
    const { count } = await run();
    console.log(`  ${String(count).padStart(5)}  ${label}`);
  };

  await step("orders (with lines, events, returns, payments)", () => db.order.deleteMany());
  await step("products (with images, variants, reviews, Q&A, stock)", () => db.product.deleteMany());
  await step("banners", () => db.banner.deleteMany());
  await step("offers", () => db.offer.deleteMany());
  await step("categories (with their collections)", () => db.category.deleteMany());
  await step("brands", () => db.brand.deleteMany());
  await step("customers (with addresses and avatars)", () => db.customer.deleteMany());
  await step("one-time sign-in codes", () => db.phoneOtp.deleteMany());

  console.log("\nDone. The storefront now renders its opening layout.");
  console.log("Add a category, then a product, from /admin — the homepage fills itself in.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
