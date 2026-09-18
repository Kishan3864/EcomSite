/**
 * One-off, local-only: photographs and facts for the Home & Kitchen listings,
 * pulled from Holiday Wholesale's product pages.
 *
 *   node tools/import-supplier-images/index.mjs fetch
 *   node tools/import-supplier-images/index.mjs build
 *
 * Run from the repository root, on a machine with a browser. `fetch` opens
 * each supplier page in headless Chromium — the pages are a JavaScript shell,
 * and a plain GET returns a document with no images in it at all — waits for
 * the gallery, reads the gallery list and the product facts from the page's
 * own data call, downloads every gallery photograph at full size, and writes
 * them, the facts and one numbered contact sheet per product into ./work,
 * which is git-ignored. `build` reads ./labels.json — what each photograph
 * shows, decided by looking at the contact sheets — converts the originals to
 * WebP no wider than 1600px, never enlarged, and writes them into
 * public/products/<slug>/ under the names the seed script lists.
 *
 * Only the product's own gallery is taken. The description tab embeds
 * pictures hosted by another retailer and the page lists related products;
 * neither is ours to use, and anything not served from the supplier's own
 * host is skipped. A product whose gallery yields nothing gets an empty
 * folder and a line in the log, never a picture from anywhere else.
 *
 * This folder has its own package.json and node_modules so that Playwright
 * never enters the root package.json — the deploy installs nothing from here.
 * sharp is resolved from the root node_modules, where Next already needs it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const WORK = path.join(HERE, "work");
const HOST = "https://holidaywholesale.in";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36";

/** The listings, keyed by the supplier's SKU. The slug is ours. */
const PRODUCTS = [
  { sku: "HE-2638", slug: "double-blade-cabbage-chopper-knife" },
  { sku: "HE-2879", slug: "multi-blade-vegetable-chopper-with-container" },
  { sku: "HE-0556", slug: "mini-electric-garlic-chopper-usb" },
  { sku: "HE-2471", slug: "3d-mosquito-killer-lamp-usb" },
  { sku: "HE-2170", slug: "square-bamboo-hot-pot-holder-trivet" },
];

/** The words allowed after the number in a file name. */
const LABELS = new Set(["main", "in-use", "closeup", "size", "features", "use-case", "package", "detail"]);

const stripHtml = (html) =>
  String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

/* ------------------------------- fetch -------------------------------- */

async function fetchAll() {
  mkdirSync(WORK, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ userAgent: USER_AGENT, viewport: { width: 1400, height: 1000 } });
  const summary = {};

  for (const product of PRODUCTS) {
    const page = await context.newPage();
    let details = null;
    page.on("response", async (response) => {
      if (!response.url().includes("/api/web/get-product-details")) return;
      try {
        details = (await response.json()).data ?? null;
      } catch {
        details = null;
      }
    });

    await page.goto(`${HOST}/product-details/${product.sku}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector(".thumbnails-track img, .main-image-container img", { timeout: 30_000 }).catch(() => {});
    const thumbnailsOnPage = await page.$$eval(".thumbnails-track img", (imgs) => imgs.length);

    // The gallery, in the page's own order, and only from the supplier's host.
    const gallery = (details?.images ?? []).filter(
      (image) => image.type === "image" && typeof image.full_path === "string" && image.full_path.startsWith(`${HOST}/`),
    );

    const dir = path.join(WORK, product.sku);
    mkdirSync(dir, { recursive: true });
    const saved = [];
    for (const [i, image] of gallery.entries()) {
      const response = await page.request.get(image.full_path);
      if (!response.ok()) {
        console.log(`  ${product.sku} image ${i + 1}: HTTP ${response.status()} — skipped`);
        continue;
      }
      const buffer = await response.body();
      const meta = await sharp(buffer).metadata();
      const ext = path.extname(new URL(image.full_path).pathname).toLowerCase() || ".jpg";
      const file = `${String(i + 1).padStart(2, "0")}${ext}`;
      writeFileSync(path.join(dir, file), buffer);
      saved.push({ index: i + 1, source: image.full_path, file, width: meta.width, height: meta.height, bytes: buffer.length });
    }

    const facts = details
      ? {
          sku: details.SKU,
          supplierTitle: details.title,
          hsn: details.HSN,
          weightGrams: details.weight,
          shippingWeightGrams: details.shipping_weight,
          dimensions: details.dimensions,
          regularPrice: details.regular_price,
          salePrice: details.sale_price,
          minSalePrice: details.min_sale_price,
          descriptionText: stripHtml(details.description),
        }
      : { error: "the page never answered its product-details call" };
    writeFileSync(path.join(dir, "facts.json"), JSON.stringify({ ...facts, images: saved }, null, 2));
    await contactSheet(dir, saved);

    console.log(`${product.sku} → ${product.slug}: ${saved.length} images downloaded (${thumbnailsOnPage} thumbnails on the page)`);
    summary[product.sku] = saved.length;
    await page.close();
  }

  await browser.close();
  writeFileSync(path.join(WORK, "summary.json"), JSON.stringify(summary, null, 2));
}

/** One numbered grid per product, so the labels can be chosen by looking. */
async function contactSheet(dir, saved) {
  if (saved.length === 0) return;
  const TILE = 360;
  const COLS = 3;
  const rows = Math.ceil(saved.length / COLS);
  const tiles = [];
  for (const [i, image] of saved.entries()) {
    const picture = await sharp(readFileSync(path.join(dir, image.file)))
      .rotate()
      .resize(TILE, TILE, { fit: "contain", background: "#ffffff" })
      .png()
      .toBuffer();
    const badge = Buffer.from(
      `<svg width="${TILE}" height="${TILE}"><rect x="0" y="0" width="70" height="34" fill="#000" fill-opacity="0.75"/>` +
        `<text x="10" y="25" font-size="22" font-family="Arial, sans-serif" font-weight="bold" fill="#fff">${image.index}</text></svg>`,
    );
    const tile = await sharp(picture).composite([{ input: badge, top: 0, left: 0 }]).png().toBuffer();
    tiles.push({ input: tile, left: (i % COLS) * TILE, top: Math.floor(i / COLS) * TILE });
  }
  await sharp({ create: { width: COLS * TILE, height: rows * TILE, channels: 3, background: "#ffffff" } })
    .composite(tiles)
    .jpeg({ quality: 82 })
    .toFile(path.join(dir, "contact-sheet.jpg"));
}

/* ------------------------------- build -------------------------------- */

async function buildAll() {
  const labelsPath = path.join(HERE, "labels.json");
  if (!existsSync(labelsPath)) throw new Error("labels.json is missing — look at the contact sheets in ./work and write it first.");
  const labels = JSON.parse(readFileSync(labelsPath, "utf8"));

  for (const product of PRODUCTS) {
    const dir = path.join(WORK, product.sku);
    const factsPath = path.join(dir, "facts.json");
    const facts = existsSync(factsPath) ? JSON.parse(readFileSync(factsPath, "utf8")) : { images: [] };
    const out = path.join(ROOT, "public", "products", product.slug);
    mkdirSync(out, { recursive: true });

    if (facts.images.length === 0) {
      console.log(`${product.sku} → public/products/${product.slug}: nothing fetched, folder left empty`);
      continue;
    }

    const chosen = labels[product.sku];
    if (!Array.isArray(chosen) || chosen.length !== facts.images.length) {
      throw new Error(`labels.json: ${product.sku} needs exactly ${facts.images.length} entries, one per fetched image`);
    }

    let n = 0;
    for (const [i, image] of facts.images.entries()) {
      const label = chosen[i];
      if (label === "skip") continue;
      if (!LABELS.has(label)) throw new Error(`labels.json: ${product.sku} image ${i + 1} has unknown label "${label}"`);
      n += 1;
      const name = `${product.slug}-${String(n).padStart(2, "0")}-${label}.webp`;
      const target = path.join(out, name);
      await sharp(readFileSync(path.join(dir, image.file)))
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(target);
      const meta = await sharp(target).metadata();
      console.log(`  ${name}  ${meta.width}x${meta.height}  from ${image.width}x${image.height}`);
    }
    console.log(`${product.sku} → public/products/${product.slug}: ${n} files`);
  }
}

/* -------------------------------- main -------------------------------- */

const command = process.argv[2];
if (command === "fetch") await fetchAll();
else if (command === "build") await buildAll();
else {
  console.log("Usage: node tools/import-supplier-images/index.mjs fetch | build");
  process.exit(1);
}
