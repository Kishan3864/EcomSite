/**
 * Twenty Home & Kitchen listings from Holiday Wholesale, read from the "Top 20"
 * sheet of Holiday_HomeKitchen_Top20.xlsx in the repository root, as drafts.
 *
 *   npx tsx scripts/import-holiday.ts --dry-run   # the whole plan; writes and downloads nothing
 *   npx tsx scripts/import-holiday.ts             # create or update
 *   npx tsx scripts/import-holiday.ts --file=path/to/other.xlsx
 *
 * From each row: SKU; "SEO Title (Meesho)" → title; "Description (Meesho)" →
 * description; HSN; "Meesho Price (₹)" → price; "MRP (₹)" → MRP; packed weight
 * → courier weight; length × width × height → a Size line in the
 * specifications (a product has no dimension columns); supplier price → cost.
 * The sheet gives weight and supplier price per piece and a listing may be a
 * pack, so both are multiplied by "Pack Qty". A blank cell stays blank —
 * nothing is guessed — and the summary lists every one. Subtitle, highlights,
 * tags, SEO text and the GST rate are not in the sheet and are left empty.
 *
 * Photographs: every link in "All Image Links" is downloaded into our own
 * media store (MediaAsset, served from /api/media/…) and attached in the
 * sheet's order. Nothing points at holidaywholesale.in. A link that fails is
 * reported and left out; a later run retries only what is still missing.
 *
 * Idempotent by SKU, compared case-blind ("he-0233" is stored as HE-0233):
 *   · SKU not in the shop                → CREATE: DRAFT, stock 0, wholesaler Holiday Wholesale.
 *   · one of this import's own drafts    → UPDATE the copy (title, description, size,
 *     (DRAFT, Holiday Wholesale, never     collection) and fetch any photograph still missing.
 *     ordered)                             Price, MRP, cost, HSN, weight, status and stock are
 *                                          the owner's once the row exists — never rewritten.
 *   · any other product with that SKU    → SKIPPED, untouched.
 *   · same title under a different SKU   → SKIPPED as a likely duplicate.
 *
 * Created only when missing, never updated: the department `home-kitchen`
 * (inactive), the collections in COLLECTIONS (new ones inactive — switch each
 * on when you publish what is in it), the wholesaler `holiday-wholesale` and
 * the brand `weekendcart`, with the same values as scripts/seed-home-kitchen.ts.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateRawSync } from "node:zlib";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const dryRun = process.argv.includes("--dry-run");
const FILE = resolve(process.argv.find((a) => a.startsWith("--file="))?.slice(7) ?? "Holiday_HomeKitchen_Top20.xlsx");
const SHEET = "Top 20";

/** The sheet's own header text for every column this import reads. */
const COL = {
  sku: "SKU",
  title: "SEO Title (Meesho)",
  description: "Description (Meesho)",
  hsn: "HSN",
  price: "Meesho Price (₹)",
  mrp: "MRP (₹)",
  weight: "Packed Wt / pc (g)",
  length: "Length (cm)",
  width: "Width (cm)",
  height: "Height (cm)",
  cost: "Supplier Price / pc (₹)",
  pack: "Pack Qty (edit)",
  images: "All Image Links",
} as const;

/* ------------------------------ Placement ------------------------------ */

const COLLECTIONS = {
  "kitchen-tools": {
    name: "Kitchen tools",
    description: "Hand tools for daily prep — choppers, shredders and slicers that need no electricity.",
  },
  "dining-serveware": {
    name: "Dining & serveware",
    description: "Trivets, mats and serving helpers that keep the dining table tidy and unmarked.",
  },
  "home-utility": {
    name: "Home utility",
    description: "Practical things for around the house, from insect traps to everyday fixes.",
  },
  "cleaning-supplies": {
    name: "Cleaning supplies",
    description: "Brushes, mops, wipers and cloths for floors, tiles, fans and the corners a broom misses.",
  },
  "storage-organisers": {
    name: "Storage & organisers",
    description: "Bags, baskets, racks and holders that keep the wardrobe, kitchen and bathroom in order.",
  },
};
type CollectionSlug = keyof typeof COLLECTIONS;

/** SKU → collection inside Home & Kitchen. A SKU missing here is reported, not guessed. */
const PLACEMENT: Record<string, CollectionSlug> = {
  "HE-0488": "kitchen-tools", // wooden chopping board + knife set
  "HE-4745": "kitchen-tools", // silicone cooking utensils
  "HE-3119": "kitchen-tools", // 3 pcs knife set
  "HE-4537": "kitchen-tools", // hand press chopper
  "HE-0181": "kitchen-tools", // foldable chopping board with colander
  "HE-0233": "kitchen-tools", // pull chopper
  "HE-2037": "dining-serveware", // vacuum flask with cups
  "HE-2112": "home-utility", // foil kitchen sticker
  "HE-2434": "home-utility", // rangoli kit
  "HE-2982": "cleaning-supplies", // fan blade cleaner
  "HE-2616": "cleaning-supplies", // tile cleaning brush
  "HE-4657": "cleaning-supplies", // floor wiper
  "HE-2802": "cleaning-supplies", // grout gap brush
  "HE-4428": "cleaning-supplies", // microfiber cloth roll
  "HE-2426": "cleaning-supplies", // twist mop
  "HE-2491": "storage-organisers", // canvas storage box
  "HE-4604": "storage-organisers", // fridge vegetable bags
  "HE-2042": "storage-organisers", // under-bed blanket bag
  "HE-0477": "storage-organisers", // mop and broom holder
  "HE-0467": "storage-organisers", // bathroom corner shelf
};

/* ---------------- Shared rows (as in seed-home-kitchen.ts) ---------------- */

const WARRANTY = "No manufacturer warranty. 7-day returns as per our Returns & Refunds policy.";

const BRAND = {
  slug: "weekendcart",
  name: "WeekendCart",
  logoText: "WEEKENDCART",
  tagline: "Everyday appliances, chosen and stocked by us",
  origin: "India",
};

const SUPPLIER = {
  slug: "holiday-wholesale",
  name: "Holiday Wholesale",
  contactName: "Holiday Wholesale, Katargam branch",
  phone: "9825372217",
  email: "support@holidaywholesale.in",
  city: "Surat",
  notes:
    "https://holidaywholesale.in — Katargam, Surat. Prices on the site are wholesale; the printed MRP is not shown there. " +
    "HSN codes on the site are theirs and must be checked against their tax invoice.",
};

const CATEGORY = {
  slug: "home-kitchen",
  name: "Home & Kitchen",
  menuLabel: "Home & Kitchen",
  icon: "utensils",
  accent: "#2c837c",
  description:
    "Small tools and helpers for the kitchen and the home — choppers, trivets, lamps and everyday fixes, chosen and stocked by us.",
  imageUrl: "/products/multi-blade-vegetable-chopper-with-container/multi-blade-vegetable-chopper-with-container-01-main.webp",
  imageAlt: "Kitchen tools and small helpers for the home",
  highlights: ["7-day returns", "GST invoice on every order", "Stocked and dispatched by us"],
  defaultTaxRate: 18,
  sortOrder: 1,
};

/* ------------------------------ Reading xlsx ------------------------------ */

/** Every file inside a .xlsx (a zip), inflated. Sizes come from the central directory. */
function unzip(buf: Buffer) {
  let end = buf.length - 22;
  while (end >= 0 && buf.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error(`${FILE} is not an .xlsx file`);
  const files = new Map<string, Buffer>();
  let p = buf.readUInt32LE(end + 16);
  for (let n = buf.readUInt16LE(end + 10); n > 0; n--) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const skip = nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    if (method === 8) files.set(name, inflateRawSync(raw));
    else if (method === 0) files.set(name, raw);
    p += 46 + skip;
  }
  return files;
}

const unescapeXml = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const attr = (attrs: string, name: string) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1];

/** The text of a string item, joining rich-text runs and ignoring phonetic hints. */
const textOf = (xml: string) =>
  unescapeXml([...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));

const colIndex = (letters: string) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);

/** One sheet as { header text → cell text } per row, with the sheet's own row numbers. */
function readSheet(path: string, sheet: string) {
  const files = unzip(readFileSync(path));
  const xml = (name: string) => files.get(name)?.toString("utf8") ?? "";

  const shared = [...xml("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
  const sheets = [...xml("xl/workbook.xml").matchAll(/<sheet\b([^>]*)\/>/g)].map((m) => ({
    name: unescapeXml(attr(m[1], "name") ?? ""),
    rid: attr(m[1], "r:id"),
  }));
  const rid = sheets.find((s) => s.name === sheet)?.rid;
  if (!rid) throw new Error(`No sheet called "${sheet}" in ${path}. Sheets: ${sheets.map((s) => s.name).join(", ")}`);
  const rel = [...xml("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b([^>]*)\/>/g)].find((m) => attr(m[1], "Id") === rid);
  const target = attr(rel?.[1] ?? "", "Target") ?? "";
  const body = xml(target.startsWith("/") ? target.slice(1) : `xl/${target}`);

  const grid: { line: number; cells: Map<number, string> }[] = [];
  for (const row of body.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const cells = new Map<number, string>();
    let col = 0;
    for (const c of row[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(c[1], "r");
      col = ref ? colIndex(ref.replace(/\d+/g, "")) : col + 1;
      const inner = c[2] ?? "";
      const type = attr(c[1], "t");
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      const value =
        type === "s" ? shared[Number(v)] : type === "inlineStr" ? textOf(inner) : v === undefined ? "" : unescapeXml(v);
      if (value?.trim()) cells.set(col, value.trim());
    }
    if (cells.size > 0) grid.push({ line: Number(attr(row[1], "r")) || grid.length + 1, cells });
  }

  const [head, ...rest] = grid;
  const headers = new Map<string, number>();
  for (const [col, text] of head?.cells ?? []) headers.set(text.replace(/\s+/g, " "), col);
  return {
    headers,
    rows: rest.map((r) => ({
      line: r.line,
      get: (header: string) => r.cells.get(headers.get(header) ?? -1) ?? "",
    })),
  };
}

/* ------------------------------ Mapping rows ------------------------------ */

interface SpecGroup {
  group: string;
  items: { label: string; value: string }[];
}

interface Row {
  line: number;
  sku: string;
  sub: CollectionSlug;
  title: string;
  description: string;
  hsn: string | null;
  price: number;
  mrp: number;
  /** Per listing (pack × per-piece supplier price), whole rupees. Admin only. */
  cost: number | null;
  /** Per listing (pack × per-piece packed weight). Null leaves the schema default. */
  weightGrams: number | null;
  specs: SpecGroup[];
  links: string[];
  /** Sheet columns that were blank or unreadable for this row. */
  missing: string[];
}

/** Blank → null, unreadable → NaN. */
const num = (text: string) => (text === "" ? null : Number(text.replace(/[₹,\s]/g, "")));
const fmt = (n: number) => String(Math.round(n * 100) / 100);

function mapRow(get: (header: string) => string, line: number): { row: Row } | { problems: string[] } {
  const problems: string[] = [];
  const missing: string[] = [];

  const sku = get(COL.sku).toUpperCase();
  const title = get(COL.title).replace(/\s+/g, " ");
  if (!sku) problems.push(`no ${COL.sku}`);
  if (!title) problems.push(`no ${COL.title}`);

  const rupees = (header: string) => {
    const n = num(get(header));
    if (n === null) problems.push(`no ${header}`);
    else if (!Number.isInteger(n) || n <= 0) problems.push(`${header} "${get(header)}" is not a whole number of rupees`);
    else return n;
    return 0;
  };
  const price = rupees(COL.price);
  const mrp = rupees(COL.mrp);
  if (price && mrp && mrp < price) problems.push(`MRP ₹${mrp} is below the price ₹${price}`);

  const sub = PLACEMENT[sku];
  if (sku && !sub) problems.push("SKU is not in the collection mapping (PLACEMENT in this file)");

  /** A positive number from an optional column, or null with the column listed as missing. */
  const optional = (header: string) => {
    const n = num(get(header));
    if (n === null || Number.isNaN(n) || n <= 0) {
      missing.push(n === null ? header : `${header} (unreadable: "${get(header)}")`);
      return null;
    }
    return n;
  };

  const description = get(COL.description);
  if (!description) missing.push(COL.description);

  const hsnText = get(COL.hsn).replace(/\s+/g, "");
  const hsn = /^\d{4,8}$/.test(hsnText) ? hsnText : null;
  if (!hsn) missing.push(hsnText ? `${COL.hsn} (unreadable: "${hsnText}")` : COL.hsn);

  const pack = optional(COL.pack);
  if (pack !== null && !Number.isInteger(pack)) problems.push(`${COL.pack} "${pack}" is not a whole number`);
  const perPiecePrice = optional(COL.cost);
  const perPieceWeight = optional(COL.weight);
  const cost = pack !== null && perPiecePrice !== null ? Math.round(pack * perPiecePrice) : null;
  const weightGrams = pack !== null && perPieceWeight !== null ? Math.round(pack * perPieceWeight) : null;

  const dims = [
    ["Length", optional(COL.length)],
    ["Width", optional(COL.width)],
    ["Height", optional(COL.height)],
  ] as const;
  const each = pack !== null && pack > 1 ? " (each)" : "";
  const items = dims.every(([, n]) => n !== null)
    ? [{ label: `Size${each}`, value: `${dims.map(([, n]) => fmt(n!)).join(" × ")} cm` }]
    : dims.filter(([, n]) => n !== null).map(([label, n]) => ({ label: `${label}${each}`, value: `${fmt(n!)} cm` }));
  const specs = items.length ? [{ group: "Specifications", items }] : [];

  const links = [...new Set(get(COL.images).split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
  if (links.length === 0) missing.push(COL.images);

  if (problems.length) return { problems };
  return { row: { line, sku, sub, title, description, hsn, price, mrp, cost, weightGrams, specs, links, missing } };
}

/* ------------------------------ Photographs ------------------------------ */

/** Same limits and formats as an admin upload (src/lib/media.ts is server-only, so not importable here). */
const MEDIA_MAX_BYTES = 8_000_000;
const MEDIA_PREFIX = "/api/media/";

function sniffImage(bytes: Uint8Array) {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * The media row's file name records which sheet link it came from — that is
 * how a later run knows which photographs a product already has.
 */
function sourceName(sku: string, link: string) {
  let base = link.split("/").pop() ?? "image";
  try {
    base = decodeURIComponent(new URL(link).pathname.split("/").pop() ?? base);
  } catch {
    // keep the raw tail
  }
  return `${sku}-${base}`.replace(/[^\w.\- ]+/g, "").slice(0, 120);
}

type Download = { link: string; name: string; key: string; mime: string; bytes: Uint8Array<ArrayBuffer> } | { link: string; error: string };

async function download(sku: string, link: string): Promise<Download> {
  let url: URL;
  try {
    url = new URL(link);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    return { link, error: "not a web address" };
  }
  let error = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WeekendCart catalogue import)", Accept: "image/*" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        await res.body?.cancel();
        error = `HTTP ${res.status}`;
        if (res.status < 500) break;
        continue;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MEDIA_MAX_BYTES) return { link, error: `too large (${bytes.byteLength} bytes)` };
      const mime = sniffImage(bytes);
      if (!mime) return { link, error: "not a JPG, PNG or WebP" };
      return { link, name: sourceName(sku, link), key: randomBytes(18).toString("base64url"), mime, bytes };
    } catch (e) {
      const cause = (e as { cause?: { code?: string } }).cause?.code;
      error = e instanceof Error && e.name === "TimeoutError" ? "timed out after 30 s" : `${e instanceof Error ? e.message : e}${cause ? ` (${cause})` : ""}`;
    }
  }
  return { link, error };
}

/** Four at a time, results in the order given. */
async function downloadAll(sku: string, links: string[]) {
  const out: Download[] = new Array(links.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, links.length) }, async () => {
      while (next < links.length) {
        const i = next++;
        out[i] = await download(sku, links[i]);
      }
    }),
  );
  return out;
}

const altFor = (title: string, position: number) => (position === 0 ? title : `${title} – photo ${position + 1}`);

/* --------------------------------- Import -------------------------------- */

const TAG = dryRun ? "[dry-run] " : "";
const log = (line: string) => console.log(`${TAG}${line}`);
const short = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 70 ? `${text.slice(0, 67)}…` : text;
};

function slugBase(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return slug.length <= 60 ? slug : slug.slice(0, 60).replace(/-[^-]*$/, "");
}

async function run() {
  const sheet = readSheet(FILE, SHEET);
  const absent = Object.values(COL).filter((h) => !sheet.headers.has(h));
  if (absent.length) {
    console.log(`\n  STOPPED — the "${SHEET}" sheet has no column called: ${absent.map((h) => `"${h}"`).join(", ")}. Nothing was written.\n`);
    process.exit(1);
  }

  const rows: Row[] = [];
  const unmapped: { line: number; sku: string; problems: string[] }[] = [];
  for (const r of sheet.rows) {
    const result = mapRow(r.get, r.line);
    const sku = r.get(COL.sku).toUpperCase();
    if ("problems" in result) unmapped.push({ line: r.line, sku, problems: result.problems });
    else if (rows.some((x) => x.sku === sku)) unmapped.push({ line: r.line, sku, problems: ["SKU appears twice in the sheet"] });
    else rows.push(result.row);
  }

  const [brand, supplier, category] = await Promise.all([
    db.brand.findUnique({ where: { slug: BRAND.slug }, select: { id: true } }),
    db.supplier.findUnique({ where: { slug: SUPPLIER.slug }, select: { id: true, name: true } }),
    db.category.findUnique({
      where: { slug: CATEGORY.slug },
      select: { id: true, isActive: true, subcategories: { select: { id: true, slug: true } } },
    }),
  ]);
  const skuMatch = rows.map((r) => ({ sku: { equals: r.sku, mode: "insensitive" as const } }));
  const [existing, twins, taken] = rows.length
    ? await Promise.all([
        db.product.findMany({
          where: { OR: skuMatch },
          select: {
            id: true, sku: true, title: true, description: true, specifications: true, status: true,
            price: true, mrp: true, costPrice: true, hsnCode: true, weightGrams: true,
            supplierId: true, categoryId: true, subcategoryId: true,
            images: { orderBy: { sortOrder: "asc" }, select: { url: true, alt: true } },
            _count: { select: { orderLines: true } },
          },
        }),
        db.product.findMany({
          where: { OR: rows.map((r) => ({ title: { equals: r.title, mode: "insensitive" as const } })), NOT: { OR: skuMatch } },
          select: { sku: true, title: true, status: true },
        }),
        db.product.findMany({
          where: { OR: rows.map((r) => ({ slug: { startsWith: slugBase(r.title) } })) },
          select: { slug: true },
        }),
      ])
    : [[], [], []];

  // Which sheet link each existing photograph came from, for this import's own drafts.
  const keys = existing.flatMap((p) => p.images.map((i) => i.url)).filter((u) => u.startsWith(MEDIA_PREFIX)).map((u) => u.slice(MEDIA_PREFIX.length));
  const assets = keys.length
    ? await db.mediaAsset.findMany({ where: { key: { in: keys } }, select: { key: true, filename: true } })
    : [];
  const sourceOf = new Map(assets.map((a) => [`${MEDIA_PREFIX}${a.key}`, a.filename]));

  const collectionIds = new Map((category?.subcategories ?? []).map((s) => [s.slug, s.id]));
  const takenSlugs = new Set(taken.map((t) => t.slug));

  console.log("");
  log(brand ? `brand ${BRAND.slug}: exists, left alone` : `brand ${BRAND.slug}: CREATE`);
  log(supplier ? `wholesaler ${SUPPLIER.slug}: exists as “${supplier.name}”, left alone` : `wholesaler ${SUPPLIER.slug}: CREATE (${SUPPLIER.name})`);
  log(category ? `category ${CATEGORY.slug}: exists (${category.isActive ? "ACTIVE" : "inactive"}), left alone` : `category ${CATEGORY.slug}: CREATE, inactive`);
  for (const [slug, c] of Object.entries(COLLECTIONS)) {
    const skus = rows.filter((r) => r.sub === slug).map((r) => r.sku);
    if (skus.length === 0) continue;
    log(`  collection ${slug}${collectionIds.has(slug) ? "" : ` — CREATE “${c.name}”, inactive`}: ${skus.join(", ")}`);
  }
  console.log("");

  const stats = { created: 0, updated: 0, unchanged: 0, skipped: 0, imagesOk: 0, imagesToFetch: 0 };
  const skipped: string[] = [];
  const failedImages: string[] = [];

  let brandId = brand?.id;
  let supplierId = supplier?.id;
  let categoryId = category?.id;
  if (!dryRun && (!brandId || !supplierId || !categoryId)) {
    await db.$transaction(async (tx) => {
      brandId ??= (await tx.brand.create({ data: BRAND, select: { id: true } })).id;
      supplierId ??= (await tx.supplier.create({ data: SUPPLIER, select: { id: true } })).id;
      categoryId ??= (await tx.category.create({ data: { ...CATEGORY, isActive: false }, select: { id: true } })).id;
    });
  }

  /** The collection's id, creating it (inactive) inside the product's own transaction when missing. */
  const collection = async (tx: Prisma.TransactionClient, slug: CollectionSlug, imageUrl: string | undefined) => {
    const id = collectionIds.get(slug);
    if (id) return { id, created: false };
    const c = COLLECTIONS[slug];
    const row = await tx.subcategory.create({
      data: {
        slug,
        name: c.name,
        description: c.description,
        imageUrl: imageUrl ?? CATEGORY.imageUrl,
        imageAlt: c.name,
        isActive: false,
        sortOrder: Object.keys(COLLECTIONS).indexOf(slug),
        categoryId: categoryId!,
      },
      select: { id: true },
    });
    return { id: row.id, created: true };
  };

  const noteFailures = (sku: string, got: Download[]) => {
    for (const d of got) {
      if ("error" in d) failedImages.push(`${sku}  ${d.link}  — ${d.error}`);
      else stats.imagesOk++;
    }
  };

  for (const row of rows) {
    const head = `${row.sku} (row ${row.line})`;

    const twin = twins.find((t) => t.title.toLowerCase() === row.title.toLowerCase());
    if (twin) {
      stats.skipped++;
      skipped.push(`${head}: same title as existing product ${twin.sku} (${twin.status}) — likely a duplicate, left alone`);
      continue;
    }

    const found = existing.find((p) => p.sku.toUpperCase() === row.sku);

    /* ---- create ---- */
    if (!found) {
      let slug = slugBase(row.title);
      for (let n = 2; takenSlugs.has(slug); n++) slug = `${slugBase(row.title)}-${n}`;
      takenSlugs.add(slug);
      log(
        `${head}: CREATE “${short(row.title)}” → ${row.sub}, /${slug}\n` +
          `      DRAFT, stock 0, ₹${row.price} (MRP ₹${row.mrp}), cost ${row.cost === null ? "—" : `₹${row.cost}`}, ` +
          `HSN ${row.hsn ?? "—"}, weight ${row.weightGrams === null ? "— (1000 g default)" : `${row.weightGrams} g`}, ${row.links.length} photo(s)`,
      );
      if (dryRun) {
        stats.created++;
        stats.imagesToFetch += row.links.length;
        continue;
      }
      const got = await downloadAll(row.sku, row.links);
      noteFailures(row.sku, got);
      const ok = got.filter((d): d is Extract<Download, { key: string }> => "key" in d);
      const made = await db.$transaction(
        async (tx) => {
          const sub = await collection(tx, row.sub, ok[0] && `${MEDIA_PREFIX}${ok[0].key}`);
          if (ok.length) {
            await tx.mediaAsset.createMany({
              data: ok.map((d, i) => ({ key: d.key, filename: d.name, mime: d.mime, bytes: d.bytes.byteLength, data: d.bytes, alt: altFor(row.title, i) })),
            });
          }
          const product = await tx.product.create({
            data: {
              slug,
              sku: row.sku,
              title: row.title,
              subtitle: "",
              description: row.description,
              status: "DRAFT",
              price: row.price,
              mrp: row.mrp,
              costPrice: row.cost,
              hsnCode: row.hsn,
              taxRate: null,
              uqc: "NOS",
              stock: 0,
              lowStockThreshold: 5,
              ...(row.weightGrams === null ? {} : { weightGrams: row.weightGrams }),
              specifications: row.specs as unknown as Prisma.InputJsonValue,
              warranty: WARRANTY,
              returnWindowDays: 7,
              deliveryDays: 5,
              codAvailable: false,
              freeShipping: false,
              publishedAt: null,
              brandId: brandId!,
              supplierId: supplierId!,
              categoryId: categoryId!,
              subcategoryId: sub.id,
            },
            select: { id: true },
          });
          if (ok.length) {
            await tx.productImage.createMany({
              data: ok.map((d, i) => ({ productId: product.id, url: `${MEDIA_PREFIX}${d.key}`, alt: altFor(row.title, i), sortOrder: i })),
            });
          }
          return sub;
        },
        { maxWait: 20_000, timeout: 120_000 },
      );
      if (made.created) collectionIds.set(row.sub, made.id);
      stats.created++;
      console.log(`      done — ${ok.length}/${row.links.length} photo(s) stored`);
      continue;
    }

    /* ---- someone else's row ---- */
    const ours = found.status === "DRAFT" && found.supplierId === supplier?.id && found._count.orderLines === 0;
    if (!ours) {
      const why = [
        found.status !== "DRAFT" && `it is ${found.status}`,
        found.supplierId !== supplier?.id && "its wholesaler is not Holiday Wholesale",
        found._count.orderLines > 0 && `it has ${found._count.orderLines} order line(s)`,
      ].filter(Boolean);
      stats.skipped++;
      skipped.push(`${head}: exists as “${short(found.title)}” — ${why.join(", ")}; not this import's draft, left alone`);
      continue;
    }

    /* ---- this import's own draft: copy + missing photographs ---- */
    const subId = collectionIds.get(row.sub);
    const copy: Record<string, unknown> = {};
    if (found.title !== row.title) copy.title = row.title;
    if (found.description !== row.description) copy.description = row.description;
    if (JSON.stringify(found.specifications) !== JSON.stringify(row.specs)) copy.specifications = row.specs;
    if (found.categoryId !== categoryId || found.subcategoryId !== subId) copy.subcategory = row.sub;

    const have = new Map<string, { url: string; alt: string }>();
    for (const image of found.images) {
      const source = sourceOf.get(image.url);
      if (source) have.set(source, image);
    }
    const want = row.links.filter((l) => !have.has(sourceName(row.sku, l)));

    const notes = (
      [
        ["price", found.price, row.price],
        ["MRP", found.mrp, row.mrp],
        ["cost", found.costPrice, row.cost],
        ["HSN", found.hsnCode, row.hsn],
        ["weight", found.weightGrams, row.weightGrams],
      ] as const
    )
      .filter(([, now, sheetValue]) => sheetValue !== null && now !== sheetValue)
      .map(([label, now, sheetValue]) => `      note: sheet ${label} ${sheetValue}, row has ${now ?? "—"} — yours once created, left alone`);

    if (Object.keys(copy).length === 0 && want.length === 0) {
      stats.unchanged++;
      log(`${head}: exists as this import's draft, copy unchanged, all ${row.links.length} photo(s) present`);
      for (const n of notes) console.log(n);
      continue;
    }

    log(`${head}: UPDATE this import's draft (price, stock, status left alone)`);
    for (const [key, value] of Object.entries(copy)) {
      const before = key === "subcategory" ? "elsewhere" : (found as unknown as Record<string, unknown>)[key];
      console.log(`      ${key}: ${short(before)} → ${short(value)}`);
    }
    if (want.length) console.log(`      photos: ${want.length} of ${row.links.length} still missing — fetch`);
    for (const n of notes) console.log(n);
    stats.updated++;
    if (dryRun) {
      stats.imagesToFetch += want.length;
      continue;
    }

    const got = await downloadAll(row.sku, want);
    noteFailures(row.sku, got);
    const fetched = new Map(got.filter((d): d is Extract<Download, { key: string }> => "key" in d).map((d) => [d.link, d]));

    // Sheet photographs in the sheet's order, then anything the owner added by hand.
    const sheetNames = new Set(row.links.map((l) => sourceName(row.sku, l)));
    const ordered: { url: string; alt?: string }[] = [];
    for (const link of row.links) {
      const kept = have.get(sourceName(row.sku, link));
      const fresh = fetched.get(link);
      if (kept) ordered.push(kept);
      else if (fresh) ordered.push({ url: `${MEDIA_PREFIX}${fresh.key}` });
    }
    for (const image of found.images) {
      const source = sourceOf.get(image.url);
      if (!source || !sheetNames.has(source)) ordered.push(image);
    }

    const made = await db.$transaction(
      async (tx) => {
        const sub = await collection(tx, row.sub, ordered[0]?.url);
        if (fetched.size) {
          await tx.mediaAsset.createMany({
            data: [...fetched.values()].map((d) => ({ key: d.key, filename: d.name, mime: d.mime, bytes: d.bytes.byteLength, data: d.bytes, alt: row.title })),
          });
        }
        await tx.product.update({
          where: { id: found.id },
          data: {
            ...(copy.title !== undefined && { title: row.title }),
            ...(copy.description !== undefined && { description: row.description }),
            ...(copy.specifications !== undefined && { specifications: row.specs as unknown as Prisma.InputJsonValue }),
            ...(copy.subcategory !== undefined && { categoryId: categoryId!, subcategoryId: sub.id }),
          },
        });
        if (fetched.size) {
          await tx.productImage.deleteMany({ where: { productId: found.id } });
          await tx.productImage.createMany({
            data: ordered.map((image, i) => ({ productId: found.id, url: image.url, alt: image.alt ?? altFor(row.title, i), sortOrder: i })),
          });
        }
        return sub;
      },
      { maxWait: 20_000, timeout: 120_000 },
    );
    if (made.created) collectionIds.set(row.sub, made.id);
    console.log(`      done — ${fetched.size}/${want.length} missing photo(s) stored`);
  }

  /* ---- summary ---- */
  console.log(`\n  ${dryRun ? "DRY RUN — nothing was written or downloaded. " : ""}Summary`);
  console.log(`    created     ${stats.created}`);
  console.log(`    updated     ${stats.updated}`);
  console.log(`    unchanged   ${stats.unchanged}`);
  console.log(`    skipped     ${stats.skipped}`);
  for (const s of skipped) console.log(`      · ${s}`);
  if (dryRun) console.log(`    photos      ${stats.imagesToFetch} to download`);
  else console.log(`    photos      ${stats.imagesOk} ok, ${failedImages.length} failed`);
  for (const f of failedImages) console.log(`      · ${f}`);
  console.log(`    not mapped  ${unmapped.length}`);
  for (const u of unmapped) console.log(`      · row ${u.line} ${u.sku || "(no SKU)"}: ${u.problems.join("; ")}`);

  const gaps = rows.filter((r) => r.missing.length);
  console.log(`\n  Blank in the sheet, left empty (${gaps.length} product(s)):`);
  for (const r of gaps) console.log(`      · ${r.sku}: ${r.missing.join(", ")}`);
  console.log("  Not in the sheet at all, left empty on every product: subtitle, highlights, tags, meta title/description, GST rate.");
  console.log("  Cost and weight are the sheet's per-piece figures × Pack Qty. Everything is DRAFT, stock 0.\n");
  if (failedImages.length && !dryRun) console.log("  Run again to retry the failed photographs; only missing ones are fetched.\n");
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  console.log(`\n  Importing "${SHEET}" from ${FILE}${dryRun ? " — DRY RUN" : ""} against ${url.replace(/\/\/[^@]*@/, "//***@")}`);
  await run();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
