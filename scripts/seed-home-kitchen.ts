/**
 * Five Home & Kitchen listings from Holiday Wholesale, as drafts.
 *
 *   npx tsx scripts/seed-home-kitchen.ts --dry-run   # say what would change; change nothing
 *   npx tsx scripts/seed-home-kitchen.ts             # add or update
 *   npx tsx scripts/seed-home-kitchen.ts --remove    # take them out (refuses an ordered product)
 *
 * What it owns, and the only rows it ever writes: the wholesaler
 * `holiday-wholesale`, the department `home-kitchen` with its four
 * collections, and the five products by SKU below with their photographs. The
 * brand `weekendcart` is shared with the rest of the shop's own stock — created
 * if missing, never updated.
 *
 * Idempotent, and careful about whose data it is. The first run creates
 * everything as drafts with stock 0 and the department inactive; the owner
 * sets stock, verifies HSN and GST against the supplier's tax invoice, checks
 * the printed MRP and publishes from the admin. A later run therefore updates
 * only the COPY — titles, descriptions, highlights, specifications, SEO text,
 * placement and photographs — and never touches status, stock, price, MRP,
 * cost, HSN, GST rate, weight, shipping flags or the department's active flag
 * once the row exists. Those are the owner's from the moment the row is
 * created.
 *
 * --dry-run prints every row it would create or update, field by field for
 * updates, and writes nothing. --remove deletes exactly what this file owns,
 * refuses to delete a product that has ever been ordered, and leaves the
 * department, its collections and the wholesaler alone while anything else
 * still points at them. --remove --dry-run says what it would delete.
 *
 * Every specification below comes from the supplier's page or its product
 * photographs. Where the page had no figure the row is simply absent rather
 * than guessed. The photographs are files under public/products/<slug>/,
 * committed to the repository and produced by tools/import-supplier-images.
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const dryRun = process.argv.includes("--dry-run");
const remove = process.argv.includes("--remove");

/* ------------------------------ Constants ------------------------------ */

const WARRANTY = "No manufacturer warranty. 7-day returns as per our Returns & Refunds policy.";
const RETURN_DAYS = 7;
const TAX_RATE = 18;

const BRAND = {
  slug: "weekendcart",
  name: "WeekendCart",
  logoText: "WEEKENDCART",
  tagline: "Everyday appliances, chosen and stocked by us",
  origin: "India",
};

/** Public contact details from the wholesaler's own site. The owner edits the rest in /admin/suppliers. */
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

const img = (slug: string, file: string) => `/products/${slug}/${slug}-${file}.webp`;

const CATEGORY = {
  slug: "home-kitchen",
  name: "Home & Kitchen",
  menuLabel: "Home & Kitchen",
  icon: "utensils",
  accent: "#2c837c",
  description:
    "Small tools and helpers for the kitchen and the home — choppers, trivets, lamps and everyday fixes, chosen and stocked by us.",
  imageUrl: img("multi-blade-vegetable-chopper-with-container", "01-main"),
  imageAlt: "Kitchen tools and small helpers for the home",
  highlights: ["7-day returns", "GST invoice on every order", "Stocked and dispatched by us"],
  defaultHsnCode: null as string | null,
  defaultTaxRate: TAX_RATE,
  sortOrder: 1,
};

const SUBCATEGORIES = [
  {
    slug: "kitchen-tools",
    name: "Kitchen tools",
    description: "Hand tools for daily prep — choppers, shredders and slicers that need no electricity.",
    imageUrl: img("double-blade-cabbage-chopper-knife", "01-main"),
    imageAlt: "Kitchen tools",
  },
  {
    slug: "small-kitchen-appliances",
    name: "Small kitchen appliances",
    description: "Compact electric helpers for small daily jobs, from mini choppers to USB-powered gadgets.",
    imageUrl: img("mini-electric-garlic-chopper-usb", "01-main"),
    imageAlt: "Small kitchen appliances",
  },
  {
    slug: "home-utility",
    name: "Home utility",
    description: "Practical things for around the house, from insect traps to everyday fixes.",
    imageUrl: img("3d-mosquito-killer-lamp-usb", "01-main"),
    imageAlt: "Home utility products",
  },
  {
    slug: "dining-serveware",
    name: "Dining & serveware",
    description: "Trivets, mats and serving helpers that keep the dining table tidy and unmarked.",
    imageUrl: img("square-bamboo-hot-pot-holder-trivet", "01-main"),
    imageAlt: "Dining and serveware",
  },
];

/* ------------------------------- Listings ------------------------------ */

interface SpecGroup {
  group: string;
  items: { label: string; value: string }[];
}

interface Listing {
  sku: string;
  slug: string;
  sub: string;
  title: string;
  headline: string;
  subtitle: string;
  description: string;
  highlights: string[];
  specs: SpecGroup[];
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  /** Approved selling price, whole rupees. MRP equals it until the printed MRP is verified. */
  price: number;
  /** What the shop pays per unit sold, whole rupees. Admin only. */
  cost: number;
  hsn: string;
  /** Packed weight for the courier booking, grams. Null leaves the schema default. */
  weightGrams: number | null;
  images: { file: string; alt: string }[];
}

const P1 = "Double Blade Cabbage Chopper Knife";
const P2 = "Multi-Blade Vegetable Chopper with Container";
const P3 = "Mini Electric Garlic Chopper (USB)";
const P4 = "3D Mosquito Killer Lamp (USB)";
const P5 = "Square Bamboo Hot Pot Holder (Pack of 4)";

const LISTINGS: Listing[] = [
  {
    sku: "HE-2638",
    slug: "double-blade-cabbage-chopper-knife",
    sub: "kitchen-tools",
    title: P1,
    headline: "Double Blade Cabbage Chopper Knife – Stainless Steel Vegetable Shredder (29 cm)",
    subtitle:
      "A hand-held double blade shredder that turns a whole cabbage into fine, even strips in minutes. No electricity, no setup.",
    description:
      "Cutting patta gobhi with a regular knife is slow, and the pieces never come out even. This cabbage chopper knife has two stainless steel blades set side by side, so every stroke gives thin, uniform shreds – ready for salad, coleslaw, sabzi, chowmein or momos filling.\n\n" +
      "It is light (about 153 g), fits in a kitchen drawer and needs no electricity. Keep the cabbage on a chopping board, hold the handle and slice downward. Works on cabbage, lettuce and other leafy vegetables.",
    highlights: [
      "Double stainless steel blades – two cuts in one stroke",
      "Thin, even shreds for salad, coleslaw, noodles and momos",
      "Light plastic handle with easy grip",
      "Manual – no electricity or assembly",
      "Slim 29 cm body, stores in a drawer",
    ],
    specs: [
      {
        group: "Specifications",
        items: [
          { label: "Material", value: "Plastic + stainless steel" },
          { label: "Size", value: "29 × 9 × 2 cm" },
          { label: "Weight", value: "Approx. 153 g" },
          { label: "Pack", value: "1 piece" },
        ],
      },
      {
        group: "Care",
        items: [
          { label: "Before first use", value: "Wash the blades" },
          { label: "Cleaning", value: "Rinse under running water and dry. No hot water, no dishwasher" },
          { label: "Safety", value: "Blades are sharp – keep away from children" },
        ],
      },
    ],
    tags: [
      "cabbage chopper knife",
      "cabbage cutter",
      "patta gobhi cutter",
      "cabbage shredder",
      "vegetable shredder knife",
      "double blade cabbage slicer",
      "cabbage cutter for momos",
      "stainless steel cabbage shredder for coleslaw",
    ],
    metaTitle: "Cabbage Chopper Knife – Double Blade Shredder | WeekendCart",
    metaDescription:
      "Shred patta gobhi in seconds with this double blade stainless steel cabbage chopper knife. Ideal for salad, coleslaw & momos. Buy online at WeekendCart.",
    price: 249,
    cost: 75,
    hsn: "8211",
    weightGrams: 255,
    images: [
      { file: "01-main", alt: "Double blade cabbage chopper knife with stainless steel blades" },
      { file: "02-detail", alt: `${P1} – shredder with red and black handle beside lettuce, tomato and cucumber` },
      { file: "03-closeup", alt: `${P1} – close-up of the handle and the twin blades from four angles` },
      { file: "04-use-case", alt: `${P1} – shredded cabbage, sliced lotus root and fish scaling shown as uses` },
      { file: "05-features", alt: `${P1} – red and black grip handle` },
      { file: "06-features", alt: `${P1} – serrated back edge used to scrape fish scales` },
      { file: "07-features", alt: `${P1} – the two parallel cutting edges` },
      { file: "08-size", alt: `${P1} – dimension diagram of the blade and handle` },
      { file: "09-in-use", alt: `${P1} – shredding lettuce over a bowl` },
    ],
  },
  {
    sku: "HE-2879",
    slug: "multi-blade-vegetable-chopper-with-container",
    sub: "kitchen-tools",
    title: P2,
    headline: "Multi-Blade Vegetable Chopper with Container – Manual Slicer, Dicer & Grater Set",
    subtitle:
      "One manual chopper set for daily chopping, slicing, dicing and grating. Cut vegetables go straight into the container.",
    description:
      "Daily sabzi prep means onion, tomato, potato, carrot, cucumber – and a lot of time on the chopping board. This chopper set replaces that with interchangeable blades: fix the blade you need, press or slide, and the pieces fall into the container below.\n\n" +
      "No electricity, less mess, even pieces. Useful for salad, sabzi, pav bhaji, poha, raita and tiffin prep.",
    highlights: [
      "Interchangeable blades for chopping, slicing, dicing and grating",
      "1.2 L container collects the cut vegetables – less mess",
      "Manual – no electricity needed",
      "Even-sized pieces for uniform cooking",
      "Blades detach for cleaning",
    ],
    specs: [
      {
        group: "Specifications",
        items: [
          { label: "Blades", value: "8 interchangeable stainless steel blade inserts" },
          { label: "Container", value: "1.2 L" },
          { label: "Set contents", value: "8 blade inserts, 1.2 L container, cutting lid, cleaning fork" },
          { label: "Material", value: "Stainless steel blades, food-grade plastic body" },
        ],
      },
      {
        group: "Care",
        items: [
          { label: "Handling", value: "Blades are sharp – handle with care" },
          { label: "Cleaning", value: "Wash and dry after every use" },
        ],
      },
    ],
    tags: [
      "multi blade vegetable chopper",
      "vegetable chopper with container",
      "multipurpose vegetable cutter",
      "onion chopper",
      "pyaz cutter manual",
      "vegetable slicer dicer grater",
      "sabji cutter with container",
      "manual food chopper",
    ],
    metaTitle: "Multi-Blade Vegetable Chopper with Container | WeekendCart",
    metaDescription:
      "Chop, slice, dice and grate with one multi-blade vegetable chopper. Interchangeable blades and a container that keeps the counter clean. Shop at WeekendCart.",
    price: 599,
    cost: 270,
    hsn: "3924",
    // The supplier lists no weight. Null leaves the schema default (1000 g)
    // for the courier booking until the owner weighs a packed one.
    weightGrams: null,
    images: [
      { file: "01-main", alt: "Multi-blade vegetable chopper with container and interchangeable blades" },
      { file: "02-features", alt: `${P2} – dicing an onion, with the egg separator and the small and large dicer inserts` },
      { file: "03-features", alt: `${P2} – grating a carrot, with the shredding and mashing inserts` },
      { file: "04-features", alt: `${P2} – slicing a potato, with the slicer and wavy-cut inserts` },
      { file: "05-use-case", alt: `${P2} – four steps: cut, fit the blade, press the lid, clean` },
      { file: "06-in-use", alt: `${P2} – in use on a kitchen counter` },
    ],
  },
  {
    sku: "HE-0556",
    slug: "mini-electric-garlic-chopper-usb",
    sub: "small-kitchen-appliances",
    title: P3,
    headline: "Mini Electric Garlic Chopper – USB Portable Food Chopper for Garlic, Ginger & Chilli (250 ml)",
    subtitle:
      "Press one button and get finely chopped garlic, ginger or chilli in seconds. Small enough for any kitchen shelf.",
    description:
      "Peeling and chopping lahsun-adrak every day is the most boring part of cooking. This mini electric chopper does it in a few seconds – add the ingredients, close the lid and press the button.\n\n" +
      "The compact bowl suits small daily quantities: garlic, ginger, green chilli, onion, coriander or nuts. It runs on USB power, so there is no bulky mixer jar to pull out and wash.",
    highlights: [
      "One-button electric chopping",
      "For garlic, ginger, chilli, onion, coriander and nuts",
      "USB rechargeable – charge from a laptop, adapter or power bank",
      "Compact 250 ml bowl for small daily quantities",
      "Cup and blade detach for a quick rinse",
    ],
    specs: [
      {
        group: "Specifications",
        items: [
          { label: "Capacity", value: "250 ml" },
          { label: "Power", value: "USB rechargeable. Cable included, adapter not included" },
          { label: "Material", value: "Plastic body, PC cup, 304 stainless steel blade" },
          { label: "Size", value: "13 × 10 × 10 cm" },
          { label: "Weight", value: "Approx. 231 g" },
          { label: "In the box", value: "Motor head, 250 ml cup, 2 blades, USB cable, user manual" },
        ],
      },
      {
        group: "Care",
        items: [
          { label: "Motor unit", value: "Do not wash – wipe with a dry cloth" },
          { label: "Safety", value: "Blade is sharp – handle with care" },
        ],
      },
    ],
    tags: [
      "electric garlic chopper",
      "mini chopper usb",
      "lahsun chopper",
      "ginger garlic chopper",
      "adrak lahsun chopper machine",
      "portable food chopper",
      "mini electric chopper",
      "small electric chopper for chilli and onion",
    ],
    metaTitle: "Mini Electric Garlic Chopper – USB Portable | WeekendCart",
    metaDescription:
      "Mini USB electric garlic chopper for garlic, ginger, chilli and onion. One-button chopping, compact size, easy to clean. Buy online at WeekendCart.",
    price: 399,
    cost: 135,
    hsn: "8215",
    weightGrams: 289,
    images: [
      { file: "01-main", alt: "Mini electric garlic chopper with USB power" },
      { file: "02-in-use", alt: `${P3} – beside bowls of chopped garlic, herbs and mince` },
      { file: "03-closeup", alt: `${P3} – the blade in the bowl with garlic and chilli, before and after chopping` },
      { file: "04-features", alt: `${P3} – USB charging port with the cable connected` },
      { file: "05-use-case", alt: `${P3} – adding garlic, chopping, and spooning it onto a dish` },
    ],
  },
  {
    sku: "HE-2471",
    slug: "3d-mosquito-killer-lamp-usb",
    sub: "home-utility",
    title: P4,
    headline: "3D Mosquito Killer Lamp – USB LED Insect Trap & Night Lamp for Home",
    subtitle:
      "A 3D-effect night lamp that also catches mosquitoes. UV light pulls them in – no coil, no spray, no smell.",
    description:
      "Coils and sprays fill the room with smoke and smell. This lamp takes a different route: its UV light attracts mosquitoes and small flying insects and catches them, while the 3D acrylic panel gives a soft decorative glow.\n\n" +
      "It runs on any USB source – adapter, power bank or laptop – and uses very little power. At 14 x 9 x 15 cm it sits easily on a bedside table or study desk. For best results, switch it on in a dark, closed room a little before bedtime.",
    highlights: [
      "2-in-1: 3D night lamp + mosquito and insect trap",
      "UV light attracts mosquitoes and small flying insects",
      "No spray, coil or smell",
      "USB powered, low power use",
      "Compact – 14 x 9 x 15 cm, approx. 200 g",
    ],
    specs: [
      {
        group: "Specifications",
        items: [
          { label: "Material", value: "Plastic" },
          { label: "Size", value: "14 × 9 × 15 cm" },
          { label: "Weight", value: "Approx. 200 g" },
          { label: "Power", value: "USB. Adapter not included" },
          { label: "Pack", value: "1 lamp" },
        ],
      },
      {
        group: "Care",
        items: [
          { label: "Cleaning", value: "Switch off and unplug before cleaning" },
          { label: "Keep away from", value: "Water" },
        ],
      },
    ],
    tags: [
      "mosquito killer lamp",
      "3d mosquito killer lamp",
      "usb mosquito trap",
      "insect killer lamp",
      "machhar marne ki machine",
      "led mosquito trap lamp",
      "mosquito killer lamp for bedroom",
      "machhar lamp for home",
    ],
    metaTitle: "3D Mosquito Killer Lamp USB – Insect Trap | WeekendCart",
    metaDescription:
      "USB 3D mosquito killer lamp that works as a night lamp and insect trap. UV light, no spray, no coil, no smell. For bedroom and office. Buy at WeekendCart.",
    price: 449,
    cost: 150,
    hsn: "8539",
    weightGrams: 230,
    images: [
      { file: "01-main", alt: "3D mosquito killer lamp with USB and LED night light" },
      { file: "02-in-use", alt: `${P4} – lit up, with the jellyfish 3D panel glowing purple` },
      { file: "03-features", alt: `${P4} – exploded view of the light, the fan and the catch tray` },
      { file: "04-detail", alt: `${P4} – the catch tray after use` },
      { file: "05-closeup", alt: `${P4} – white base with the clear acrylic panel fitted` },
      { file: "06-use-case", alt: `${P4} – on a desk beside books` },
    ],
  },
  {
    sku: "HE-2170",
    slug: "square-bamboo-hot-pot-holder-trivet",
    sub: "dining-serveware",
    title: P5,
    headline:
      "Square Bamboo Hot Pot Holder – Heat Resistant Wooden Trivet for Kitchen & Dining Table (16.5 cm)",
    subtitle:
      "Natural bamboo trivet that keeps hot kadhai, cooker and pans off your table. Slim, sturdy and easy to wipe clean.",
    description:
      "A hot kadhai or pressure cooker placed directly on the dining table leaves heat marks that never go away. This square bamboo pot holder sits between the hot vessel and the surface, so you can serve straight from the stove.\n\n" +
      "Each piece measures 16.5 x 16.5 cm and is just 0.5 cm thick, so a full set stacks flat in a drawer. The natural bamboo finish goes with any dining table and also works under kettles, casseroles and serving bowls. A practical pick for housewarming and festive gifting.",
    highlights: [
      "Natural bamboo, heat resistant",
      "Protects dining table and kitchen counter from heat marks",
      "16.5 x 16.5 x 0.5 cm – stacks flat",
      "For kadhai, cooker, pans, kettle, casserole and bowls",
      "Wipes clean with a damp cloth",
    ],
    specs: [
      {
        group: "Specifications",
        items: [
          { label: "Material", value: "Bamboo" },
          { label: "Size", value: "16.5 × 16.5 × 0.5 cm" },
          { label: "Weight", value: "Approx. 110 g per piece" },
          { label: "Pack", value: "4 pieces" },
        ],
      },
      {
        group: "Care",
        items: [
          { label: "Cleaning", value: "Wipe with a damp cloth and air dry" },
          { label: "Avoid", value: "Do not soak or put in a dishwasher" },
        ],
      },
    ],
    tags: [
      "bamboo hot pot holder",
      "bamboo trivet",
      "hot pot stand",
      "garam bartan stand",
      "wooden coaster for hot pan",
      "heat pad for dining table",
      "kadhai stand for dining table",
      "wooden hot plate mat set",
    ],
    metaTitle: "Bamboo Hot Pot Holder Trivet – Square | WeekendCart",
    metaDescription:
      "Square bamboo hot pot holder for hot pans, kadhai and cooker. Heat resistant, slim and easy to clean. Protects your dining table. Order at WeekendCart.",
    price: 449,
    cost: 156,
    hsn: "4419",
    // Four pieces at about 110 g plus packing. An estimate for the courier
    // booking, not a customer-facing figure; the owner corrects it on the scale.
    weightGrams: 500,
    images: [
      { file: "01-main", alt: "Square bamboo hot pot holder trivet on dining table" },
      { file: "02-in-use", alt: `${P5} – a steel pot resting on the trivet` },
      { file: "03-features", alt: `${P5} – front, back and edge views with the anti-slip pads` },
      { file: "04-closeup", alt: `${P5} – close-up of the woven centre and the 5 mm edge` },
      { file: "05-features", alt: `${P5} – front and back, and under a pan, a kadhai and a teapot` },
      { file: "06-use-case", alt: `${P5} – under a soup cup` },
      { file: "07-use-case", alt: `${P5} – under a plate` },
    ],
  },
];

/* ------------------------------- Helpers ------------------------------- */

const SKUS = LISTINGS.map((l) => l.sku);
const TAG = dryRun ? "[dry-run] " : "";
const log = (line: string) => console.log(`${TAG}${line}`);

const short = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 70 ? `${text.slice(0, 67)}…` : text;
};

/** Field-by-field difference between what a row holds and what the listing says. */
function diff<T extends Record<string, unknown>>(current: T, wanted: Partial<T>): string[] {
  const lines: string[] = [];
  for (const key of Object.keys(wanted) as (keyof T)[]) {
    const before = JSON.stringify(current[key] ?? null);
    const after = JSON.stringify(wanted[key] ?? null);
    if (before !== after) lines.push(`      ${String(key)}: ${short(current[key] ?? null)} → ${short(wanted[key] ?? null)}`);
  }
  return lines;
}

/** The copy: everything a later run is allowed to change on an existing product. */
function copyFields(l: Listing, categoryId: string, subcategoryId: string) {
  return {
    title: l.title,
    headline: l.headline,
    subtitle: l.subtitle,
    description: l.description,
    highlights: l.highlights,
    specifications: l.specs as unknown as Prisma.InputJsonValue,
    tags: l.tags.map((t) => t.toLowerCase()),
    metaTitle: l.metaTitle,
    metaDescription: l.metaDescription,
    warranty: WARRANTY,
    returnWindowDays: RETURN_DAYS,
    categoryId,
    subcategoryId,
  };
}

/** Everything else, written once on creation and then the owner's. */
function ownerFields(l: Listing, brandId: string, supplierId: string) {
  return {
    slug: l.slug,
    sku: l.sku,
    status: "DRAFT" as const,
    price: l.price,
    mrp: l.price,
    costPrice: l.cost,
    hsnCode: l.hsn,
    taxRate: TAX_RATE,
    uqc: "NOS",
    stock: 0,
    lowStockThreshold: 5,
    ...(l.weightGrams === null ? {} : { weightGrams: l.weightGrams }),
    badges: [],
    colors: [],
    deliveryDays: 5,
    codAvailable: false,
    freeShipping: false,
    publishedAt: null,
    brandId,
    supplierId,
  };
}

const imageRows = (l: Listing) =>
  l.images.map((image, i) => ({ url: img(l.slug, image.file), alt: image.alt, sortOrder: i }));

function checkFilesOnDisk() {
  const missing: string[] = [];
  for (const l of LISTINGS) {
    for (const image of l.images) {
      const url = img(l.slug, image.file);
      if (!existsSync(join(process.cwd(), "public", url))) missing.push(url);
    }
  }
  for (const s of SUBCATEGORIES) {
    if (!existsSync(join(process.cwd(), "public", s.imageUrl))) missing.push(s.imageUrl);
  }
  if (!existsSync(join(process.cwd(), "public", CATEGORY.imageUrl))) missing.push(CATEGORY.imageUrl);
  return missing;
}

/* --------------------------------- Seed -------------------------------- */

async function seed() {
  const missing = checkFilesOnDisk();
  if (missing.length > 0) {
    console.log(`\n  ${missing.length} photograph(s) are not under public/ on this machine:`);
    for (const m of missing) console.log(`    · ${m}`);
    console.log("  The rows would point at files the site cannot serve. Deploy the images first.\n");
    process.exit(1);
  }

  // Everything is read first so a dry run can describe the whole plan without
  // writing, and the real run writes the same plan inside one transaction.
  const [brand, supplier, category, existingProducts] = await Promise.all([
    db.brand.findUnique({ where: { slug: BRAND.slug }, select: { id: true } }),
    db.supplier.findUnique({ where: { slug: SUPPLIER.slug }, select: { id: true, name: true } }),
    db.category.findUnique({
      where: { slug: CATEGORY.slug },
      include: { subcategories: { select: { id: true, slug: true, name: true, description: true, imageUrl: true, imageAlt: true } } },
    }),
    db.product.findMany({
      where: { sku: { in: SKUS } },
      include: { images: { orderBy: { sortOrder: "asc" }, select: { url: true, alt: true, sortOrder: true } } },
    }),
  ]);

  console.log("");
  log(brand ? `brand ${BRAND.slug}: exists, left alone` : `brand ${BRAND.slug}: CREATE`);
  log(supplier ? `supplier ${SUPPLIER.slug}: exists as “${supplier.name}”, left alone` : `supplier ${SUPPLIER.slug}: CREATE (${SUPPLIER.name}, ${SUPPLIER.city})`);

  if (category) {
    const changes = diff(category as unknown as Record<string, unknown>, {
      name: CATEGORY.name,
      menuLabel: CATEGORY.menuLabel,
      description: CATEGORY.description,
      imageUrl: CATEGORY.imageUrl,
      imageAlt: CATEGORY.imageAlt,
      highlights: CATEGORY.highlights,
    });
    log(`category ${CATEGORY.slug}: exists (${category.isActive ? "ACTIVE" : "inactive"}, left as is)${changes.length ? ", UPDATE copy:" : ", copy unchanged"}`);
    for (const c of changes) console.log(c);
  } else {
    log(`category ${CATEGORY.slug}: CREATE “${CATEGORY.name}”, inactive until you publish`);
  }

  for (const s of SUBCATEGORIES) {
    const existing = category?.subcategories.find((x) => x.slug === s.slug);
    if (existing) {
      const changes = diff(existing as unknown as Record<string, unknown>, {
        name: s.name,
        description: s.description,
        imageUrl: s.imageUrl,
        imageAlt: s.imageAlt,
      });
      log(`  collection ${s.slug}: exists${changes.length ? ", UPDATE copy:" : ", unchanged"}`);
      for (const c of changes) console.log(c);
    } else {
      log(`  collection ${s.slug}: CREATE “${s.name}”`);
    }
  }

  for (const l of LISTINGS) {
    const existing = existingProducts.find((p) => p.sku === l.sku);
    if (!existing) {
      log(`product ${l.sku}: CREATE “${l.title}” — DRAFT, stock 0, ₹${l.price}, cost ₹${l.cost}, HSN ${l.hsn}, ${l.images.length} images`);
      continue;
    }
    const wantedCopy = copyFields(l, existing.categoryId, existing.subcategoryId);
    const changes = diff(existing as unknown as Record<string, unknown>, {
      ...wantedCopy,
      specifications: l.specs as unknown as string,
    });
    const wantedImages = imageRows(l);
    const imagesChanged = JSON.stringify(existing.images) !== JSON.stringify(wantedImages);
    log(
      `product ${l.sku}: exists as “${existing.title}” (${existing.status}, stock ${existing.stock}, ₹${existing.price} — all left alone)` +
        `${changes.length || imagesChanged ? ", UPDATE copy:" : ", copy unchanged"}`,
    );
    for (const c of changes) console.log(c);
    if (imagesChanged) console.log(`      images: ${existing.images.length} row(s) → ${wantedImages.length} row(s), rewritten in order`);
    if (existing.slug !== l.slug) console.log(`      (slug stays ${existing.slug}; the listing's ${l.slug} is used only on creation)`);
  }

  if (dryRun) {
    console.log("\n  Dry run: nothing was written.");
    return;
  }

  await db.$transaction(async (tx) => {
    const brandRow = brand ?? (await tx.brand.create({ data: BRAND, select: { id: true } }));
    const supplierRow = supplier ?? (await tx.supplier.create({ data: SUPPLIER, select: { id: true, name: true } }));

    const categoryRow = await tx.category.upsert({
      where: { slug: CATEGORY.slug },
      create: { ...CATEGORY, isActive: false },
      // Never isActive, never sortOrder: those are the owner's once the row exists.
      update: {
        name: CATEGORY.name,
        menuLabel: CATEGORY.menuLabel,
        description: CATEGORY.description,
        imageUrl: CATEGORY.imageUrl,
        imageAlt: CATEGORY.imageAlt,
        highlights: CATEGORY.highlights,
      },
      select: { id: true },
    });

    const subIds = new Map<string, string>();
    for (const [i, s] of SUBCATEGORIES.entries()) {
      const row = await tx.subcategory.upsert({
        where: { categoryId_slug: { categoryId: categoryRow.id, slug: s.slug } },
        create: { ...s, categoryId: categoryRow.id, sortOrder: i },
        update: { name: s.name, description: s.description, imageUrl: s.imageUrl, imageAlt: s.imageAlt },
        select: { id: true },
      });
      subIds.set(s.slug, row.id);
    }

    for (const l of LISTINGS) {
      const subcategoryId = subIds.get(l.sub)!;
      const copy = copyFields(l, categoryRow.id, subcategoryId);
      const product = await tx.product.upsert({
        where: { sku: l.sku },
        create: { ...ownerFields(l, brandRow.id, supplierRow.id), ...copy },
        update: copy,
        select: { id: true },
      });
      // Rewritten rather than appended, so a re-run never stacks duplicates.
      await tx.productImage.deleteMany({ where: { productId: product.id } });
      await tx.productImage.createMany({
        data: imageRows(l).map((row) => ({ productId: product.id, ...row })),
      });
    }
  });

  console.log(`\n  Done: ${LISTINGS.length} products, ${SUBCATEGORIES.length} collections, 1 department (inactive), 1 wholesaler.`);
}

/* -------------------------------- Remove ------------------------------- */

async function removeAll() {
  const products = await db.product.findMany({
    where: { sku: { in: SKUS } },
    select: { id: true, sku: true, title: true, _count: { select: { orderLines: true } } },
  });
  const deletable = products.filter((p) => p._count.orderLines === 0);
  const kept = products.filter((p) => p._count.orderLines > 0);
  const deletableIds = deletable.map((p) => p.id);

  console.log("");
  for (const p of deletable) log(`product ${p.sku}: DELETE “${p.title}” (with its images)`);
  for (const p of kept) log(`product ${p.sku}: KEPT — it has ${p._count.orderLines} order line(s); an invoice points at it`);
  for (const sku of SKUS.filter((s) => !products.some((p) => p.sku === s))) log(`product ${sku}: not there`);

  // "Others" everywhere below means products that are NOT being deleted by
  // this run. A collection, the department or the wholesaler goes only when
  // nothing else still points at it.
  const others = (where: Prisma.ProductWhereInput) =>
    db.product.count({ where: { ...where, id: { notIn: deletableIds } } });

  const category = await db.category.findUnique({
    where: { slug: CATEGORY.slug },
    select: { id: true, subcategories: { select: { id: true, slug: true } } },
  });
  const ownedSubs = (category?.subcategories ?? []).filter((s) => SUBCATEGORIES.some((x) => x.slug === s.slug));
  const unownedSubs = (category?.subcategories ?? []).filter((s) => !SUBCATEGORIES.some((x) => x.slug === s.slug));

  const subsToDelete: string[] = [];
  for (const s of ownedSubs) {
    const left = await others({ subcategoryId: s.id });
    if (left === 0) {
      subsToDelete.push(s.id);
      log(`collection ${s.slug}: DELETE`);
    } else {
      log(`collection ${s.slug}: KEPT — ${left} other product(s) still in it`);
    }
  }

  // The department cascades over every collection in it, so it goes only when
  // it holds nothing but this file's own empty collections.
  let deleteCategory = false;
  if (category) {
    const left = await others({ categoryId: category.id });
    deleteCategory = left === 0 && unownedSubs.length === 0;
    log(
      deleteCategory
        ? `category ${CATEGORY.slug}: DELETE`
        : `category ${CATEGORY.slug}: KEPT — ${left} other product(s) and ${unownedSubs.length} collection(s) not from this file`,
    );
  } else {
    log(`category ${CATEGORY.slug}: not there`);
  }

  const supplier = await db.supplier.findUnique({ where: { slug: SUPPLIER.slug }, select: { id: true } });
  let deleteSupplier = false;
  if (supplier) {
    const left = await others({ supplierId: supplier.id });
    deleteSupplier = left === 0;
    log(deleteSupplier ? `supplier ${SUPPLIER.slug}: DELETE` : `supplier ${SUPPLIER.slug}: KEPT — ${left} other product(s) bought from them`);
  } else {
    log(`supplier ${SUPPLIER.slug}: not there`);
  }

  if (dryRun) {
    console.log("\n  Dry run: nothing was deleted.");
    return;
  }

  await db.$transaction(async (tx) => {
    if (deletableIds.length > 0) await tx.product.deleteMany({ where: { id: { in: deletableIds } } });
    if (deleteCategory && category) {
      await tx.category.delete({ where: { id: category.id } }); // its collections cascade
    } else if (subsToDelete.length > 0) {
      await tx.subcategory.deleteMany({ where: { id: { in: subsToDelete } } });
    }
    if (deleteSupplier && supplier) await tx.supplier.delete({ where: { id: supplier.id } });
  });
  console.log(`\n  Removed ${deletableIds.length} product(s).${kept.length ? ` ${kept.length} kept because they have been ordered.` : ""}`);
}

/* ------------------------------- Reminder ------------------------------ */

function reminder() {
  console.log(`
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  BEFORE YOU PUBLISH ANY OF THESE FIVE                                    │
  │                                                                          │
  │  · HSN + GST: the codes stored are the supplier's site codes (8211,      │
  │    3924, 8215, 8539) and 4419 for the trivet, all at 18%. Check every    │
  │    one against the supplier's TAX INVOICE and correct it in /admin.      │
  │  · MRP: set equal to the selling price. Replace with the PRINTED MRP.    │
  │  · Cost price: your figures, to correct after the first supplier invoice │
  │  · Cabbage chopper: the supplier's own dimension photo says 32.5 cm and  │
  │    about 160 g, its data says 29 × 9 × 2 cm and 153 g. Measure one.      │
  │  · Multi-blade chopper: no size or weight from the supplier; courier     │
  │    weight is the 1000 g default. Weigh a packed one.                     │
  │  · Trivet pack: courier weight 500 g is an estimate. Weigh a packed one. │
  │  · Stock is 0 and the department is inactive until you switch them on.  │
  └──────────────────────────────────────────────────────────────────────────┘
`);
}

/* --------------------------------- Main -------------------------------- */

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  console.log(`\n  ${remove ? "Removing" : "Seeding"} Home & Kitchen${dryRun ? " — DRY RUN" : ""} against ${url.replace(/\/\/[^@]*@/, "//***@")}`);
  if (remove) await removeAll();
  else await seed();
  if (!remove) reminder();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
