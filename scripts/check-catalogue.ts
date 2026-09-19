/**
 * A read-only look at the catalogue's oddities. It writes nothing, ever.
 *
 *   npx tsx scripts/check-catalogue.ts
 *
 * Three questions, asked of whatever database DATABASE_URL points at:
 *
 *   1. For each Home & Kitchen SKU, every product that could be "the same
 *      thing" — by SKU, by slug or by title — with where it sits, its status,
 *      when it was made and what the activity log says was done to it. A
 *      listing made by hand before the seed ran shows up here as a second row.
 *   2. Prices that look wrong: under ₹50, under the recorded cost, or under a
 *      tenth of the MRP.
 *   3. For each of those, the order lines that were sold at it, with enough of
 *      the order to tell a real sale from a test: who, when, how it was paid
 *      and whether PayU ever captured money. Emails and phones are masked.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const LISTINGS = [
  { sku: "HE-2638", slug: "double-blade-cabbage-chopper-knife", title: "Cabbage Chopper" },
  { sku: "HE-2879", slug: "multi-blade-vegetable-chopper-with-container", title: "Vegetable Chopper" },
  { sku: "HE-0556", slug: "mini-electric-garlic-chopper-usb", title: "Garlic Chopper" },
  { sku: "HE-2471", slug: "3d-mosquito-killer-lamp-usb", title: "Mosquito Killer" },
  { sku: "HE-2170", slug: "square-bamboo-hot-pot-holder-trivet", title: "Bamboo Hot Pot" },
];

const maskEmail = (email: string) => email.replace(/^(.).*(@.*)$/, "$1***$2");
const maskPhone = (phone: string) => (phone.length > 4 ? `******${phone.slice(-4)}` : "****");
const when = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

async function lookalikes() {
  console.log("\n== 1. The five Home & Kitchen listings, and anything that looks like them ==");
  for (const l of LISTINGS) {
    const rows = await db.product.findMany({
      where: {
        OR: [
          { sku: { equals: l.sku, mode: "insensitive" } },
          { slug: l.slug },
          { title: { contains: l.title, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        sku: true,
        slug: true,
        title: true,
        status: true,
        price: true,
        stock: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { slug: true, isActive: true } },
        subcategory: { select: { slug: true, isActive: true } },
        supplier: { select: { slug: true } },
        _count: { select: { orderLines: true, images: true } },
      },
    });
    console.log(`\n${l.sku}: ${rows.length} row(s)`);
    for (const p of rows) {
      console.log(
        `  · sku ${p.sku} | slug ${p.slug} | ${p.status} | ${p.category.slug}${p.category.isActive ? "" : "(hidden)"}/` +
          `${p.subcategory.slug}${p.subcategory.isActive ? "" : "(hidden)"} | ₹${p.price} | stock ${p.stock} | ` +
          `${p._count.images} images | ${p._count.orderLines} order lines | supplier ${p.supplier?.slug ?? "-"}`,
      );
      console.log(`    “${p.title}” | created ${when(p.createdAt)} | updated ${when(p.updatedAt)}`);
      const log = await db.activityLog.findMany({
        where: { entity: "Product", entityId: p.id },
        orderBy: { createdAt: "asc" },
        take: 12,
        select: { createdAt: true, actorName: true, action: true, summary: true },
      });
      if (log.length === 0) console.log("    activity log: nothing — so no admin made or edited this row by hand");
      for (const e of log) console.log(`    log ${when(e.createdAt)} ${e.actorName}: ${e.action} — ${e.summary}`);
    }
  }
}

async function wrongPrices() {
  console.log("\n== 2. Prices that look wrong ==");
  const all = await db.product.findMany({
    select: { id: true, sku: true, title: true, status: true, price: true, mrp: true, costPrice: true, _count: { select: { orderLines: true } } },
    orderBy: { price: "asc" },
  });
  const odd = all.filter(
    (p) => p.price < 50 || (p.costPrice !== null && p.price < p.costPrice) || (p.mrp > 0 && p.price * 10 < p.mrp),
  );
  if (odd.length === 0) console.log("  none");
  for (const p of odd) {
    const why = [
      p.price < 50 ? "under ₹50" : "",
      p.costPrice !== null && p.price < p.costPrice ? `under its cost ₹${p.costPrice}` : "",
      p.mrp > 0 && p.price * 10 < p.mrp ? `under a tenth of MRP ₹${p.mrp}` : "",
    ]
      .filter(Boolean)
      .join(", ");
    console.log(`  · ${p.sku} “${p.title}” ${p.status} ₹${p.price} (MRP ₹${p.mrp}) — ${why} — ${p._count.orderLines} order lines`);
  }
  return odd;
}

async function ordersFor(products: { id: string; sku: string; title: string }[]) {
  console.log("\n== 3. What was sold at those prices ==");
  const admins = new Set((await db.adminUser.findMany({ select: { email: true } })).map((a) => a.email.toLowerCase()));
  for (const p of products) {
    const lines = await db.orderLine.findMany({
      where: { productId: p.id },
      orderBy: { order: { placedAt: "asc" } },
      select: {
        price: true,
        quantity: true,
        order: {
          select: {
            number: true,
            placedAt: true,
            status: true,
            total: true,
            paymentStatus: true,
            paymentMethod: true,
            contactEmail: true,
            contactPhone: true,
            awb: true,
            payments: { select: { status: true, amount: true } },
          },
        },
      },
    });
    if (lines.length === 0) continue;
    console.log(`\n${p.sku} “${p.title}”: ${lines.length} order line(s)`);
    const emails = new Map<string, number>();
    let captured = 0;
    let shipped = 0;
    for (const l of lines) {
      const o = l.order;
      const email = o.contactEmail.toLowerCase();
      emails.set(email, (emails.get(email) ?? 0) + 1);
      const cap = o.payments.filter((a) => a.status === "CAPTURED" || a.status === "REFUNDED");
      if (cap.length > 0) captured += 1;
      if (o.awb) shipped += 1;
      console.log(
        `  · ${o.number} ${when(o.placedAt)} | line ₹${l.price} × ${l.quantity} | order ₹${o.total} | ${o.status} / ${o.paymentStatus} / ${o.paymentMethod}` +
          ` | PayU captured: ${cap.length ? cap.map((a) => `₹${a.amount / 100}`).join("+") : "no"} | AWB: ${o.awb ? "yes" : "no"}` +
          ` | ${maskEmail(o.contactEmail)}${admins.has(email) ? " (AN ADMIN'S EMAIL)" : ""} ${maskPhone(o.contactPhone)}`,
      );
    }
    console.log(
      `  summary: ${emails.size} distinct buyer email(s), ${[...emails.keys()].filter((e) => admins.has(e)).length} of them an admin's; ` +
        `${captured} order(s) with money captured by PayU; ${shipped} with a courier AWB.`,
    );
  }
}

async function main() {
  console.log(`Read-only catalogue check against ${(process.env.DATABASE_URL ?? "").replace(/\/\/[^@]*@/, "//***@")}`);
  await lookalikes();
  const odd = await wrongPrices();
  await ordersFor(odd);
  console.log("\nNothing was written.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
