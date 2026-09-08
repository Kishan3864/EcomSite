/**
 * Seeds the database from the mock catalogue that shipped with phase 1.
 *
 * Idempotent: every row is upserted on its natural key (slug, code, email,
 * order number), so it is safe to run again after a schema change. Seeded rows
 * keep the mock ids (p1, c1, b1 …) so cross-references stay trivially valid;
 * anything created later through the admin panel gets a cuid.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type Prisma,
  type BannerPlacement,
  type ProductBadge,
  type VariantType,
} from "../src/generated/prisma/client";

import { brands, categories } from "../src/data/taxonomy";
import { products } from "../src/data/products";
import { questions, reviews } from "../src/data/reviews";
import {
  customer as demoCustomer,
  heroBanners,
  midBanners,
  offers,
  promoTiles,
  returnRequests,
  savedAddresses,
} from "../src/data/marketing";
import { demoOrders } from "../src/data/orders";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const BADGE: Record<string, ProductBadge> = {
  bestseller: "BESTSELLER",
  new: "NEW",
  trending: "TRENDING",
  limited: "LIMITED",
  exclusive: "EXCLUSIVE",
  handpicked: "HANDPICKED",
};

const VARIANT: Record<string, VariantType> = {
  color: "COLOR",
  size: "SIZE",
  storage: "STORAGE",
  option: "OPTION",
};

const CATEGORY_CODE: Record<string, string> = {
  electronics: "ELE",
  fashion: "FAS",
  "home-living": "HOM",
  kitchen: "KIT",
  beauty: "BEA",
  jewellery: "JEW",
  sports: "SPO",
  books: "BOK",
};

function log(label: string, count: number) {
  console.log(`  ${label.padEnd(22)} ${String(count).padStart(4)}`);
}

async function seedBrands() {
  for (const b of brands) {
    await db.brand.upsert({
      where: { slug: b.slug },
      create: { id: b.id, slug: b.slug, name: b.name, logoText: b.logoText, tagline: b.tagline, origin: b.origin },
      update: { name: b.name, logoText: b.logoText, tagline: b.tagline, origin: b.origin },
    });
  }
  log("brands", brands.length);
}

async function seedCategories() {
  let subs = 0;
  for (const [i, c] of categories.entries()) {
    await db.category.upsert({
      where: { slug: c.slug },
      create: {
        id: c.id,
        slug: c.slug,
        name: c.name,
        menuLabel: c.menuLabel,
        icon: c.icon,
        accent: c.accent,
        description: c.description,
        imageUrl: c.image.url,
        imageAlt: c.image.alt,
        highlights: c.highlights,
        featuredBrandSlugs: c.featuredBrands,
        sortOrder: i,
      },
      update: {
        name: c.name,
        menuLabel: c.menuLabel,
        icon: c.icon,
        accent: c.accent,
        description: c.description,
        imageUrl: c.image.url,
        imageAlt: c.image.alt,
        highlights: c.highlights,
        featuredBrandSlugs: c.featuredBrands,
        sortOrder: i,
      },
    });

    for (const [j, s] of c.subcategories.entries()) {
      await db.subcategory.upsert({
        where: { categoryId_slug: { categoryId: c.id, slug: s.slug } },
        create: {
          id: s.id,
          slug: s.slug,
          name: s.name,
          description: s.description,
          imageUrl: s.image.url,
          imageAlt: s.image.alt,
          sortOrder: j,
          categoryId: c.id,
        },
        update: {
          name: s.name,
          description: s.description,
          imageUrl: s.image.url,
          imageAlt: s.image.alt,
          sortOrder: j,
        },
      });
      subs++;
    }
  }
  log("categories", categories.length);
  log("subcategories", subs);
}

async function seedProducts() {
  const subIdBySlug = new Map(
    categories.flatMap((c) => c.subcategories.map((s) => [`${c.slug}/${s.slug}`, s.id] as const)),
  );
  const brandIdBySlug = new Map(brands.map((b) => [b.slug, b.id]));
  const catIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  for (const [i, p] of products.entries()) {
    const sku = `MAY-${CATEGORY_CODE[p.categorySlug] ?? "GEN"}-${String(i + 1).padStart(4, "0")}`;
    const base = {
      slug: p.slug,
      sku,
      title: p.title,
      subtitle: p.subtitle,
      description: p.description,
      status: "ACTIVE" as const,
      price: p.price,
      mrp: p.mrp,
      stock: p.stock,
      lowStockThreshold: 12,
      soldCount: p.soldCount,
      rating: p.rating,
      reviewCount: p.reviewCount,
      badges: p.badges.map((b) => BADGE[b]).filter(Boolean),
      tags: p.tags,
      colors: p.colors,
      highlights: p.highlights,
      specifications: p.specifications as unknown as Prisma.InputJsonValue,
      deliveryDays: p.deliveryDays,
      codAvailable: p.codAvailable,
      returnWindowDays: p.returnWindowDays,
      warranty: p.warranty,
      freeShipping: p.freeShipping,
      videoPoster: p.videoPoster,
      brandId: brandIdBySlug.get(p.brandSlug)!,
      categoryId: catIdBySlug.get(p.categorySlug)!,
      subcategoryId: subIdBySlug.get(`${p.categorySlug}/${p.subcategorySlug}`)!,
      publishedAt: new Date(p.createdAt),
      createdAt: new Date(p.createdAt),
    };

    await db.product.upsert({
      where: { slug: p.slug },
      create: { id: p.id, ...base },
      update: base,
    });

    // Child rows are rebuilt from the mock each run — they carry no history.
    await db.productImage.deleteMany({ where: { productId: p.id } });
    await db.productImage.createMany({
      data: p.images.map((img, idx) => ({ productId: p.id, url: img.url, alt: img.alt, sortOrder: idx })),
    });

    await db.variantGroup.deleteMany({ where: { productId: p.id } });
    for (const [gi, g] of p.variants.entries()) {
      await db.variantGroup.create({
        data: {
          productId: p.id,
          name: g.name,
          type: VARIANT[g.type] ?? "OPTION",
          sortOrder: gi,
          options: {
            create: g.options.map((o, oi) => ({
              label: o.label,
              value: o.value,
              swatch: o.swatch,
              priceDelta: o.priceDelta ?? 0,
              inStock: o.inStock,
              sortOrder: oi,
            })),
          },
        },
      });
    }
  }

  // Cross-sell wiring needs every product to exist first.
  await db.productRelation.deleteMany({});
  const relations = products.flatMap((p) => [
    ...p.relatedIds.map((rid, idx) => ({ productId: p.id, relatedId: rid, kind: "RELATED" as const, sortOrder: idx })),
    ...p.bundleIds.map((rid, idx) => ({ productId: p.id, relatedId: rid, kind: "BUNDLE" as const, sortOrder: idx })),
  ]);
  await db.productRelation.createMany({ data: relations, skipDuplicates: true });

  // Opening-stock movement so the inventory ledger has a starting point.
  const withMoves = await db.stockMovement.findMany({ select: { productId: true }, distinct: ["productId"] });
  const seen = new Set(withMoves.map((m) => m.productId));
  await db.stockMovement.createMany({
    data: products
      .filter((p) => !seen.has(p.id))
      .map((p) => ({ productId: p.id, delta: p.stock, reason: "Opening stock", actorName: "Seed" })),
  });

  log("products", products.length);
  log("product relations", relations.length);
}

async function seedSocialProof() {
  for (const r of reviews) {
    await db.review.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        productId: r.productId,
        author: r.author,
        location: r.location,
        rating: r.rating,
        title: r.title,
        body: r.body,
        images: r.images ?? [],
        verified: r.verified,
        helpfulCount: r.helpfulCount,
        status: "APPROVED",
        createdAt: new Date(r.createdAt),
      },
      update: {},
    });
  }
  for (const q of questions) {
    await db.question.upsert({
      where: { id: q.id },
      create: {
        id: q.id,
        productId: q.productId,
        question: q.question,
        answer: q.answer,
        askedBy: q.askedBy,
        answeredBy: q.answeredBy,
        answeredAt: new Date(q.answeredAt),
        upvotes: q.upvotes,
        status: "ANSWERED",
        createdAt: new Date(q.answeredAt),
      },
      update: {},
    });
  }
  log("reviews", reviews.length);
  log("questions", questions.length);
}

async function seedMarketing() {
  const catIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  for (const o of offers) {
    const data = {
      title: o.title,
      description: o.description,
      type: o.type.toUpperCase() as "PERCENT" | "FLAT" | "SHIPPING" | "BANK",
      value: o.value,
      minSpend: o.minSpend,
      maxDiscount: o.maxDiscount ?? null,
      categoryId: o.categorySlug ? (catIdBySlug.get(o.categorySlug) ?? null) : null,
      accent: o.accent,
      expiresAt: new Date(o.expiresAt),
      isActive: true,
    };
    await db.offer.upsert({ where: { code: o.code }, create: { id: o.id, code: o.code, ...data }, update: data });
  }

  const banners: { id: string; placement: BannerPlacement; data: Record<string, unknown> }[] = [
    ...heroBanners.map((b, i) => ({
      id: `banner-${b.id}`,
      placement: "HERO" as const,
      data: { eyebrow: b.eyebrow, title: b.title, subtitle: b.subtitle, cta: b.cta, href: b.href, imageUrl: b.image.url, imageAlt: b.image.alt, align: b.align, theme: b.theme, sortOrder: i },
    })),
    ...midBanners.map((b, i) => ({
      id: `banner-${b.id}`,
      placement: "MID" as const,
      data: { eyebrow: b.eyebrow, title: b.title, subtitle: b.subtitle, cta: b.cta, href: b.href, imageUrl: b.image.url, imageAlt: b.image.alt, align: b.align, theme: b.theme, sortOrder: i },
    })),
    ...promoTiles.map((t, i) => ({
      id: `banner-${t.id}`,
      placement: "PROMO_TILE" as const,
      data: { eyebrow: "", title: t.title, subtitle: t.subtitle, cta: t.cta, href: t.href, imageUrl: t.image.url, imageAlt: t.image.alt, align: "left", theme: "dark", sortOrder: i },
    })),
  ];
  for (const b of banners) {
    await db.banner.upsert({
      where: { id: b.id },
      create: { id: b.id, placement: b.placement, ...(b.data as object) } as never,
      update: b.data as never,
    });
  }

  log("offers", offers.length);
  log("banners", banners.length);
}

async function seedCustomer() {
  const passwordHash = await bcrypt.hash(process.env.CUSTOMER_SEED_PASSWORD ?? "Ananya@2026", 10);
  const c = await db.customer.upsert({
    where: { email: demoCustomer.email },
    create: {
      id: demoCustomer.id,
      email: demoCustomer.email,
      phone: demoCustomer.phone,
      name: demoCustomer.name,
      passwordHash,
      tier: "PEACOCK_CLUB",
      loyaltyPoints: demoCustomer.loyaltyPoints,
      createdAt: new Date(demoCustomer.memberSince),
    },
    update: { name: demoCustomer.name, phone: demoCustomer.phone },
  });

  for (const a of savedAddresses) {
    await db.address.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        customerId: c.id,
        label: a.label.toUpperCase() as "HOME" | "WORK" | "OTHER",
        fullName: a.fullName,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2,
        landmark: a.landmark,
        city: a.city,
        state: a.state,
        pincode: a.pincode,
        isDefault: a.isDefault,
      },
      update: {},
    });
  }
  log("customers", 1);
  log("addresses", savedAddresses.length);
  return c;
}

async function seedOrders(customerId: string) {
  let lines = 0;
  for (const o of demoOrders) {
    const existing = await db.order.findUnique({ where: { number: o.number } });
    if (existing) continue;

    const a = o.address;
    const method = o.paymentMethod.id.toUpperCase() as "UPI" | "CARD" | "NETBANKING" | "WALLET" | "COD";
    const status = o.status.toUpperCase() as "CONFIRMED" | "PACKED" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED";

    await db.order.create({
      data: {
        id: o.id,
        number: o.number,
        customerId,
        contactName: a.fullName,
        contactEmail: demoCustomer.email,
        contactPhone: a.phone,
        status,
        paymentStatus: method === "COD" ? (status === "DELIVERED" ? "PAID" : "COD_PENDING") : "PAID",
        paymentMethod: method,
        paymentDetail: o.paymentMethod.description,
        deliverySpeed: o.delivery.id.toUpperCase() as "STANDARD" | "EXPRESS" | "SCHEDULED",
        deliveryName: o.delivery.name,
        deliveryPrice: o.delivery.price,
        shipLabel: a.label,
        shipName: a.fullName,
        shipPhone: a.phone,
        shipLine1: a.line1,
        shipLine2: a.line2,
        shipLandmark: a.landmark,
        shipCity: a.city,
        shipState: a.state,
        shipPincode: a.pincode,
        itemsTotal: o.totals.itemsTotal,
        mrpTotal: o.totals.mrpTotal,
        productDiscount: o.totals.productDiscount,
        couponCode: o.totals.couponCode,
        couponDiscount: o.totals.couponDiscount,
        shipping: o.totals.shipping,
        tax: o.totals.tax,
        total: o.totals.total,
        courier: o.courier,
        awb: o.awb,
        estimatedDelivery: new Date(o.estimatedDelivery),
        deliveredAt: status === "DELIVERED" ? new Date(o.estimatedDelivery) : null,
        placedAt: new Date(o.placedAt),
        lines: {
          create: o.lines.map((l) => ({
            id: `${o.id}-${l.productId}`,
            productId: l.productId,
            slug: l.slug,
            title: l.title,
            brand: l.brand,
            categorySlug: l.categorySlug,
            image: l.image,
            variantLabel: l.variantLabel,
            variantKey: l.variantKey,
            price: l.price,
            mrp: l.mrp,
            quantity: l.quantity,
          })),
        },
        events: {
          create: o.tracking
            .filter((e) => e.done)
            .map((e) => ({
              status: e.status.toUpperCase() as "CONFIRMED" | "PACKED" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED",
              title: e.title,
              description: e.description,
              location: e.location,
              at: new Date(e.at),
              actorName: "System",
            })),
        },
      },
    });
    lines += o.lines.length;
  }
  log("orders", demoOrders.length);
  log("order lines", lines);
}

async function seedReturns(customerId: string) {
  for (const r of returnRequests) {
    const existing = await db.returnRequest.findUnique({ where: { id: r.id } });
    if (existing) continue;
    const order = await db.order.findUnique({
      where: { number: r.orderNumber },
      include: { lines: true },
    });
    if (!order) continue;
    const line = order.lines.find((l) => l.title === r.productTitle) ?? order.lines[0];
    await db.returnRequest.create({
      data: {
        id: r.id,
        orderId: order.id,
        orderLineId: line.id,
        customerId,
        reason: r.reason,
        status: r.status.toUpperCase() as "REQUESTED" | "APPROVED" | "PICKED_UP" | "REFUNDED" | "REJECTED",
        refundAmount: r.refundAmount,
        refundMode: r.refundMode,
        requestedAt: new Date(r.requestedAt),
        resolvedAt: r.status === "refunded" ? new Date(r.requestedAt) : null,
      },
    });
    // A refunded line means the parent order was (partially) refunded.
    if (r.status === "refunded") {
      await db.order.update({ where: { id: order.id }, data: { paymentStatus: "PARTIALLY_REFUNDED" } });
    }
  }
  log("return requests", returnRequests.length);
}

async function seedAdmin() {
  const count = await db.adminUser.count();
  if (count > 0) {
    log("admin users", count);
    return;
  }
  const email = process.env.ADMIN_SEED_EMAIL ?? "admin@mayura.in";
  const password = process.env.ADMIN_SEED_PASSWORD ?? "Mayura@2026";
  await db.adminUser.create({
    data: {
      email,
      name: "Store Owner",
      passwordHash: await bcrypt.hash(password, 10),
      role: "OWNER",
    },
  });
  log("admin users", 1);
  console.log(`\n  Admin login → ${email} / ${password}`);
}

async function seedSettings() {
  const settings: Record<string, unknown> = {
    store: {
      name: "Mayura",
      legalName: "Mayura Commerce Private Limited",
      tagline: "Made well. Priced honestly.",
      supportEmail: "hello@mayura.in",
      supportPhone: "+91 80 4718 2200",
      address: "4th Floor, Ekam House, 27 Residency Road, Bengaluru 560025",
      gstin: "29AABCM1234K1ZP",
      currency: "INR",
    },
    shipping: {
      freeThreshold: 999,
      standardFee: 79,
      expressFee: 99,
      scheduledFee: 49,
      standardDays: [3, 5],
      expressDays: [1, 2],
    },
    payments: {
      upi: true,
      card: true,
      netbanking: true,
      wallet: true,
      cod: true,
      codLimit: 25000,
    },
    tax: { gstRate: 18, pricesIncludeTax: true },
    inventory: { lowStockThreshold: 12, allowBackorders: false },
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.storeSetting.upsert({
      where: { key },
      create: { key, value: value as object },
      update: {},
    });
  }
  log("settings", Object.keys(settings).length);
}

async function main() {
  console.log("Seeding Mayura …\n");
  await seedBrands();
  await seedCategories();
  await seedProducts();
  await seedSocialProof();
  await seedMarketing();
  const customer = await seedCustomer();
  await seedOrders(customer.id);
  await seedReturns(customer.id);
  await seedAdmin();
  await seedSettings();
  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
