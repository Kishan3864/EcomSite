/**
 * Puts one department and five listings into the shop, to start it off.
 *
 *   npx tsx scripts/seed-home-appliance.ts            # add or update
 *   npx tsx scripts/seed-home-appliance.ts --remove   # take them out again
 *
 * READ THIS BEFORE YOU SELL ANYTHING FROM IT.
 *
 * The five products are real kinds of appliance with plausible specifications,
 * but the prices, the stock figures, the warranty terms and the HSN codes are
 * mine, not yours. They are a starting shape for the shop — something for the
 * homepage, the category page and the product page to be judged on — not a
 * catalogue. Open each one in /admin, put your own photographs and your own
 * prices in, and check the HSN against the purchase invoice from your supplier
 * before a customer can buy it.
 *
 * The photographs are stock images from Unsplash, which the site already allows
 * (see images.remotePatterns in next.config.ts). Replace them with pictures of
 * the actual goods: the Upload button on the product form takes a file from
 * your phone or computer.
 *
 * Idempotent: every row is upserted on its slug, so running it twice changes
 * nothing. --remove deletes exactly what it created and nothing else.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { POOL, img } from "../src/data/images";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const remove = process.argv.includes("--remove");

const BRAND = {
  slug: "weekendcart",
  name: "WeekendCart",
  logoText: "WEEKENDCART",
  tagline: "Everyday appliances, chosen and stocked by us",
  origin: "India",
};

const CATEGORY = {
  slug: "home-appliance",
  name: "Home & Appliance",
  menuLabel: "Home & Appliance",
  icon: "plug",
  accent: "#426b58",
  description:
    "Appliances for the kitchen and the rest of the house — bought, stocked and invoiced by us, with the warranty handled here rather than sent somewhere else.",
  imageUrl: img(POOL.kitchen[0], { fit: "wide", w: 1400 }),
  imageAlt: "Home and kitchen appliances",
  highlights: [
    "Free delivery over ₹999",
    "7-day returns",
    "Warranty handled by us",
    "GST invoice on every order",
  ],
  defaultHsnCode: "8516",
  defaultTaxRate: 18,
};

const SUBCATEGORIES = [
  {
    slug: "kitchen-appliances",
    name: "Kitchen appliances",
    description: "Mixers, kettles and cooktops — the machines that do the work in a kitchen.",
    imageUrl: img(POOL.kitchen[1], { fit: "wide", w: 1200 }),
    imageAlt: "Kitchen appliances",
  },
  {
    slug: "home-care",
    name: "Home care",
    description: "Irons, vacuum cleaners and everything else that keeps a house in order.",
    imageUrl: img(POOL.decor[2], { fit: "wide", w: 1200 }),
    imageAlt: "Home care appliances",
  },
];

interface Seed {
  slug: string;
  sku: string;
  sub: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  mrp: number;
  stock: number;
  hsn: string;
  images: [string, string];
  highlights: string[];
  specs: { group: string; items: { label: string; value: string }[] }[];
  warranty: string;
  deliveryDays: number;
  tags: string[];
}

const PRODUCTS: Seed[] = [
  {
    slug: "mixer-grinder-750w-3-jar",
    sku: "WKC-HOM-0001",
    sub: "kitchen-appliances",
    title: "Mixer Grinder 750W, 3 jars",
    subtitle: "Wet grinding, dry grinding and chutney, on one motor",
    description:
      "A 750-watt mixer grinder with three stainless steel jars: a 1.5 litre wet jar for batter and gravy, a 1 litre dry jar for masala and coffee, and a 400 ml chutney jar. Three speeds and a pulse setting, with an overload cut-out that stops the motor before it burns out. The jars and blades are dishwasher safe; the base is not.",
    price: 2499,
    mrp: 3499,
    stock: 24,
    hsn: "8509",
    images: [img(POOL.kitchen[2]), img(POOL.kitchen[3])],
    highlights: [
      "750W copper-wound motor",
      "3 stainless steel jars (1.5L, 1L, 400ml)",
      "3 speeds with pulse",
      "Overload protection",
    ],
    specs: [
      {
        group: "Motor",
        items: [
          { label: "Power", value: "750 W" },
          { label: "Speeds", value: "3 + pulse" },
          { label: "Voltage", value: "230 V, 50 Hz" },
        ],
      },
      {
        group: "In the box",
        items: [
          { label: "Jars", value: "Wet 1.5L, dry 1L, chutney 400ml" },
          { label: "Also included", value: "Spatula, user manual, warranty card" },
        ],
      },
    ],
    warranty: "2 years on the product, 5 years on the motor",
    deliveryDays: 3,
    tags: ["mixer", "grinder", "kitchen", "blender"],
  },
  {
    slug: "electric-kettle-1-5l-stainless",
    sku: "WKC-HOM-0002",
    sub: "kitchen-appliances",
    title: "Electric Kettle 1.5L, stainless steel",
    subtitle: "Boils in under five minutes and switches itself off",
    description:
      "A 1500-watt kettle with a stainless steel body and a concealed heating element, so there is nothing inside for scale to cling to. It switches itself off when the water boils and again if it is ever switched on empty. The lid opens with one hand and the base is cordless, so it lifts off in any direction.",
    price: 1199,
    mrp: 1799,
    stock: 40,
    hsn: "8516",
    images: [img(POOL.kitchen[4]), img(POOL.kitchen[5])],
    highlights: [
      "1.5 litre, 1500W",
      "Auto shut-off and boil-dry protection",
      "Concealed element — easy to clean",
      "360° cordless base",
    ],
    specs: [
      {
        group: "Capacity and power",
        items: [
          { label: "Capacity", value: "1.5 litres" },
          { label: "Power", value: "1500 W" },
          { label: "Body", value: "Stainless steel" },
        ],
      },
      {
        group: "Safety",
        items: [
          { label: "Auto shut-off", value: "Yes, on boil" },
          { label: "Boil-dry protection", value: "Yes" },
        ],
      },
    ],
    warranty: "1 year against manufacturing defects",
    deliveryDays: 3,
    tags: ["kettle", "electric kettle", "kitchen", "tea"],
  },
  {
    slug: "induction-cooktop-2000w",
    sku: "WKC-HOM-0003",
    sub: "kitchen-appliances",
    title: "Induction Cooktop 2000W",
    subtitle: "Eight preset modes and a glass top that wipes clean",
    description:
      "A 2000-watt induction cooktop with a crystal glass top and touch controls. Eight presets cover the everyday — milk, roti, curry, deep fry, sauté, pressure cook, slow cook and manual — and power and temperature can be set by hand as well. A timer switches it off on its own. Works with induction-ready flat-bottomed steel and iron cookware.",
    price: 2299,
    mrp: 3299,
    stock: 18,
    hsn: "8516",
    images: [img(POOL.kitchen[1]), img(POOL.kitchen[0])],
    highlights: [
      "2000W with 8 preset modes",
      "Crystal glass touch panel",
      "Auto switch-off timer",
      "Works with steel and iron cookware",
    ],
    specs: [
      {
        group: "Power",
        items: [
          { label: "Rated power", value: "2000 W" },
          { label: "Voltage", value: "230 V, 50 Hz" },
          { label: "Presets", value: "8" },
        ],
      },
      {
        group: "Cookware",
        items: [
          { label: "Works with", value: "Flat-bottomed steel and iron" },
          { label: "Does not work with", value: "Aluminium, copper, glass, clay" },
        ],
      },
    ],
    warranty: "1 year against manufacturing defects",
    deliveryDays: 4,
    tags: ["induction", "cooktop", "kitchen", "stove"],
  },
  {
    slug: "steam-iron-1600w-ceramic",
    sku: "WKC-HOM-0004",
    sub: "home-care",
    title: "Steam Iron 1600W, ceramic soleplate",
    subtitle: "Steam burst, spray and a plate that glides",
    description:
      "A 1600-watt steam iron with a ceramic-coated soleplate that slides over cotton without catching. Continuous steam for everyday creases, a burst for the stubborn ones, and a spray for linen. The tank holds 200 ml and the dial covers everything from synthetics to cotton. Self-cleaning, and it drips nothing while it heats.",
    price: 1499,
    mrp: 2199,
    stock: 30,
    hsn: "8516",
    images: [img(POOL.decor[0]), img(POOL.decor[1])],
    highlights: [
      "1600W with ceramic soleplate",
      "Steam burst and spray",
      "200 ml water tank",
      "Self-clean and anti-drip",
    ],
    specs: [
      {
        group: "Power and steam",
        items: [
          { label: "Power", value: "1600 W" },
          { label: "Water tank", value: "200 ml" },
          { label: "Soleplate", value: "Ceramic coated" },
        ],
      },
      {
        group: "Features",
        items: [
          { label: "Steam burst", value: "Yes" },
          { label: "Spray", value: "Yes" },
          { label: "Self-clean", value: "Yes" },
        ],
      },
    ],
    warranty: "2 years against manufacturing defects",
    deliveryDays: 3,
    tags: ["iron", "steam iron", "laundry", "home care"],
  },
  {
    slug: "vacuum-cleaner-1200w-bagless",
    sku: "WKC-HOM-0005",
    sub: "home-care",
    title: "Vacuum Cleaner 1200W, bagless",
    subtitle: "Wet and dry, with a blower and no bags to buy",
    description:
      "A 1200-watt canister vacuum that takes wet spills as well as dry dust, with a 10 litre drum and a washable filter — there are no bags to keep buying. The hose reverses into a blower for drying and for clearing places a nozzle cannot reach. Comes with a floor brush, a crevice tool and an upholstery head.",
    price: 4299,
    mrp: 5999,
    stock: 12,
    hsn: "8508",
    images: [img(POOL.furniture[0]), img(POOL.furniture[1])],
    highlights: [
      "1200W, wet and dry",
      "10 litre drum, bagless",
      "Blower function",
      "3 attachments included",
    ],
    specs: [
      {
        group: "Power and capacity",
        items: [
          { label: "Power", value: "1200 W" },
          { label: "Drum", value: "10 litres" },
          { label: "Filter", value: "Washable, reusable" },
        ],
      },
      {
        group: "In the box",
        items: [
          { label: "Attachments", value: "Floor brush, crevice tool, upholstery head" },
          { label: "Hose", value: "1.5 m, reversible for blowing" },
        ],
      },
    ],
    warranty: "1 year against manufacturing defects",
    deliveryDays: 5,
    tags: ["vacuum", "vacuum cleaner", "cleaning", "home care"],
  },
];

async function removeAll() {
  const category = await db.category.findUnique({ where: { slug: CATEGORY.slug } });
  if (!category) {
    console.log("Nothing to remove — that category is not there.");
    return;
  }

  const products = await db.product.deleteMany({
    where: { slug: { in: PRODUCTS.map((p) => p.slug) } },
  });
  const left = await db.product.count({ where: { categoryId: category.id } });
  if (left > 0) {
    console.log(
      `Removed ${products.count} products, but ${left} other product(s) are still in this category,\nso the category itself is left alone. Move or delete those first.`,
    );
    return;
  }

  await db.category.delete({ where: { id: category.id } }); // subcategories cascade
  await db.brand.deleteMany({ where: { slug: BRAND.slug, products: { none: {} } } });
  console.log(`Removed ${products.count} products, the category and its collections.`);
}

async function seed() {
  const brand = await db.brand.upsert({
    where: { slug: BRAND.slug },
    create: BRAND,
    update: { name: BRAND.name, tagline: BRAND.tagline, origin: BRAND.origin },
  });

  const { slug: catSlug, ...catData } = CATEGORY;
  const category = await db.category.upsert({
    where: { slug: catSlug },
    create: { slug: catSlug, ...catData, sortOrder: 0 },
    update: catData,
  });

  const subIds = new Map<string, string>();
  for (const [i, s] of SUBCATEGORIES.entries()) {
    const row = await db.subcategory.upsert({
      where: { categoryId_slug: { categoryId: category.id, slug: s.slug } },
      create: { ...s, categoryId: category.id, sortOrder: i },
      update: { ...s, sortOrder: i },
    });
    subIds.set(s.slug, row.id);
  }

  const now = new Date();
  for (const p of PRODUCTS) {
    const data = {
      sku: p.sku,
      title: p.title,
      subtitle: p.subtitle,
      description: p.description,
      status: "ACTIVE" as const,
      price: p.price,
      mrp: p.mrp,
      hsnCode: p.hsn,
      taxRate: 18,
      uqc: "NOS",
      stock: p.stock,
      lowStockThreshold: 5,
      tags: p.tags,
      highlights: p.highlights,
      specifications: p.specs,
      deliveryDays: p.deliveryDays,
      codAvailable: true,
      returnWindowDays: 7,
      warranty: p.warranty,
      freeShipping: true,
      brandId: brand.id,
      categoryId: category.id,
      subcategoryId: subIds.get(p.sub)!,
      publishedAt: now,
    };

    const product = await db.product.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
    });

    // Rewritten rather than appended, so a re-run does not stack duplicates.
    await db.productImage.deleteMany({ where: { productId: product.id } });
    await db.productImage.createMany({
      data: p.images.map((url, i) => ({
        productId: product.id,
        url,
        alt: `${p.title} — photo ${i + 1}`,
        sortOrder: i,
      })),
    });
  }

  console.log(`\n  ${CATEGORY.name}`);
  console.log(`    ${SUBCATEGORIES.length} collections, ${PRODUCTS.length} products, all live\n`);
  console.log("  Before anyone buys from it, open each product in /admin and check:");
  console.log("    · the price and the MRP — mine are placeholders");
  console.log("    · the HSN code, against your supplier's invoice");
  console.log("    · the stock figure");
  console.log("    · the photographs — replace the stock images with your own\n");
  console.log("  To take all of it out again:  npx tsx scripts/seed-home-appliance.ts --remove\n");
}

(remove ? removeAll() : seed())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
