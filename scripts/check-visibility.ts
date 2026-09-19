/**
 * Proves that hiding is complete and cascading.
 *
 *   npx tsx --conditions=react-server scripts/check-visibility.ts          # static only
 *   npx tsx --conditions=react-server scripts/check-visibility.ts --db     # + local database
 *
 * STATIC, always: every storefront read of products must carry
 * visibleProducts(). It walks src/ outside the admin, finds each
 * `.product.find…/count/aggregate/groupBy(` call, and fails if the call's
 * arguments do not mention the filter or if the file is not one of the few
 * allowed to query products at all. The ESLint rule says the same thing at
 * edit time; this says it with the file and line, and can gate a deploy.
 *
 * --db, LOCAL ONLY: hides one category, then separately one collection whose
 * category stays active, and asks the storefront's own read functions whether
 * anything inside is still reachable — the product by slug, /products, search,
 * every home block, related products, the sitemap's slug list, the instant
 * search index, the cart availability check and the exact query placeOrder
 * re-prices a bag with. It restores both flags in a finally block, and it
 * refuses to run against anything but a local database.
 */
import "dotenv/config";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ok = (s: string) => console.log(`\x1b[32m✓\x1b[0m ${s}`);
const bad = (s: string) => console.log(`\x1b[31m✗\x1b[0m ${s}`);
let failures = 0;
const expect = (condition: boolean, label: string) => {
  if (condition) ok(label);
  else {
    bad(label);
    failures += 1;
  }
};

/* ------------------------------- static ------------------------------- */

const ROOT = process.cwd();
const ALLOWED = new Set(
  [
    "src/services/catalog.ts",
    "src/services/search-docs.ts",
    "src/services/commerce.ts",
    "src/services/cart-availability.ts",
  ].map((p) => p.split("/").join(sep)),
);
const EXEMPT = ["src/app/admin", "src/services/admin", "src/generated"].map((p) => p.split("/").join(sep));

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(name)) yield full;
  }
}

/** The text of a call's argument list, from its opening paren to the matching close. */
function argsFrom(source: string, open: number) {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "(") depth += 1;
    else if (source[i] === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return source.slice(open);
}

function staticCheck() {
  console.log("\nStatic: every storefront product read goes through visibleProducts()");
  const READ = /\.product\.(find\w*|count|aggregate|groupBy)\s*\(/g;
  let reads = 0;
  for (const file of walk(join(ROOT, "src"))) {
    const rel = relative(ROOT, file);
    if (EXEMPT.some((e) => rel.startsWith(e))) continue;
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(READ)) {
      reads += 1;
      const line = source.slice(0, match.index).split("\n").length;
      const where = `${rel.split(sep).join("/")}:${line}`;
      if (!ALLOWED.has(rel)) {
        expect(false, `${where} queries products outside the allowed files`);
        continue;
      }
      const args = argsFrom(source, (match.index ?? 0) + match[0].length - 1);
      expect(args.includes("visibleProducts("), `${where} ${match[1]} goes through visibleProducts()`);
    }
  }
  expect(reads > 0, `found ${reads} storefront product reads to check`);
}

/* --------------------------------- db --------------------------------- */

async function dbCheck() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.log("\nRefusing --db: DATABASE_URL is not a local database.");
    process.exit(1);
  }
  const { db } = await import("@/lib/db");
  const catalog = await import("@/services/catalog");
  const { getSearchDocs } = await import("@/services/search-docs");
  const { unavailableProductIds } = await import("@/services/cart-availability");
  const { visibleProducts } = await import("@/services/visibility");

  // A visible product to aim at, the best seller, so every block can show it.
  const target = await db.product.findFirst({
    where: visibleProducts(),
    select: {
      id: true,
      slug: true,
      title: true,
      categoryId: true,
      subcategoryId: true,
      category: { select: { slug: true } },
      subcategory: { select: { slug: true } },
    },
    orderBy: { soldCount: "desc" },
  });
  if (!target) {
    console.log("\nNo visible product in the local database to test with.");
    process.exit(1);
  }

  async function reachable() {
    const listing = await catalog.searchProducts({ page: 1, perPage: 500 } as never);
    const search = await catalog.searchProducts({ q: target!.title.split(" ")[0], page: 1, perPage: 500 } as never);
    const category = await catalog.searchProducts({ category: target!.category.slug, page: 1, perPage: 500 } as never);
    const docs = await getSearchDocs();
    return {
      "product by slug, so /p/<slug> renders with its JSON-LD": (await catalog.getProduct(target!.slug)) !== null,
      "getProductsByIds: related, bundle, recently viewed": (await catalog.getProductsByIds([target!.id])).length > 0,
      "/products listing": listing.items.some((p) => p.id === target!.id),
      "/search results": search.items.some((p) => p.id === target!.id),
      "category listing query": category.items.some((p) => p.id === target!.id),
      "home block: category top": (await catalog.getCategoryTop(target!.category.slug, 500)).some((p) => p.id === target!.id),
      "home block: bestsellers": (await catalog.getBestsellers(500)).some((p) => p.id === target!.id),
      "sitemap product slugs": (await catalog.getAllProductSlugs()).includes(target!.slug),
      "instant-search index": JSON.stringify(docs).includes(target!.slug),
      "cart availability says buyable": !(await unavailableProductIds([target!.id])).includes(target!.id),
      "placeOrder's re-pricing query finds it": (await db.product.count({ where: visibleProducts({ id: { in: [target!.id] } }) })) > 0,
    };
  }

  const report = (title: string, state: Record<string, boolean>, wantVisible: boolean) => {
    console.log(`\n${title}`);
    for (const [label, seen] of Object.entries(state)) {
      expect(seen === wantVisible, `${wantVisible ? "visible" : "gone"}: ${label}`);
    }
  };

  console.log(`\nDatabase: target “${target.title}” in ${target.category.slug}/${target.subcategory.slug}`);
  report("Baseline, everything active", await reachable(), true);

  try {
    await db.category.update({ where: { id: target.categoryId }, data: { isActive: false } });
    report(`Category ${target.category.slug} HIDDEN`, await reachable(), false);
    const paths = await catalog.getAllCategoryPaths();
    expect(!paths.some((p) => p.category === target.category.slug), "gone: the category and its collections from sitemap paths and /c/ params");
    expect((await catalog.getCategory(target.category.slug)) === null, "gone: /c/<category>, getCategory is null so the page 404s");
  } finally {
    await db.category.update({ where: { id: target.categoryId }, data: { isActive: true } });
  }

  try {
    await db.subcategory.update({ where: { id: target.subcategoryId }, data: { isActive: false } });
    report(`Collection ${target.subcategory.slug} HIDDEN while category ${target.category.slug} stays ACTIVE`, await reachable(), false);
    expect((await catalog.getCategory(target.category.slug)) !== null, "still there: the parent category itself");
    expect((await catalog.getSubcategory(target.category.slug, target.subcategory.slug)) === null, "gone: /c/<category>/<collection>, the page 404s");
    const paths = await catalog.getAllCategoryPaths();
    expect(
      !paths.some((p) => "subcategory" in p && p.subcategory === target.subcategory.slug && p.category === target.category.slug),
      "gone: the collection from sitemap paths",
    );
  } finally {
    await db.subcategory.update({ where: { id: target.subcategoryId }, data: { isActive: true } });
  }

  report("Restored, everything active again", await reachable(), true);
  await db.$disconnect();
}

async function main() {
  staticCheck();
  if (process.argv.includes("--db")) await dbCheck();
  console.log(failures === 0 ? "\nAll visibility checks passed.\n" : `\n${failures} visibility check(s) FAILED.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
