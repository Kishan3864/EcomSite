/**
 * Set the drawn mark a department carries.
 *
 * The storefront no longer shows a photograph for a department; it shows a
 * drawn mark chosen by the `icon` string on the category row. A department
 * seeded before the marks existed can easily be carrying one that made sense
 * as a Lucide name and makes none as a department's face — "plug" on a
 * department of home appliances says "the wire you put in the wall".
 *
 * The same field is editable in the admin panel under Categories → Appearance.
 * This exists for the case where it is quicker to say it once on the server
 * than to click through, and so that the change is recorded in the history.
 *
 *   npx tsx scripts/category-icon.ts                       list every category
 *   npx tsx scripts/category-icon.ts home-appliance appliance
 *
 * The marks that are actually drawn are listed below. Anything else is
 * accepted — the storefront falls back to reading the department's name, and
 * failing that to an open carton — but a name from this list is the only way
 * to be certain of what appears.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DRAWN = [
  "appliance / washing-machine / washer / refrigerator / microwave",
  "kettle / coffee / cooking-pot / utensils / blender",
  "spray / spray-can / brush / broom",
  "home / house",
  "plug",
  "cpu",
  "shirt",
  "sofa",
  "chef-hat",
  "sparkles",
  "gem",
  "dumbbell",
  "book-open",
  "package",
];

async function main() {
  const [slug, icon] = process.argv.slice(2);

  if (!slug || !icon) {
    const categories = await prisma.category.findMany({
      select: { slug: true, name: true, icon: true },
      orderBy: { name: "asc" },
    });
    console.log("\nDepartments:\n");
    for (const c of categories) {
      console.log(`  ${c.slug.padEnd(24)} ${c.icon.padEnd(18)} ${c.name}`);
    }
    console.log("\nMarks that are drawn:\n");
    for (const d of DRAWN) console.log(`  ${d}`);
    console.log("\n  npx tsx scripts/category-icon.ts <slug> <icon>\n");
    return;
  }

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (!existing) {
    console.error(`No department with slug "${slug}". Run with no arguments to list them.`);
    process.exitCode = 1;
    return;
  }

  await prisma.category.update({ where: { slug }, data: { icon } });
  console.log(`${existing.name}: ${existing.icon} → ${icon}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
